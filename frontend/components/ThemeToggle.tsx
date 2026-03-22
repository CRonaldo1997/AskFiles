'use client';

import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Also toggle Tailwind 'dark' class for compatibility with built-in dark: variants if any
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2.5 hover:bg-white/10 dark:hover:bg-white/5 rounded-xl transition-all active:scale-90 text-on-surface-variant hover:text-primary group relative overflow-hidden"
            aria-label="Toggle Theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={theme}
                    initial={{ y: 20, opacity: 0, rotate: 45 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: -20, opacity: 0, rotate: -45 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {theme === 'dark' ? (
                        <Moon className="w-5 h-5 transition-transform group-hover:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    ) : (
                        <Sun className="w-5 h-5 transition-transform group-hover:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    )}
                </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 rounded-xl border border-white/0 group-hover:border-primary/20 transition-colors duration-300"></div>
        </button>
    );
}
