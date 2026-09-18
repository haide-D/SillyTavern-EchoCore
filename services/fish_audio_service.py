# services/fish_audio_service.py
"""
Fish.audio TTS 云端语音合成服务

支持 Fish Audio 官方 API：
- 底层推理模型选择 (通过 Header `model: s2.1-pro` 传递)
- 声音模型 reference_id 驱动 (支持角色克隆声线与社区声音)
- 账号收藏音色一键远程同步 (GET https://api.fish.audio/model?self=true)
- 本地高效文件缓存 (Cache/fish_audio/ 毫秒级命中秒返，杜绝重复扣费)
- 统一转码为标准 16-bit PCM WAV，无缝对接前端播放器与连麦管线
"""

import os
import io
import json
import hashlib
import asyncio
from typing import Optional, Dict, Any, List, Tuple
import httpx

from config import get_current_dirs, init_settings, load_json, save_json, SETTINGS_FILE

# 官方预设基础模型版本
SUPPORTED_FISH_BASE_MODELS = [
    {"id": "s2.1-pro", "name": "s2.1-pro (官方推荐·最新生产级)", "description": "吞吐量、音质与低延迟平衡最佳的主力大模型"},
    {"id": "s2.1-pro-free", "name": "s2.1-pro-free (免费/测试通道)", "description": "同 s2.1-pro 高质量，适合调试与免费试用"},
    {"id": "s2-pro", "name": "s2-pro (上一代旗舰模型)", "description": "支持自然语言情感与多角色控制"},
    {"id": "drama-3-preview", "name": "drama-3-preview (戏剧/情感实验版)", "description": "情感表现力丰富，适合剧情戏剧化朗读"},
    {"id": "s1", "name": "s1 (旧版初代模型)", "description": "兼容旧版整合项目的历史模型"}
]

# 官方社区经典声音模型（开箱即用体验）
FISH_PRESET_VOICES = [
    {
        "id": "7f92f8afb8ec43bf81429cc1c9199cb1",
        "name": "温柔知性小姐姐 (示例预设)",
        "gender": "female",
        "category": "preset",
        "description": "温柔柔和女声，适合旁白或温柔角色"
    },
    {
        "id": "9a9cf47702da476aa4629e2506d4a857",
        "name": "元气活泼少女 (示例预设)",
        "gender": "female",
        "category": "preset",
        "description": "明朗活泼、声线清澈的少女音"
    },
    {
        "id": "8029148a07114138a08d633f84e27f71",
        "name": "沉稳磁性男声 (示例预设)",
        "gender": "male",
        "category": "preset",
        "description": "沉稳、富有磁性的成年男声"
    }
]


class FishAudioTTSService:
    """Fish.audio 云端 TTS 服务管理器"""

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(FishAudioTTSService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized") and self._initialized:
            return
        self._initialized = True
        self._lock = asyncio.Lock()

    @staticmethod
    def get_config() -> Dict[str, Any]:
        """获取最新的 Fish.audio 系统配置"""
        settings = init_settings()
        cfg = settings.get("fish_audio_tts", {})

        defaults = {
            "enabled": False,
            "api_key": "",
            "api_url": "https://api.fish.audio/v1/tts",
            "model": "s2.1-pro",
            "default_voice_id": "",
            "speed": 1.0,
            "format": "wav",
            "latency": "normal",
            "custom_voices": []
        }
        for k, v in defaults.items():
            if k not in cfg:
                cfg[k] = v
        return cfg

    @classmethod
    def get_preset_voices(cls) -> List[Dict[str, Any]]:
        """获取所有可用音色（直接允许重复：用户自定义音色与预设音色全部并列展示）"""
        cfg = cls.get_config()
        custom_list = cfg.get("custom_voices", [])

        voices = []
        # 1. 优先展示所有用户添加的自定义音色 (直接允许重复 ID，保留各自的独立名称)
        if isinstance(custom_list, list):
            for cv in custom_list:
                if isinstance(cv, dict) and cv.get("id"):
                    cid = cv["id"].strip()
                    voices.append({
                        "id": cid,
                        "name": (cv.get("name") or cid).strip(),
                        "gender": cv.get("gender", "female"),
                        "category": cv.get("category", "custom"),
                        "description": cv.get("description", "用户自定义音色"),
                        "tags": cv.get("tags", [])
                    })

        # 2. 官方示例预设音色 (全部完整保留，直接允许重复)
        for pv in FISH_PRESET_VOICES:
            voices.append(dict(pv))

        return voices

    @staticmethod
    def emotion_text(text: str, emotion: str = "default", model: str = "s2.1-pro") -> str:
        """Use model-specific inline cues; unknown cues safely retain plain text."""
        aliases = {"紧张": "scared", "tense": "scared", "fear": "scared", "恐惧": "scared",
                   "悲伤": "sad", "阴沉": "sad", "开心": "happy", "高兴": "happy",
                   "愤怒": "angry", "whisper": "whispering", "低语": "whispering",
                   "激动": "excited"}
        tag = (emotion or "default").strip().lower()
        tag = aliases.get(tag, tag)
        if tag not in {"happy", "sad", "angry", "scared", "whispering", "excited"}:
            return text.strip()
        cue = f"[{tag}]" if model.startswith("s2") else f"({tag})"
        clean = text.strip()
        return clean if clean.startswith(cue) else f"{cue} {clean}"

    @classmethod
    def get_cache_dir(cls) -> str:
        """获取 Fish Audio 专用缓存目录"""
        _, root_cache = get_current_dirs()
        fish_cache = os.path.join(root_cache, "fish_audio")
        os.makedirs(fish_cache, exist_ok=True)
        return fish_cache

    @classmethod
    def get_cache_key(
        cls,
        text: str,
        voice_id: str,
        speed: float,
        model: str,
        format_ext: str = "wav"
    ) -> Tuple[str, str]:
        """生成唯一缓存键及文件路径"""
        raw_key = f"fish_{text}_{voice_id}_{speed:.2f}_{model}_{format_ext}"
        md5_hash = hashlib.md5(raw_key.encode("utf-8")).hexdigest()
        filename = f"fish_{md5_hash}.wav"
        return md5_hash, filename

    @classmethod
    def check_cache(
        cls,
        text: str,
        voice_id: str,
        speed: float = 1.0,
        model: Optional[str] = None,
        emotion: str = "default"
    ) -> Tuple[bool, str, Optional[str]]:
        """检查指定参数的音频是否已命中本地缓存"""
        cfg = cls.get_config()
        model = model or cfg.get("model", "s2.1-pro")
        voice_id = voice_id or cfg.get("default_voice_id", "")
        speed = max(0.5, min(2.0, float(speed)))
        text = cls.emotion_text(text, emotion, model)
        cache_dir = cls.get_cache_dir()
        _, filename = cls.get_cache_key(text, voice_id, speed, model)
        file_path = os.path.join(cache_dir, filename)
        if os.path.exists(file_path) and os.path.getsize(file_path) > 1024:
            return True, filename, file_path
        return False, filename, None

    @classmethod
    async def test_credentials(
        cls,
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """快速验证 Fish.audio API Key 连通性与权限"""
        cfg = cls.get_config()
        effective_key = (api_key if api_key is not None else cfg.get("api_key", "")).strip()

        if not effective_key:
            return {
                "success": False,
                "message": "Fish.audio API Key 为空，请先输入有效的 API Key"
            }

        headers = {
            "Authorization": f"Bearer {effective_key}"
        }

        test_url = "https://api.fish.audio/model?self=true&page_size=1"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(test_url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    total_models = data.get("total", 0) if isinstance(data, dict) else len(data)
                    return {
                        "success": True,
                        "message": f"Fish.audio API 连通性测试通过！检测到当前账户拥有/收藏 {total_models} 个声音模型。"
                    }
                elif response.status_code == 401:
                    return {
                        "success": False,
                        "message": "Fish.audio API Key 无效或已过期 (HTTP 401 Unauthorized)"
                    }
                elif response.status_code == 403:
                    return {
                        "success": False,
                        "message": "Fish.audio 账户受限或权限不足 (HTTP 403 Forbidden)"
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Fish.audio 接口响应异常 (HTTP {response.status_code}): {response.text[:200]}"
                    }
        except httpx.TimeoutException:
            return {
                "success": False,
                "message": "连接 Fish.audio 服务器超时 (10秒)，请检查网络或代理设置"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"连接 Fish.audio 失败: {str(e)}"
            }

    @classmethod
    async def sync_remote_voices(cls, api_key: Optional[str] = None) -> Dict[str, Any]:
        """
        从 Fish.audio 官方拉取当前账号收藏/创建的 Voice Models，并合并保存至本地 custom_voices
        """
        cfg = cls.get_config()
        effective_key = (api_key if api_key is not None else cfg.get("api_key", "")).strip()

        if not effective_key:
            return {
                "success": False,
                "message": "Fish.audio API Key 为空，无法同步远程音色"
            }

        headers = {
            "Authorization": f"Bearer {effective_key}"
        }

        url = "https://api.fish.audio/model?self=true&page_size=100"

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                if response.status_code == 401:
                    raise ValueError("Fish.audio API Key 无效或未授权 (HTTP 401)")
                raise RuntimeError(f"同步音色失败 (HTTP {response.status_code}): {response.text[:200]}")

            res_json = response.json()
            items = []
            if isinstance(res_json, dict) and "items" in res_json:
                items = res_json["items"]
            elif isinstance(res_json, list):
                items = res_json

            # 读取当前系统设置
            settings = load_json(SETTINGS_FILE)
            if "fish_audio_tts" not in settings:
                settings["fish_audio_tts"] = {}
            if "custom_voices" not in settings["fish_audio_tts"]:
                settings["fish_audio_tts"]["custom_voices"] = []

            local_custom = settings["fish_audio_tts"]["custom_voices"]
            local_map = {item["id"]: item for item in local_custom if isinstance(item, dict) and "id" in item}

            added_count = 0
            for model in items:
                model_id = model.get("_id") or model.get("id")
                if not model_id:
                    continue
                title = model.get("title") or model_id
                desc = model.get("description") or "来自 Fish.audio 个人音色库"
                tags = model.get("tags") or []
                languages = model.get("languages") or []

                voice_entry = {
                    "id": model_id.strip(),
                    "name": title.strip(),
                    "gender": "female" if any("女" in str(t) or "female" in str(t).lower() for t in tags) else "custom",
                    "category": "remote_sync",
                    "description": desc.strip(),
                    "tags": tags,
                    "languages": languages
                }

                if model_id not in local_map:
                    added_count += 1
                local_map[model_id] = voice_entry

            settings["fish_audio_tts"]["custom_voices"] = list(local_map.values())
            save_json(SETTINGS_FILE, settings)
            init_settings()

            return {
                "success": True,
                "synced_count": len(items),
                "added_count": added_count,
                "total_custom": len(settings["fish_audio_tts"]["custom_voices"]),
                "voices": cls.get_preset_voices(),
                "message": f"成功从 Fish.audio 同步 {len(items)} 个音色模型 (新增/更新 {added_count} 个)"
            }

    @classmethod
    async def generate_audio(
        cls,
        text: str,
        voice_id: Optional[str] = None,
        speed: Optional[float] = 1.0,
        model: Optional[str] = None,
        force_regenerate: bool = False,
        emotion: str = "default"
    ) -> Dict[str, Any]:
        """
        调用 Fish.audio 官方 API 合成语音，包含 SHA-256 本地文件级缓存
        """
        cfg = cls.get_config()

        # 1. 参数校验与清洗
        clean_text = (text or "").strip()
        if not clean_text:
            raise ValueError("待合成文本内容为空")

        api_key = cfg.get("api_key", "").strip()
        if not api_key:
            raise ValueError("Fish.audio API Key 未配置，请在扩展设置中填入有效密钥")

        api_url = cfg.get("api_url", "https://api.fish.audio/v1/tts").strip() or "https://api.fish.audio/v1/tts"
        active_model = (model or cfg.get("model", "s2.1-pro")).strip() or "s2.1-pro"

        clean_text = cls.emotion_text(clean_text, emotion, active_model)

        # 提取 voice_id
        final_voice_id = (voice_id or cfg.get("default_voice_id", "")).strip()
        if final_voice_id.startswith("fish:"):
            final_voice_id = final_voice_id[len("fish:"):].strip()
        elif final_voice_id.startswith("fish_audio:"):
            final_voice_id = final_voice_id[len("fish_audio:"):].strip()

        # 规范语速 (0.5 ~ 2.0)
        base_speed = speed if speed is not None else cfg.get("speed", 1.0)
        try:
            final_speed = max(0.5, min(2.0, float(base_speed)))
        except (ValueError, TypeError):
            final_speed = 1.0

        # 2. 检查本地文件缓存
        cached, filename, cached_path = cls.check_cache(
            text=clean_text,
            voice_id=final_voice_id,
            speed=final_speed,
            model=active_model
        )

        cache_dir = cls.get_cache_dir()
        target_path = os.path.join(cache_dir, filename)

        if not force_regenerate and cached and cached_path and os.path.exists(cached_path):
            print(f"[Fish Audio TTS] ⚡ 命中本地缓存: {filename} (voice={final_voice_id}, speed={final_speed:.2f})")
            with open(cached_path, "rb") as f:
                audio_bytes = f.read()
            return {
                "audio_bytes": audio_bytes,
                "file_path": cached_path,
                "filename": filename,
                "cached": True,
                "duration": cls._estimate_or_get_duration(audio_bytes)
            }

        # 3. 未命中缓存，发起网络请求
        print(f"[Fish Audio TTS] 🌐 发起 API 请求: voice={final_voice_id}, model={active_model}, speed={final_speed:.2f}, text=\"{clean_text[:30]}\"")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "model": active_model  # 官方规范：基础模型版本通过 Header 传递
        }

        payload: Dict[str, Any] = {
            "text": clean_text,
            "format": "wav",
            "latency": cfg.get("latency", "normal"),
            "prosody": {
                "speed": round(final_speed, 2),
                "volume": 0
            }
        }
        if final_voice_id:
            payload["reference_id"] = final_voice_id

        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                response = await client.post(api_url, headers=headers, json=payload)
        except httpx.TimeoutException:
            raise RuntimeError("请求 Fish.audio 云端 API 超时 (35秒)，请检查网络或重试")
        except Exception as req_err:
            raise RuntimeError(f"无法连接到 Fish.audio 云端 API: {req_err}")

        # 4. 状态码异常细化处理
        if response.status_code != 200:
            if response.status_code == 401:
                raise RuntimeError("Fish.audio API Key 无效或未授权 (HTTP 401)")
            elif response.status_code == 402:
                raise RuntimeError("Fish.audio 账户余额或积分不足 (HTTP 402 Insufficient credits)")
            elif response.status_code == 422:
                err_detail = response.text[:200]
                raise RuntimeError(f"Fish.audio 请求参数校验失败 (HTTP 422)，请检查 Voice ID 是否存在: {err_detail}")
            elif response.status_code == 429:
                raise RuntimeError("Fish.audio 触发 API 请求频率限制 (HTTP 429 Too Many Requests)，请稍后重试")
            else:
                raise RuntimeError(f"Fish.audio 请求失败 (HTTP {response.status_code}): {response.text[:300]}")

        raw_audio = response.content
        if not raw_audio or len(raw_audio) < 100:
            raise RuntimeError("Fish.audio 返回的音频数据过小或无效")

        # 5. 音频转码与持久化落盘
        wav_bytes = cls._convert_to_wav(raw_audio)
        temp_target = f"{target_path}.tmp_{os.getpid()}"
        try:
            with open(temp_target, "wb") as f:
                f.write(wav_bytes)
            if os.path.exists(target_path):
                os.remove(target_path)
            os.rename(temp_target, target_path)
        finally:
            if os.path.exists(temp_target):
                os.remove(temp_target)

        duration = cls._estimate_or_get_duration(wav_bytes)
        print(f"[Fish Audio TTS] ✅ 音频合成成功: {len(wav_bytes)} 字节, 时长: {duration:.2f}s -> {filename}")

        return {
            "audio_bytes": wav_bytes,
            "file_path": target_path,
            "filename": filename,
            "cached": False,
            "duration": duration
        }

    @staticmethod
    def _convert_to_wav(audio_data: bytes) -> bytes:
        """确保转为标准 PCM WAV"""
        if audio_data.startswith(b"RIFF") and b"WAVE" in audio_data[:12]:
            return audio_data
        try:
            from pydub import AudioSegment
            seg = AudioSegment.from_file(io.BytesIO(audio_data))
            out_io = io.BytesIO()
            seg.export(out_io, format="wav")
            return out_io.getvalue()
        except Exception as e:
            print(f"[Fish Audio TTS] ⚠️ 转码 WAV 异常 (使用原始字节): {e}")
            return audio_data

    @staticmethod
    def _estimate_or_get_duration(wav_data: bytes) -> float:
        """计算音频时长"""
        try:
            from pydub import AudioSegment
            seg = AudioSegment.from_file(io.BytesIO(wav_data))
            return len(seg) / 1000.0
        except Exception:
            if len(wav_data) > 44:
                return (len(wav_data) - 44) / 64000.0
            return 1.0


# 全局单例
fish_audio_service = FishAudioTTSService()
