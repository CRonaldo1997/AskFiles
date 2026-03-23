from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any
from app.db.supabase import supabase

router = APIRouter()

class SettingsRequest(BaseModel):
    value: Any

@router.get("/{key}")
def get_setting(key: str):
    # 从 supabase 中查询指定 key 的设置项
    res = supabase.table("settings").select("value").eq("key", key).execute()
    if not res.data:
        return {"value": None}
    
    return {"value": res.data[0]["value"]}

@router.post("/{key}")
def update_setting(key: str, req: SettingsRequest):
    # 检查项是否存在以决定是更新还是插入 (Upsert)
    # Supabase 的 .upsert() 也可以
    data = {"key": key, "value": req.value}
    supabase.table("settings").upsert(data).execute()
    
    return {"status": "success", "key": key, "value": req.value}
