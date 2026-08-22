from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body, Request
from fastapi.responses import JSONResponse, Response
from typing import Optional, Dict, Any, List
import json
import logging

from services.preset_service import PresetService
from config import load_json, save_json, SETTINGS_FILE

logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== 1. 精确静态路由 (必须在动态路径参数前定义) ====================

@router.get("/presets/active")
async def get_active_presets():
    """获取当前生效的预设列表 (支持多选批量生效)"""
    try:
        settings = load_json(SETTINGS_FILE)
        phone_call_cfg = settings.get("phone_call", {})
        
        # 兼容列表与单字符串
        active_calls = phone_call_cfg.get("active_preset_ids")
        if not active_calls or not isinstance(active_calls, list):
            single = phone_call_cfg.get("active_preset_id") or phone_call_cfg.get("preset_id") or "standard_call"
            active_calls = [single]
            
        active_eavesdrops = phone_call_cfg.get("active_eavesdrop_preset_ids")
        if not active_eavesdrops or not isinstance(active_eavesdrops, list):
            single_e = phone_call_cfg.get("active_eavesdrop_preset_id") or phone_call_cfg.get("eavesdrop_preset_id") or "standard_eavesdrop"
            active_eavesdrops = [single_e]

        return {
            "success": True,
            "active_presets": {
                "phone_call": active_calls,
                "eavesdrop": active_eavesdrops
            },
            "single_active": {
                "phone_call": active_calls[0] if active_calls else "standard_call",
                "eavesdrop": active_eavesdrops[0] if active_eavesdrops else "standard_eavesdrop"
            }
        }
    except Exception as e:
        logger.error(f"获取当前生效预设失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取当前生效预设失败: {str(e)}")

@router.post("/presets/active")
async def set_active_preset(payload: Dict[str, Any] = Body(...)):
    """
    设置或批量设置当前生效预设列表
    payload 格式支持:
    1. 批量设置: {"category": "phone_call", "preset_ids": ["id1", "id2"]}
    2. 单选覆盖: {"category": "phone_call", "preset_id": "id1"}
    3. 单项切换: {"category": "phone_call", "toggle_preset_id": "id1"}
    """
    try:
        category = payload.get("category")
        if not category or category not in {"phone_call", "eavesdrop"}:
            raise HTTPException(status_code=400, detail=f"无效的分类: {category}")

        settings = load_json(SETTINGS_FILE)
        if "phone_call" not in settings:
            settings["phone_call"] = {}

        key_list = "active_preset_ids" if category == "phone_call" else "active_eavesdrop_preset_ids"
        key_single = "active_preset_id" if category == "phone_call" else "active_eavesdrop_preset_id"

        current_list = settings["phone_call"].get(key_list)
        if not current_list or not isinstance(current_list, list):
            single = settings["phone_call"].get(key_single) or ("standard_call" if category == "phone_call" else "standard_eavesdrop")
            current_list = [single]

        # 模式 1: 批量直接传入 preset_ids
        if "preset_ids" in payload and isinstance(payload["preset_ids"], list):
            new_list = [str(pid).strip() for pid in payload["preset_ids"] if str(pid).strip()]
            if not new_list:
                default_id = "standard_call" if category == "phone_call" else "standard_eavesdrop"
                new_list = [default_id]
            current_list = new_list

        # 模式 2: 单项切换 (toggle)
        elif "toggle_preset_id" in payload:
            toggle_id = str(payload["toggle_preset_id"]).strip()
            if toggle_id in current_list:
                if len(current_list) > 1:
                    current_list.remove(toggle_id)
                else:
                    logger.info(f"至少保留一个生效剧本，禁止取消唯一的: {toggle_id}")
            else:
                current_list.append(toggle_id)

        # 模式 3: 单项指定 (覆盖)
        elif "preset_id" in payload:
            pid = str(payload["preset_id"]).strip()
            current_list = [pid]

        settings["phone_call"][key_list] = current_list
        settings["phone_call"][key_single] = current_list[0] if current_list else ""
        if category == "phone_call":
            settings["phone_call"]["preset_id"] = current_list[0] if current_list else ""
        else:
            settings["phone_call"]["eavesdrop_preset_id"] = current_list[0] if current_list else ""

        save_json(SETTINGS_FILE, settings)
        logger.info(f"✅ 成功更新 {category} 生效预设池: {current_list}")

        return {
            "success": True,
            "message": f"生效剧本池已更新 ({len(current_list)} 个)",
            "active_presets": {
                "phone_call": settings["phone_call"].get("active_preset_ids", ["standard_call"]),
                "eavesdrop": settings["phone_call"].get("active_eavesdrop_preset_ids", ["standard_eavesdrop"])
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"设置生效预设失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"设置生效预设失败: {str(e)}")


@router.get("/presets/defaults/{category}")
async def get_preset_defaults(category: str):
    """获取指定分类的官方默认模板 (剧情模版 + 系统注入模版)"""
    try:
        defaults = PresetService.get_default_templates(category)
        return {
            "success": True,
            "category": category,
            "defaults": defaults
        }
    except Exception as e:
        logger.error(f"获取默认模板失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取默认模板失败: {str(e)}")


@router.get("/presets")
async def list_presets(category: Optional[str] = None):
    """
    获取场景预设列表
    - category: 可选 "phone_call" 或 "eavesdrop"
    """
    try:
        presets = PresetService.list_presets(category)
        return {
            "success": True,
            "total": len(presets),
            "presets": presets
        }
    except Exception as e:
        logger.error(f"获取预设列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取预设列表失败: {str(e)}")

@router.post("/presets/import")
async def import_preset(payload: Dict[str, Any] = Body(...)):
    """
    导入预设 (通过 JSON Body)
    支持两种结构：
    1. {"raw_json": "...json string...", "category": "phone_call"}
    2. 直接传入完整的预设对象 {"name": "...", "prompt_template": "...", "category": "..."}
    """
    try:
        if "raw_json" in payload and isinstance(payload["raw_json"], str):
            content_str = payload["raw_json"]
            category = payload.get("category")
            imported = PresetService.import_preset(content_str, category)
        else:
            category = payload.get("category", "phone_call")
            imported = PresetService.save_preset(category, payload)

        return {
            "success": True,
            "message": "预设导入成功",
            "preset": imported
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"导入预设失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"导入预设失败: {str(e)}")

@router.post("/presets/upload")
async def upload_preset_file(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None)
):
    """通过文件上传导入预设 (.json 文件)"""
    try:
        bytes_data = await file.read()
        content_str = bytes_data.decode("utf-8")
        imported = PresetService.import_preset(content_str, category)
        return {
            "success": True,
            "message": "预设文件上传导入成功",
            "preset": imported
        }
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="预设文件必须为 UTF-8 编码的 JSON 文件")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"文件上传导入预设失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"导入预设失败: {str(e)}")

# ==================== 2. 动态路径路由 ({category} / {preset_id}) ====================

@router.get("/presets/{category}/{preset_id}")
async def get_preset_detail(category: str, preset_id: str):
    """获取单个预设详情"""
    preset = PresetService.get_preset(category, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"未找到预设: {category}/{preset_id}")
    return {
        "success": True,
        "preset": preset
    }

@router.post("/presets/{category}")
async def save_custom_preset(category: str, preset_data: Dict[str, Any] = Body(...)):
    """保存或更新用户自定义预设"""
    try:
        saved = PresetService.save_preset(category, preset_data)
        return {
            "success": True,
            "message": "预设保存成功",
            "preset": saved
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"保存预设失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"保存预设失败: {str(e)}")

@router.delete("/presets/{category}/{preset_id}")
async def delete_custom_preset(category: str, preset_id: str):
    """删除用户自定义预设 (出厂预设禁止删除)"""
    try:
        success = PresetService.delete_preset(category, preset_id)
        if not success:
            raise HTTPException(status_code=404, detail="预设不存在或已删除")
        return {
            "success": True,
            "message": "预设已成功删除"
        }
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"删除预设失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"删除预设失败: {str(e)}")

@router.get("/presets/{category}/{preset_id}/export")
async def export_preset(category: str, preset_id: str):
    """导出预设为独立 JSON 文件"""
    preset = PresetService.get_preset(category, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="预设不存在")
    
    # 转换为 JSON 格式化字符串并以附件形式响应
    json_bytes = json.dumps(preset, ensure_ascii=False, indent=2).encode('utf-8')
    filename = f"{preset.get('id', preset_id)}.json"
    
    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
