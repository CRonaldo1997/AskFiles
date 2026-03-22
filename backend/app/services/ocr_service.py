import httpx
import json
import asyncio
from fastapi import HTTPException
from app.core.config import settings

class OCRService:
    def __init__(self):
        self.api_url = settings.PADDLE_OCR_API_URL
        self.headers = {
            "Authorization": f"bearer {settings.PADDLE_OCR_TOKEN}"
        }
        self.model_name = "PaddleOCR-VL-1.5"

    async def submit_job(self, file_bytes: bytes, filename: str) -> str:
        """
        Submits file to PaddleOCR jobs and returns the jobId.
        """
        optional_payload = {
            "useDocOrientationClassify": False,
            "useDocUnwarping": False,
            "useChartRecognition": False
        }
        
        # Use a safe filename for the API submit to avoid encoding/illegal char issues
        import os
        ext = os.path.splitext(filename)[1].lower()
        if not ext:
            ext = ".pdf" # default fallback
            
        safe_filename = f"file_{ext.replace('.', '')}{ext}"
        
        # Determine content type
        content_type = "application/pdf"
        if ext in [".png"]: content_type = "image/png"
        elif ext in [".jpg", ".jpeg"]: content_type = "image/jpeg"
        
        files = {
            "file": (safe_filename, file_bytes, content_type)
        }
        
        data = {
            "model": self.model_name,
            "optionalPayload": json.dumps(optional_payload)
        }
        
        print(f"DEBUG: Submitting OCR job for {filename} (safe: {safe_filename}) with model {self.model_name}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.api_url, 
                    headers=self.headers, 
                    files=files, 
                    data=data,
                    timeout=30.0
                )
                if response.status_code != 200:
                    print(f"ERROR: OCR Submit failed with status {response.status_code}: {response.text}")
                    response.raise_for_status()
                
                res_data = response.json()
                if not res_data.get("data") or not res_data["data"].get("jobId"):
                    raise Exception(f"OCR submission response missing data/jobId: {res_data}")
                
                return res_data["data"]["jobId"]
            except httpx.HTTPError as e:
                raise Exception(f"HTTP request error during OCR submit: {str(e)}")
            except Exception as e:
                raise Exception(f"OCR internal parsing error: {str(e)}")

    async def get_job_status(self, job_id: str) -> dict:
        """
        Checks job status.
        Returns dict with status ('pending', 'running', 'done', 'failed'), and optional jsonUrl or error.
        """
        url = f"{self.api_url}/{job_id}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=10.0)
                response.raise_for_status()
                res_data = response.json()
                
                data = res_data.get("data", {})
                state = data.get("state")

                if state == "done":
                    json_url = data.get("resultUrl", {}).get("jsonUrl")
                    return {
                        "status": "done",
                        "jsonUrl": json_url
                    }
                elif state == "failed":
                    return {"status": "failed", "error": data.get("errorMsg", "Unknown error")}
                else:
                    return {"status": state or "pending"}
                    
            except httpx.HTTPError as e:
                return {"status": "failed", "error": f"HTTP error during poll: {str(e)}"}

    async def download_and_parse_result(self, json_url: str) -> str:
        """
        Downloads result JSONL and parses markdown text.
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(json_url, timeout=30.0)
                response.raise_for_status()
                
                content_lines = response.text.strip().split("\n")
                markdown_texts = []
                
                for line in content_lines:
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        result = data.get("result", {})
                        parsing_results = result.get("layoutParsingResults", [])
                        for res in parsing_results:
                            md_text = res.get("markdown", {}).get("text", "")
                            if md_text:
                                markdown_texts.append(md_text)
                    except Exception as pe:
                        print(f"WARNING: Failed to parse line in JSONL: {pe}")
                        continue
                
                return "\n\n".join(markdown_texts)
            except Exception as e:
                raise Exception(f"Failed to parse OCR result: {str(e)}")

ocr_service = OCRService()
