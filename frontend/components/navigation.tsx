'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserCircle, Hexagon } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('askfiles_username');
    setUsername(saved);
  }, [pathname]);

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const navItems = [
    { name: '问答交互', path: '/' },
    { name: '知识库管理', path: '/knowledge' },
    { name: '模型配置', path: '/models' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 w-full z-50 glass-nav shadow-[0_4px_30px_rgba(0,0,0,0.1)] h-16 backdrop-blur-xl bg-background/60"
    >
      <div className="flex items-center justify-between px-8 h-full max-w-7xl mx-auto">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center w-8 h-8">
              <Hexagon className="absolute w-8 h-8 text-primary/40 group-hover:text-primary transition-colors duration-500" />
              <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-pulse"></div>
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-on-surface to-on-surface/60 bg-clip-text text-transparent font-headline">
              文档问答助手
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 font-headline text-sm font-medium tracking-tight">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="relative px-4 py-2 rounded-lg transition-colors group"
                >
                  <span className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                    }`}>
                    {item.name}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-lg shadow-[0_0_15px_rgba(var(--primary),0.15)]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 bg-on-surface/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="p-2 hover:bg-on-surface/10 rounded-full transition-all active:scale-95 text-on-surface-variant hover:text-on-surface group relative"
            title={username ? `当前登录: ${username}` : '未登录'}
          >
            <UserCircle className="w-6 h-6" />
            <div className="absolute inset-0 rounded-full border border-on-surface/0 group-hover:border-on-surface/20 transition-colors duration-300"></div>
          </Link>

        </div>
      </div>
    </motion.nav>
  );
}
