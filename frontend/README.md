# ATELIER AI 前端

AI 穿搭问答界面的 Next.js 15 源码工程，使用 React 19、TypeScript 和 npm。

## 本地开发

```powershell
cd E:\acode\learnlang\frontend
npm.cmd install
npm.cmd run dev
```

## 检查与构建

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

静态导出产物生成在 `out/`。

## 部署到 FastAPI

成功构建后运行：

```powershell
npm.cmd run deploy
```

部署脚本只替换 `E:\acode\learnlang\app\static`，不会修改 Python
路由、Agent、模型或 API 契约。

前端继续使用 `http://localhost:8001`。登录只做本地界面展示，
不会调用认证 API。
