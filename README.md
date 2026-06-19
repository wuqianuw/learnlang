# ATELIER AI 私人穿搭顾问

基于 FastAPI、LangChain/LangGraph 和 Next.js 的多模态穿搭分析应用。
用户可以上传穿搭照片，通过流式对话获得造型、配色和场景化搭配建议。

## 项目结构

```text
app/          FastAPI 后端与已构建的静态前端
frontend/     Next.js 前端源码
tests/        后端接口测试
```

## 本地运行

复制并配置 `.env`，然后安装 Python 依赖：

```powershell
python -m venv .venv
.\.venv\Scripts\pip.exe install -r requirements.txt
.\.venv\Scripts\python.exe -m app.main
```

访问：

```text
http://127.0.0.1:8001
```

## 前端开发

```powershell
cd frontend
npm.cmd install
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run deploy
```

`npm.cmd run deploy` 会将静态导出部署到 `app/static`。

## 测试

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_api_routes -v
cd frontend
npm.cmd test -- --run
```

## 安全说明

- `.env`、SQLite 数据库、虚拟环境、Node 依赖和本地运行缓存均已忽略。
- 登录界面目前仅作前端展示，不提供真实身份认证。
