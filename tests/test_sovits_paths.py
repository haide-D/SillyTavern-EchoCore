import asyncio
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from config import load_json, save_json
from services.sovits_paths import map_sovits_path, map_sovits_audio_params
from services.model_weight_service import ModelWeightService
from phone_call_utils.tts_service import TTSService
from phone_call_utils.response_parser import EmotionSegment
from routers import tts, admin


class PathMappingTests(unittest.TestCase):
    def test_cross_platform_paths(self):
        cases = [
            ('/app/MyCharacters', r'Z:\MyCharacters', '/app/MyCharacters/Rain/Rain.ckpt', r'Z:\MyCharacters\Rain\Rain.ckpt'),
            ('/app/MyCharacters/', r'\\nas\models', '/app/MyCharacters/雨/参考 音频.wav', r'\\nas\models\雨\参考 音频.wav'),
            (r'C:\Models', '/models', 'c:/models/Rain/ref.wav', '/models/Rain/ref.wav'),
            (r'\\nas\models', '/models', r'\\nas\models\Rain\Rain.pth', '/models/Rain/Rain.pth'),
            ('/app/models', '/srv/models/', '/app/models/Rain/ref.wav', '/srv/models/Rain/ref.wav'),
            ('./MyCharacters', '/remote', os.path.abspath('MyCharacters/Rain/ref.wav'), '/remote/Rain/ref.wav'),
        ]
        for base, remote, source, expected in cases:
            with self.subTest(source=source, remote=remote):
                self.assertEqual(map_sovits_path(source, {'base_dir': base, 'sovits_model_dir': remote}), expected)

    def test_unchanged_paths_and_boundaries(self):
        for path in ['/app/models-other/a.wav', '/app/models/../other/a.wav', '/outside/a.wav', '']:
            self.assertEqual(map_sovits_path(path, {'base_dir': '/app/models', 'sovits_model_dir': '/remote'}), path)
        self.assertEqual(map_sovits_path('/app/models/a.wav', {'base_dir': '/app/models'}), '/app/models/a.wav')
        self.assertEqual(map_sovits_path(r'D:\models\a.wav', {'base_dir': r'C:\models', 'sovits_model_dir': '/remote'}), r'D:\models\a.wav')

    def test_audio_params_preserve_input(self):
        params = {'ref_audio_path': '/local/main.wav', 'aux_ref_audio_paths': ['/local/aux.wav'], 'text': '/local/text'}
        with patch('services.sovits_paths.init_settings', return_value={'base_dir': '/local', 'sovits_model_dir': '/remote'}):
            mapped = map_sovits_audio_params(params)
        self.assertEqual(mapped['ref_audio_path'], '/remote/main.wav')
        self.assertEqual(mapped['aux_ref_audio_paths'], ['/remote/aux.wav'])
        self.assertEqual(params['aux_ref_audio_paths'], ['/local/aux.wav'])
        self.assertEqual(mapped['text'], params['text'])


class RequestMappingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.cfg = {'base_dir': self.temp.name, 'sovits_model_dir': '/remote'}
        self.client = AsyncMock()
        self.client.__aenter__.return_value = self.client
        self.client.get.return_value = httpx.Response(200, content=b'RIFF' + b'0' * 120)
        for mock in [patch('services.sovits_paths.init_settings', return_value=self.cfg),
                     patch('httpx.AsyncClient', return_value=self.client),
                     patch('validation_utils.check_sovits_connection'),
                     patch('services.model_weight_service.get_sovits_host', return_value='http://localhost:9880')]:
            mock.start(); self.addCleanup(mock.stop)
        self.service = ModelWeightService()
        self.service.reset_state()
        self.addCleanup(self.service.reset_state)
        self.ref = str(Path(self.temp.name, 'Rain', 'ref.wav'))
        Path(self.ref).parent.mkdir()
        Path(self.ref).write_bytes(b'RIFF' + b'0' * 120)

    async def test_weights_reload_when_mapping_changes_and_errors(self):
        for method, extension in [(self.service.set_gpt_weights, 'ckpt'), (self.service.set_sovits_weights, 'pth')]:
            file = Path(self.temp.name, 'Rain.' + extension)
            file.write_bytes(b'fixture')
            self.cfg['sovits_model_dir'] = '/remote'
            self.assertTrue((await method(str(file)))['success'])
            self.assertEqual(self.client.get.call_args.kwargs['params']['weights_path'], '/remote/' + file.name)
            self.assertTrue((await method(str(file)))['skipped'])
            self.cfg['sovits_model_dir'] = '/changed'
            self.assertFalse((await method(str(file)))['skipped'])
            self.client.get.return_value = httpx.Response(400, text='file not found')
            result = await method(str(file), skip_if_same=False)
            self.assertIn('file not found', result['message'])
            self.client.get.return_value = httpx.Response(200, content=b'audio')

    async def test_all_tts_entrypoints(self):
        with patch('routers.tts.get_current_dirs', return_value=(self.temp.name, self.temp.name)), patch('routers.tts.get_sovits_host', return_value='http://localhost:9880'), patch('routers.tts.apply_text_replacements', side_effect=lambda text: text):
            await tts.tts_proxy(text='normal test', ref_audio_path=self.ref)
            self.assertEqual(self.client.get.call_args.kwargs['params']['ref_audio_path'], '/remote/Rain/ref.wav')
            req = tts.TTSRequest(text='v2 test', text_lang='en', ref_audio_path=self.ref, prompt_text='ref', prompt_lang='en', aux_ref_audio_paths=[self.ref])
            await tts.tts_proxy_v2(req)
            self.assertEqual(self.client.get.call_args.kwargs['params']['aux_ref_audio_paths'], ['/remote/Rain/ref.wav'])
        await TTSService('http://localhost:9880').generate_audio(EmotionSegment(text='phone test', emotion='default'), {'path': self.ref, 'text': 'ref'}, {'use_aux_ref_audio': True}, {'path': self.ref})
        params = self.client.get.call_args.kwargs['params']
        self.assertEqual(params['ref_audio_path'], '/remote/Rain/ref.wav')
        self.assertEqual(params['aux_ref_audio_paths'], ['/remote/Rain/ref.wav'])


class SettingsTests(unittest.TestCase):
    def test_save_and_reload_remote_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            file = str(Path(temp, 'settings.json'))
            save_json(file, {'base_dir': temp})
            with patch('routers.admin.SETTINGS_FILE', file), patch('routers.admin.init_settings', side_effect=lambda: load_json(file)):
                app = FastAPI(); app.include_router(admin.router)
                with TestClient(app) as client:
                    for remote in [r'Z:\MyCharacters', '']:
                        self.assertEqual(client.post('/settings', json={'sovits_model_dir': remote}).status_code, 200)
                        self.assertEqual(client.get('/settings').json()['sovits_model_dir'], remote)
                        self.assertEqual(load_json(file)['base_dir'], temp)


if __name__ == '__main__':
    unittest.main()
