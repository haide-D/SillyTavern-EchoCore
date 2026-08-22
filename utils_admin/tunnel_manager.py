"""
Cloudflare Zero-Config 安全隧道管理模块 (TunnelManager)
提供无需公网 IP、无需域名、无需配置 SSL 证书的即开即用公网 HTTPS/WSS 安全穿透。
"""

import os
import re
import sys
import time
import shutil
import platform
import threading
import subprocess
from pathlib import Path
from typing import Optional, Callable


class TunnelManager:
    """Cloudflare Quick Tunnel 管理器"""

    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.public_url: Optional[str] = None
        self.is_running: bool = False
        self._log_thread: Optional[threading.Thread] = None
        self._on_url_ready: Optional[Callable[[str], None]] = None

    def get_binary_path(self) -> Optional[str]:
        """获取或自动检测 cloudflared 二进制路径"""
        # 1. 检查环境变量或 PATH
        which_path = shutil.which("cloudflared")
        if which_path:
            return which_path

        # 2. 检查本地项目 runtime 目录
        project_root = Path(__file__).resolve().parent.parent
        ext = ".exe" if os.name == "nt" else ""
        candidate_paths = [
            project_root / f"cloudflared{ext}",
            project_root / "runtime" / f"cloudflared{ext}",
            project_root / "runtime" / "bin" / f"cloudflared{ext}",
            Path.home() / ".cloudflared" / f"cloudflared{ext}",
        ]
        for p in candidate_paths:
            if p.exists() and os.access(str(p), os.X_OK if os.name != "nt" else os.R_OK):
                return str(p)

        return None

    def download_cloudflared_if_needed(self) -> Optional[str]:
        """如果本地未检测到 cloudflared，尝试自动下载官方单文件二进制"""
        existing = self.get_binary_path()
        if existing:
            return existing

        system = platform.system().lower()
        machine = platform.machine().lower()

        project_root = Path(__file__).resolve().parent.parent
        bin_dir = project_root / "runtime" / "bin"
        bin_dir.mkdir(parents=True, exist_ok=True)

        url = ""
        filename = "cloudflared"

        if system == "windows":
            filename = "cloudflared.exe"
            if "64" in machine:
                url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
            else:
                url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-386.exe"
        elif system == "linux":
            if "aarch64" in machine or "arm64" in machine:
                url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
            elif "arm" in machine:
                url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm"
            else:
                url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
        elif system == "darwin":
            if "arm64" in machine or "m1" in machine or "m2" in machine:
                url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
            else:
                url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"

        target_file = bin_dir / filename
        if not url:
            print("[Tunnel] ⚠️ 未识别到当前平台的自动下载链接，请手动安装 cloudflared")
            return None

        try:
            import urllib.request
            print(f"[Tunnel] ⏳ 正在下载 Cloudflare 安全隧道组件 ({url})...")
            urllib.request.urlretrieve(url, str(target_file))
            if os.name != "nt":
                os.chmod(str(target_file), 0o755)
            print(f"[Tunnel] ✅ Cloudflare 隧道组件准备就绪: {target_file}")
            return str(target_file)
        except Exception as e:
            print(f"[Tunnel] ⚠️ 自动下载 cloudflared 失败: {e}，请手动安装或放入项目根目录")
            return None

    def start_tunnel(self, local_port: int, on_url_ready: Optional[Callable[[str], None]] = None) -> bool:
        """启动 Cloudflare Quick Tunnel 并捕获公网 URL"""
        if self.is_running and self.public_url:
            print(f"[Tunnel] ✅ 隧道已在运行中: {self.public_url}")
            return True

        bin_path = self.download_cloudflared_if_needed()
        if not bin_path:
            return False

        self._on_url_ready = on_url_ready
        cmd = [
            bin_path,
            "tunnel",
            "--url", f"http://127.0.0.1:{local_port}",
            "--no-autoupdate"
        ]

        print(f"[Tunnel] 🚀 正在开启 Cloudflare 安全公网隧道 (映射本地端口: {local_port})...")

        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            self.is_running = True

            # 启动日志监听线程解析生成的 trycloudflare URL
            self._log_thread = threading.Thread(target=self._monitor_output, daemon=True)
            self._log_thread.start()
            return True
        except Exception as e:
            print(f"[Tunnel] ❌ 启动 Cloudflare 隧道失败: {e}")
            self.is_running = False
            return False

    def _monitor_output(self):
        """实时捕获隧道进程输出，提取 trycloudflare.com 公网域名"""
        pattern = re.compile(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
        while self.is_running and self.process and self.process.poll() is None:
            line = self.process.stdout.readline()
            if not line:
                break
            line_str = line.strip()
            
            match = pattern.search(line_str)
            if match and not self.public_url:
                self.public_url = match.group(0)
                print("\n" + "=" * 64)
                print(f"🎉 Cloudflare 公网安全隧道已成功建立！(支持 HTTPS / WSS)")
                print(f"👉 远程公网直连地址: {self.public_url}")
                print(f"⚙️  远程管理面板地址: {self.public_url}/admin")
                print("💡 无论你在任何网络环境，酒馆直接填写此公网地址即可连通")
                print("=" * 64 + "\n")
                if self._on_url_ready:
                    self._on_url_ready(self.public_url)

        self.is_running = False

    def stop_tunnel(self):
        """停止隧道"""
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=3)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None

        self.is_running = False
        self.public_url = None
        print("[Tunnel] 🛑 Cloudflare 公网隧道已关闭")


# 全局单例
tunnel_manager = TunnelManager()
