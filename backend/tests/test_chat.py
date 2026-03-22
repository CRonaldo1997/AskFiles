from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from app.main import app

client = TestClient(app)

@patch("app.api.endpoints.chat.llm_service.ask_question", new_callable=AsyncMock)
@patch("app.api.endpoints.chat.supabase")
def test_ask_question(mock_supabase, mock_ask):
    # Mock models
    mock_model_res = MagicMock()
    mock_model_res.execute.return_value.data = [{
        "id": "model-1", "name": "GPT-3.5", "url": "http://api.com", "api_key": "sk-1"
    }]
    
    # Mock documents
    mock_doc_res = MagicMock()
    mock_doc_res.execute.return_value.data = [{
        "ocr_content": "文档的内容！", "status": "done"
    }]
    
    # Mock insert chat
    mock_insert_res = MagicMock()
    mock_insert_res.execute.return_value.data = [{
        "id": "chat-1", "question": "这写了什么", "answer": "回答: 文档...",
        "prompt": "xx", "doc_id": "doc-1", "created_at": "2023-10-01T12:00:00Z"
    }]
    
    def side_effect_select(table):
        if table == "models":
            m = MagicMock()
            m.eq.return_value = mock_model_res
            return m
        elif table == "documents":
            m = MagicMock()
            m.eq.return_value = mock_doc_res
            return m
    
    mock_supabase.table.return_value.select.side_effect = side_effect_select
    mock_supabase.table.return_value.insert.return_value = mock_insert_res
    
    mock_ask.return_value = "回答: 文档..."

    req = {
        "question": "这写了什么",
        "doc_id": "doc-1",
        "model_id": "model-1"
    }
    
    resp = client.post("/api/chat/ask", json=req)
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "回答: 文档..."

@patch("app.api.endpoints.chat.supabase")
def test_get_chat_history(mock_supabase):
    mock_res = MagicMock()
    mock_res.execute.return_value.data = [{"id": "chat-1"}]
    mock_supabase.table.return_value.select.return_value.order.return_value.execute = mock_res
    
    resp = client.get("/api/chat/list")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

@patch("app.api.endpoints.chat.supabase")
def test_clear_chat(mock_supabase):
    mock_res = MagicMock()
    mock_supabase.table.return_value.delete.return_value.neq.return_value.execute = mock_res
    
    resp = client.post("/api/chat/clear", json={})
    assert resp.status_code == 200
    assert "清空所有对话记录" in resp.json()["message"]
