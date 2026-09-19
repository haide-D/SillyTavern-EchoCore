import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from config import load_json, save_json
from routers.admin import router


class AdminPromptPresetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.file = str(Path(self.temp.name) / 'settings.json')
        save_json(self.file, {'prompt_injector': {'custom_template': 'legacy', 'models': {'Voice': {'speed': 1.2}}}, 'unrelated': True})
        for mock in [patch('routers.admin.SETTINGS_FILE', self.file),
                     patch('routers.admin.init_settings', side_effect=lambda: load_json(self.file))]:
            mock.start(); self.addCleanup(mock.stop)
        app = FastAPI(); app.include_router(router, prefix='/api/admin')
        self.client = TestClient(app)
        self.doc = {'version': 1, 'presets': {'custom_test': {'id': 'custom_test', 'provider': 'elevenlabs',
                    'name': 'V3 小说', 'template': '{{bound_characters_section}} [whispers]',
                    'punctuation_guide': 'V3', 'allowed_emotions': ['default', 'whisper'], 'is_builtin': False}},
                    'active_presets': {'elevenlabs': 'custom_test'}}

    def post(self, doc):
        return self.client.post('/api/admin/settings', json={'prompt_injector': {'provider_presets': doc}})

    def test_save_reload_delete_preserves_other_settings(self):
        self.assertEqual(self.post(self.doc).status_code, 200)
        settings = self.client.get('/api/admin/settings').json()
        self.assertEqual(settings['prompt_injector']['provider_presets'], self.doc)
        empty = {'version': 1, 'presets': {}, 'active_presets': {'elevenlabs': 'builtin_elevenlabs'}}
        self.assertEqual(self.post(empty).status_code, 200)
        settings = load_json(self.file)
        self.assertEqual(settings['prompt_injector']['provider_presets'], empty)
        self.assertEqual(settings['prompt_injector']['custom_template'], 'legacy')
        self.assertEqual(settings['prompt_injector']['models']['Voice']['speed'], 1.2)
        self.assertTrue(settings['unrelated'])

    def test_invalid_snapshot_is_atomic(self):
        self.post(self.doc)
        before = Path(self.file).read_bytes()
        for change in [lambda d: d.update(version=2),
                       lambda d: d['active_presets'].update(minimax='custom_test'),
                       lambda d: d['presets']['custom_test'].update(template=''),
                       lambda d: d['presets']['custom_test'].update(provider=['bad'])]:
            bad = copy.deepcopy(self.doc); change(bad)
            self.assertEqual(self.post(bad).status_code, 400)
            self.assertEqual(Path(self.file).read_bytes(), before)

    def test_failed_disk_write_is_not_success(self):
        with patch('routers.admin.save_json', return_value=None):
            self.assertEqual(self.post(self.doc).status_code, 500)


if __name__ == '__main__':
    unittest.main()
