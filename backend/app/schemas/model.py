from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime

class ModelBase(BaseModel):
    name: str = Field(..., title="模型名称", example="GPT-4")
    url: str = Field(..., title="模型请求基础地址", example="https://api.openai.com/v1")
    api_key: str = Field(..., title="模型鉴权秘钥", example="sk-...")

class ModelCreate(ModelBase):
    pass

class ModelUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    api_key: Optional[str] = None

class ModelResponse(ModelBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ModelResponseMasked(BaseModel):
    id: str
    name: str
    url: str
    api_key_masked: str
    created_at: datetime
