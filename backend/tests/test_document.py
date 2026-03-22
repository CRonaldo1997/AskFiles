from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from app.main import app

client = TestClient(app)

@patch("app.api.endpoints.document.ocr_service.submit_job", new_callable=AsyncMock)
@patch("app.api.endpoints.document.supabase")
def test_upload_document(mock_supabase, mock_submit_job):
    # Mocking Supabase
    mock_execute_insert = MagicMock()
    mock_execute_insert.execute.return_value.data = [{"id": "doc-123", "filename": "test.txt"}]
    mock_supabase.table.return_value.insert.return_value = mock_execute_insert

    mock_execute_update = MagicMock()
    mock_execute_update.execute.return_value.data = [{
        "id": "doc-123", 
        "file_name": "test.txt",
        "file_type": "text/plain",
        "file_size": 12,
        "ocr_content": None,
        "status": "running",
        "job_id": "job-123",
        "created_at": "2023-10-01T12:00:00Z",
        "updated_at": "2023-10-01T12:00:00Z"
    }]
    mock_supabase.table.return_value.update.return_value.eq.return_value = mock_execute_update

    # Mocking OCR submit job
    mock_submit_job.return_value = "job-123"

    response = client.post("/api/document/upload", files={"file": ("test.txt", b"hello world", "text/plain")})
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "job-123"
    assert data["status"] == "running"

@patch("app.api.endpoints.ocr.ocr_service.get_job_status", new_callable=AsyncMock)
@patch("app.api.endpoints.ocr.ocr_service.download_and_parse_result", new_callable=AsyncMock)
@patch("app.api.endpoints.ocr.supabase")
def test_ocr_status(mock_supabase, mock_download, mock_get_status):
    # Initial status check document
    mock_execute_select = MagicMock()
    mock_execute_select.execute.return_value.data = [{
        "id": "doc-123", 
        "status": "running",
        "job_id": "job-123",
        "file_name": "test.txt", 
        "file_type": "text/plain", 
        "file_size": 100,
        "created_at": "2023-10-01T12:00:00Z",
        "updated_at": "2023-10-01T12:00:00Z"
    }]
    mock_supabase.table.return_value.select.return_value.eq.return_value = mock_execute_select

    mock_get_status.return_value = {"status": "done", "jsonUrl": "http://json"}
    mock_download.return_value = "Parsed Markdown Text"

    mock_execute_update = MagicMock()
    mock_execute_update.execute.return_value.data = [{
        "id": "doc-123", 
        "status": "done",
        "job_id": "job-123",
        "file_name": "test.txt",
        "file_type": "text/plain",
        "file_size": 100,
        "ocr_content": "Parsed Markdown Text",
        "created_at": "2023-10-01T12:00:00Z",
        "updated_at": "2023-10-01T12:00:00Z"
    }]
    mock_supabase.table.return_value.update.return_value.eq.return_value = mock_execute_update

    response = client.get("/api/ocr/status/job-123")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "done"
@patch("app.api.endpoints.document.supabase")
def test_list_documents(mock_supabase):
    mock_execute = MagicMock()
    mock_execute.execute.return_value.data = [{"id": "doc-123"}]
    mock_supabase.table.return_value.select.return_value.order.return_value.execute = mock_execute

    response = client.get("/api/document/list")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == "doc-123"

@patch("app.api.endpoints.document.supabase")
def test_update_document(mock_supabase):
    mock_execute = MagicMock()
    mock_execute.execute.return_value.data = [{"id": "doc-123", "ocr_content": "New Content"}]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute = mock_execute

    response = client.put("/api/document/doc-123", json={"ocr_content": "New Content"})
    assert response.status_code == 200
    assert response.json()["ocr_content"] == "New Content"

@patch("app.api.endpoints.document.supabase")
def test_delete_document(mock_supabase):
    mock_execute = MagicMock()
    mock_execute.execute.return_value.data = [{"id": "doc-123"}]
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute = mock_execute

    response = client.delete("/api/document/doc-123")
    assert response.status_code == 200
    assert response.json()["message"] == "文档删除成功"
