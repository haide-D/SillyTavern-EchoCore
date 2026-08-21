from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body, Request
from fastapi.responses import JSONResponse, Response
from typing import Optional, Dict, Any, List
import json
import logging

from services.preset_service import PresetService

logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== 1. 精确静态路由 (必须在动态路径参数前定义) ====================

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
