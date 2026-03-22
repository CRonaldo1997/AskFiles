from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ChatRequest(BaseModel):
    question: str
    system_prompt: Optional[str] = "你是一个智能问答助手，请基于提供的文档内容回答用户问题。"
    user_prompt: Optional[str] = "请看以下文档内容并回答问题：\n\n{context}\n\n问题：{question}"
    doc_id: Optional[str] = None
    model_id: str
    username: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    id: str
    question: str
    answer: str
    prompt: str
    doc_id: Optional[str] = None
    session_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ClearChatRequest(BaseModel):
    doc_id: Optional[str] = None # 如果传入，则清空该文档关联的对话；否则清空全部
    username: str
    session_id: Optional[str] = None

class SessionBase(BaseModel):
    title: str
    username: str
    doc_id: Optional[str] = None

class SessionCreate(SessionBase):
    pass

class SessionUpdate(BaseModel):
    title: Optional[str] = None

class Session(SessionBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
