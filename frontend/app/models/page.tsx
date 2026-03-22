'use client';

import { useState, useEffect } from 'react';
import { Cpu, Plus, Edit2, Trash2, Key, Loader2, ShieldCheck, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiService, ModelConfig } from '@/lib/api';

export default function ModelsPage() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Partial<ModelConfig> | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', api_key: '' });
  const [isTesting, setIsTesting] = useState<string | null>(null); // null, 'modal', or modelId
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error', message: string } | null>(null);

  const fetchModels = async () => {
    try {
      const data = await apiService.getModels();
      setModels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleTestConnection = async (modelId?: string) => {
    setIsTesting(modelId || 'modal');
    setTestResult(null);
    try {
      let res;
      if (modelId) {
        // Test existing
        res = await fetch(`http://localhost:8000/api/model/test/${modelId}`, { method: 'POST' });
      } else {
        // Test current form
        if (!formData.name || !formData.url || (!formData.api_key && !editingModel)) {
          throw new Error("请先填写完整配置（包括 API Key）以便测试");
        }
        res = await fetch('http://localhost:8000/api/model/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      const data = await res.json();
      setTestResult(data);
      if (data.status === 'success') {
        // Optionally clear success message after some time if it's on the card
        if (modelId) setTimeout(() => setIsTesting(null), 3000);
      }
    } catch (err: any) {
      setTestResult({ status: 'error', message: err.message || "测试请求失败" });
    } finally {
      // For card tests, keep the result visible for a bit before clearing isTesting
      // For modal tests, reset immediately
      if (!modelId) setIsTesting(null);
      else setTimeout(() => setIsTesting(null), 3000);
    }
  };

  const handleOpenModal = (model?: ModelConfig) => {
    setTestResult(null);
    if (model) {
      setEditingModel(model);
      setFormData({ name: model.name, url: model.url, api_key: '' });
    } else {
      setEditingModel(null);
      setFormData({ name: '', url: '', api_key: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingModel) {
        // Update
        const res = await fetch(`http://localhost:8000/api/model/${editingModel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        // Create
        const res = await fetch('http://localhost:8000/api/model/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error("Create failed");
      }
      setIsModalOpen(false);
      fetchModels();
    } catch (err) {
      alert("保存失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("确定删除吗？")) {
      await fetch(`http://localhost:8000/api/model/${id}`, { method: 'DELETE' });
      fetchModels();
    }
  };

  return (
    <main className="pt-24 pb-20 px-8 max-w-7xl mx-auto w-full relative z-10 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold mb-2">模型配置</h1>
          <p className="text-on-surface-variant/70 text-lg text-secondary">管理您的 LLM 服务端点和 API 密钥。</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>新建模型</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <span className="font-medium">配置加载中...</span>
          </div>
        ) : models.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-on-surface-variant/40 italic">
            暂无模型配置，请点击右上方按钮添加。
          </div>
        ) : models.map((model) => (
          <motion.div
            key={model.id}
            layout
            className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col group"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate text-lg text-on-surface">{model.name}</h3>
                <p className="text-xs text-on-surface-variant/60 truncate font-mono">{model.url}</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-between p-3 bg-on-surface/5 rounded-xl border border-on-surface/10">
                <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <Key className="w-3.5 h-3.5" />
                  <span>API Key</span>
                </div>
                <span className="text-xs font-mono text-on-surface-variant">{model.api_key_masked}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-auto">
              <button
                onClick={() => handleOpenModal(model)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-on-surface/5 hover:bg-on-surface/10 border border-on-surface/10 rounded-xl text-xs font-bold transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>编辑</span>
              </button>
              <button
                onClick={() => handleTestConnection(model.id)}
                disabled={isTesting === model.id}
                title="测试连通性"
                className={`flex items-center justify-center p-2.5 rounded-xl border transition-all ${isTesting === model.id
                  ? 'bg-primary/5 border-primary/20 text-primary'
                  : 'bg-on-surface/5 border-on-surface/10 text-on-surface-variant hover:text-primary hover:border-primary/30 hover:bg-primary/5'
                  }`}
              >
                {isTesting === model.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDelete(model.id)}
                className="p-2.5 bg-error/5 border border-error/20 text-error/60 hover:text-error hover:bg-error/10 hover:border-error/40 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {isTesting === model.id && testResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-2 rounded-lg text-[10px] flex items-center gap-2 border ${testResult.status === 'success'
                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                  : 'bg-error/10 text-error border-error/20'
                  }`}
              >
                {testResult.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span className="truncate">{testResult.message}</span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface p-8 rounded-3xl w-full max-w-md shadow-2xl relative border border-outline-variant"
            >
              <h2 className="text-2xl font-bold mb-6 text-on-surface">
                {editingModel ? '编辑模型配置' : '添加新模型'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">模型名称</label>
                    <input
                      required
                      placeholder="例如: GPT-4o, Gemini Pro"
                      className="w-full bg-on-surface/5 border border-on-surface/10 rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">接口地址 (Endpoint URL)</label>
                    <input
                      required
                      placeholder="https://api.openai.com/v1"
                      className="w-full bg-on-surface/5 border border-on-surface/10 rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">
                      API 密钥 {editingModel && <span className="text-[10px] text-primary normal-case font-normal ml-2">(留空则保持不变)</span>}
                    </label>
                    <input
                      type="password"
                      placeholder="sk-••••••••••••••••"
                      className="w-full bg-on-surface/5 border border-on-surface/10 rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    />
                  </div>
                </div>

                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${testResult.status === 'success'
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : 'bg-error/10 text-error border-error/20'
                      }`}
                  >
                    {testResult.status === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                    <span className="font-medium leading-relaxed">{testResult.message}</span>
                  </motion.div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleTestConnection(editingModel?.id)}
                      disabled={isTesting !== null}
                      className="flex-1 px-4 py-3 bg-on-surface/5 hover:bg-on-surface/10 text-on-surface font-bold rounded-xl border border-on-surface/10 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isTesting !== null ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Activity className="w-5 h-5" />
                      )}
                      <span>测试连通性</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-[1.5] px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold shadow-[0_4px_20px_rgba(var(--primary),0.3)] transition-all active:scale-95"
                    >
                      保存配置
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-3 rounded-xl font-medium text-on-surface-variant hover:bg-on-surface/5 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[120px]"></div>
      </div>
    </main>
  );
}
