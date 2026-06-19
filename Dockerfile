# ===================================================
# Stage 1: 构建 Next.js 前端（静态导出）
# ===================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# 1. 复制依赖配置文件
COPY frontend/package.json ./

# 2. 安装依赖
RUN npm install

# 3. 复制前端源码
COPY frontend/ .

# 4. 构建静态导出（output: "export" 生成 out/ 目录）
RUN npm run build

# 验证 out/ 目录生成
RUN ls -la out/

# ===================================================
# Stage 2: Python 后端 + 静态文件服务
# ===================================================
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=Asia/Shanghai

WORKDIR /app

# 1. 安装系统依赖（如果有需要，目前项目不需要额外系统包）
# RUN apt-get update && apt-get install -y --no-install-recommends ... && rm -rf /var/lib/apt/lists/*

# 2. 复制并安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. 复制 Python 后端代码
COPY app/ ./app/
COPY main.py .

# 4. 从 Stage 1 复制前端构建产物到 app/static/
COPY --from=frontend-builder /app/frontend/out/ ./app/static/

# 5. 创建数据库目录（SQLite），路径对应 app/agents/personal_clothing.py 中的 Path(__file__).parent.parent / "db"
RUN mkdir -p /app/app/db

# 6. 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/api/v1/chat/messages?thread_id=health')" || exit 1

# 7. 暴露端口
EXPOSE 8001

# 8. 启动命令（生产模式，不使用 reload）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
