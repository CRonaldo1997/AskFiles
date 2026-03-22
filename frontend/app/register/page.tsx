'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hexagon, Loader2, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { apiService } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      await apiService.register(formData.username, formData.password);
      router.push('/login');
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Decorative top border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

          <div className="flex flex-col items-center mb-8">
            <div className="relative flex items-center justify-center w-12 h-12 mb-4">
              <Hexagon className="absolute w-12 h-12 text-primary/40" />
              <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-pulse"></div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface font-headline text-center">
              中再寿险文档问答助手
            </h1>
            <p className="text-sm text-primary/80 mt-2 font-medium tracking-wide">
              基于LLM的AI问答Agent
            </p>
            <div className="mt-6 w-full flex items-center gap-4">
              <div className="h-px bg-on-surface/10 flex-1"></div>
              <span className="text-xs text-on-surface-variant tracking-wider">注册账号</span>
              <div className="h-px bg-on-surface/10 flex-1"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface" htmlFor="username">
                用户名
              </label>
              <input
                id="username"
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-surface-dim border border-outline-variant text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                placeholder="请输入您的用户名"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface" htmlFor="password">
                密码
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-surface-dim border border-outline-variant text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                placeholder="请输入密码"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface" htmlFor="confirmPassword">
                确认密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-surface-dim border border-outline-variant text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                placeholder="请再次输入密码"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-400 text-sm font-medium text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> 注册
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-on-surface-variant">
            已有账号？{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              直接登录
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
