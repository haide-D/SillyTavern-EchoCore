"""
MiniMax TTS 云端语音合成服务

支持 MiniMax T2A v2 (Text-to-Audio v2) 官方 API：
- 官方预设音色库 (少女、御姐、青涩青年、霸道总裁、播音主持等)
- 用户自定义克隆音色 ID (Voice Clone ID)
- 细粒度情绪参数映射与声学调优 (happy, sad, angry, whisper, climax, etc.)
- 本地高效文件缓存 (Cache/minimax/ 毫秒级命中秒返)
- 格式自动对齐 (转标准 16-bit PCM WAV，无缝适配 AudioMerger)
"""

import os
import io
import json
import hashlib
import asyncio
from typing import Dict, List, Optional, Tuple, Any
import httpx
from pydantic import BaseModel

from config import init_settings, load_json, save_json, SETTINGS_FILE, get_current_dirs, apply_text_replacements

# 官方常用预设音色库
MINIMAX_PRESET_VOICES = [
    {
        "id": "female-shaonv",
        "name": "少女音",
        "gender": "female",
        "category": "preset",
        "description": "清澈灵动、青春活力"
    },
    {
        "id": "female-yujie",
        "name": "御姐音",
        "gender": "female",
        "category": "preset",
        "description": "成熟知性、冷静优雅"
    },
    {
        "id": "female-tianmei",
        "name": "甜美音",
        "gender": "female",
        "category": "preset",
        "description": "软萌温柔、甜美治愈"
    },
    {
        "id": "female-chengshu",
        "name": "成熟女性",
        "gender": "female",
        "category": "preset",
        "description": "沉稳端庄、富有亲和力"
    },
    {
        "id": "presenter_female",
        "name": "女主持人",
        "gender": "female",
        "category": "preset",
        "description": "标准播音腔、字正腔圆"
    },
    {
        "id": "audiobook_female_1",
        "name": "女播音员 1",
        "gender": "female",
        "category": "preset",
        "description": "温和叙事、适合小说朗读"
    },
    {
        "id": "audiobook_female_2",
        "name": "女播音员 2",
        "gender": "female",
        "category": "preset",
        "description": "沉稳大气、情绪充沛"
    },
    {
        "id": "male-qn-qingse",
        "name": "青涩青年",
        "gender": "male",
        "category": "preset",
        "description": "阳光少年、自然清新"
    },
    {
        "id": "male-qn-jingying",
        "name": "精英青年",
        "gender": "male",
        "category": "preset",
        "description": "沉稳干练、自信温润"
    },
    {
        "id": "male-qn-badao",
        "name": "霸道青年",
        "gender": "male",
        "category": "preset",
        "description": "磁性低沉、富有掌控感"
    },
    {
        "id": "male-qn-daxuesheng",
        "name": "男大学生",
        "gender": "male",
        "category": "preset",
        "description": "清爽随和、日常口语化"
    },
    {
        "id": "presenter_male",
        "name": "男主持人",
        "gender": "male",
        "category": "preset",
        "description": "浑厚庄重、新闻级播音"
    },
    {
        "id": "audiobook_male_1",
        "name": "男播音员 1",
        "gender": "male",
        "category": "preset",
        "description": "故事感强、磁性浑厚"
    },
    {
        "id": "audiobook_male_2",
        "name": "男播音员 2",
        "gender": "male",
        "category": "preset",
        "description": "深度纪录片质感"
    }
]

# ST-Direct-TTS 情绪标签 -> MiniMax 情感与声学参数映射
DEFAULT_EMOTION_MAP = {
    "default": {"emotion": "neutral", "speed": 1.0, "pitch": 0, "vol": 1.0},
    "neutral": {"emotion": "neutral", "speed": 1.0, "pitch": 0, "vol": 1.0},
    "happy": {"emotion": "happy", "speed": 1.05, "pitch": 1, "vol": 1.05},
    "sad": {"emotion": "sad", "speed": 0.92, "pitch": -1, "vol": 0.9},
    "angry": {"emotion": "angry", "speed": 1.1, "pitch": 1, "vol": 1.2},
    "fear": {"emotion": "fearful", "speed": 1.08, "pitch": 1, "vol": 0.95},
    "fearful": {"emotion": "fearful", "speed": 1.08, "pitch": 1, "vol": 0.95},
    "disgust": {"emotion": "disgusted", "speed": 0.95, "pitch": -1, "vol": 1.0},
    "disgusted": {"emotion": "disgusted", "speed": 0.95, "pitch": -1, "vol": 1.0},
    "surprise": {"emotion": "surprised", "speed": 1.1, "pitch": 2, "vol": 1.1},
    "surprised": {"emotion": "surprised", "speed": 1.1, "pitch": 2, "vol": 1.1},
    "whisper": {"emotion": "neutral", "speed": 0.88, "pitch": -1, "vol": 0.7},
    "panting": {"emotion": "fearful", "speed": 1.15, "pitch": 1, "vol": 1.0},
    "climax": {"emotion": "happy", "speed": 1.12, "pitch": 2, "vol": 1.2},
    "smug": {"emotion": "happy", "speed": 1.02, "pitch": 1, "vol": 1.05}
}


class MiniMaxTTSService:
    """MiniMax 云端 TTS 服务管理器"""

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MiniMaxTTSService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized") and self._initialized:
            return
        self._initialized = True
        self._lock = None

    @staticmethod
    def get_config() -> Dict[str, Any]:
        """获取最新的 MiniMax 系统配置"""
        settings = init_settings()
        cfg = settings.get("minimax_tts", {})
        
        # 默认配置兜底
        defaults = {
            "enabled": False,
            "api_key": "",
            "group_id": "",
            "api_url": "https://api.minimax.chat/v1/t2a_v2",
            "model": "speech-01-turbo",
            "default_voice_id": "female-shaonv",
            "speed": 1.0,
            "vol": 1.0,
            "pitch": 0,
            "audio_format": "mp3",
            "sample_rate": 32000,
            "bitrate": 128000,
            "custom_voices": []
        }
        for k, v in defaults.items():
            if k not in cfg:
                cfg[k] = v
        return cfg

    @staticmethod
    def get_preset_voices() -> List[Dict[str, Any]]:
        """获取所有官方预设与用户添加的自定义克隆音色"""
        cfg = MiniMaxTTSService.get_config()
        custom = cfg.get("custom_voices", [])
        
        combined = list(MINIMAX_PRESET_VOICES)
        for c in custom:
            if isinstance(c, dict) and c.get("id"):
                combined.append({
                    "id": c["id"],
                    "name": c.get("name", c["id"]),
                    "gender": c.get("gender", "unknown"),
                    "category": "custom",
                    "description": c.get("description", "用户自定义克隆音色")
                })
        return combined

    @staticmethod
    def map_emotion(emotion_tag: Optional[str]) -> Dict[str, Any]:
        """
        将 ST 情绪标签映射至 MiniMax 情感代码与基础声学微调
        """
        if not emotion_tag:
            return DEFAULT_EMOTION_MAP["default"]
        
        tag = emotion_tag.strip().lower()
        if tag in DEFAULT_EMOTION_MAP:
            return DEFAULT_EMOTION_MAP[tag]
        
        # 模糊匹配
        for k, v in DEFAULT_EMOTION_MAP.items():
            if k in tag:
                return v
        return DEFAULT_EMOTION_MAP["default"]

    @staticmethod
    def get_cache_dir() -> str:
        """获取 MiniMax 专用缓存目录"""
        _, root_cache = get_current_dirs()
        minimax_cache = os.path.join(root_cache, "minimax")
        os.makedirs(minimax_cache, exist_ok=True)
        return minimax_cache

    @staticmethod
    def get_cache_key(
        text: str,
        voice_id: str,
        emotion: str,
        speed: float,
        pitch: int,
        vol: float,
        model: str
    ) -> Tuple[str, str]:
        """计算缓存哈希键与目标文件名"""
        raw_key = f"minimax_{text}_{voice_id}_{emotion}_{speed:.2f}_{pitch}_{vol:.2f}_{model}"
        hash_str = hashlib.md5(raw_key.encode("utf-8")).hexdigest()
        filename = f"{hash_str}.wav"
        return hash_str, filename

    @staticmethod
    def check_cache(
        text: str,
        voice_id: str,
        emotion: str = "default",
        speed: float = 1.0,
        pitch: int = 0,
        vol: float = 1.0,
        model: str = "speech-01-turbo"
    ) -> Tuple[bool, str, Optional[str]]:
        """
        检查指定参数的 MiniMax 音频是否命中本地缓存
        
        Returns:
            (cached, filename, file_path_if_exists)
        """
        cache_dir = MiniMaxTTSService.get_cache_dir()
        _, filename = MiniMaxTTSService.get_cache_key(text, voice_id, emotion, speed, pitch, vol, model)
        file_path = os.path.join(cache_dir, filename)
        
        if os.path.exists(file_path) and os.path.getsize(file_path) > 100:
            return True, filename, file_path
        return False, filename, None

    @classmethod
    async def test_credentials(cls, api_key: str, group_id: Optional[str] = None, api_url: Optional[str] = None) -> Dict[str, Any]:
        """
        快速验证 MiniMax API Key 连通性 (Group ID 为可选)
        """
        if not api_key or not api_key.strip():
            return {"success": False, "message": "API Key 不能为空"}

        target_url = (api_url or "https://api.minimax.chat/v1/t2a_v2").strip()
        if not target_url.endswith("/t2a_v2"):
            if not target_url.endswith("/v1"):
                target_url = target_url.rstrip("/") + "/v1/t2a_v2"
            else:
                target_url = target_url.rstrip("/") + "/t2a_v2"

        if group_id and group_id.strip():
            url = f"{target_url}?GroupId={group_id.strip()}"
        else:
            url = target_url
        headers = {
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json"
        }
        body = {
            "model": "speech-01-turbo",
            "text": "测试连接",
            "voice_setting": {
                "voice_id": "female-shaonv",
                "speed": 1.0,
                "vol": 1.0,
                "pitch": 0
            },
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": "mp3",
                "channel": 1
            }
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, headers=headers, json=body)
            
            if resp.status_code == 401 or resp.status_code == 403:
                return {"success": False, "message": f"鉴权失败 (HTTP {resp.status_code}): 请检查 API Key 是否正确"}
            
            if resp.status_code != 200:
                return {"success": False, "message": f"HTTP 请求失败 ({resp.status_code}): {resp.text[:200]}"}

            data = resp.json()
            base_resp = data.get("base_resp", {})
            status_code = base_resp.get("status_code", 0)
            status_msg = base_resp.get("status_msg", "success")

            if status_code != 0:
                if status_code == 1004:
                    return {"success": False, "message": f"MiniMax 账户余额不足 (错误码: 1004)"}
                elif status_code == 1001:
                    return {"success": False, "message": f"Group ID 或凭据无效 (错误码: 1001: {status_msg})"}
                elif status_code == 1002:
                    return {"success": False, "message": f"请求频率超限 (错误码: 1002: {status_msg})"}
                return {"success": False, "message": f"MiniMax API 错误 (码: {status_code}): {status_msg}"}

            if not data.get("data", {}).get("audio"):
                return {"success": False, "message": "MiniMax 响应中未包含音频数据流"}

            return {"success": True, "message": "MiniMax API 连通性测试通过！"}

        except Exception as e:
            return {"success": False, "message": f"连接 MiniMax 服务异常: {str(e)}"}

    @classmethod
    async def generate_audio(
        cls,
        text: str,
        voice_id: Optional[str] = None,
        emotion: str = "default",
        speed: Optional[float] = None,
        pitch: Optional[int] = None,
        vol: Optional[float] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        执行 MiniMax 语音合成 (支持本地缓存与格式自动对齐为 WAV)
        
        Args:
            text: 台词文本
            voice_id: 音色 ID (如 female-shaonv, male-qn-qingse 或克隆ID)
            emotion: ST 情绪标签 (happy, sad, whisper, etc.)
            speed: 语速倍率 (0.5 - 2.0)
            pitch: 音调调节 (-12 到 12)
            vol: 音量调节 (0.1 - 2.0)
            model: 模型版本 (默认 speech-01-turbo)
            
        Returns:
            Dict: {
                "audio_bytes": bytes,
                "file_path": str,
                "filename": str,
                "cached": bool,
                "duration": float
            }
        """
        # 1. 文本预处理与敏感词/发音纠错
        text = apply_text_replacements(text)
        if not text or not text.strip():
            raise ValueError("TTS 待合成文本为空")

        # 2. 读取配置
        cfg = cls.get_config()
        api_key = cfg.get("api_key", "").strip()
        group_id = cfg.get("group_id", "").strip()
        api_url = cfg.get("api_url", "https://api.minimax.chat/v1/t2a_v2").strip()
        active_model = (model or cfg.get("model") or "speech-01-turbo").strip()

        if not api_key:
            raise ValueError("MiniMax API Key 未配置，请在设置中填入有效的 MiniMax API Key")

        # 3. 音色与情绪参数合成
        final_voice_id = voice_id or cfg.get("default_voice_id") or "female-shaonv"
        # 去除可能存在的协议前缀
        if final_voice_id.startswith("minimax:"):
            final_voice_id = final_voice_id[len("minimax:"):].strip()

        emotion_info = cls.map_emotion(emotion)
        final_emotion = emotion_info["emotion"]

        # 声学参数微调 (用户指定 > 情绪映射 > 系统配置)
        base_speed = speed if speed is not None else cfg.get("speed", 1.0)
        final_speed = float(base_speed) * emotion_info.get("speed", 1.0)
        final_speed = max(0.5, min(2.0, round(final_speed, 2)))

        base_pitch = pitch if pitch is not None else cfg.get("pitch", 0)
        final_pitch = int(base_pitch) + int(emotion_info.get("pitch", 0))
        final_pitch = max(-12, min(12, final_pitch))

        base_vol = vol if vol is not None else cfg.get("vol", 1.0)
        final_vol = float(base_vol) * emotion_info.get("vol", 1.0)
        final_vol = max(0.1, min(2.0, round(final_vol, 2)))

        # 4. 本地缓存检查
        cached, filename, cached_path = cls.check_cache(
            text=text,
            voice_id=final_voice_id,
            emotion=emotion,
            speed=final_speed,
            pitch=final_pitch,
            vol=final_vol,
            model=active_model
        )

        cache_dir = cls.get_cache_dir()
        target_path = os.path.join(cache_dir, filename)

        if cached and cached_path and os.path.exists(cached_path):
            print(f"[MiniMax TTS] ⚡ 命中本地缓存: {filename} (voice={final_voice_id}, emotion={emotion})")
            with open(cached_path, "rb") as f:
                audio_bytes = f.read()
            return {
                "audio_bytes": audio_bytes,
                "file_path": cached_path,
                "filename": filename,
                "cached": True,
                "duration": cls._estimate_or_get_duration(audio_bytes)
            }

        # 5. 未命中缓存，发起网络请求
        print(f"[MiniMax TTS] 🌐 发起 API 请求: voice={final_voice_id}, model={active_model}, emotion={final_emotion}, text=\"{text[:30]}\"")
        
        target_url = api_url
        if not target_url.endswith("/t2a_v2"):
            if not target_url.endswith("/v1"):
                target_url = target_url.rstrip("/") + "/v1/t2a_v2"
            else:
                target_url = target_url.rstrip("/") + "/t2a_v2"
        
        if group_id and group_id.strip():
            request_url = f"{target_url}?GroupId={group_id.strip()}"
        else:
            request_url = target_url
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": active_model,
            "text": text,
            "voice_setting": {
                "voice_id": final_voice_id,
                "speed": final_speed,
                "vol": final_vol,
                "pitch": final_pitch,
                "emotion": final_emotion
            },
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": "mp3",
                "channel": 1
            }
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(request_url, headers=headers, json=payload)
        except (httpx.ConnectError, httpx.RequestError) as req_err:
            raise RuntimeError(f"无法连接到 MiniMax 云端 API: {req_err}")

        if response.status_code != 200:
            raise RuntimeError(f"MiniMax 请求失败 (HTTP {response.status_code}): {response.text[:300]}")

        res_json = response.json()
        base_resp = res_json.get("base_resp", {})
        status_code = base_resp.get("status_code", 0)
        status_msg = base_resp.get("status_msg", "success")

        if status_code != 0:
            if status_code == 1004:
                raise RuntimeError(f"MiniMax 账户余额不足 (错误码: 1004)")
            elif status_code == 1001:
                raise RuntimeError(f"MiniMax 鉴权无效 (错误码: 1001): {status_msg}")
            elif status_code == 1002:
                raise RuntimeError(f"MiniMax 触发并发频率限制 (错误码: 1002): {status_msg}")
            raise RuntimeError(f"MiniMax API 错误 (码 {status_code}): {status_msg}")

        hex_audio = res_json.get("data", {}).get("audio", "")
        if not hex_audio:
            raise RuntimeError(f"MiniMax 返回了空音频数据")

        # 6. Hex 解码为二进制音频数据
        try:
            raw_audio_bytes = bytes.fromhex(hex_audio)
        except Exception as hex_err:
            raise RuntimeError(f"MiniMax 音频 Hex 解码失败: {hex_err}")

        # 7. 自动将 MP3 / 原始流转换为标准的 16-bit PCM WAV（确保与现有 AudioMerger 与播放器 100% 兼容）
        wav_bytes = cls._convert_to_wav(raw_audio_bytes)

        # 8. 写入本地缓存文件
        temp_target = target_path + ".tmp"
        try:
            with open(temp_target, "wb") as f:
                f.write(wav_bytes)
            if os.path.exists(target_path):
                os.remove(target_path)
            os.rename(temp_target, target_path)
        except Exception as save_err:
            print(f"[MiniMax TTS] ⚠️ 写入缓存失败: {save_err}")
            if os.path.exists(temp_target):
                os.remove(temp_target)

        duration = cls._estimate_or_get_duration(wav_bytes)
        print(f"[MiniMax TTS] ✅ 音频合成成功: {len(wav_bytes)} 字节, 时长: {duration:.2f}s -> {filename}")

        return {
            "audio_bytes": wav_bytes,
            "file_path": target_path,
            "filename": filename,
            "cached": False,
            "duration": duration
        }

    @staticmethod
    def _convert_to_wav(audio_data: bytes) -> bytes:
        """将音频字节转换为标准 16-bit PCM WAV"""
        # 尝试通过 pydub 解析
        try:
            from pydub import AudioSegment
            seg = AudioSegment.from_file(io.BytesIO(audio_data))
            # 统一为单声道 32000Hz (或保持 32000)
            seg = seg.set_frame_rate(32000).set_channels(1)
            out_io = io.BytesIO()
            seg.export(out_io, format="wav")
            return out_io.getvalue()
        except Exception as e:
            # 如果 pydub 转换异常且本身就是 wav 格式，直接返回
            if audio_data.startswith(b"RIFF") and b"WAVE" in audio_data[:12]:
                return audio_data
            print(f"[MiniMax TTS] ⚠️ 音频转 WAV 异常 (使用原始字节): {e}")
            return audio_data

    @staticmethod
    def _estimate_or_get_duration(wav_data: bytes) -> float:
        """获取或估算音频时长 (秒)"""
        try:
            from pydub import AudioSegment
            seg = AudioSegment.from_file(io.BytesIO(wav_data))
            return len(seg) / 1000.0
        except Exception:
            # WAV 估算: 32000 Hz * 16 bit (2 bytes) * 1 ch = 64000 bytes/sec
            if len(wav_data) > 44:
                return (len(wav_data) - 44) / 64000.0
            return 1.0


# 全局单例导出
minimax_service = MiniMaxTTSService()
