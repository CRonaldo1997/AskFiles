from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    # App config
    PROJECT_NAME: str = "AskFiles API"
    API_V1_STR: str = "/api"
    
    # Supabase config
    SUPABASE_URL: str = Field(..., env='SUPABASE_URL')
    SUPABASE_KEY: str = Field(..., env='SUPABASE_KEY')
    SUPABASE_STORAGE_BUCKET: str = "documents"
    
    # PaddleOCR config
    PADDLE_OCR_API_URL: str = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
    PADDLE_OCR_TOKEN: str = Field(..., env='PADDLE_OCR_TOKEN')
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
