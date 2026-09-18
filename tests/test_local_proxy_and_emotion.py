import asyncio
import io
import os
import sys
import tempfile
import threading
import unittest
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from services.local_http import model_trust_env
from services.model_weight_service import ModelWeightService
from services.fish_audio_service import FishAudioTTSService as Fish
from services.minimax_service import MiniMaxTTSService


class LocalProxyTests(unittest.TestCase):
    def test_address_policy(self):
        for host in ['localhost', 'localhost.', '127.0.0.2', '[::1]', '[::ffff:127.0.0.1]', '192.168.1.2', '10.2.3.4', '172.16.5.6', '[fd00::1]', 'sovits.local']:
            self.assertFalse(model_trust_env(f'http://{host}:9880'))
        for host in ['api.fish.audio', 'example.org', '8.8.8.8', '198.18.0.1', '172.32.0.1']:
            self.assertTrue(model_trust_env(f'https://{host}'))

    def test_bad_proxy_does_not_intercept_model_switch(self):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
            def log_message(self, *args):
                pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = f'http://127.0.0.1:{server.server_port}'
        env = {'HTTP_PROXY': 'http://127.0.0.1:1', 'HTTPS_PROXY': 'http://127.0.0.1:1',
               'ALL_PROXY': 'http://127.0.0.1:1', 'NO_PROXY': ''}
        async def check(weights):
            async with httpx.AsyncClient(timeout=2) as client:
                with self.assertRaises((httpx.ConnectError, httpx.ConnectTimeout)):
                    await client.get(url)
            service = ModelWeightService()
            with patch('services.model_weight_service.get_sovits_host', return_value=url):
                self.assertTrue((await service.set_gpt_weights(weights, skip_if_same=False))['success'])
                self.assertTrue((await service.set_sovits_weights(weights, skip_if_same=False))['success'])
            service.reset_state()
        try:
            with tempfile.TemporaryDirectory() as temp, patch.dict(os.environ, env, clear=True):
                weights = Path(temp, 'fixture.ckpt'); weights.write_bytes(b'fixture')
                asyncio.run(check(str(weights)))
        finally:
            server.shutdown(); server.server_close(); thread.join()

    def test_emotion_model_syntax_and_cache_separation(self):
        self.assertEqual(Fish.emotion_text('hello', '紧张'), '[scared] hello')
        self.assertEqual(Fish.emotion_text('hello', 'whisper', 's1'), '(whispering) hello')
        self.assertEqual(Fish.emotion_text('hello', 'unknown'), 'hello')
        self.assertEqual(Fish.emotion_text('hello', 'default'), 'hello')
        with tempfile.TemporaryDirectory() as temp, patch.object(Fish, 'get_cache_dir', return_value=temp), patch.object(Fish, 'get_config', return_value={'model': 's2-pro', 'default_voice_id': 'voice'}):
            plain = Fish.check_cache('hello', '')[1]
            sad = Fish.check_cache('hello', '', emotion='sad')[1]
            effective = Fish.check_cache('[sad] hello', 'voice', model='s2-pro')[1]
            self.assertNotEqual(plain, sad)
            self.assertEqual(sad, effective)
        self.assertEqual(MiniMaxTTSService.map_emotion('紧张')['emotion'], 'fearful')

    def test_fish_generation_and_preflight_share_emotional_cache(self):
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as audio:
            audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(24000)
            audio.writeframes(b'\x00\x00' * 2400)
        response = httpx.Response(200, content=buffer.getvalue())
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.post.return_value = response
        cfg = {'api_key': 'fixture', 'model': 's2-pro', 'default_voice_id': 'voice'}
        with tempfile.TemporaryDirectory() as temp, patch.object(Fish, 'get_cache_dir', return_value=temp), patch.object(Fish, 'get_config', return_value=cfg), patch('services.fish_audio_service.httpx.AsyncClient', return_value=client):
            result = asyncio.run(Fish.generate_audio('hello', emotion='sad'))
            self.assertFalse(result['cached'])
            self.assertEqual(client.post.call_args.kwargs['json']['text'], '[sad] hello')
            self.assertTrue(Fish.check_cache('hello', '', emotion='sad')[0])
            self.assertFalse(Fish.check_cache('hello', '', emotion='happy')[0])
            replay = asyncio.run(Fish.generate_audio('hello', emotion='sad'))
            self.assertTrue(replay['cached'])
            self.assertEqual(replay['filename'], result['filename'])
            client.post.assert_awaited_once()


if __name__ == '__main__':
    unittest.main()
