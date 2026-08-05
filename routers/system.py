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
