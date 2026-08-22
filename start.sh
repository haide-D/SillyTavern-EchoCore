#!/bin/bash

# ============================================================
# SillyTavern-GPT-SoVITS Launcher (Linux / macOS / Termux / VPS)
# ============================================================

cd "$(dirname "$0")"

echo "============================================================"
echo "  🚀 SillyTavern-GPT-SoVITS 后端启动器"
echo "============================================================"
echo "[INFO] 工作路径: $(pwd)"

export PYTHONPATH="$(pwd)"

# 1. 检测 Python 环境
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "[ERROR] 未检测到 Python 3，请先安装 Python 3.10+"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install python3 python3-pip python3-venv ffmpeg"
    echo "  Termux (安卓): pkg install python ffmpeg clang"
    exit 1
fi

echo "[INFO] 使用 Python: $($PYTHON_CMD --version 2>&1)"

# 2. 检查并优先使用虚拟环境 (venv)
if [ -d ".venv" ]; then
    if [ -f ".venv/bin/activate" ]; then
        echo "[INFO] 激活本地虚拟环境 (.venv)..."
        source .venv/bin/activate
        PYTHON_CMD="python"
    fi
fi

# 3. 依赖检查
echo "[INFO] 正在检查/安装 Python 依赖..."
$PYTHON_CMD -m pip install -r requirements.txt -q --disable-pip-version-check

# 4. 获取端口与网络信息
MANAGER_PORT=$(grep '"manager_port"' system_settings.json 2>/dev/null | grep -o '[0-9]\+')
if [ -z "$MANAGER_PORT" ]; then
    MANAGER_PORT="3000"
fi

# 获取本机局域网 IP (兼容 Linux / macOS / Termux)
LOCAL_IP="127.0.0.1"
if command -v hostname &> /dev/null && hostname -I &> /dev/null; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
elif command -v ifconfig &> /dev/null; then
    LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
fi

echo ""
echo "[INFO] 服务准备就绪！"
echo "  👉 本地管理面板: http://127.0.0.1:${MANAGER_PORT}/admin"
if [ "$LOCAL_IP" != "127.0.0.1" ] && [ -n "$LOCAL_IP" ]; then
    echo "  👉 局域网/远程:   http://${LOCAL_IP}:${MANAGER_PORT}/admin"
fi
echo "------------------------------------------------------------"

# 5. 非无头桌面环境下尝试自动打开浏览器
if [ -n "$DISPLAY" ] || [ "$(uname)" = "Darwin" ]; then
    (sleep 3 && open "http://localhost:${MANAGER_PORT}/admin" 2>/dev/null || xdg-open "http://localhost:${MANAGER_PORT}/admin" 2>/dev/null) &
fi

# 6. 运行 Manager
$PYTHON_CMD manager.py
