-- 1. 创建模型表 (models)
CREATE TABLE IF NOT EXISTS public.models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建文档表 (documents)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    ocr_content TEXT,
    status TEXT DEFAULT 'pending', -- pending, running, done, failed
    job_id TEXT,                   -- PaddleOCR的jobId
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 创建对话历史表 (chats)
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    prompt TEXT,
    doc_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 开启行级安全 (RLS) 用于保护数据 (如果需要，可暂时关闭或设置公共允许)
-- 简单起见，这里设置所有的表为 public 可读写（你可以根据需求收紧权限）
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.models FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.models FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.models FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.models FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.chats FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.chats FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.chats FOR DELETE USING (true);
