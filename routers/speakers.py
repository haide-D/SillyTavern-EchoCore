from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from database import DatabaseManager

router = APIRouter()


class UpdateSpeakersRequest(BaseModel):
    """更新说话人请求"""
    chat_branch: str
    speakers: List[str]
    mesid: Optional[int] = None


class BatchInitSpeakersRequest(BaseModel):
    """批量初始化说话人请求"""
    speakers_data: List[Dict[str, Any]]


@router.get("/speakers/{chat_branch}")
def get_speakers(chat_branch: str):
    """
    获取指定对话的所有说话人
    
    Args:
        chat_branch: 对话分支ID
        
    Returns:
        说话人列表
    """
    try:
        db = DatabaseManager()
        speakers = db.get_speakers_for_chat(chat_branch)
        
        return {
            "status": "success",
            "chat_branch": chat_branch,
            "speakers": speakers,
            "count": len(speakers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speakers/update")
def update_speakers(req: UpdateSpeakersRequest):
    """
    更新或插入对话的说话人列表
    
    Args:
        req: 包含 chat_branch, speakers, mesid 的请求
        
    Returns:
        操作结果
    """
    try:
        db = DatabaseManager()
        db.update_speakers_for_chat(req.chat_branch, req.speakers, req.mesid)
        
        return {
            "status": "success",
            "message": f"已更新对话 {req.chat_branch} 的说话人列表",
            "speakers": req.speakers,
            "count": len(req.speakers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speakers/batch_init")
def batch_init_speakers(req: BatchInitSpeakersRequest):
    """
    批量初始化说话人记录 (用于旧对话扫描)
    
    Args:
        req: 包含 speakers_data 列表的请求
        
    Returns:
        操作结果
    """
    try:
        db = DatabaseManager()
        db.batch_init_speakers(req.speakers_data)
        
        return {
            "status": "success",
            "message": f"已批量初始化 {len(req.speakers_data)} 条说话人记录",
            "count": len(req.speakers_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import os
import re
import time
import shutil
from fastapi import UploadFile, File, Form

AVATARS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "avatars")
os.makedirs(AVATARS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp"}


@router.post("/speakers/avatar/upload")
async def upload_speaker_avatar(
    file: UploadFile = File(...),
    speaker_name: Optional[str] = Form(None)
):
    """
    上传并持久化保存角色自定义头像到本地硬盘 data/avatars
    """
    try:
        # 获取并校验扩展名
        orig_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".png"
        if not orig_ext or orig_ext not in ALLOWED_EXTENSIONS:
            orig_ext = ".png"

        # 清理 speaker_name 或生成安全文件名
        if speaker_name and speaker_name.strip():
            # 移除文件系统危险字符
            clean_name = re.sub(r'[\\/*?:"<>|]', "", speaker_name.strip())
            if not clean_name:
                clean_name = f"avatar_{int(time.time())}"
            target_filename = f"{clean_name}{orig_ext}"
        else:
            clean_orig = re.sub(r'[\\/*?:"<>|]', "", file.filename or "avatar")
            base_orig = os.path.splitext(clean_orig)[0] or "avatar"
            target_filename = f"{base_orig}_{int(time.time())}{orig_ext}"

        file_path = os.path.join(AVATARS_DIR, target_filename)

        # 写入物理磁盘
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 相对路径与带时间戳的静态 URL (防止浏览器强缓存)
        rel_url = f"/avatars/{target_filename}"

        return {
            "status": "success",
            "message": "头像上传并落盘成功",
            "filename": target_filename,
            "avatar_url": rel_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存头像失败: {str(e)}")


@router.get("/speakers/avatars")
def list_local_avatars():
    """
    获取本地 data/avatars 目录下的所有头像文件
    """
    try:
        if not os.path.exists(AVATARS_DIR):
            return {"status": "success", "avatars": []}

        files = []
        for f in os.listdir(AVATARS_DIR):
            ext = os.path.splitext(f)[1].lower()
            if ext in ALLOWED_EXTENSIONS:
                files.append({
                    "filename": f,
                    "name": os.path.splitext(f)[0],
                    "avatar_url": f"/avatars/{f}"
                })
        return {
            "status": "success",
            "avatars": files,
            "count": len(files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

