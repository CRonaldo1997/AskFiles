from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to AskFiles API"}

from app.api.endpoints import model, document, ocr, chat, settings as api_settings, auth
import os



app.include_router(model.router, prefix="/api/model", tags=["model"])
app.include_router(document.router, prefix="/api/document", tags=["document"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(api_settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])




@app.get("/health")
def health_check():
    return {"status": "ok"}
