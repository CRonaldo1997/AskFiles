from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentResponse(BaseModel):
    id: str
    file_name: str
    file_type: str
    file_size: int
    ocr_content: Optional[str] = None
    status: str
    job_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DocumentUpdate(BaseModel):
    ocr_content: str
