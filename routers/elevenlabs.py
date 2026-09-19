import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from config import init_settings, save_json, SETTINGS_FILE
from services.elevenlabs_service import elevenlabs_service as service

router = APIRouter(prefix='/tts/elevenlabs')


class Voice(BaseModel):
    id: str = Field(min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=100)


@router.get('/voices')
def voices():
    return {'voices': service.voices()}


@router.post('/sync')
async def sync():
    try:
        remote = await service.remote_voices()
        settings = init_settings()
        local = settings.get('elevenlabs_tts', {}).get('voices', [])
        merged = {voice['id']: voice for voice in remote}
        merged.update({voice['id']: voice for voice in local if voice.get('source') == 'manual'})
        settings.setdefault('elevenlabs_tts', {})['voices'] = list(merged.values())
        save_json(SETTINGS_FILE, settings)
        return {'voices': list(merged.values()), 'message': f'已同步 {len(remote)} 个音色'}
    except httpx.RequestError as error:
        raise HTTPException(502, "ElevenLabs 音色同步连接失败，请检查网络") from error
    except (ValueError, RuntimeError) as error:
        raise HTTPException(400, str(error)) from error


@router.post('/voices')
def add_voice(voice: Voice):
    try:
        voice_id = service.voice_id(voice.id)
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    settings = init_settings()
    cfg = settings.setdefault('elevenlabs_tts', {})
    items = {v['id']: v for v in cfg.get('voices', [])}
    items[voice_id] = {'id': voice_id, 'name': voice.name.strip() or voice_id, 'source': 'manual'}
    cfg['voices'] = list(items.values())
    save_json(SETTINGS_FILE, settings)
    return {'voices': cfg['voices']}


@router.delete('/voices/{voice_id}')
def delete_voice(voice_id: str):
    settings = init_settings()
    cfg = settings.setdefault('elevenlabs_tts', {})
    cfg['voices'] = [voice for voice in cfg.get('voices', []) if voice['id'] != voice_id]
    save_json(SETTINGS_FILE, settings)
    return {'voices': cfg['voices']}
