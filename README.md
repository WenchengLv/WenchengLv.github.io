# 📅 开发日志

- 2026-03-18：完成域名申请，网站正式上线。
- 2026-03-19：新增年终奖两种计算方式对比功能，优化个税计算器。
- 2026-03-20：
  1. 实现邮箱登录界面，支持账户安全管理。
  2. 丰富专项扣除、专项附加扣除及其他扣除细节，提升个税计算准确性。
  3. 增加养老账户、医疗账户、住房公积金、个人养老金累计功能，支持多项账户管理。

# 🏠 个人财务工具箱

一个基于 Vite + React 18 + TypeScript 的个人财务网站，包含个税计算器和理财指南两个功能模块。

## ✨ 功能

- **💼 个税计算器**：根据 2025 年中国税法，快速计算个人所得税和税后收入
- **📚 理财指南**：完整的个人理财计划和基金选择技巧指南
- **📊 浏览量统计**：使用 Supabase 记录网页浏览数据（可选）

## 🛠️ 技术栈

- **Vite 5.4.21** - 高速打包工具
- **React 18.3.1** - UI 框架
- **TypeScript 5.5.3** - 类型安全
- **react-markdown 10.1.0** - Markdown 渲染
- **Supabase** - 后端数据库（可选）

## 📦 安装与运行

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（localhost:5173+）
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

### 部署到 GitHub Pages

```bash
# 1. 本地构建
npm run build

# 2. 提交到 GitHub
git add docs
git commit -m "build: update production build"
git push origin main
```

> 自定义域名通过 `public/CNAME` 保留，构建时会自动输出到 `docs/CNAME`。

## 🔌 Supabase 浏览量统计（可选）

要启用浏览量记录功能：

1. **复制环境变量文件**
   ```bash
   cp .env.local.example .env.local
   ```

2. **配置 Supabase 凭证**
   - 访问 https://supabase.com
   - 创建新项目并复制 Project URL 和 Anon Key
   - 更新 `.env.local` 文件

3. **创建数据库表**
   - 参考 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 中的 SQL 脚本
   - 在 Supabase SQL 编辑器中执行

4. **启动应用**
   ```bash
   npm run dev
   ```
   页面浏览时会自动记录到 Supabase

## 📁 项目结构

```
src/
├── App.tsx              # 主应用组件（路由、税收计算）
├── App.css              # 全局样式（响应式设计）
├── FinanceGuide.tsx     # 理财指南组件（动态加载 Markdown）
├── supabase.ts          # Supabase 客户端配置
├── main.tsx             # React 应用入口
└── index.css            # 基础 CSS 变量

public/
├── guide/               # 理财指南静态资源
│   └── 「个人理财...」/
│       └── SoC8tV/
│           ├── *.md     # Markdown 文件
│           └── image/   # 图片素材

docs/                    # GitHub Pages 部署目录
dist/                    # 生产构建输出
```

## 🎨 响应式设计

该应用支持三种视口宽度的优化布局：

- **Desktop**: 最大宽度 1000px，适合大屏幕浏览
- **Tablet**: 最大宽度 720px，2 列网格布局
- **Mobile**: 宽度 100%，单列堆叠布局

## 📝 环境变量

`.env.local` 文件示例：
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> ⚠️ **重要**：`.env.local` 已在 `.gitignore` 中，不会上传到 GitHub

## 🔐 隐私与安全

- 浏览量数据仅包含：页面名称、访问时间、User Agent、Referrer
- 不收集个人信息或敏感数据
- Supabase 提供行级安全策略保护

## 📄 许可证

MIT

## 👤 作者

[WenchengLv](https://github.com/WenchengLv)

---

**Live Demo**: https://WenchengLv.github.io
