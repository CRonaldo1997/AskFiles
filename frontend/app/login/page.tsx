'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hexagon, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { apiService } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiService.login(formData.username, formData.password);
      localStorage.setItem('askfiles_username', formData.username);
      router.push('/');
    } catch (err: any) {
      alert(err.message || '登录失败，请检查用户名或密码');
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
              <span className="text-xs text-on-surface-variant tracking-wider">账号登录</span>
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  登录 <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant">
            还没有账号？{' '}
            <Link href="/register" className="text-primary hover:text-primary-dim font-medium transition-colors">
              立即注册
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
