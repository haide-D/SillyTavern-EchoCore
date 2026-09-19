import os
import hashlib
import httpx
from services.local_http import model_trust_env
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import Optional, Union, List
from pydantic import BaseModel

from config import get_current_dirs, get_sovits_host, apply_text_replacements
from utils import maintain_cache_size

router = APIRouter()
from routers.elevenlabs import router as elevenlabs_router
router.include_router(elevenlabs_router)


class TTSRequest(BaseModel):
    """完整的GPT-SoVITS TTS请求参数"""
    # 必需参数
    text: str
    text_lang: str
    ref_audio_path: str
    prompt_lang: str
    prompt_text: str = ""
    
    # 情绪参数(用于缓存策略)
    emotion: Optional[str] = "default"
    
    # 可选参数(带默认值)
    aux_ref_audio_paths: Optional[List[str]] = None
    top_k: int = 5
    top_p: float = 1.0
    temperature: float = 1.0
    text_split_method: str = "cut5"
    batch_size: int = 1
    batch_threshold: float = 0.75
    split_bucket: bool = True
    speed_factor: float = 1.0
    fragment_interval: float = 0.3
    seed: int = -1
    parallel_infer: bool = True
    repetition_penalty: float = 1.35
    sample_steps: int = 32
    super_sampling: bool = False
    streaming_mode: Union[bool, int] = False
    overlap_length: int = 2
    min_chunk_length: int = 16

@router.get("/proxy_set_gpt_weights")
async def proxy_set_gpt_weights(weights_path: str):
    """
    切换 GPT 权重（通过统一的 ModelWeightService，带锁保护）
    """
    from services.model_weight_service import model_weight_service
    
    async with model_weight_service.acquire_lock("set_gpt_weights"):
        result = await model_weight_service.set_gpt_weights(weights_path, skip_if_same=False)
    
    if not result["success"]:
        if "不存在" in result["message"]:
            raise HTTPException(status_code=400, detail=result["message"])
        elif "无法连接" in result["message"]:
            raise HTTPException(status_code=503, detail=result["message"])
        elif "超时" in result["message"]:
            raise HTTPException(status_code=503, detail=result["message"])
        else:
            raise HTTPException(status_code=500, detail=f"GPT 权重切换失败: {result['message']}")
    
    return {"status": 200, "detail": result["message"]}

@router.get("/proxy_set_sovits_weights")
async def proxy_set_sovits_weights(weights_path: str):
    """
    切换 SoVITS 权重（通过统一的 ModelWeightService，带锁保护）
    """
    from services.model_weight_service import model_weight_service
    
    async with model_weight_service.acquire_lock("set_sovits_weights"):
        result = await model_weight_service.set_sovits_weights(weights_path, skip_if_same=False)
    
    if not result["success"]:
        if "不存在" in result["message"]:
            raise HTTPException(status_code=400, detail=result["message"])
        elif "无法连接" in result["message"]:
            raise HTTPException(status_code=503, detail=result["message"])
        elif "超时" in result["message"]:
            raise HTTPException(status_code=503, detail=result["message"])
        else:
            raise HTTPException(status_code=500, detail=f"SoVITS 权重切换失败: {result['message']}")
    
    return {"status": 200, "detail": result["message"]}

class MiniMaxTestRequest(BaseModel):
    api_key: str
    group_id: Optional[str] = ""
    api_url: Optional[str] = "https://api.minimax.chat/v1/t2a_v2"


class MiniMaxVoiceItem(BaseModel):
    id: str
    name: str
    gender: Optional[str] = "female"
    category: Optional[str] = "custom"
    description: Optional[str] = "用户自定义克隆音色"


class MiniMaxPreviewRequest(BaseModel):
    voice_id: str
    text: Optional[str] = "主人，您好！这是我的MiniMax语音合成试听效果。"
    speed: Optional[float] = 1.0


@router.post("/tts/minimax/test")
async def test_minimax(req: MiniMaxTestRequest):
    """测试 MiniMax API Key 与 Group ID 连通性"""
    from services.minimax_service import minimax_service
    return await minimax_service.test_credentials(req.api_key, req.group_id, req.api_url)


@router.get("/tts/minimax/voices")
def get_minimax_voices():
    """获取 MiniMax 可用音色列表 (官方预设 + 用户自定义)"""
    from services.minimax_service import minimax_service
    return {
        "status": "success",
        "voices": minimax_service.get_preset_voices()
    }


@router.post("/tts/minimax/voices")
def add_minimax_voice(voice: MiniMaxVoiceItem):
    """添加或更新 MiniMax 自定义音色"""
    from config import load_json, save_json, SETTINGS_FILE, init_settings
    settings = load_json(SETTINGS_FILE)
    if "minimax_tts" not in settings:
        settings["minimax_tts"] = {}
    if "custom_voices" not in settings["minimax_tts"]:
        settings["minimax_tts"]["custom_voices"] = []
    
    custom_list = settings["minimax_tts"]["custom_voices"]
    voice_dict = {
        "id": voice.id.strip(),
        "name": voice.name.strip() or voice.id.strip(),
        "gender": voice.gender or "female",
        "category": "custom",
        "description": voice.description or "用户自定义克隆音色"
    }
    
    found = False
    for idx, item in enumerate(custom_list):
        if isinstance(item, dict) and item.get("id") == voice_dict["id"]:
            custom_list[idx] = voice_dict
            found = True
            break
    if not found:
        custom_list.append(voice_dict)
    
    save_json(SETTINGS_FILE, settings)
    init_settings()
    from services.minimax_service import minimax_service
    return {
        "status": "success",
        "message": f"声线「{voice_dict['name']}」已成功保存至 MiniMax 音色库",
        "voices": minimax_service.get_preset_voices()
    }


@router.delete("/tts/minimax/voices/{voice_id}")
def delete_minimax_voice(voice_id: str):
    """删除 MiniMax 自定义音色"""
    from config import load_json, save_json, SETTINGS_FILE, init_settings
    settings = load_json(SETTINGS_FILE)
    clean_id = voice_id.strip()
    if clean_id.startswith("minimax:"):
        clean_id = clean_id[len("minimax:"):].strip()

    if "minimax_tts" in settings and "custom_voices" in settings["minimax_tts"]:
        settings["minimax_tts"]["custom_voices"] = [
            v for v in settings["minimax_tts"]["custom_voices"] 
            if isinstance(v, dict) and v.get("id") != clean_id
        ]
        save_json(SETTINGS_FILE, settings)
        init_settings()
    from services.minimax_service import minimax_service
    return {
        "status": "success",
        "message": "音色已从自定义库移除",
        "voices": minimax_service.get_preset_voices()
    }


@router.post("/tts/minimax/preview")
async def preview_minimax_voice(req: MiniMaxPreviewRequest):
    """快速试听指定 MiniMax 声线"""
    from services.minimax_service import minimax_service
    try:
        result = await minimax_service.generate_audio(
            text=req.text or "主人，您好！这是我的MiniMax语音合成试听效果。",
            voice_id=req.voice_id,
            speed=req.speed or 1.0
        )
        custom_headers = {
            "X-Audio-Filename": result["filename"],
            "Access-Control-Expose-Headers": "X-Audio-Filename"
        }
        return FileResponse(result["file_path"], media_type="audio/wav", headers=custom_headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"试听生成失败: {str(e)}")


# ================= Fish.audio 云端 TTS 路由 =================

class FishAudioTestRequest(BaseModel):
    api_key: str
    api_url: Optional[str] = "https://api.fish.audio/v1/tts"
    model: Optional[str] = "s2.1-pro"


class FishAudioVoiceItem(BaseModel):
    id: str
    name: str
    gender: Optional[str] = "female"
    category: Optional[str] = "custom"
    description: Optional[str] = "用户自定义/克隆音色"


class FishAudioPreviewRequest(BaseModel):
    voice_id: str
    text: Optional[str] = "主人，您好！这是我的Fish.audio语音合成试听效果。"
    speed: Optional[float] = 1.0
    model: Optional[str] = "s2.1-pro"


class FishAudioSyncRequest(BaseModel):
    api_key: Optional[str] = None


@router.post("/tts/fish_audio/test")
async def test_fish_audio(req: FishAudioTestRequest):
    """测试 Fish.audio API Key 连通性"""
    from services.fish_audio_service import fish_audio_service
    return await fish_audio_service.test_credentials(req.api_key, req.api_url, req.model)


@router.get("/tts/fish_audio/voices")
def get_fish_audio_voices():
    """获取 Fish.audio 可用音色列表 (预设 + 个人同步/自定义)"""
    from services.fish_audio_service import fish_audio_service
    return {
        "status": "success",
        "voices": fish_audio_service.get_preset_voices()
    }


@router.post("/tts/fish_audio/sync_remote")
async def sync_fish_audio_remote_voices(req: FishAudioSyncRequest):
    """从 Fish.audio 官方一键同步当前账号创建与收藏的音色"""
    from services.fish_audio_service import fish_audio_service
    try:
        result = await fish_audio_service.sync_remote_voices(req.api_key)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tts/fish_audio/voices")
def add_fish_audio_voice(voice: FishAudioVoiceItem):
    """添加或更新 Fish.audio 自定义音色"""
    from config import load_json, save_json, SETTINGS_FILE, init_settings
    settings = load_json(SETTINGS_FILE)
    if "fish_audio_tts" not in settings:
        settings["fish_audio_tts"] = {}
    if "custom_voices" not in settings["fish_audio_tts"]:
        settings["fish_audio_tts"]["custom_voices"] = []

    custom_list = settings["fish_audio_tts"]["custom_voices"]
    clean_id = voice.id.strip()
    if clean_id.startswith("fish:"):
        clean_id = clean_id[len("fish:"):].strip()
    elif clean_id.startswith("fish_audio:"):
        clean_id = clean_id[len("fish_audio:"):].strip()

    name = voice.name.strip() or clean_id
    voice_dict = {
        "id": clean_id,
        "name": name,
        "gender": voice.gender or "female",
        "category": "custom",
        "description": voice.description or "用户自定义音色"
    }

    # 直接允许重复：仅当 ID 与名称完全一致时原地更新，否则作为独立新音色条目直接追加
    found = False
    for idx, item in enumerate(custom_list):
        if isinstance(item, dict) and item.get("id") == clean_id and item.get("name") == name:
            custom_list[idx] = voice_dict
            found = True
            break
    if not found:
        custom_list.append(voice_dict)

    save_json(SETTINGS_FILE, settings)
    init_settings()
    from services.fish_audio_service import fish_audio_service
    return {
        "status": "success",
        "message": f"音色「{name}」已保存至 Fish.audio 库",
        "voices": fish_audio_service.get_preset_voices()
    }


@router.delete("/tts/fish_audio/voices/{voice_id}")
def delete_fish_audio_voice(voice_id: str, name: Optional[str] = None):
    """删除 Fish.audio 自定义音色 (支持按 ID 或按 ID+名称精准删除)"""
    from config import load_json, save_json, SETTINGS_FILE, init_settings
    settings = load_json(SETTINGS_FILE)
    clean_id = voice_id.strip()
    if clean_id.startswith("fish:"):
        clean_id = clean_id[len("fish:"):].strip()
    elif clean_id.startswith("fish_audio:"):
        clean_id = clean_id[len("fish_audio:"):].strip()

    target_name = name.strip() if (name and name.strip()) else None

    if "fish_audio_tts" in settings and "custom_voices" in settings["fish_audio_tts"]:
        if target_name:
            settings["fish_audio_tts"]["custom_voices"] = [
                v for v in settings["fish_audio_tts"]["custom_voices"]
                if not (isinstance(v, dict) and v.get("id") == clean_id and v.get("name") == target_name)
            ]
        else:
            settings["fish_audio_tts"]["custom_voices"] = [
                v for v in settings["fish_audio_tts"]["custom_voices"]
                if isinstance(v, dict) and v.get("id") != clean_id
            ]
        save_json(SETTINGS_FILE, settings)
        init_settings()
    from services.fish_audio_service import fish_audio_service
    return {
        "status": "success",
        "message": "音色已从自定义库移除",
        "voices": fish_audio_service.get_preset_voices()
    }


@router.post("/tts/fish_audio/preview")
async def preview_fish_audio_voice(req: FishAudioPreviewRequest):
    """快速试听指定 Fish.audio 声线"""
    from services.fish_audio_service import fish_audio_service
    try:
        result = await fish_audio_service.generate_audio(
            text=req.text or "主人，您好！这是我的Fish.audio语音合成试听效果。",
            voice_id=req.voice_id,
            speed=req.speed or 1.0,
            model=req.model or "s2.1-pro"
        )
        custom_headers = {
            "X-Audio-Filename": result["filename"],
            "Access-Control-Expose-Headers": "X-Audio-Filename"
        }
        return FileResponse(result["file_path"], media_type="audio/wav", headers=custom_headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"试听生成失败: {str(e)}")


@router.get("/tts_proxy")
async def tts_proxy(
    text: str, 
    text_lang: str = "zh", 
    ref_audio_path: str = "", 
    prompt_text: str = "", 
    prompt_lang: str = "zh", 
    emotion: Optional[str] = "default",
    speed: Optional[float] = 1.0,
    speed_factor: Optional[float] = None,
    streaming_mode: Optional[str] = "false", 
    check_only: Optional[str] = None,
    provider: Optional[str] = None,
    voice_id: Optional[str] = None,
    force_regenerate: bool = False
):
    from services.model_weight_service import model_weight_service
    
    # 执行 TTS 文本发音纠正与敏感/多音字替换
    text = apply_text_replacements(text)

    # 统一语速倍率
    actual_speed = speed_factor if speed_factor is not None else (speed if speed is not None else 1.0)
    actual_emotion = emotion or "default"

    # ========== 识别是否为 MiniMax 云端供应商 ==========
    is_minimax = (
        (provider and provider.lower() in ("minimax", "minimax_tts")) or
        (ref_audio_path and (ref_audio_path.startswith("minimax:") or ref_audio_path.startswith("minimax_")))
    )

    if is_minimax:
        from services.minimax_service import minimax_service
        
        target_voice_id = voice_id
        if not target_voice_id and ref_audio_path:
            if ref_audio_path.startswith("minimax:"):
                target_voice_id = ref_audio_path[len("minimax:"):].strip()
            elif ref_audio_path.startswith("minimax_"):
                target_voice_id = ref_audio_path[len("minimax_"):].strip()
        
        # 检查仅预检缓存
        if check_only == "true":
            cached, filename, _ = minimax_service.check_cache(
                text=text,
                voice_id=target_voice_id or "female-shaonv",
                emotion=actual_emotion,
                speed=actual_speed
            )
            return {
                "cached": cached,
                "filename": filename
            }

        try:
            result = await minimax_service.generate_audio(
                text=text,
                voice_id=target_voice_id,
                emotion=actual_emotion,
                speed=actual_speed,
                force_regenerate=force_regenerate
            )
            custom_headers = {
                "X-Audio-Filename": result["filename"],
                "Access-Control-Expose-Headers": "X-Audio-Filename"
            }
            return FileResponse(result["file_path"], media_type="audio/wav", headers=custom_headers)
        except Exception as mm_err:
            print(f"[TTS Proxy] ❌ MiniMax 语音生成失败: {mm_err}")
            raise HTTPException(status_code=500, detail=f"MiniMax 语音生成失败: {str(mm_err)}")

    if provider == "elevenlabs" or ref_audio_path.startswith("elevenlabs:"):
        from services.elevenlabs_service import elevenlabs_service
        target_voice = voice_id or ref_audio_path.removeprefix("elevenlabs:")
        try:
            if check_only == "true":
                cached, filename, _ = elevenlabs_service.check_cache(text, target_voice, emotion, actual_speed)
                return {"cached": cached, "filename": filename}
            result = await elevenlabs_service.generate_audio(text, target_voice, emotion, actual_speed, force_regenerate)
            return FileResponse(result["file_path"], media_type="audio/wav", filename=result["filename"],
                headers={"X-Audio-Filename": result["filename"], "Access-Control-Expose-Headers": "X-Audio-Filename"})
        except ValueError as error:
            raise HTTPException(400, str(error)) from error
        except RuntimeError as error:
            raise HTTPException(502, str(error)) from error

    # ========== 识别是否为 Fish.audio 云端供应商 ==========
    is_fish_audio = (
        (provider and provider.lower() in ("fish", "fish_audio", "fish_audio_tts")) or
        (ref_audio_path and (ref_audio_path.startswith("fish:") or ref_audio_path.startswith("fish_audio:")))
    )

    if is_fish_audio:
        from services.fish_audio_service import fish_audio_service

        target_voice_id = voice_id
        if not target_voice_id and ref_audio_path:
            if ref_audio_path.startswith("fish:"):
                target_voice_id = ref_audio_path[len("fish:"):].strip()
            elif ref_audio_path.startswith("fish_audio:"):
                target_voice_id = ref_audio_path[len("fish_audio:"):].strip()

        # 检查仅预检缓存
        if check_only == "true":
            cached, filename, _ = fish_audio_service.check_cache(
                text=text,
                emotion=emotion or "default",
                voice_id=target_voice_id or "",
                speed=actual_speed
            )
            return {
                "cached": cached,
                "filename": filename
            }

        try:
            result = await fish_audio_service.generate_audio(
                text=text,
                emotion=emotion or "default",
                voice_id=target_voice_id,
                speed=actual_speed,
                force_regenerate=force_regenerate
            )
            custom_headers = {
                "X-Audio-Filename": result["filename"],
                "Access-Control-Expose-Headers": "X-Audio-Filename"
            }
            return FileResponse(result["file_path"], media_type="audio/wav", headers=custom_headers)
        except Exception as fa_err:
            print(f"[TTS Proxy] ❌ Fish.audio 语音生成失败: {fa_err}")
            raise HTTPException(status_code=500, detail=f"Fish.audio 语音生成失败: {str(fa_err)}")

    # ========== GPT-SoVITS 本地模型流程 ==========
    _, cache_dir = get_current_dirs()

    try:
        # 新缓存Key: 包含情绪与语速
        speed_tag = f"_sp{actual_speed}" if actual_speed != 1.0 else ""
        new_key = f"{text}_{actual_emotion}_{text_lang}_{prompt_lang}{speed_tag}"
        new_hash = hashlib.md5(new_key.encode('utf-8')).hexdigest()
        new_filename = f"{new_hash}.wav"
        new_cache_path = os.path.join(cache_dir, new_filename)
        
        # 旧缓存Key: 包含音频路径 (用于兼容旧数据)
        old_key = f"{text}_{ref_audio_path}_{prompt_text}_{text_lang}_{prompt_lang}{speed_tag}"
        old_hash = hashlib.md5(old_key.encode('utf-8')).hexdigest()
        old_filename = f"{old_hash}.wav"
        old_cache_path = os.path.join(cache_dir, old_filename)

        # 响应头
        custom_headers = {
            "X-Audio-Filename": new_filename,
            "Access-Control-Expose-Headers": "X-Audio-Filename"
        }

        # 检查缓存是否存在 (不需要锁)
        if check_only == "true":
            # 优先检查新缓存,回退检查旧缓存
            cached = os.path.exists(new_cache_path) or os.path.exists(old_cache_path)
            return {
                "cached": cached,
                "filename": new_filename
            }

        # 优先查找新缓存 (不需要锁)
        if not force_regenerate and os.path.exists(new_cache_path):
            return FileResponse(new_cache_path, media_type="audio/wav", headers=custom_headers)

        # 回退查找旧缓存 (不需要锁)
        if not force_regenerate and os.path.exists(old_cache_path):
            # 找到旧缓存,复制到新Key (逐步迁移)
            try:
                import shutil
                shutil.copy2(old_cache_path, new_cache_path)
                print(f"[Cache Migration] {old_filename} -> {new_filename}")
            except Exception as e:
                print(f"[Cache Migration Failed] {e}")
            return FileResponse(old_cache_path, media_type="audio/wav", headers=custom_headers)

        # ========== 缓存未命中,需要生成,获取锁 ==========
        async with model_weight_service.acquire_lock(f"tts_proxy_{emotion}"):
            from validation_utils import validate_tts_request
            
            try:
                validate_tts_request(
                    text=text,
                    text_lang=text_lang,
                    ref_audio_path=ref_audio_path,
                    prompt_lang=prompt_lang,
                    sovits_host=get_sovits_host()
                )
            except HTTPException:
                # 验证失败时直接抛出,让 FastAPI 处理
                raise

            maintain_cache_size(cache_dir)

            # 转发请求给 SoVITS (非流式)
            url = f"{get_sovits_host()}/tts"
            params = {
                "text": text,
                "text_lang": text_lang,
                "ref_audio_path": ref_audio_path,
                "prompt_text": prompt_text,
                "prompt_lang": prompt_lang,
                "speed": actual_speed,
                "speed_factor": actual_speed,
                "streaming_mode": "false" # 明确关闭流式
            }

            try:
                async with httpx.AsyncClient(timeout=120.0, trust_env=model_trust_env(url)) as client:
                    r = await client.get(url, params=params)
            except (httpx.ConnectError, httpx.RequestError):
                raise HTTPException(status_code=503, detail="无法连接到 SoVITS 服务，请检查 9880 端口")

            if r.status_code != 200:
                raise HTTPException(status_code=500, detail=f"SoVITS Error: {r.status_code}")

            # 保存到新缓存路径
            temp_path = new_cache_path + ".tmp"

            try:
                with open(temp_path, "wb") as f:
                    f.write(r.content)

                if os.path.exists(new_cache_path):
                    os.remove(new_cache_path)
                os.rename(temp_path, new_cache_path)

            except Exception as e:
                print(f"文件保存错误: {e}")
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                raise HTTPException(status_code=500, detail="Failed to save audio file")

        # 新生成文件返回时,也带上 headers (锁已释放)
        return FileResponse(new_cache_path, media_type="audio/wav", headers=custom_headers)

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"General TTS Error: {e}")
        raise HTTPException(status_code=500, detail="TTS Server Internal Error")
# [添加到 routers/tts.py 末尾]

@router.get("/delete_cache")
def delete_cache(filename: str):
    """
    直接根据文件名删除缓存。
    前端从 audio url 中提取文件名传过来即可。
    """
    _, cache_dir = get_current_dirs()

    # 安全措施：只允许删除文件名，不允许带路径（防止删错系统文件）
    safe_filename = os.path.basename(filename)
    target_path = os.path.join(cache_dir, safe_filename)

    if os.path.exists(target_path):
        try:
            os.remove(target_path)
            return {"status": "success", "msg": f"Deleted {safe_filename}"}
        except PermissionError:
            print(f"Warning: File {safe_filename} is in use and cannot be deleted.")
            return {"status": "success", "msg": "File in use, skipped deletion"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
    else:
        # 如果文件本来就不在（可能已经被删了），也算成功，方便前端继续跑生成逻辑
        return {"status": "success", "msg": "File not found (already deleted?)"}


@router.post("/tts_proxy_v2")
async def tts_proxy_v2(req: TTSRequest, check_only: Optional[str] = None):
    """
    TTS代理接口 V2 - 支持完整GPT-SoVITS参数
    
    Args:
        req: TTS请求参数
        check_only: 仅检查缓存是否存在
    
    Returns:
        音频文件或缓存状态
    """
    _, cache_dir = get_current_dirs()

    # 执行 TTS 文本发音纠正与敏感/多音字替换
    req.text = apply_text_replacements(req.text)

    try:
        # 新缓存Key: 基于emotion,不包含具体音频路径
        # 包含影响音频质量的参数
        new_key = f"{req.text}_{req.emotion}_{req.text_lang}_{req.prompt_lang}_{req.speed_factor}_{req.temperature}"
        new_hash = hashlib.md5(new_key.encode('utf-8')).hexdigest()
        new_filename = f"{new_hash}.wav"
        new_cache_path = os.path.join(cache_dir, new_filename)
        
        # 旧缓存Key: 包含音频路径 (用于兼容旧数据)
        old_key = f"{req.text}_{req.ref_audio_path}_{req.prompt_text}_{req.text_lang}_{req.prompt_lang}_{req.speed_factor}_{req.temperature}"
        old_hash = hashlib.md5(old_key.encode('utf-8')).hexdigest()
        old_filename = f"{old_hash}.wav"
        old_cache_path = os.path.join(cache_dir, old_filename)

        custom_headers = {
            "X-Audio-Filename": new_filename,
            "Access-Control-Expose-Headers": "X-Audio-Filename"
        }

        # 检查缓存是否存在
        if check_only == "true":
            # 优先检查新缓存,回退检查旧缓存
            cached = os.path.exists(new_cache_path) or os.path.exists(old_cache_path)
            return {
                "cached": cached,
                "filename": new_filename
            }

        # 优先查找新缓存
        if os.path.exists(new_cache_path):
            return FileResponse(new_cache_path, media_type="audio/wav", headers=custom_headers)
        
        # 回退查找旧缓存
        if os.path.exists(old_cache_path):
            # 找到旧缓存,复制到新Key (逐步迁移)
            try:
                import shutil
                shutil.copy2(old_cache_path, new_cache_path)
                print(f"[Cache Migration V2] {old_filename} -> {new_filename}")
            except Exception as e:
                print(f"[Cache Migration V2 Failed] {e}")
            return FileResponse(old_cache_path, media_type="audio/wav", headers=custom_headers)

        maintain_cache_size(cache_dir)

        # 构建完整参数
        url = f"{get_sovits_host()}/tts"
        params = req.dict(exclude_none=True)  # 自动排除None值
        params["streaming_mode"] = False  # 强制非流式

        try:
            async with httpx.AsyncClient(timeout=120.0, trust_env=model_trust_env(url)) as client:
                r = await client.get(url, params=params)
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="无法连接到 SoVITS 服务,请检查 9880 端口")

        if r.status_code != 200:
            raise HTTPException(status_code=500, detail=f"SoVITS Error: {r.status_code}")

        # 保存到新缓存路径
        temp_path = new_cache_path + ".tmp"

        try:
            with open(temp_path, "wb") as f:
                f.write(r.content)

            if os.path.exists(new_cache_path):
                os.remove(new_cache_path)
            os.rename(temp_path, new_cache_path)

        except Exception as e:
            print(f"文件保存错误: {e}")
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise HTTPException(status_code=500, detail="Failed to save audio file")

        return FileResponse(new_cache_path, media_type="audio/wav", headers=custom_headers)

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"General TTS Error: {e}")
        raise HTTPException(status_code=500, detail="TTS Server Internal Error")
