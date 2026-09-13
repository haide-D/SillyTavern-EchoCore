"""持久化全文成品；只接收 PCM WAV，不请求供应商或接收任意文件路径。"""
import os
import re
import tempfile
import wave
import hashlib
from pydantic import BaseModel, Field
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from config import DATA_DIR

router = APIRouter(prefix='/fulltext-audio')
MAX_BYTES = 200 * 1024 * 1024


class Identity(BaseModel):
    identity: str = Field(max_length=1000000)


@router.post('/identity')
def identify(body: Identity):
    return {'key': hashlib.sha256(body.identity.encode('utf-8')).hexdigest()}


def audio_path(key: str) -> Path:
    if not re.fullmatch(r'[a-f0-9]{64}', key):
        raise HTTPException(400, '无效的全文音频标识')
    directory = Path(DATA_DIR) / 'fulltext_audio'
    directory.mkdir(parents=True, exist_ok=True)
    return directory / f'{key}.wav'


@router.get('/{key}/status')
def status(key: str):
    return {'exists': audio_path(key).is_file()}


@router.get('/{key}')
def download(key: str):
    target = audio_path(key)
    if not target.is_file():
        raise HTTPException(404, '完整音频不存在，请重新生成')
    return FileResponse(target, media_type='audio/wav', filename='全文朗读.wav',
                        headers={'Cache-Control': 'no-cache'})


@router.put('/{key}')
async def save(key: str, request: Request):
    target = audio_path(key)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, suffix='.tmp', delete=False) as output:
            temporary = output.name
            size = 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > MAX_BYTES:
                    raise HTTPException(413, '全文音频超过 200MB，请分成较短的消息')
                output.write(chunk)
        try:
            with wave.open(temporary, 'rb') as audio:
                if (audio.getnchannels() != 1 or audio.getsampwidth() != 2 or
                        audio.getframerate() != 24000 or audio.getnframes() == 0):
                    raise ValueError('unsupported PCM')
                frames = audio.getnframes()
                if len(audio.readframes(frames)) != frames * 2:
                    raise ValueError('truncated PCM')
        except (wave.Error, EOFError, ValueError):
            raise HTTPException(400, '需要完整的 24kHz 单声道 PCM16 WAV 文件')
        os.replace(temporary, target)
        return {'exists': True}
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)
