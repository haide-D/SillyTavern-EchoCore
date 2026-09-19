import asyncio
import io
import sys
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from services.elevenlabs_service import ElevenLabsService as Eleven
from routers.tts import router
from phone_call_utils.tts_service import TTSService
from phone_call_utils.response_parser import EmotionSegment
from phone_call_utils.audio_pipeline import AudioPipeline
from services.emotion_service import EmotionService


class ElevenTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.cfg = {'api_key': 'fixture-only', 'default_voice_id': 'voiceA', 'stability': 0.5, 'audio_tags': True}
        self.config = patch.object(Eleven, 'get_config', return_value=self.cfg)
        self.config.start(); self.addCleanup(self.config.stop)
        self.dirs = patch('services.elevenlabs_service.get_current_dirs', return_value=(self.temp.name, self.temp.name))
        self.dirs.start(); self.addCleanup(self.dirs.stop)

    def mock_client(self, responses):
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.post.side_effect = responses
        return client

    def test_tags_payload_pcm_cache_and_force_regeneration(self):
        client = self.mock_client([httpx.Response(200, content=b'\x00\x00' * 200)] * 2)
        with patch('services.elevenlabs_service.httpx.AsyncClient', return_value=client):
            result = asyncio.run(Eleven.generate_audio('[whispers] Hello [sighs].', emotion='happy'))
            request = client.post.call_args
            self.assertEqual(request.kwargs['json']['model_id'], 'eleven_v3')
            self.assertEqual(request.kwargs['json']['text'], '[whispers] Hello [sighs].')
            self.assertEqual(request.kwargs['params'], {'output_format': 'pcm_24000'})
            self.assertEqual(request.kwargs['headers'], {'xi-api-key': 'fixture-only'})
            with wave.open(io.BytesIO(result['audio_bytes'])) as wav:
                self.assertEqual(wav.getframerate(), 24000)
                self.assertEqual(wav.getnchannels(), 1)
            replay = asyncio.run(Eleven.generate_audio('[whispers] Hello [sighs].', emotion='happy'))
            self.assertTrue(replay['cached']); client.post.assert_awaited_once()
            self.assertTrue(Eleven.check_cache('[whispers] Hello [sighs].', emotion='happy')[0])
            asyncio.run(Eleven.generate_audio('[whispers] Hello [sighs].', force_regenerate=True))
            self.assertEqual(client.post.await_count, 2)
        self.assertEqual(Eleven.tagged_text('Hello', 'whisper'), '[whispers] Hello')
        self.assertEqual(Eleven.tagged_text('[whispers] Hello', 'sad', False), 'Hello')

    def test_cache_parameters_and_validation(self):
        first = Eleven.request_spec('Hello')[3]
        self.cfg['stability'] = 0
        self.assertNotEqual(first, Eleven.request_spec('Hello')[3])
        self.assertNotEqual(first, Eleven.request_spec('Hello', voice_id='voiceB')[3])
        self.assertNotEqual(first, Eleven.request_spec('Hello', emotion='sad')[3])
        with self.assertRaises(ValueError): Eleven.request_spec('Hello', voice_id='../secret')
        self.cfg['stability'] = 0.7
        with self.assertRaises(ValueError): Eleven.request_spec('Hello')

    def test_error_does_not_cache_or_retry(self):
        for status in [401, 403, 402, 404, 422, 429, 503]:
            client = self.mock_client([httpx.Response(status, json={'detail': 'fixture'})])
            with patch('services.elevenlabs_service.httpx.AsyncClient', return_value=client):
                with self.assertRaisesRegex(RuntimeError, str(status)):
                    asyncio.run(Eleven.generate_audio('Hello'))
            client.post.assert_awaited_once()
            self.assertFalse(Eleven.check_cache('Hello')[0])

    def test_voice_pagination(self):
        client = self.mock_client([])
        client.get.side_effect = [httpx.Response(200, json={'voices': [{'voice_id': 'a', 'name': 'A'}], 'has_more': True, 'next_page_token': 'p2'}),
                                httpx.Response(200, json={'voices': [{'voice_id': 'b', 'name': 'B'}], 'has_more': False})]
        with patch('services.elevenlabs_service.httpx.AsyncClient', return_value=client):
            voices = asyncio.run(Eleven.remote_voices())
        self.assertEqual([v['id'] for v in voices], ['a', 'b'])
        self.assertEqual(client.get.call_args.kwargs['params']['next_page_token'], 'p2')

    def test_proxy_route_and_phone_preserve_tags(self):
        app = FastAPI(); app.include_router(router)
        client = TestClient(app)
        path = Path(self.temp.name, 'test.wav'); path.write_bytes(b'fixture')
        generation = AsyncMock(return_value={'file_path': str(path), 'filename': path.name, 'audio_bytes': b'fixture'})
        with patch.object(Eleven, 'generate_audio', generation), patch('routers.tts.apply_text_replacements', side_effect=lambda text: text):
            response = client.get('/tts_proxy', params={'text': '[laughs] Hello', 'provider': 'elevenlabs', 'voice_id': 'voiceA', 'emotion': 'happy'})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers['X-Audio-Filename'], 'test.wav')
            self.assertEqual(generation.call_args.args[:3], ('[laughs] Hello', 'voiceA', 'happy'))
            segment = EmotionSegment(text='[sighs] Hello', emotion='sad', speed=1)
            self.assertEqual(asyncio.run(TTSService('unused').generate_audio(segment, {'path': 'elevenlabs:voiceA'}, {})), b'fixture')
            self.assertEqual(generation.call_args.args[:3], ('[sighs] Hello', 'voiceA', 'sad'))

    def test_voice_sync_preserves_manual_and_failed_sync_does_not_write(self):
        app = FastAPI(); app.include_router(router)
        client = TestClient(app)
        settings = {'elevenlabs_tts': {'voices': [{'id': 'voiceA', 'name': 'My name', 'source': 'manual'}]}}
        with patch('routers.elevenlabs.init_settings', return_value=settings), patch('routers.elevenlabs.save_json') as save:
            remote = AsyncMock(return_value=[{'id': 'voiceA', 'name': 'Remote name'}, {'id': 'voiceB', 'name': 'B'}])
            with patch.object(Eleven, 'remote_voices', remote):
                response = client.post('/tts/elevenlabs/sync')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()['voices'][0]['name'], 'My name')
                save.assert_called_once()
            save.reset_mock()
            with patch.object(Eleven, 'remote_voices', AsyncMock(side_effect=RuntimeError('fixture failure'))):
                self.assertEqual(client.post('/tts/elevenlabs/sync').status_code, 400)
                save.assert_not_called()
            self.assertEqual(client.post('/tts/elevenlabs/voices', json={'id': '../bad', 'name': 'bad'}).status_code, 400)
            self.assertEqual(client.post('/tts/elevenlabs/voices', json={'id': 'voiceC', 'name': 'C'}).status_code, 200)
            self.assertEqual(len(client.delete('/tts/elevenlabs/voices/voiceC').json()['voices']), 2)

    def test_phone_pipeline_skips_local_model_lock(self):
        wav = io.BytesIO()
        with wave.open(wav, 'wb') as output:
            output.setnchannels(1); output.setsampwidth(2); output.setframerate(24000); output.writeframes(b'\x00\x00' * 2400)
        pipeline = AudioPipeline('unused')
        segment = EmotionSegment(text='[whispers] Hello', emotion='whisper', speed=1)
        with patch('config.is_minimax_character', return_value=False), patch('config.get_character_provider', return_value='elevenlabs'), \
             patch.object(EmotionService, '_resolve_model_target', return_value='elevenlabs:voiceA'), \
             patch.object(Eleven, 'generate_audio', AsyncMock(return_value={'audio_bytes': wav.getvalue()})) as generate, \
             patch('phone_call_utils.audio_pipeline.model_weight_service.use_model') as lock, \
             patch.object(pipeline.audio_merger, 'merge_segments', return_value=wav.getvalue()):
            audio, segments = asyncio.run(pipeline.synthesize_segments('Alice', [segment], {}, {}))
            self.assertTrue(audio); self.assertGreater(segments[0].audio_duration, 0)
            self.assertEqual(generate.call_args.args[:3], ('[whispers] Hello', 'voiceA', 'whisper'))
            lock.assert_not_called()

    def test_shared_cache_can_be_regenerated(self):
        client = self.mock_client([httpx.Response(200, content=b'\x00\x00' * 200)])
        with patch('services.elevenlabs_service.httpx.AsyncClient', return_value=client):
            result = asyncio.run(Eleven.generate_audio('Hello'))
        app = FastAPI(); app.include_router(router)
        with patch('routers.tts.get_current_dirs', return_value=(self.temp.name, self.temp.name)):
            response = TestClient(app).get('/delete_cache', params={'filename': result['filename']})
            self.assertEqual(response.status_code, 200)
        self.assertFalse(Eleven.check_cache('Hello')[0])


if __name__ == '__main__': unittest.main()
