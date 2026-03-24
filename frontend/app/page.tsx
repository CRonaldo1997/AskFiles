'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Settings2, Trash2, MessageSquare, Loader2, X, Cpu, FileText, Plus, Clock, Edit2, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { apiService, ModelConfig, Document, ChatSession, ChatRequest, API_BASE_URL } from '@/lib/api';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isThinking?: boolean;
};


export default function ChatPage() {
  const router = useRouter();

  // Core chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是您的智能文档助手。请先在“知识库管理”上传文档，并在下方选择文档和模型进行问答。'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Settings state - default values first
  const [systemPrompt, setSystemPrompt] = useState('你是一个专业的智能文档助手，请用专业、准确、友好的语气回答用户的问题，有如下要求：\n1-如果问题的答案在文档中存在，则尽量按原文内容来回答。\n2-如果答案不存在，直接回答：抱歉，未找到该问题的答案，请咨询相关同事。\n3-不要编造/臆想，严格按文档描述来！');
  const [tempSystemPrompt, setTempSystemPrompt] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [clearModal, setClearModal] = useState(false);
  const [username, setUsername] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const isInitialMount = useRef(true);
  const isManualLoad = useRef(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Load from localStorage on Mount safely
  useEffect(() => {
    const savedUsername = localStorage.getItem('askfiles_username');
    if (!savedUsername) {
      router.push('/login');
      return;
    }
    setUsername(savedUsername);

    const loadSessions = async (q?: string) => {
      try {
        const cloudSessions = await apiService.listSessions(savedUsername, undefined, q);
        setSessions(cloudSessions);
      } catch (err) {
        console.error("Failed to load sessions from cloud", err);
      }
    };
    loadSessions();


    const savedPrompt = localStorage.getItem('askfiles_system_prompt');
    const savedModel = localStorage.getItem('askfiles_model_id');
    const savedDoc = localStorage.getItem('askfiles_doc_id');

    if (savedPrompt) {
      setSystemPrompt(savedPrompt);
      setTempSystemPrompt(savedPrompt);
    } else {
      setTempSystemPrompt(systemPrompt);
    }
    if (savedModel) setSelectedModelId(savedModel);
    if (savedDoc) setSelectedDocId(savedDoc);
  }, []);

  const [models, setModels] = useState<ModelConfig[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const init = async () => {
    try {
      const [modelList, docList] = await Promise.all([
        apiService.getModels(),
        apiService.getDocuments()
      ]);
      setModels(modelList);

      const savedModel = localStorage.getItem('askfiles_model_id');
      if (!savedModel && modelList.length > 0) setSelectedModelId(modelList[0].id);

      // Include files that are ready (done) or being processed (uploaded/running)
      const visibleDocs = docList.filter(d => ['done', 'uploaded', 'running'].includes(d.status));
      setDocuments(visibleDocs);

      const savedDoc = localStorage.getItem('askfiles_doc_id');
      // Only set default if nothing was saved
      // Only set default if nothing was saved
      if (!savedDoc && visibleDocs.length > 0) setSelectedDocId(visibleDocs[0].id);

      // Load System Prompt from Backend (Survives Restarts)
      const promptRes = await fetch(`${API_BASE_URL}/api/settings/system_prompt`).then(r => r.json()).catch(() => ({}));
      if (promptRes.value) {
        setSystemPrompt(promptRes.value);
        setTempSystemPrompt(promptRes.value);
        localStorage.setItem('askfiles_system_prompt', promptRes.value);
      }
    } catch (err) {
      console.error("Failed to load configs", err);
    }
  };

  useEffect(() => {
    init();
  }, []);

  // Fetch chat history when document changes
  useEffect(() => {
    const loadHistory = async () => {
      // Don't load if user isn't authenticated yet
      if (!username) return;

      try {
        if (!isInitialMount.current && !isManualLoad.current) {
          // Skip loading if this trigger was from handleSend (automatic session ID update)
          return;
        }

        const history = await apiService.getChatHistory(selectedDocId || undefined, username, currentSessionId || undefined);
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: '您好！我是您的智能文档助手。请先在“知识库管理”上传文档，并在下方选择文档和模型进行问答。'
        };

        if (history.length > 0) {
          setMessages(history);
        } else {
          setMessages([welcomeMessage]);
        }
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        isInitialMount.current = false;
        isManualLoad.current = false;
      }
    };
    loadHistory();
    if (selectedDocId) localStorage.setItem('askfiles_doc_id', selectedDocId);
    else localStorage.removeItem('askfiles_doc_id');
  }, [selectedDocId, username, currentSessionId]);

  // Persist model selection
  useEffect(() => {
    if (selectedModelId) localStorage.setItem('askfiles_model_id', selectedModelId);
  }, [selectedModelId]);

  // Load sessions when search query changes (debounced)
  useEffect(() => {
    if (!username) return;
    const timer = setTimeout(async () => {
      try {
        const cloudSessions = await apiService.listSessions(username, undefined, sessionSearchQuery || undefined);
        setSessions(cloudSessions);
      } catch (err) {
        console.error("Failed to filter sessions", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [sessionSearchQuery, username]);

  const handleNewChat = () => {
    // 为新对话生成一个唯一的临时 ID，以确保不会加载旧的、无 Session ID 的历史记录
    isManualLoad.current = true;
    setCurrentSessionId(`new-${Date.now()}`);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '新的一轮对话已开始。请在下方输入问题，或选择相关的历史对话。'
    }]);
  };

  const handleLoadSession = (s: ChatSession) => {
    isManualLoad.current = true;
    if (s.doc_id) setSelectedDocId(s.doc_id);
    else setSelectedDocId('');
    setCurrentSessionId(s.id);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await apiService.deleteSession(sessionToDelete);
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
      if (currentSessionId === sessionToDelete) {
        handleNewChat();
      }
      setSessionToDelete(null);
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
      setSessionToDelete(null);
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await apiService.updateSession(sessionId, newTitle);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
      setEditingSessionId(null);
    } catch (err: any) {
      alert(`重命名失败: ${err.message}`);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };


  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!selectedModelId) {
      alert("请先配置并选择一个模型");
      return;
    }

    const userMessage = input.trim();
    setInput('');

    // Use unique IDs to avoid key collisions
    const userMsgId = `${Date.now()}-user-${Math.random().toString(36).substring(2, 9)}`;
    const thinkingId = `${Date.now()}-bot-${Math.random().toString(36).substring(2, 9)}`;

    let activeSessionId = currentSessionId;
    const isActuallyNew = !sessions.some(s => s.id === activeSessionId);

    if (!activeSessionId || isActuallyNew || activeSessionId.startsWith('new-')) {
      try {
        const newSessionObj = await apiService.createSession({
          title: userMessage.length > 20 ? userMessage.substring(0, 20) + '...' : userMessage,
          username: username,
          doc_id: selectedDocId || undefined
        });
        activeSessionId = newSessionObj.id;
        setCurrentSessionId(activeSessionId);
        setSessions(prev => [newSessionObj, ...prev]);
      } catch (err) {
        console.error("Failed to create cloud session", err);
        // Fallback to local timestamp-based ID if cloud fails for some reason
        if (!activeSessionId || activeSessionId.startsWith('new-')) {
          activeSessionId = `${Date.now()}`;
          setCurrentSessionId(activeSessionId);
        }
      }
    } else {
      // Session exists, updating timestamp is handled by backend automatically
      // We can periodically refresh session list to stay in sync
    }


    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: userMessage },
      { id: thinkingId, role: 'assistant', content: '', isThinking: true }
    ]);
    setIsLoading(true);

    try {
      const chatReq: ChatRequest = {
        question: userMessage,
        doc_id: selectedDocId || undefined,
        session_id: activeSessionId,
        username: username,
        model_id: selectedModelId,
        system_prompt: systemPrompt || undefined
      };

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await apiService.streamMessage(chatReq, controller.signal);

      if (!response.body) throw new Error("No response body");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法创建读取器");

      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');

        // The last line might be an incomplete SSE message, keep it in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                setMessages(prev => prev.map(m =>
                  m.id === thinkingId ? { ...m, isThinking: false, content: accumulatedContent } : m
                ));
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              console.warn("解析数据块失败:", e, data);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Generation stopped by user");
        return;
      }
      console.error("Chat error:", err);
      setMessages(prev => prev.map(m =>
        m.id === thinkingId ? { ...m, isThinking: false, content: `错误: ${err.message}` } : m
      ));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    setClearModal(true);
  };

  const confirmClear = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/chat/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: selectedDocId || null, username: username, session_id: currentSessionId || undefined })
      });

      if (currentSessionId && !currentSessionId.startsWith('new-')) {
        await apiService.deleteSession(currentSessionId);
        setSessions(prev => prev.filter(s => s.id !== currentSessionId));
      }


      setMessages([{
        id: `clear-${Date.now()}`,
        role: 'assistant',
        content: '记录已清空。您可以继续开始新的对话。'
      }]);
      // Use a new temporary ID so we don't accidentally load legacy history without session IDs
      setCurrentSessionId(`new-${Date.now()}`);
      setClearModal(false);
    } catch (err: any) {
      alert(`清空失败: ${err.message}`);
    }
  };

  const saveSystemPrompt = async () => {
    try {
      setSystemPrompt(tempSystemPrompt);
      localStorage.setItem('askfiles_system_prompt', tempSystemPrompt);

      // Save to Backend for persistence across restarts
      await fetch(`${API_BASE_URL}/api/settings/system_prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: tempSystemPrompt })
      });

      setIsPromptModalOpen(false);
    } catch (err) {
      console.error("Failed to save prompt", err);
      // Still close modal since we saved to localStorage
      setIsPromptModalOpen(false);
    }
  };

  return (
    <main className="pt-24 min-h-screen flex flex-col relative overflow-hidden h-screen bg-surface">
      <div className="flex-1 px-8 pb-8 flex flex-row gap-6 overflow-hidden relative z-10 w-full">

        {/* Pane 1: Left Sidebar (Documents + History) */}
        <aside className="w-[18%] flex flex-col gap-4 shrink-0 overflow-hidden">
          {/* Documents List */}
          <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-xl border border-white/5 bg-surface max-h-[50%]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <FileText className="w-3 h-3" /> 知识库
              </h2>
              <div className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] rounded-full font-bold">{documents.length}</div>
            </div>
            <div className="p-3 border-b border-white/5">
              <div className="relative group">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 transition-colors ${docSearchQuery ? 'text-primary' : 'text-on-surface-variant/40'}`} />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/20 border border-white/10 rounded-xl text-[10px] outline-none placeholder:text-on-surface-variant/30 focus:border-primary/50 transition-all font-medium"
                  placeholder="搜索文档名称/内容..."
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {(() => {
                const filteredDocs = documents.filter(doc =>
                  doc.name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                  (doc.ocr_content && doc.ocr_content.toLowerCase().includes(docSearchQuery.toLowerCase()))
                );

                if (filteredDocs.length === 0) {
                  return <div className="text-center py-10 text-[10px] text-on-surface-variant/40 italic">
                    {docSearchQuery ? '未找到相关文档' : '暂无文档'}
                  </div>;
                }

                return filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      isManualLoad.current = true;
                      setSelectedDocId(doc.id);
                      setCurrentSessionId('');
                    }}
                    className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${doc.id === selectedDocId ? 'bg-primary/20 border-primary/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${doc.id === selectedDocId ? 'bg-primary text-white' : 'bg-black/20 text-on-surface-variant'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">{doc.name}</p>
                      <p className={`text-[9px] capitalize ${doc.status === 'done' ? 'text-on-surface-variant/60' : 'text-primary'}`}>
                        {doc.status === 'done' ? doc.type : (doc.status === 'uploaded' ? '待OCR' : '正在解析')}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* 醒目的新建对话按钮 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNewChat}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary flex items-center justify-center gap-3 text-white font-bold text-sm shadow-[0_8px_20px_rgba(var(--primary),0.3)] hover:shadow-[0_12px_25px_rgba(var(--primary),0.5)] transition-all border border-primary/20 group relative overflow-hidden shrink-0"
          >
            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span className="tracking-wide">开启全新问答</span>
          </motion.button>

          {/* History Conversations List */}
          <div className="flex-[1.5] glass-panel rounded-2xl flex flex-col overflow-hidden shadow-xl border border-white/5 bg-surface">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 relative group">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <Clock className="w-3 h-3" /> 历史对话
              </h2>
              <div className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] rounded-full font-bold">{sessions.length}</div>
            </div>
            <div className="p-3 border-b border-white/5">
              <div className="relative group">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 transition-colors ${sessionSearchQuery ? 'text-primary' : 'text-on-surface-variant/40'}`} />
                <input
                  type="text"
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-black/20 border border-white/10 rounded-xl text-[10px] outline-none placeholder:text-on-surface-variant/30 focus:border-primary/50 transition-all font-medium"
                  placeholder="搜索对话题目/内容..."
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {sessions.length === 0 ? (
                <div className="text-center py-10 text-[10px] text-on-surface-variant/40 italic">暂无历史问答</div>
              ) : sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleLoadSession(s)}
                  className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all relative overflow-hidden ${s.id === currentSessionId ? 'bg-primary/20 border-primary/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-lg ${s.id === currentSessionId ? 'bg-primary text-white' : 'bg-black/20 text-on-surface-variant'}`}>
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingSessionId === s.id ? (
                      <input
                        autoFocus
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={() => handleRenameSession(s.id, tempTitle)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSession(s.id, tempTitle);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-on-surface/5 border border-primary/50 rounded px-1.5 py-0.5 text-[11px] font-bold outline-none text-on-surface shadow-[0_0_10px_rgba(var(--primary),0.2)]"
                      />
                    ) : (
                      <>
                        <p className="text-[11px] font-bold truncate">{s.title}</p>
                        <p className="text-[9px] text-on-surface-variant/60 capitalize">{new Date(s.updated_at).toLocaleDateString()}</p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSessionId(s.id);
                        setTempTitle(s.title);
                      }}
                      className="p-1.5 hover:bg-primary/20 hover:text-primary rounded-lg transition-all text-on-surface-variant/40"
                      title="重命名对话"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSessionToDelete(s.id); }}
                      className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all text-on-surface-variant/40"
                      title="删除对话"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {s.id === currentSessionId && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Pane 2: Document Preview (Middle) */}
        <section className="w-[38%] glass-panel rounded-2xl flex flex-col overflow-hidden shadow-xl bg-black/20 border border-white/5">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-black/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">原文档预览</span>
          </div>
          <div className="flex-1 bg-black/40 relative">
            {selectedDocId ? (
              (() => {
                const doc = documents.find(d => d.id === selectedDocId);
                if (!doc) return null;

                if (doc.type === 'pdf' || doc.type === 'txt') {
                  return (
                    <iframe
                      src={`${API_BASE_URL}/api/document/file/${selectedDocId}`}
                      className="absolute inset-0 w-full h-full border-none bg-white"
                      title="Document Preview"
                    />
                  );
                } else if (doc.type === 'image') {
                  return (
                    <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/20 overflow-auto">
                      <img
                        src={`${API_BASE_URL}/api/document/file/${selectedDocId}`}
                        alt="Document Preview"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                      />
                    </div>
                  );
                } else {
                  return (
                    <div className="absolute inset-0 p-6 overflow-y-auto custom-scrollbar">
                      <div className="prose prose-sm max-w-none">
                        <pre className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono text-on-surface-variant/80">
                          {doc.ocr_content || '文档内容正在加载中或为空...'}
                        </pre>
                      </div>
                    </div>
                  );
                }
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-10 text-on-surface-variant/40 italic text-sm">
                <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
                <span>请先从左侧选择一个文档</span>
              </div>
            )}
          </div>
        </section>

        {/* Pane 3: Chat Interaction (Right) */}
        <section className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-2xl relative border border-white/10">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-bold">智能对话</h3>
                <p className="text-[10px] text-on-surface-variant/70">
                  {models.find(m => m.id === selectedModelId)?.name || '未选择模型'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsPromptModalOpen(true)} className="p-2 hover:bg-white/10 rounded-lg text-on-surface-variant transition-colors" title="提示词配置">
                <Settings2 className="w-4 h-4" />
              </button>
              <button onClick={clearHistory} className="p-2 hover:bg-white/10 rounded-lg text-on-surface-variant transition-colors" title="清空对话">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end ml-auto' : 'items-start'}`}
                >
                  <div className={`
                    ${msg.role === 'user'
                      ? 'px-5 py-3 rounded-3xl bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)]'
                      : 'py-2 bg-transparent text-on-surface'
                    } text-sm 
                  `}>
                    {msg.isThinking ? (
                      <div className="flex items-center gap-2 animate-pulse text-xs italic opacity-70">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>正在处理中...</span>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {msg.content.replace(/\|\|\|/g, '\n')}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="p-4 bg-white/5 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-on-surface-variant outline-none focus:border-primary/50 transition-colors"
              >
                <option value="" disabled>选择模型</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="relative group bg-white/5 rounded-xl border border-white/10 p-1.5 focus-within:border-primary/50 transition-all shadow-inner">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none focus:ring-0 text-on-surface text-sm resize-none py-2 px-3 outline-none min-h-[44px] custom-scrollbar"
                placeholder="提问或描述您想了解的内容..."
                rows={1}
              />
              <div className="flex justify-end p-1">
                {isLoading ? (
                  <button
                    onClick={handleStopGeneration}
                    className="bg-error hover:bg-error/90 text-white p-2 rounded-lg transition-all shadow-lg animate-pulse"
                    title="停止生成"
                  >
                    <div className="w-4 h-4 bg-current rounded-sm shadow-[0_0_8px_rgba(255,255,255,0.5)]"></div>
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || !selectedModelId}
                    className="bg-primary hover:bg-primary/90 text-on-primary p-2 rounded-lg transition-all shadow-lg disabled:opacity-30 disabled:grayscale"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Modals Stay Fixed at Shell Level */}
      <AnimatePresence>
        {isPromptModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-on-surface/20 dark:bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 rounded-2xl w-full max-w-lg border border-outline-variant shadow-2xl bg-surface relative">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary">
                <Settings2 className="w-5 h-5" />
                系统提示词配置
              </h2>
              <p className="text-xs text-on-surface-variant/70 mb-4">设置助手的背景设定和回复风格，影响所有后续对话。</p>
              <textarea
                value={tempSystemPrompt}
                onChange={(e) => setTempSystemPrompt(e.target.value)}
                className="w-full h-40 bg-surface-dim border border-outline-variant rounded-xl p-4 text-sm text-on-surface outline-none mb-6 focus:border-primary/50 transition-all custom-scrollbar"
                placeholder="例如：你是一个严谨的学术助手..."
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsPromptModalOpen(false)} className="px-5 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors">取消</button>
                <button onClick={saveSystemPrompt} className="px-8 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">保存配置</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {clearModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-on-surface/20 dark:bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 bg-surface border border-outline-variant relative">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error mb-4 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">清空对话记录？</h3>
              <p className="text-sm text-on-surface-variant text-center mb-6">确定要清空{selectedDocId ? '当前文档关联的' : '全部'}对话记录吗？此操作不可撤销。</p>
              <div className="flex gap-3">
                <button onClick={() => setClearModal(false)} className="flex-1 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-dim text-sm font-semibold transition-all text-on-surface">取消</button>
                <button onClick={confirmClear} className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-semibold hover:bg-opacity-90 transition-all shadow-lg shadow-error/20">确定清空</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-on-surface/20 dark:bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm rounded-2xl shadow-2xl p-6 bg-surface border border-outline-variant relative"
            >
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error mb-4 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">删除这段对话？</h3>
              <p className="text-sm text-on-surface-variant text-center mb-6">确定要删除这段对话内容吗？此操作不可撤销。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-dim text-sm font-semibold transition-all text-on-surface"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-semibold hover:bg-opacity-90 transition-all shadow-lg shadow-error/20"
                >
                  确定删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

