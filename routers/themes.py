import os
import glob
import json
import shutil
import zipfile
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict

router = APIRouter()
THEMES_DIR = "data/themes"

class ThemeManifest(BaseModel):
    id: str
    name: str
    version: str = "1.0.0"
    author: str = ""
    description: str = ""
    type: str = "external"
    entry_js: Optional[str] = None
    entry_css: Optional[str] = None
    dependencies: List[str] = []

@router.get("/list")
async def list_themes():
    """获取所有已安装的主题列表"""
    themes = []
    if not os.path.exists(THEMES_DIR):
        return themes
        
    for theme_id in os.listdir(THEMES_DIR):
        theme_path = os.path.join(THEMES_DIR, theme_id)
        if not os.path.isdir(theme_path):
            continue
            
        manifest_path = os.path.join(theme_path, "manifest.json")
        if os.path.exists(manifest_path):
            try:
                with open(manifest_path, 'r', encoding='utf-8') as f:
                    manifest = json.load(f)
                    themes.append(manifest)
            except Exception as e:
                print(f"[Themes] Error parsing manifest for {theme_id}: {e}")
                
    return themes

@router.post("/upload")
async def upload_theme(file: UploadFile = File(...)):
    """上传并安装主题 ZIP 包"""
    if not file.filename.endswith('.zip') and not file.filename.endswith('.sttheme'):
        raise HTTPException(status_code=400, detail="只接受 .zip 或 .sttheme 文件")

    # 创建临时目录解压
    with tempfile.TemporaryDirectory() as tmp_dir:
        zip_path = os.path.join(tmp_dir, "uploaded.zip")
        with open(zip_path, "wb") as f:
            f.write(await file.read())
            
        extract_dir = os.path.join(tmp_dir, "extracted")
        os.makedirs(extract_dir)
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                # 防目录穿越校验
                for member in zip_ref.namelist():
                    if '..' in member or member.startswith('/'):
                        raise HTTPException(status_code=400, detail="不安全的 ZIP 文件 (目录穿越)")
                zip_ref.extractall(extract_dir)
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="无效的 ZIP 文件")
            
        # 查找 manifest.json (可能在根目录，也可能包了一层文件夹)
        manifest_path = None
        base_dir = extract_dir
        
        if os.path.exists(os.path.join(extract_dir, "manifest.json")):
            manifest_path = os.path.join(extract_dir, "manifest.json")
        else:
            # 检查是否只包了一层目录
            items = os.listdir(extract_dir)
            if len(items) == 1 and os.path.isdir(os.path.join(extract_dir, items[0])):
                base_dir = os.path.join(extract_dir, items[0])
                if os.path.exists(os.path.join(base_dir, "manifest.json")):
                    manifest_path = os.path.join(base_dir, "manifest.json")
                    
        if not manifest_path:
            raise HTTPException(status_code=400, detail="找不到 manifest.json")
            
        # 解析 manifest 验证 id
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
                theme_id = manifest.get('id')
                if not theme_id or not isinstance(theme_id, str):
                    raise ValueError("缺少有效的 id")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"解析 manifest.json 失败: {e}")
            
        # 移动到正式目录
        target_dir = os.path.join(THEMES_DIR, theme_id)
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir) # 覆盖安装
            
        os.makedirs(os.path.dirname(target_dir), exist_ok=True)
        shutil.copytree(base_dir, target_dir)
        
    return {"status": "success", "message": f"主题 {theme_id} 安装成功", "id": theme_id}

class ThemeTextPayload(BaseModel):
    files: Dict[str, str]

@router.post("/install_text")
async def install_text_theme(payload: ThemeTextPayload):
    """通过纯文本(JSON)代码安装主题"""
    manifest_str = payload.files.get("manifest.json")
    if not manifest_str:
        raise HTTPException(status_code=400, detail="缺少 manifest.json")
    
    try:
        manifest = json.loads(manifest_str)
        theme_id = manifest.get("id")
        if not theme_id or not isinstance(theme_id, str):
            raise ValueError("缺少有效的 id")
    except Exception as e:
         raise HTTPException(status_code=400, detail=f"解析 manifest.json 失败: {e}")
         
    if ".." in theme_id or "/" in theme_id or "\\" in theme_id:
        raise HTTPException(status_code=400, detail="不安全的 theme_id")
        
    for filepath in payload.files.keys():
        if ".." in filepath or filepath.startswith("/"):
             raise HTTPException(status_code=400, detail="不安全的文件路径 (目录穿越)")

    target_dir = os.path.join(THEMES_DIR, theme_id)
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir) # 覆盖安装
        
    os.makedirs(target_dir, exist_ok=True)
    
    for filepath, content in payload.files.items():
        full_path = os.path.join(target_dir, filepath)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
            
    return {"status": "success", "message": f"主题 {theme_id} 安装成功", "id": theme_id}


@router.delete("/{theme_id}")
async def delete_theme(theme_id: str):
    """删除主题"""
    if ".." in theme_id or "/" in theme_id or "\\" in theme_id:
        raise HTTPException(status_code=400, detail="无效的 theme_id")
        
    target_dir = os.path.join(THEMES_DIR, theme_id)
    if not os.path.exists(target_dir):
        raise HTTPException(status_code=404, detail="主题不存在")
        
    shutil.rmtree(target_dir)
    return {"status": "success", "message": "主题已删除"}

@router.get("/export/{theme_id}")
async def export_theme(theme_id: str):
    """打包并导出主题"""
    if ".." in theme_id or "/" in theme_id or "\\" in theme_id:
        raise HTTPException(status_code=400, detail="无效的 theme_id")
        
    target_dir = os.path.join(THEMES_DIR, theme_id)
    if not os.path.exists(target_dir):
        raise HTTPException(status_code=404, detail="主题不存在")
        
    # 创建临时压缩包
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
    tmp_file.close()
    
    with zipfile.ZipFile(tmp_file.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(target_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # 计算相对路径，避免压缩绝对路径
                rel_path = os.path.relpath(file_path, target_dir)
                zipf.write(file_path, rel_path)
                
    return FileResponse(
        tmp_file.name, 
        media_type='application/zip', 
        filename=f"{theme_id}.zip",
        background=None # 需要清理临时文件的话可以加 BackgroundTask
    )
