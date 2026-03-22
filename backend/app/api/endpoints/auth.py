import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "users.json")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

class AuthRequest(BaseModel):
    username: str
    password: str

def load_users() -> dict:
    if not os.path.exists(DB_PATH):
        return {}
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_users(users: dict):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False)

@router.post("/register")
def register(req: AuthRequest):
    users = load_users()
    if req.username in users:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    users[req.username] = req.password  # In plaintext for simplicity here
    save_users(users)
    return {"status": "success", "message": "注册成功", "username": req.username}

@router.post("/login")
def login(req: AuthRequest):
    users = load_users()
    if req.username not in users or users[req.username] != req.password:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    return {"status": "success", "message": "登录成功", "username": req.username}
