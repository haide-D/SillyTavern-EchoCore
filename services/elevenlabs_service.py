"""Eleven v3 non-streaming speech, voice library and deterministic WAV cache."""
import hashlib
import io
import json
import os
import re
import tempfile
import wave
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from config import init_settings, get_current_dirs

DEFAULTS = {'api_key': '', 'api_base': 'https://api.elevenlabs.io',
            'model': 'eleven_v3', 'default_voice_id': '', 'stability': 0.5,
            'voices': [], 'audio_tags': True}


class ElevenLabsService:
    @staticmethod
    def get_config():
        saved = init_settings().get('elevenlabs_tts')
        return {**DEFAULTS, **(saved if isinstance(saved, dict) else {})}

    @classmethod
    def voices(cls):
        return cls.get_config().get('voices', [])

    @staticmethod
    def base_url(cfg):
        base = str(cfg.get('api_base') or DEFAULTS['api_base']).strip().rstrip('/')
        parsed = urlsplit(base)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.query or parsed.fragment:
            raise ValueError('ElevenLabs API 地址格式不正确')
        return base

    @staticmethod
    def voice_id(value):
        value = str(value or '').removeprefix('elevenlabs:').strip()
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', value):
            raise ValueError('请先配置有效的 ElevenLabs Voice ID')
        return value

    @staticmethod
    def headers(cfg):
        key = str(cfg.get('api_key') or '').strip()
        if not key:
            raise ValueError('请先保存 ElevenLabs API Key')
        return {'xi-api-key': key}

    @staticmethod
    def check_response(response):
        if response.status_code == 200:
            return
        messages = {401: 'API Key 无效', 403: 'API Key 缺少权限或音色不可用', 402: '账户额度不足',
                    404: '音色或接口不存在', 422: '语音参数无效', 429: '请求频率或并发超限，请稍后重试'}
        raise RuntimeError(f'ElevenLabs：{messages.get(response.status_code, "服务请求失败")}（HTTP {response.status_code}）')

    @classmethod
    async def remote_voices(cls):
        cfg = cls.get_config()
        voices, token, seen = [], None, set()
        async with httpx.AsyncClient(timeout=20) as client:
            for _ in range(100):
                params = {'page_size': 100}
                if token:
                    params['next_page_token'] = token
                response = await client.get(cls.base_url(cfg) + '/v2/voices', params=params, headers=cls.headers(cfg))
                cls.check_response(response)
                data = response.json()
                for voice in data.get('voices', []):
                    voice_id = cls.voice_id(voice.get('voice_id'))
                    if voice_id not in seen:
                        voices.append({'id': voice_id, 'name': str(voice.get('name') or voice_id), 'source': 'remote'})
                        seen.add(voice_id)
                if not data.get('has_more'):
                    return voices
                next_token = data.get('next_page_token')
                if not next_token or next_token == token:
                    raise RuntimeError('ElevenLabs 音色分页异常，未覆盖已有音色')
                token = next_token
        raise RuntimeError('音色库过大，未覆盖已有音色；可手动填写 Voice ID')

    @staticmethod
    def tagged_text(text, emotion, enabled=True):
        text = text.strip()
        if not enabled:
            return re.sub(r'\[[^\]\n]{1,80}\]', '', text).strip()
        # Preserve author-directed tags; do not prepend a conflicting emotion.
        if re.search(r'\[[^\]\n]{1,80}\]', text):
            return text
        tag = {'happy': 'happy', 'sad': 'sad', 'angry': 'angry', 'fear': 'nervous',
               '紧张': 'nervous', 'tense': 'nervous', '悲伤': 'sad', 'whisper': 'whispers',
               'excited': 'excited', 'laugh': 'laughs', 'sigh': 'sighs'}.get((emotion or '').lower())
        return f'[{tag}] {text}' if tag else text

    @classmethod
    def request_spec(cls, text, voice_id=None, emotion='default', speed=1.0):
        cfg = cls.get_config()
        voice = cls.voice_id(voice_id or cfg.get('default_voice_id'))
        stability = float(cfg.get('stability', 0.5))
        if stability not in (0.0, 0.5, 1.0):
            raise ValueError('V3 稳定度请选择创意、自然或稳健')
        clean = cls.tagged_text(text, emotion, cfg.get('audio_tags', True))
        if not clean or len(clean) > 5000:
            raise ValueError('Eleven V3 单段文本需为 1–5000 字符，请使用分段朗读')
        # V3 delivery speed is directed through tags, not the v2 speed parameter.
        if cfg.get('audio_tags', True):
            if speed < 0.9: clean = '[slowly] ' + clean
            elif speed > 1.1: clean = '[speaking quickly] ' + clean
        payload = {'text': clean, 'model_id': 'eleven_v3', 'voice_settings': {'stability': stability}}
        identity = json.dumps([cls.base_url(cfg), voice, payload, 'pcm_24000'], ensure_ascii=False, sort_keys=True)
        filename = 'eleven_' + hashlib.sha256(identity.encode()).hexdigest() + '.wav'
        # Shared cache tools (favorites, download and regeneration) address basenames.
        directory = Path(get_current_dirs()[1])
        return cfg, voice, payload, directory / filename

    @classmethod
    def check_cache(cls, text, voice_id=None, emotion='default', speed=1.0):
        _, _, _, path = cls.request_spec(text, voice_id, emotion, speed)
        return path.is_file() and path.stat().st_size > 44, path.name, str(path)

    @classmethod
    async def generate_audio(cls, text, voice_id=None, emotion='default', speed=1.0, force_regenerate=False):
        cfg, voice, payload, path = cls.request_spec(text, voice_id, emotion, speed)
        if not force_regenerate and path.is_file() and path.stat().st_size > 44:
            return {'audio_bytes': path.read_bytes(), 'file_path': str(path), 'filename': path.name, 'cached': True}
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                response = await client.post(cls.base_url(cfg) + f'/v1/text-to-speech/{voice}',
                    params={'output_format': 'pcm_24000'}, headers=cls.headers(cfg), json=payload)
        except httpx.RequestError as error:
            raise RuntimeError('ElevenLabs 连接失败或超时，请检查网络后重试') from error
        cls.check_response(response)
        pcm = response.content
        if len(pcm) < 2 or len(pcm) % 2 or 'json' in response.headers.get('content-type', ''):
            raise RuntimeError('ElevenLabs 返回无效 PCM 音频，未写入缓存')
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(24000); wav.writeframes(pcm)
        audio = buffer.getvalue()
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as file:
                temporary = file.name; file.write(audio)
            os.replace(temporary, path)
        finally:
            if temporary and os.path.exists(temporary): os.unlink(temporary)
        return {'audio_bytes': audio, 'file_path': str(path), 'filename': path.name, 'cached': False}


elevenlabs_service = ElevenLabsService()
