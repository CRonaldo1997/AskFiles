'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Upload, FileText, FileSpreadsheet, FileIcon, Copy, Save, Trash2, Loader2, Eye, FileImage, ScanLine } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { apiService, Document } from '@/lib/api';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, docId: string | null, docName: string | null }>({
    isOpen: false,
    docId: null,
    docName: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const docs = await apiService.getDocuments();
      setDocuments(docs);
      return docs;
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedUsername = localStorage.getItem('askfiles_username');
    if (!savedUsername) {
      router.push('/login');
      return;
    }

    fetchDocs().then(docs => {
      if (docs && docs.length > 0) {
        setActiveDocId(docs[0].id);
        setMarkdownContent(docs[0].ocr_content || '');
      }
    });
  }, []);

  // Polling for running documents
  useEffect(() => {
    const timer = setInterval(async () => {
      // Find docs that are still running
      const runningDocs = documents.filter(d => d.status === 'running' && d.jobId);

      if (runningDocs.length > 0) {
        console.log('Polling status for:', runningDocs.map(d => d.jobId));
        // Check status for each running job
        await Promise.all(runningDocs.map(doc => apiService.checkOcrStatus(doc.jobId!)));

        // Refresh the list after updates
        const updatedDocs = await fetchDocs();

        // Update active doc if needed
        if (updatedDocs && activeDocId) {
          const currentDoc = updatedDocs.find(d => d.id === activeDocId);
          if (currentDoc) setMarkdownContent(currentDoc.ocr_content || '');
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [documents, activeDocId]);

  const handleDocClick = (doc: Document) => {
    setActiveDocId(doc.id);
    setMarkdownContent(doc.ocr_content || '');
  };

  const onUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await apiService.uploadDocument(file);
      await fetchDocs();
    } catch (err: any) {
      alert(`上传失败: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteModal({
      isOpen: true,
      docId: doc.id,
      docName: doc.name
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.docId) return;

    try {
      await apiService.deleteDocument(deleteModal.docId);
      await fetchDocs();
      if (activeDocId === deleteModal.docId) {
        setActiveDocId(null);
        setMarkdownContent('');
      }
      setDeleteModal({ isOpen: false, docId: null, docName: null });
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDoc = documents.find(d => d.id === activeDocId);

  // Check if OCR button should be shown
  const needsOcr = activeDoc && (activeDoc.type === 'pdf' || activeDoc.type === 'image') &&
    (activeDoc.status === 'uploaded' || activeDoc.status === 'failed');
  const isOcrInProgress = activeDoc && activeDoc.status === 'running';

  const handleTriggerOCR = async () => {
    if (!activeDocId) return;
    setIsOcrRunning(true);
    try {
      await apiService.triggerOCR(activeDocId);
      await fetchDocs();
    } catch (err: any) {
      alert(`OCR失败: ${err.message}`);
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleSave = async () => {
    if (!activeDocId) return;
    setIsSaving(true);
    try {
      await apiService.updateDocumentContent(activeDocId, markdownContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      await fetchDocs();
    } catch (err: any) {
      alert(`保存失败: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    // Optional: show a toast or change icon briefly
  };

  return (
    <main className="pt-24 min-h-screen flex flex-col relative overflow-hidden">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {/* Sub-Header */}
      <section className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex-1 max-w-2xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 glass-panel border border-white/10 rounded-xl text-sm"
            placeholder="搜索知识库..."
          />
        </div>
        <button
          onClick={onUploadClick}
          disabled={isUploading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary font-semibold rounded-xl shadow-lg disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span>{isUploading ? '正在上传...' : '上传文档'}</span>
        </button>
      </section>

      {/* Main Content */}
      <div className="flex-1 px-8 pb-8 flex flex-col lg:flex-row gap-6 overflow-hidden h-[calc(100vh-140px)] relative z-10">

        {/* Pane 1: Document List */}
        <aside className="w-full lg:w-[22%] glass-panel rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">知识库</h2>
            <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded-full font-bold">{documents.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>
            ) : filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleDocClick(doc)}
                className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer border transition-all ${doc.id === activeDocId ? 'bg-primary/20 border-primary/50' : 'bg-white/5 border-transparent'
                  }`}
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/20 text-primary">
                  {doc.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{doc.name}</p>
                  <p className="text-[10px] text-on-surface-variant/70">
                    {doc.status === 'done' ? '就绪' : doc.status === 'running' ? '解析中' : doc.status === 'pending' ? '等待中' : doc.status === 'uploaded' ? '待OCR' : '失败'}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(doc, e)}
                  className="p-1.5 rounded-md opacity-40 hover:opacity-100 hover:bg-error/10 hover:text-error transition-all"
                  title="删除文档"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Pane 2: Preview */}
        <section className="hidden lg:flex flex-1 glass-panel rounded-2xl flex-row overflow-hidden shadow-xl bg-black/20">

          {/* File Preview */}
          <div className="flex-1 flex flex-col border-r border-white/10 relative">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/10">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">原文档预览</span>
              {needsOcr && (
                <button
                  onClick={handleTriggerOCR}
                  disabled={isOcrRunning}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {isOcrRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                  <span>{isOcrRunning ? 'OCR识别中...' : '开始OCR识别'}</span>
                </button>
              )}
              {isOcrInProgress && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-lg">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>OCR识别中...</span>
                </span>
              )}
            </div>
            <div className="flex-1 bg-black/40 relative">
              {activeDoc ? (
                activeDoc.type === 'pdf' ? (
                  <iframe
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/document/file/${activeDoc.id}`}
                    className="absolute inset-0 w-full h-full border-none"
                    title="Document Preview"
                  />
                ) : (activeDoc.type === 'txt' || activeDoc.type === 'docx') ? (
                  <div className="absolute inset-0 p-6 overflow-y-auto">
                    <pre className="text-on-surface font-mono text-sm leading-relaxed whitespace-pre-wrap">{markdownContent || '暂无内容'}</pre>
                  </div>
                ) : (
                  <iframe
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/document/file/${activeDoc.id}`}
                    className="absolute inset-0 w-full h-full border-none"
                    title="Document Preview"
                  />
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-10 text-on-surface-variant/40 italic">
                  <Eye className="w-12 h-12 mb-4 opacity-20" />
                  <span>选择一个文档进行预览</span>
                </div>
              )}
            </div>
          </div>

          {/* OCR Content */}
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/10">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">文档内容</span>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !activeDocId}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${saveSuccess ? 'bg-green-500/20 text-green-400' : 'bg-white/5 hover:bg-white/10 text-on-surface'
                    }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : saveSuccess ? (
                    <Save className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span>{isSaving ? '正在保存...' : saveSuccess ? '已保存' : '保存修改'}</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-on-surface-variant"
                  title="复制内容"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {activeDoc ? (
                <textarea
                  className="w-full h-full bg-transparent border-none text-on-surface font-mono text-sm leading-relaxed outline-none resize-none"
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                />
              ) : (
                <div className="h-full flex items-center justify-center italic text-on-surface-variant/40">暂无内容</div>
              )}
            </div>
          </div>
        </section>
      </div>
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl p-6 bg-[#1a1c1e] border border-white/10">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">确认删除？</h3>
            <p className="text-sm text-on-surface-variant text-center mb-6">
              您确定要删除 <span className="text-on-surface font-semibold">"{deleteModal.docName}"</span> 吗？此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, docId: null, docName: null })}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 font-semibold transition-all"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-error text-white font-semibold hover:bg-opacity-90 transition-all shadow-lg shadow-error/20"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
