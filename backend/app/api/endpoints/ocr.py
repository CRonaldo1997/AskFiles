from fastapi import APIRouter, HTTPException
from app.schemas.document import DocumentResponse
from app.db.supabase import supabase
from app.services.ocr_service import ocr_service
from datetime import datetime

router = APIRouter()

@router.get("/status/{job_id}", response_model=DocumentResponse)
async def check_ocr_status(job_id: str):
    # 先查出这个 job_id 对应的文档
    db_res = supabase.table("documents").select("*").eq("job_id", job_id).execute()
    if not db_res.data:
        raise HTTPException(status_code=404, detail="未找到对应的文档任务")
    
    doc = db_res.data[0]
    # 如果已经 done 或 failed，直接返回
    if doc["status"] in ["done", "failed"]:
        return doc

    # 向 PaddleOCR 请求状态
    try:
        job_status_info = await ocr_service.get_job_status(job_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"检查状态异常: {str(e)}")

    api_status = job_status_info.get("status")
    
    if api_status in ["init", "pending", "running"]:
        return doc
    elif api_status == "done":
        json_url = job_status_info.get("jsonUrl")
        if not json_url:
            update_data = {"status": "failed", "ocr_content": "OCR完成但未提供JsonUrl"}
        else:
            try:
                markdown_text = await ocr_service.download_and_parse_result(json_url)
                update_data = {"status": "done", "ocr_content": markdown_text, "updated_at": datetime.utcnow().isoformat()}
            except Exception as e:
                update_data = {"status": "failed", "ocr_content": f"解析结果失败: {str(e)}", "updated_at": datetime.utcnow().isoformat()}
    elif api_status == "failed":
        err_msg = job_status_info.get("error", "OCR Engine Error")
        update_data = {"status": "failed", "ocr_content": f"识别失败: {err_msg}", "updated_at": datetime.utcnow().isoformat()}
    else:
        update_data = {"status": "failed", "ocr_content": f"未知状态: {api_status}", "updated_at": datetime.utcnow().isoformat()}
        
    # 同步状态到数据库
    upd_res = supabase.table("documents").update(update_data).eq("id", doc["id"]).execute()
    return upd_res.data[0]
