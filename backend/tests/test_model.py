from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

@patch("app.api.endpoints.model.supabase")
def test_add_model(mock_supabase):
    # Mock supabase response
    mock_execute = MagicMock()
    mock_execute.execute.return_value.data = [{
        "id": "1234-5678",
        "name": "Test Model",
        "url": "https://api.test.com",
        "api_key": "sk-1234567890abcdef",
        "created_at": "2023-10-01T12:00:00Z"
    }]
    mock_supabase.table.return_value.insert.return_value = mock_execute

    response = client.post("/api/model/add", json={
        "name": "Test Model",
        "url": "https://api.test.com",
        "api_key": "sk-1234567890abcdef"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Model"
    assert data["api_key_masked"] == "sk-1****cdef"

@patch("app.api.endpoints.model.supabase")
def test_list_models(mock_supabase):
    mock_execute = MagicMock()
    mock_execute.execute.return_value.data = [{
        "id": "1234-5678",
        "name": "Test Model",
        "url": "https://api.test.com",
        "api_key": "sk-test", # length < 8
        "created_at": "2023-10-01T12:00:00Z"
    }]
    mock_supabase.table.return_value.select.return_value = mock_execute

    response = client.get("/api/model/list")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["api_key_masked"] == "********"

@patch("app.api.endpoints.model.supabase")
def test_update_model(mock_supabase):
    mock_execute = MagicMock()
    mock_execute.execute.return_value.data = [{
        "id": "1234-5678",
        "name": "Updated Model",
        "url": "https://api.test.com",
        "api_key": "sk-1234567890abcdef",
        "created_at": "2023-10-01T12:00:00Z"
    }]
    mock_supabase.table.return_value.update.return_value.eq.return_value = mock_execute

    response = client.put("/api/model/1234-5678", json={
        "name": "Updated Model"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Model"

@patch("app.api.endpoints.model.supabase")
def test_delete_model(mock_supabase):
    mock_execute = MagicMock()
    mock_execute.execute.return_value.data = [{"id": "1234-5678"}]
    mock_supabase.table.return_value.delete.return_value.eq.return_value = mock_execute

    response = client.delete("/api/model/1234-5678")
    assert response.status_code == 200
    assert response.json() == {"message": "Model deleted successfully"}
