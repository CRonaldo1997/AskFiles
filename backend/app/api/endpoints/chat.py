from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.schemas.chat import ChatRequest, ChatResponse, ClearChatRequest, Session, SessionCreate, SessionUpdate
from app.db.supabase import supabase
from app.services.llm_service import llm_service
from datetime import datetime
import uuid

router = APIRouter()

from fastapi.responses import StreamingResponse
import json

@router.post("/ask/stream")
async def ask_question_stream(chat_in: ChatRequest):
    print(f"DEBUG: ask_question_stream starting for user {chat_in.username}, session {chat_in.session_id}")
    # 1. 拿取所选模型的配置信息
    model_res = supabase.table("models").select("*").eq("id", chat_in.model_id).execute()
    if not model_res.data:
        raise HTTPException(status_code=404, detail="大模型配置未找到")
    model_config = model_res.data[0]
    
    # 2. 检查要有 OCR 文件内容
    ocr_context = ""
    if chat_in.doc_id:
        doc_res = supabase.table("documents").select("ocr_content, status").eq("id", chat_in.doc_id).execute()
        if ocr_res := doc_res.data:
            document = ocr_res[0]
            if document.get("status") == "done" and document.get("ocr_content"):
                ocr_context = document["ocr_content"]

    # 3. 构造系统提示词 (注入文档内容作为背景)
    system_prompt = chat_in.system_prompt or "你是一个专业的智能文档助手，请用专业、准确、友好的语气回答用户的问题。"
    if ocr_context:
        system_prompt = f"{system_prompt}\n\n【参考文档全文开始】\n{ocr_context}\n【参考文档全文结束】\n\n请在回答时严格参考上述文档内容。"
    
    final_user_content = chat_in.question
    print(f"DEBUG: context length={len(ocr_context)}, system_prompt_len={len(system_prompt)}")
    
    # 4. 获取历史上下文 (最近20条)
    history_messages = []
    
    if chat_in.session_id:
        is_valid_uuid = False
        try:
            uuid.UUID(chat_in.session_id)
            is_valid_uuid = True
        except (ValueError, TypeError, AttributeError):
            pass

        if is_valid_uuid:
            # Normalized way: Query by session_id
            history_res = supabase.table("chats").select("question, answer")\
                .eq("session_id", chat_in.session_id)\
                .order("created_at", desc=True).limit(20).execute()
            
            if history_res.data:
                for h in reversed(history_res.data):
                    # We stop prefixing new chats, so just use directly
                    history_messages.append({"role": "user", "content": h["question"]})
                    history_messages.append({"role": "assistant", "content": h["answer"]})
    else:
        # Legacy/Default way: Query by prefix
        user_prefix = f"[USER_{chat_in.username}] "
        history_query = supabase.table("chats").select("question, answer").like("question", f"{user_prefix}%")
        if chat_in.doc_id:
            history_query = history_query.eq("doc_id", chat_in.doc_id)
        else:
            history_query = history_query.is_("doc_id", "null")
            
        history_res = history_query.order("created_at", desc=True).limit(20).execute()
        
        if history_res.data:
            for h in reversed(history_res.data):
                real_question = h["question"].replace(user_prefix, "", 1) if h["question"].startswith(user_prefix) else h["question"]
                history_messages.append({"role": "user", "content": real_question})
                history_messages.append({"role": "assistant", "content": h["answer"]})
        print(f"DEBUG: history messages count={len(history_messages) // 2}")


    messages = [{"role": "system", "content": system_prompt}] + history_messages + [{"role": "user", "content": final_user_content}]
    
    async def chat_event_generator():
        print("DEBUG: event generator starting")
        full_answer = ""
        try:
            async for chunk in llm_service.ask_question_stream(
                api_url=model_config["url"],
                api_key=model_config["api_key"],
                model_name=model_config["name"],
                messages=messages
            ):
                full_answer += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            # 5. 保存到 Supabase chats 表 (在流结束时)
            chat_data = {
                "question": chat_in.question,
                "answer": full_answer,
                "prompt": f"System: {system_prompt}\nUser: {final_user_content}",
                "doc_id": chat_in.doc_id,
                "session_id": chat_in.session_id
            }
            # If no session_id, we might still want the prefix for legacy UI support if not updating all at once
            if not chat_in.session_id:
                chat_data["question"] = f"[USER_{chat_in.username}] {chat_in.question}"
                
            supabase.table("chats").insert(chat_data).execute()
            
            # Update session updated_at
            if chat_in.session_id:
                supabase.table("sessions").update({"updated_at": datetime.now().isoformat()}).eq("id", chat_in.session_id).execute()

            
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(chat_event_generator(), media_type="text/event-stream")

@router.post("/ask", response_model=ChatResponse)
async def ask_question(chat_in: ChatRequest):
    # 1. 拿取所选模型的配置信息
    model_res = supabase.table("models").select("*").eq("id", chat_in.model_id).execute()
    if not model_res.data:
        raise HTTPException(status_code=404, detail="大模型配置未找到")
    model_config = model_res.data[0]
    
    # 2. 检查是否有 OCR 文件内容
    ocr_context = ""
    if chat_in.doc_id:
        doc_res = supabase.table("documents").select("ocr_content, status").eq("id", chat_in.doc_id).execute()
        if not doc_res.data:
            raise HTTPException(status_code=404, detail="文档未找到")
        document = doc_res.data[0]
        if document.get("status") != "done" or not document.get("ocr_content"):
            raise HTTPException(status_code=400, detail="文档 OCR 尚未完成或内容为空")
        ocr_context = document["ocr_content"]

    # 3. 构造系统提示词 (注入文档内容作为背景)
    system_prompt = chat_in.system_prompt or "你是一个专业的智能文档助手，请用专业、准确、友好的语气回答用户的问题。"
    if ocr_context:
        system_prompt = f"{system_prompt}\n\n【参考文档全文开始】\n{ocr_context}\n【参考文档全文结束】\n\n请在回答时严格参考上述文档内容。"
    
    final_user_content = chat_in.question
    full_prompt_record = f"System: {system_prompt}\nUser: {final_user_content}"
    
    # 4. 获取历史上下文 (最近20条)
    history_messages = []
    
    if chat_in.session_id:
        is_valid_uuid = False
        try:
            uuid.UUID(chat_in.session_id)
            is_valid_uuid = True
        except (ValueError, TypeError, AttributeError):
            pass

        if is_valid_uuid:
            # Normalized way: Query by session_id
            history_res = supabase.table("chats").select("question, answer")\
                .eq("session_id", chat_in.session_id)\
                .order("created_at", desc=True).limit(20).execute()
            
            if history_res.data:
                for h in reversed(history_res.data):
                    # We stop prefixing new chats, so just use directly
                    history_messages.append({"role": "user", "content": h["question"]})
                    history_messages.append({"role": "assistant", "content": h["answer"]})
    else:
        # Legacy/Default way: Query by prefix
        user_prefix = f"[USER_{chat_in.username}] "
        history_query = supabase.table("chats").select("question, answer").like("question", f"{user_prefix}%")
        if chat_in.doc_id:
            history_query = history_query.eq("doc_id", chat_in.doc_id)
        else:
            history_query = history_query.is_("doc_id", "null")
            
        history_res = history_query.order("created_at", desc=True).limit(20).execute()
        
        if history_res.data:
            for h in reversed(history_res.data):
                real_question = h["question"].replace(user_prefix, "", 1) if h["question"].startswith(user_prefix) else h["question"]
                history_messages.append({"role": "user", "content": real_question})
                history_messages.append({"role": "assistant", "content": h["answer"]})


    messages = [{"role": "system", "content": system_prompt}] + history_messages + [{"role": "user", "content": final_user_content}]

    # 5. 请求 LLM 服务
    try:
        answer = await llm_service.ask_question(
            api_url=model_config["url"],
            api_key=model_config["api_key"],
            model_name=model_config["name"],
            messages=messages
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM 接口调用异常: {str(e)}")

    # 6. 保存到 Supabase chats 表
    chat_data = {
        "question": chat_in.question,
        "answer": answer,
        "prompt": full_prompt_record,
        "doc_id": chat_in.doc_id,
        "session_id": chat_in.session_id
    }
    if not chat_in.session_id:
        chat_data["question"] = f"[USER_{chat_in.username}] {chat_in.question}"
    
    db_res = supabase.table("chats").insert(chat_data).execute()
    if not db_res.data:
        raise HTTPException(status_code=500, detail="保存对话记录到数据库失败")
        
    if chat_in.session_id:
        supabase.table("sessions").update({"updated_at": datetime.now().isoformat()}).eq("id", chat_in.session_id).execute()

        
    return db_res.data[0]

@router.get("/list", response_model=List[ChatResponse])
def get_chat_history(username: str, doc_id: Optional[str] = None, session_id: Optional[str] = None):
    if session_id:
        # Validate UUID
        try:
            uuid.UUID(session_id)
        except (ValueError, TypeError, AttributeError):
            # If not a valid UUID (e.g. 'new-XXXX'), just return empty list
            return []
            
        res = supabase.table("chats").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()
        return res.data
    else:
        user_prefix = f"[USER_{username}] "
        query = supabase.table("chats").select("*").like("question", f"{user_prefix}%")
        if doc_id:
            query = query.eq("doc_id", doc_id)
        else:
            query = query.is_("doc_id", "null")
            
        res = query.order("created_at", desc=False).execute()
        
        for row in res.data:
            if row["question"].startswith(user_prefix):
                row["question"] = row["question"].replace(user_prefix, "", 1)
        return res.data


@router.post("/clear")
def clear_chat_history(req: ClearChatRequest):
    if req.session_id:
        supabase.table("chats").delete().eq("session_id", req.session_id).execute()
        # Optionally delete session itself
        supabase.table("sessions").delete().eq("id", req.session_id).execute()
        return {"message": "成功清空并删除当前会话内容"}
    else:
        user_prefix = f"[USER_{req.username}] "
        query = supabase.table("chats").delete().like("question", f"{user_prefix}%")
        if req.doc_id:
            res = query.eq("doc_id", req.doc_id).execute()
            return {"message": f"成功清空当前文档（{req.doc_id}）对应的对话记录"}
        else:
            res = query.is_("doc_id", "null").execute()
            return {"message": "成功清空全局对话记录"}

# --- New Session Management Endpoints ---

@router.get("/sessions", response_model=List[Session])
def list_sessions(username: str, doc_id: Optional[str] = None, q: Optional[str] = None):
    if not q:
        query = supabase.table("sessions").select("*").eq("username", username)
        if doc_id:
            query = query.eq("doc_id", doc_id)
        res = query.order("updated_at", desc=True).execute()
        return res.data
    
    # 搜索逻辑
    # 1. 搜标题
    title_query = supabase.table("sessions").select("*").eq("username", username).ilike("title", f"%{q}%")
    if doc_id:
        title_query = title_query.eq("doc_id", doc_id)
    title_res = title_query.execute()
    
    # 2. 搜内容 (从 chats 表中找匹配的 session_id)
    content_query = supabase.table("chats").select("session_id").or_(f"question.ilike.%{q}%,answer.ilike.%{q}%")
    content_res = content_query.execute()
    
    session_ids = set()
    if content_res.data:
        session_ids = {c["session_id"] for c in content_res.data if c["session_id"]}
    
    # 3. 合并结果
    if session_ids:
        # 获取这些 session_id 对应的 session (且属于当前用户)
        id_query = supabase.table("sessions").select("*").eq("username", username).in_("id", list(session_ids))
        if doc_id:
            id_query = id_query.eq("doc_id", doc_id)
        id_res = id_query.execute()
        
        # 合并并去重
        combined = {s["id"]: s for s in title_res.data}
        for s in id_res.data:
            combined[s["id"]] = s
            
        # 按更新时间排序
        results = list(combined.values())
        results.sort(key=lambda x: x["updated_at"], reverse=True)
        return results
    
    return title_res.data

@router.post("/sessions", response_model=Session)
def create_session(session_in: SessionCreate):
    res = supabase.table("sessions").insert(session_in.model_dump()).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="创建会话失败")
    return res.data[0]

@router.put("/sessions/{session_id}", response_model=Session)
def update_session(session_id: str, session_in: SessionUpdate):
    try:
        uuid.UUID(session_id)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid Session ID format")
        
    res = supabase.table("sessions").update(session_in.model_dump(exclude_unset=True)).eq("id", session_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="会话不存在")
    return res.data[0]

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    try:
        uuid.UUID(session_id)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid Session ID format")
        
    # Chats will be deleted automatically if ON DELETE CASCADE is set, 
    # but we can do it manually to be safe or if not set.
    supabase.table("chats").delete().eq("session_id", session_id).execute()
    res = supabase.table("sessions").delete().eq("id", session_id).execute()
    if not res.data:
         raise HTTPException(status_code=404, detail="会话不存在")
    return {"message": "会话已删除"}
