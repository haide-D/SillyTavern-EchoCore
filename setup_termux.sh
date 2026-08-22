#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
# SillyTavern-GPT-SoVITS 手机 Termux / Android 一键环境安装脚本
# ============================================================

set -e

echo "============================================================"
echo "  📱 SillyTavern-GPT-SoVITS Android Termux 一键配置向导"
echo "============================================================"

# 1. 授予存储权限
echo "[1/4] 请求 Termux 存储权限..."
termux-setup-storage 2>/dev/null || true

# 2. 更新系统包并安装基础工具与依赖
echo "[2/4] 安装系统依赖 (Python, FFmpeg, Clang, Tmux)..."
pkg update -y
pkg install -y python ffmpeg clang libjpeg-turbo libffi openssl tmux git

# 3. 升级 pip 并配置国内加速镜像 (可选)
echo "[3/4] 升级 Python pip 模块..."
python -m pip install --upgrade pip -q

echo "是否配置清华大学 pip 镜像源以加速国内下载？[Y/n]"
read -r -t 10 choice || choice="y"
if [[ "$choice" =~ ^[Yy]$ ]] || [[ -z "$choice" ]]; then
    python -m pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
    echo "✅ 已启用清华 pip 镜像源"
fi

# 4. 安装 Python 核心轻量依赖
echo "[4/4] 正在安装插件后端轻量核心依赖..."
cd "$(dirname "$0")"
pip install -r requirements.txt

echo ""
echo "============================================================"
echo "  🎉 Termux 环境配置圆满完成！"
echo "============================================================"
echo "💡 常用启动方式："
echo "  1. 正常直接启动:"
echo "     ./start.sh"
echo ""
echo "  2. 使用 Tmux 24小时后台常驻启动 (推荐):"
echo "     tmux new -s tts './start.sh'"
echo "     (按下 Ctrl+B 然后按 D 键可挂入后台，手机熄屏依然稳定运行)"
echo "     (重新唤出窗口命令: tmux attach -t tts)"
echo "============================================================"
