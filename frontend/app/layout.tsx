import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css'; // Global styles
import { Navigation } from '@/components/navigation';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: '文档问答助手 - The Intelligent Canvas',
  description: '基于文件内容的智能问答系统',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const theme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-background text-on-surface font-body min-h-screen flex flex-col antialiased selection:bg-primary/30" suppressHydrationWarning>
        {/* Background Elements */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-background">
        </div>

        <Navigation />
        {children}
      </body>
    </html>
  );
}
