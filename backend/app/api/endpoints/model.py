from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.model import ModelCreate, ModelUpdate, ModelResponse, ModelResponseMasked
from app.db.supabase import supabase
from app.services.llm_service import llm_service

router = APIRouter()

@router.post("/test")
async def test_model(model_in: ModelCreate):
    """测试模型连通性"""
    try:
        # 直接使用传入的参数进行简单测试
        await llm_service.ask_question(
            api_url=model_in.url,
            api_key=model_in.api_key,
            model_name=model_in.name,
            messages=[
                {"role": "system", "content": "You are a connection tester."},
                {"role": "user", "content": "ping"}
            ]
        )
        return {"status": "success", "message": "连接测试成功！"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/test/{model_id}")
async def test_existing_model(model_id: str):
    """测试已存在模型的连通性"""
    response = supabase.table("models").select("*").eq("id", model_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Model not found")
        
    m = response.data[0]
    try:
        await llm_service.ask_question(
            api_url=m["url"],
            api_key=m["api_key"],
            model_name=m["name"],
            messages=[
                {"role": "system", "content": "You are a connection tester."},
                {"role": "user", "content": "ping"}
            ]
        )
        return {"status": "success", "message": "连接测试成功！"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def mask_api_key(api_key: str) -> str:
    if len(api_key) <= 8:
        return "********"
    return f"{api_key[:4]}****{api_key[-4:]}"

@router.post("/add", response_model=ModelResponseMasked)
def add_model(model_in: ModelCreate):
    data = model_in.model_dump()
    response = supabase.table("models").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create model")
    
    new_model = response.data[0]
    return {
        "id": new_model["id"],
        "name": new_model["name"],
        "url": new_model["url"],
        "api_key_masked": mask_api_key(new_model["api_key"]),
        "created_at": new_model["created_at"]
    }

@router.get("/list", response_model=List[ModelResponseMasked])
def list_models():
    response = supabase.table("models").select("*").execute()
    models = response.data
    
    result = []
    for m in models:
        result.append({
            "id": m["id"],
            "name": m["name"],
            "url": m["url"],
            "api_key_masked": mask_api_key(m["api_key"]),
            "created_at": m["created_at"]
        })
    return result

@router.put("/{model_id}", response_model=ModelResponseMasked)
def update_model(model_id: str, model_in: ModelUpdate):
    update_data = model_in.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
        
    response = supabase.table("models").update(update_data).eq("id", model_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Model not found")
        
    updated_model = response.data[0]
    return {
        "id": updated_model["id"],
        "name": updated_model["name"],
        "url": updated_model["url"],
        "api_key_masked": mask_api_key(updated_model["api_key"]),
        "created_at": updated_model["created_at"]
    }

@router.delete("/{model_id}")
def delete_model(model_id: str):
    response = supabase.table("models").delete().eq("id", model_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"message": "Model deleted successfully"}
