import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()

# Local storage path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "settings.json")

# Ensure data dir exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

class SettingsRequest(BaseModel):
    value: Any

def load_settings() -> Dict[str, Any]:
    if not os.path.exists(DB_PATH):
        return {}
    try:
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_settings(data: Dict[str, Any]):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@router.get("/{key}")
def get_setting(key: str):
    data = load_settings()
    if key not in data:
        return {"value": None}
    return {"value": data[key]}

@router.post("/{key}")
def update_setting(key: str, req: SettingsRequest):
    data = load_settings()
    data[key] = req.value
    save_settings(data)
    return {"status": "success", "key": key, "value": req.value}
