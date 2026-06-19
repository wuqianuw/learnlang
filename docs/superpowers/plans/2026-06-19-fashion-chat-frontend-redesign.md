# AI 穿搭问答前端重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建可维护的 Next.js 前端源码，将现有厨师聊天界面重构为编辑式极简的 AI 穿搭问答界面，加入纯前端登录弹窗，并将静态导出部署到 `app/static`。

**Architecture:** `frontend/` 独立维护 UI、API 客户端与状态组件；所有现有 URL、请求字段、流式文本读取和会话存储契约原样保留。Next.js 使用静态导出生成 `frontend/out`，验证后以单向复制部署到 FastAPI 已挂载的 `app/static`，不修改任何 Python 后端文件。

**Tech Stack:** Node.js 22、npm 10、Next.js、React、TypeScript、CSS Modules/全局 CSS、Lucide React、React Markdown、Vitest、Testing Library。

---

## 文件结构

```text
frontend/
  package.json
  package-lock.json
  next.config.ts
  tsconfig.json
  vitest.config.ts
  vitest.setup.ts
  src/
    app/
      globals.css
      layout.tsx
      page.tsx
    components/
      ChatComposer.tsx
      ChatMessage.tsx
      ChatShell.tsx
      EmptyState.tsx
      LoginModal.tsx
      SiteHeader.tsx
    lib/
      api.ts
      messages.ts
      session.ts
    types/
      chat.ts
    tests/
      api.test.ts
      LoginModal.test.tsx
      ChatShell.test.tsx
  README.md
docs/superpowers/progress/
  fashion-chat-frontend-progress.md
```

生产部署只替换 `app/static`。禁止修改：

```text
app/api/**
app/agents/**
app/models/**
app/main.py
```

当前目录不是 Git 仓库，因此计划中的常规提交步骤改为：每个任务完成后更新进度文件，并运行对应验证。

### Task 1：初始化可静态导出的前端工程

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/vitest.setup.ts`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/globals.css`
- Create: `frontend/README.md`
- Create: `docs/superpowers/progress/fashion-chat-frontend-progress.md`

- [ ] **Step 1: 创建进度记录**

写入：

```markdown
# AI 穿搭前端重构进度

## 当前状态

Task 1 开始。

## 已完成

- 设计规格已确认。
- 实施计划已确认。

## 边界

- 不修改 Python 后端和 API 契约。
- 登录只做前端展示。

## 下一步

初始化 `frontend/` 并验证静态导出。
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "atelier-ai-fashion-chat",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "powershell -ExecutionPolicy Bypass -File scripts/deploy-static.ps1"
  },
  "dependencies": {
    "lucide-react": "^0.468.0",
    "next": "^15.5.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: 安装依赖**

Run:

```powershell
Set-Location E:\acode\learnlang\frontend
npm install
```

Expected: `package-lock.json` 和 `node_modules/` 生成，命令 exit 0。

- [ ] **Step 4: 配置静态导出**

`frontend/next.config.ts`：

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
```

`frontend/tsconfig.json` 使用 Next.js 标准 TypeScript 配置，开启 `strict`、`noEmit`、`jsx: preserve`，设置别名 `@/* -> ./src/*`。

- [ ] **Step 5: 配置 Vitest**

`frontend/vitest.config.ts`：

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

`frontend/vitest.setup.ts`：

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: 创建最小页面并验证工程**

`layout.tsx` 引入 `globals.css`，页面元数据为“ATELIER AI｜私人穿搭顾问”。`page.tsx` 暂时返回：

```tsx
export default function Home() {
  return <main>ATELIER AI</main>;
}
```

Run:

```powershell
npm run typecheck
npm run build
```

Expected: 类型检查 exit 0；`frontend/out/index.html` 存在。

- [ ] **Step 7: 更新进度记录**

记录已生成的配置、安装结果、构建结果以及下一步 Task 2。

### Task 2：以测试锁定现有 API 契约

**Files:**
- Create: `frontend/src/types/chat.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/session.ts`
- Create: `frontend/src/lib/messages.ts`
- Create: `frontend/src/tests/api.test.ts`

- [ ] **Step 1: 定义聊天类型**

`frontend/src/types/chat.ts`：

```ts
export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string;
  streaming?: boolean;
  error?: boolean;
  timestamp: number;
}

export interface ApiHistoryMessage {
  role: MessageRole;
  content:
    | string
    | Array<{ type: "text"; text: string } | { type: "image"; url: string }>;
}
```

- [ ] **Step 2: 写 API 失败测试**

`api.test.ts` 必须验证：

1. 签名请求 URL 是 `/api/v1/oss/presign?filename=...`；
2. PUT 使用响应中的 `contentType`；
3. 聊天 POST 请求体键严格为 `message`、`image_url`、`thread_id`；
4. 使用 `ReadableStreamDefaultReader` 与 `TextDecoder` 逐块回调；
5. history 读取 `.messages`；
6. clear 使用 DELETE；
7. API 基地址为 `http://localhost:8001`。

测试使用 `vi.stubGlobal("fetch", vi.fn())`，不能请求真实网络。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```powershell
npm test -- src/tests/api.test.ts
```

Expected: 因 `api.ts` 尚未实现而失败。

- [ ] **Step 4: 实现 API 客户端**

`api.ts` 导出：

```ts
export const API_BASE_URL = "http://localhost:8001";
export async function uploadImage(file: File): Promise<string>;
export async function streamChat(args: {
  message: string;
  imageUrl?: string;
  threadId: string;
  onChunk: (chunk: string) => void;
}): Promise<void>;
export async function getChatMessages(threadId: string): Promise<ApiHistoryMessage[]>;
export async function clearChatMessages(threadId: string): Promise<void>;
```

实现必须复制现有协议，不增加认证头或新字段。空流允许正常结束，不把 `null` 写入聊天。

- [ ] **Step 5: 实现会话与历史转换**

`session.ts`：

```ts
export const THREAD_STORAGE_KEY = "thread_id";
export function createThreadId(): string;
export function getOrCreateThreadId(): string;
export function replaceThreadId(): string;
```

`messages.ts` 将历史中的字符串或 `text/image` 内容数组转换为前端 `ChatMessage`。

- [ ] **Step 6: 运行测试确认 GREEN**

Run:

```powershell
npm test -- src/tests/api.test.ts
npm run typecheck
```

Expected: API 测试和类型检查通过。

- [ ] **Step 7: 更新进度记录**

写明 API URL、字段和流式协议已由测试锁定。

### Task 3：实现展示型登录弹窗

**Files:**
- Create: `frontend/src/components/LoginModal.tsx`
- Create: `frontend/src/tests/LoginModal.test.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: 写登录组件失败测试**

测试必须验证：

- 显示标题“登录你的穿搭档案”；
- 手机号/邮箱、密码输入框存在；
- 显示“微信快捷登录”和演示说明；
- 点击“登录并继续”只调用 `onLogin(displayName)`；
- 未发生 `fetch`；
- Escape 调用 `onClose`；
- 点击遮罩调用 `onClose`，点击对话框本体不关闭。

- [ ] **Step 2: 运行测试确认 RED**

Run:

```powershell
npm test -- src/tests/LoginModal.test.tsx
```

Expected: 组件缺失导致失败。

- [ ] **Step 3: 实现 LoginModal**

组件接口：

```ts
interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (displayName: string) => void;
}
```

实现要求：

- `role="dialog"`、`aria-modal="true"`；
- 表单提交只更新本地状态；
- 显示“界面演示，不会提交账号信息”；
- 默认昵称从邮箱 `@` 前或手机号后四位生成；
- 无输入时显示前端必填提示；
- Escape 与遮罩关闭；
- 打开时锁定背景滚动，关闭时恢复。

- [ ] **Step 4: 添加登录视觉样式**

在 `globals.css` 中添加遮罩、弹窗、输入框、展示按钮和移动端规则。色彩只使用设计令牌，不新增真实认证品牌跳转。

- [ ] **Step 5: 运行测试确认 GREEN**

Run:

```powershell
npm test -- src/tests/LoginModal.test.tsx
npm run typecheck
```

Expected: 测试和类型检查通过。

- [ ] **Step 6: 更新进度记录**

记录登录只做本地展示且没有 fetch。

### Task 4：实现问答式聊天界面

**Files:**
- Create: `frontend/src/components/SiteHeader.tsx`
- Create: `frontend/src/components/EmptyState.tsx`
- Create: `frontend/src/components/ChatMessage.tsx`
- Create: `frontend/src/components/ChatComposer.tsx`
- Create: `frontend/src/components/ChatShell.tsx`
- Create: `frontend/src/tests/ChatShell.test.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: 写 ChatShell 失败测试**

测试必须验证：

- 空状态标题“今天想分析哪套穿搭？”；
- 顶栏出现“私人穿搭顾问”“登录”“新会话”；
- 点击登录打开 LoginModal；
- 登录后顶栏显示本地昵称；
- 提示词可以填入输入框；
- 选择图片后显示预览和移除按钮；
- Enter 发送、Shift+Enter 不发送；
- 发送过程调用 `uploadImage` 和 `streamChat`；
- AI chunk 按顺序追加；
- 新会话调用 clear 并生成新 thread id；
- API 失败显示可读错误消息。

API、UUID、localStorage 使用测试替身，不访问真实服务。

- [ ] **Step 2: 运行测试确认 RED**

Run:

```powershell
npm test -- src/tests/ChatShell.test.tsx
```

Expected: 组件缺失导致失败。

- [ ] **Step 3: 实现 SiteHeader**

包含品牌、穿搭副标题、登录/展示头像与新会话按钮。移动端只隐藏副标题，不隐藏关键操作。

- [ ] **Step 4: 实现 EmptyState**

包含：

- “今天想分析哪套穿搭？”
- 上传照片操作；
- “通勤穿搭”“约会造型”“旅行搭配”提示词；
- 两张静态 AI 能力卡片，只作视觉说明。

- [ ] **Step 5: 实现 ChatMessage**

用户消息右侧莓红气泡；AI 消息左侧纸白卡片。AI 内容使用：

```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {message.content}
</ReactMarkdown>
```

表格包裹可横向滚动容器，链接使用安全属性。流式状态显示文字与非侵扰动效。

- [ ] **Step 6: 实现 ChatComposer**

支持图片预览、移除、文件输入、textarea、Enter/Shift+Enter、禁用状态和发送按钮。创建的 object URL 必须在图片移除或组件卸载时 revoke。

- [ ] **Step 7: 实现 ChatShell 状态编排**

职责：

- 初始化/读取 `thread_id`；
- 加载历史；
- 上传图片；
- 创建用户与 AI 占位消息；
- 按 chunk 更新 AI 消息；
- 结束 streaming；
- 新会话清空和替换 thread id；
- 控制 LoginModal 与纯本地昵称。

不得在 UI 组件中复制 API URL。

- [ ] **Step 8: 完成编辑式极简 CSS**

`globals.css` 定义语义变量：

```css
:root {
  --page: #f7f4ef;
  --surface: #ffffff;
  --ink: #211d1a;
  --muted: #746b63;
  --brand: #9d174d;
  --brand-soft: #f8edef;
  --border: #e4ddd5;
}
```

实现桌面 960px、平板 760px、移动全宽布局；44px 交互目标；可见 focus；`prefers-reduced-motion`；无页面横向溢出。

- [ ] **Step 9: 将 page.tsx 接入 ChatShell**

```tsx
import { ChatShell } from "@/components/ChatShell";

export default function Home() {
  return <ChatShell />;
}
```

- [ ] **Step 10: 运行测试确认 GREEN**

Run:

```powershell
npm test
npm run typecheck
npm run build
```

Expected: 所有测试通过、类型检查通过、静态导出成功。

- [ ] **Step 11: 更新进度记录**

记录 UI、登录、聊天、图片预览与构建状态。

### Task 5：部署静态导出且保护后端边界

**Files:**
- Create: `frontend/scripts/deploy-static.ps1`
- Modify: `frontend/README.md`
- Replace generated assets under: `app/static/**`
- Verify unchanged: `app/api/**`, `app/agents/**`, `app/models/**`, `app/main.py`

- [ ] **Step 1: 创建部署脚本**

脚本必须：

1. 验证 `frontend/out/index.html` 存在；
2. 解析并验证源目录、目标目录绝对路径；
3. 目标必须严格等于 `E:\acode\learnlang\app\static`；
4. 清理目标目录内容；
5. 将 `frontend/out/*` 递归复制到目标；
6. 输出复制文件数量。

使用纯 PowerShell `Remove-Item` 和 `Copy-Item`，不得跨 shell 拼接删除命令。

- [ ] **Step 2: 写 README**

记录：

```powershell
cd E:\acode\learnlang\frontend
npm install
npm run dev
npm test
npm run typecheck
npm run build
npm run deploy
```

明确 API 基地址和登录为展示模式。

- [ ] **Step 3: 保存后端文件指纹**

构建部署前运行：

```powershell
Get-FileHash `
  app\main.py, `
  app\api\v1\chat.py, `
  app\api\v1\oss.py, `
  app\agents\personal_clothing.py, `
  app\models\schemas.py
```

将结果保存到进度文件。

- [ ] **Step 4: 构建并部署**

Run:

```powershell
Set-Location E:\acode\learnlang\frontend
npm run build
npm run deploy
```

Expected: `app/static/index.html` 和 `_next/static` 存在。

- [ ] **Step 5: 验证接口契约存在于产物**

Run:

```powershell
rg -n -S `
  "/api/v1/oss/presign|/api/v1/chat/stream|/api/v1/chat/messages|image_url|thread_id|uploadUrl|accessUrl|TextDecoder|getReader" `
  E:\acode\learnlang\app\static
```

Expected: 所有关键契约均能在构建 JavaScript 中找到。

- [ ] **Step 6: 再次核对后端文件指纹**

重复 Step 3，所有哈希必须完全相同。

- [ ] **Step 7: 更新进度记录**

记录部署文件数、契约检索结果、后端哈希比对结果。

### Task 6：浏览器视觉与交互验证

**Files:**
- Verify: `frontend/src/**`
- Verify: `app/static/**`
- Modify only if needed: frontend files

- [ ] **Step 1: 启动或确认 FastAPI**

Run:

```powershell
E:\acode\learnlang\.venv\Scripts\python.exe -m app.main
```

如果 8001 已有服务运行，不重复启动。

- [ ] **Step 2: 在应用内浏览器打开页面**

打开：

```text
http://localhost:8001
```

检查没有控制台资源错误。

- [ ] **Step 3: 验证桌面界面**

确认：

- 编辑式暖白问答布局；
- 品牌和穿搭文案正确；
- 空状态、提示词、上传按钮、登录、新会话可见；
- 无旧“私人厨师”“食材”“食谱”文案。

- [ ] **Step 4: 验证登录展示**

点击登录，确认：

- 弹窗视觉和字段正确；
- Escape、遮罩、关闭按钮工作；
- 提交后只改变顶栏本地昵称；
- Network 中没有新增登录请求。

- [ ] **Step 5: 验证移动和平板布局**

视口：

```text
375 × 812
768 × 1024
1440 × 900
```

确认无横向溢出，按钮触控尺寸足够，输入栏不遮挡最新消息。

- [ ] **Step 6: 验证真实聊天链路**

通过现有页面上传一张非敏感测试图片并发送，确认：

- presign、PUT 和 chat stream 使用原接口；
- 用户图片消息显示；
- AI 文本逐块出现；
- 页面不显示 `null`。

该步骤会上传用户选择的图片，必须只使用用户明确授权的测试图片。

- [ ] **Step 7: 修复发现的前端问题并重跑完整验证**

每次修复后运行：

```powershell
npm test
npm run typecheck
npm run build
npm run deploy
```

然后重新加载浏览器验证相关状态。

- [ ] **Step 8: 完成进度记录**

写入最终测试数量、构建结果、浏览器验证结果和剩余已知限制。

### Task 7：最终交付检查

**Files:**
- Verify: `frontend/**`
- Verify: `app/static/**`
- Verify unchanged: backend scope
- Finalize: `docs/superpowers/progress/fashion-chat-frontend-progress.md`

- [ ] **Step 1: 运行最终自动验证**

```powershell
Set-Location E:\acode\learnlang\frontend
npm test
npm run typecheck
npm run build
```

Expected: 全部 exit 0。

- [ ] **Step 2: 验证静态首页**

```powershell
Test-Path E:\acode\learnlang\app\static\index.html
Test-Path E:\acode\learnlang\app\static\_next\static
```

Expected: 两项均为 `True`。

- [ ] **Step 3: 验证无后端改动**

对比 Task 5 保存的前后哈希，必须一致。

- [ ] **Step 4: 记录最终状态**

进度文件标记：

```markdown
## 当前状态

完成。

## 已知限制

- 登录为纯前端展示，不提供真实认证或账号安全能力。
- API 基地址保持为现有 `http://localhost:8001`。
```

- [ ] **Step 5: 若执行被中断**

不得写“完成”。必须保存：

- 最后成功任务和步骤；
- 当前测试/构建输出；
- 未完成文件；
- 下一条精确命令；
- 是否需要重新安装依赖或重新部署。

