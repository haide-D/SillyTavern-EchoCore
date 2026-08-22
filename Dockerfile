# ============================================================
# SillyTavern-GPT-SoVITS Manager Dockerfile (超轻量 Linux VPS 运行镜像)
# ============================================================

FROM python:3.10-slim

WORKDIR /app

# 安装系统级 ffmpeg (用于音频切片与拼接)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目核心源码
COPY . .

# 暴露 Manager 默认端口
EXPOSE 3000

# 启动 Manager 后端中间件
CMD ["python", "manager.py"]
