/**
 * API Client for FastAPI Backend Integration
 */

export interface Document {
  id: string;
  name: string;
  date: string;
  size: string;
  type: 'pdf' | 'csv' | 'docx' | 'txt' | 'image';
  status: 'pending' | 'running' | 'done' | 'failed' | 'uploaded';
  ocr_content?: string;
  jobId?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  url: string;
  api_key_masked: string;
}

export interface ChatSession {
  id: string;
  title: string;
  username: string;
  doc_id?: string;
  created_at: string;
  updated_at: string;
}


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  question: string;
  doc_id?: string;
  model_id: string;
  username: string;
  session_id?: string;
  system_prompt?: string;
  user_prompt?: string;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const mapDocType = (mime: string): 'pdf' | 'csv' | 'docx' | 'txt' | 'image' => {
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('csv')) return 'csv';
  if (mime.includes('word') || mime.includes('docx')) return 'docx';
  if (mime.includes('image') || mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg')) return 'image';
  return 'txt';
};

export const apiService = {
  // Documents
  getDocuments: async (): Promise<Document[]> => {
    const res = await fetch(`${API_BASE_URL}/document/list`);
    const data = await res.json();
    return data.map((d: any) => ({
      id: d.id,
      name: d.file_name,
      date: new Date(d.created_at).toLocaleDateString('zh-CN'),
      size: formatSize(d.file_size),
      type: mapDocType(d.file_type),
      status: d.status,
      ocr_content: d.ocr_content,
      jobId: d.job_id
    }));
  },

  uploadDocument: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/document/upload`, {
      method: 'POST',
      body: formData
    });
    const d = await res.json();
    return {
      id: d.id,
      name: d.file_name,
      date: new Date(d.created_at).toLocaleDateString('zh-CN'),
      size: formatSize(d.file_size),
      type: mapDocType(d.file_type),
      status: d.status,
      jobId: d.job_id
    };
  },

  checkOcrStatus: async (jobId: string): Promise<Document> => {
    const res = await fetch(`${API_BASE_URL}/ocr/status/${jobId}`);
    const d = await res.json();
    return {
      id: d.id,
      name: d.file_name,
      date: new Date(d.created_at).toLocaleDateString('zh-CN'),
      size: formatSize(d.file_size),
      type: mapDocType(d.file_type),
      status: d.status,
      ocr_content: d.ocr_content,
      jobId: d.job_id
    };
  },

  deleteDocument: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/document/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errData.detail || `Delete failed: ${res.status}`);
    }
    return await res.json();
  },

  triggerOCR: async (docId: string): Promise<Document> => {
    const res = await fetch(`${API_BASE_URL}/document/ocr/${docId}`, { method: 'POST' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errData.detail || `OCR failed: ${res.status}`);
    }
    const d = await res.json();
    return {
      id: d.id,
      name: d.file_name,
      date: new Date(d.created_at).toLocaleDateString('zh-CN'),
      size: formatSize(d.file_size),
      type: mapDocType(d.file_type),
      status: d.status,
      ocr_content: d.ocr_content,
      jobId: d.job_id
    };
  },

  updateDocumentContent: async (docId: string, ocr_content: string): Promise<Document> => {
    const res = await fetch(`${API_BASE_URL}/document/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocr_content })
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status}`);
    const d = await res.json();
    return {
      id: d.id,
      name: d.file_name,
      date: new Date(d.created_at).toLocaleDateString('zh-CN'),
      size: formatSize(d.file_size),
      type: mapDocType(d.file_type),
      status: d.status,
      ocr_content: d.ocr_content,
      jobId: d.job_id
    };
  },

  // Models
  getModels: async (): Promise<ModelConfig[]> => {
    const res = await fetch(`${API_BASE_URL}/model/list`);
    return await res.json();
  },

  // Chat
  sendMessage: async (request: ChatRequest): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return await res.json();
  },

  getChatHistory: async (doc_id: string | undefined, username: string, sessionId?: string): Promise<ChatMessage[]> => {
    let url = `${API_BASE_URL}/chat/list?username=${encodeURIComponent(username)}`;
    if (doc_id) {
      url += `&doc_id=${doc_id}`;
    }
    if (sessionId) {
      url += `&session_id=${encodeURIComponent(sessionId)}`;
    }
    const res = await fetch(url);
    const data = await res.json();

    // Transform backend {question, answer} to frontend Message list
    const history: ChatMessage[] = [];
    data.forEach((item: any) => {
      history.push({ id: `${item.id}-q`, role: 'user', content: item.question });
      history.push({ id: `${item.id}-a`, role: 'assistant', content: item.answer });
    });
    return history;
  },

  streamMessage: async (request: ChatRequest, signal?: AbortSignal): Promise<Response> => {
    return await fetch(`${API_BASE_URL}/chat/ask/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal
    });
  },

  // Auth
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "登录失败");
    }
    return res.json();
  },

  register: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "注册失败");
    }
    return res.json();
  },

  // Sessions Management
  listSessions: async (username: string, docId?: string): Promise<ChatSession[]> => {
    let url = `${API_BASE_URL}/chat/sessions?username=${encodeURIComponent(username)}`;
    if (docId) url += `&doc_id=${docId}`;
    const res = await fetch(url);
    return await res.json();
  },

  createSession: async (session: { title: string; username: string; doc_id?: string }): Promise<ChatSession> => {
    const res = await fetch(`${API_BASE_URL}/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
    return await res.json();
  },

  updateSession: async (sessionId: string, title: string): Promise<ChatSession> => {
    const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    return await res.json();
  },

  deleteSession: async (sessionId: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, { method: 'DELETE' });
    return await res.json();
  }
};


