# Supabase 配置

要启用网页浏览量记录功能，需要在项目根目录创建 `.env.local` 文件：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 获取 Supabase 凭证

1. 访问 https://supabase.com，创建账户
2. 创建新项目
3. 进入项目设置，复制：
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Key** → `VITE_SUPABASE_ANON_KEY`

## 数据库表结构

在 Supabase SQL 编辑器中执行以下 SQL 创建表：

```sql
CREATE TABLE page_views (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  page_name TEXT NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_page_views_page_name ON page_views(page_name);
CREATE INDEX idx_page_views_visited_at ON page_views(visited_at);

-- 设置行级安全策略（允许匿名插入和查询）
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for all users" ON page_views
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow select for all users" ON page_views
  FOR SELECT
  USING (true);
```

## 查看数据

在 Supabase 控制台 → Tables → page_views 中可以看到所有的浏览记录。

## 本地开发

1. 创建 `.env.local` 文件
2. 添加 Supabase 凭证
3. 运行 `npm run dev`
4. 页面浏览时会自动记录到 Supabase
