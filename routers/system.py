import os
import glob
from fastapi import APIRouter
from config import init_settings, load_json, save_json, get_current_dirs, SETTINGS_FILE
from schemas import SettingsRequest, ThemeRequest

router = APIRouter()

@router.post("/clear_cache")
def clear_cache():
    _, cache_dir = get_current_dirs()
    if not os.path.exists(cache_dir): return {"status": "empty"}

    for f in glob.glob(os.path.join(cache_dir, "*.wav")):
        try: os.remove(f)
        except: pass
    return {"status": "success"}

@router.post("/update_settings")
def update(req: SettingsRequest):
    s = load_json(SETTINGS_FILE)

    if req.enabled is not None: s["enabled"] = req.enabled
    if req.auto_generate is not None: s["auto_generate"] = req.auto_generate
    if req.base_dir and req.base_dir.strip(): s["base_dir"] = req.base_dir.strip()
    if req.cache_dir and req.cache_dir.strip(): s["cache_dir"] = req.cache_dir.strip()
    if req.default_lang is not None: s["default_lang"] = req.default_lang
    if req.iframe_mode is not None: s["iframe_mode"] = req.iframe_mode
    if req.bubble_style is not None: s["bubble_style"] = req.bubble_style
    if req.developer_mode is not None: s["developer_mode"] = req.developer_mode
    save_json(SETTINGS_FILE, s)
    # 强制刷新一次，确保目录被创建
    init_settings()
    return {"status": "success", "settings": s}

@router.get("/theme")
def get_theme():
    """获取当前主题设置"""
    s = init_settings()
    return s.get("ui_theme", {"current": "default", "preferences": {}})

@router.post("/theme")
def set_theme(req: ThemeRequest):
    """设置主题"""
    s = load_json(SETTINGS_FILE)
    if "ui_theme" not in s:
        s["ui_theme"] = {"preferences": {}}
    s["ui_theme"]["current"] = req.theme_id
    save_json(SETTINGS_FILE, s)
    return {"status": "success", "theme": req.theme_id}


# ============================================================
# 隧道与远程反向代理配置 API
# ============================================================

@router.get("/system/tunnel/status")
def get_tunnel_status():
    """获取 Cloudflare 穿透隧道状态与公网 URL"""
    from utils_admin.tunnel_manager import tunnel_manager
    return {
        "is_running": tunnel_manager.is_running,
        "public_url": tunnel_manager.public_url
    }


@router.post("/system/tunnel/start")
def start_tunnel():
    """手动开启 Cloudflare 安全隧道"""
    from utils_admin.tunnel_manager import tunnel_manager
    from config import get_manager_port
    port = get_manager_port()
    ok = tunnel_manager.start_tunnel(local_port=port)
    return {
        "success": ok,
        "is_running": tunnel_manager.is_running,
        "public_url": tunnel_manager.public_url,
        "message": "隧道启动中，请等待几秒后刷新状态" if ok else "启动失败，请查看控制台日志"
    }


@router.post("/system/tunnel/stop")
def stop_tunnel():
    """关闭 Cloudflare 安全隧道"""
    from utils_admin.tunnel_manager import tunnel_manager
    tunnel_manager.stop_tunnel()
    return {"success": True, "is_running": False}


from pydantic import BaseModel
from typing import Optional

class NginxConfigRequest(BaseModel):
    domain: str = "tts.example.com"
    local_port: int = 3000
    enable_ssl: bool = True
    ssl_cert_path: Optional[str] = "/etc/letsencrypt/live/example.com/fullchain.pem"
    ssl_key_path: Optional[str] = "/etc/letsencrypt/live/example.com/privkey.pem"

@router.post("/system/tunnel/generate_nginx")
def generate_nginx_config(req: NginxConfigRequest):
    """一键生成标准 Nginx 反向代理配置（带完整的 WebSocket WSS 升级支持）"""
    domain = req.domain.strip() or "tts.example.com"
    port = req.local_port or 3000
    
    if req.enable_ssl:
        cert = req.ssl_cert_path or "/etc/ssl/certs/fullchain.pem"
        key = req.ssl_key_path or "/etc/ssl/private/privkey.pem"
        config_text = f"""# ============================================================
# SillyTavern-GPT-SoVITS 专属 Nginx HTTPS/WSS 反向代理配置
# 域名: {domain} -> 本地端口: {port}
# ============================================================

server {{
    listen 80;
    server_name {domain};
    # 强制将 HTTP 重定向至 HTTPS
    return 301 https://$host$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {domain};

    # SSL 证书路径
    ssl_certificate {cert};
    ssl_certificate_key {key};

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 客户端上传体限制 (支持大音频/模型切片)
    client_max_body_size 100M;

    location / {{
        proxy_pass http://127.0.0.1:{port};
        proxy_http_version 1.1;

        # WebSocket 关键穿透支持 (WSS 实时流)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 真实客户端 IP 与请求头转发
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 代理超时防断连优化
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }}
}}
"""
    else:
        config_text = f"""# ============================================================
# SillyTavern-GPT-SoVITS 专属 Nginx HTTP 反向代理配置
# 域名: {domain} -> 本地端口: {port}
# ============================================================

server {{
    listen 80;
    server_name {domain};

    client_max_body_size 100M;

    location / {{
        proxy_pass http://127.0.0.1:{port};
        proxy_http_version 1.1;

        # WebSocket 关键穿透支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }}
}}
"""

    return {
        "status": "success",
        "domain": domain,
        "config": config_text
    }

