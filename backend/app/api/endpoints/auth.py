from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.supabase import supabase

router = APIRouter()

class AuthRequest(BaseModel):
    username: str
    password: str

@router.post("/register")
def register(req: AuthRequest):
    # 1. 检查用户是否存在
    user_res = supabase.table("users").select("*").eq("username", req.username).execute()
    if user_res.data:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 2. 插入新用户 (对应数据库列名: password_hash)
    new_user = {
        "username": req.username,
        "password_hash": req.password  # 将前端传入的密码映射到数据库的 password_hash 列
    }
    supabase.table("users").insert(new_user).execute()
    
    return {"status": "success", "message": "注册成功", "username": req.username}

@router.post("/login")
def login(req: AuthRequest):
    # 1. 查询用户
    user_res = supabase.table("users").select("*").eq("username", req.username).execute()
    if not user_res.data:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    user = user_res.data[0]
    # 这里的对比也需要使用 password_hash
    if user.get("password_hash") != req.password:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    return {"status": "success", "message": "登录成功", "username": req.username}
