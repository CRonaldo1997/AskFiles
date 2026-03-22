# AskFiles (文档问答助手) 🚀

**AskFiles** 是一个功能强大、美观且智能的文档问答及知识库管理系统。它结合了先进的大语言模型（LLM）与增强检索生成（RAG）技术，允许用户高效地从各种格式的文档中提取信息并进行深度对话。

---

## ✨ 核心特性

- **多格式支持**: 支持 PDF、Word (.docx)、纯文本 (.txt) 以及 图像 (OCR) 的内容提取与分析。
- **智能对话助手**: 内置多种 LLM 模型支持（如 Gemini, GLM-5 等），提供精准的文档问答体验。
- **知识库管理**: 简单直观的文件上传与管理系统，支持多端同步（Supabase 驱动）。
- **实时文档预览**: 集成的 PDF 渲染器与文本预览器，在对话时即可查阅原始出处。
- **OCR 增强**: 通过 PaddleOCR 的集成，能够精准识别扫描件与图像中的文字内容。
- **极致视觉体验**: 基于 Next.js 15 和现代 UI 框架构建，支持暗黑模式、丝滑动画（Framer Motion）。

---

## 🛠️ 技术栈

### 前端 (Frontend)
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: React Hooks & Context API
- **Animations**: [Motion (Framer Motion)](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Markdown**: React Markdown + KaTeX (数学公式支持)

### 后端 (Backend)
- **Language**: Python 3.11
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Database/Auth**: [Supabase](https://supabase.com/)
- **Extraction**: `python-docx` for Word, `PaddleOCR` for Image/Scan OCR
- **Environment Management**: Conda / Pip

---

## 🚀 本地启动指南

### 前期准备
确保你已安装以下环境：
- Node.js (v18+)
- Python 3.11
- Conda (可选，推荐)

### 1. 克隆仓库
```bash
git clone https://github.com/CRonaldo1997/AskFiles.git
cd AskFiles
```

### 2. 后端启动
```bash
cd backend
# 建议创建 conda 环境
conda create -n py311 python=3.11
conda activate py311
# 安装依赖
pip install -r requirements.txt
# 配置环境变量 (参考 .env.example)
# 启动服务
python -m uvicorn app.main:app --reload --port 8000
```

### 3. 前端启动
```bash
cd frontend
# 安装依赖
npm install
# 配置环境变量
# 启动开发服务器
npm run dev
```
访问 [http://localhost:3000](http://localhost:3000) 即可开始体验。

---

## ⚙️ 环境变量配置

请在 `backend` 和 `frontend` 目录下分别创建 `.env` 文件，并填写必要的配置：

**Backend (`backend/.env`):**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PADDLE_OCR_TOKEN=your_paddle_ocr_token
```

**Frontend (`frontend/.env`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📸 界面预览

*(你可以将系统截图放置于此处)*

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源。
