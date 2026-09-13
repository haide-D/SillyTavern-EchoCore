import io
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from routers import fulltext_audio


def wav(samples=b'\x00\x01' * 100):
    result = io.BytesIO()
    with wave.open(result, 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(24000)
        audio.writeframes(samples)
    return result.getvalue()


class RecordingTests(unittest.TestCase):
    def test_persist_restore_replace_and_validate(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(fulltext_audio, 'DATA_DIR', directory):
            app = FastAPI()
            app.include_router(fulltext_audio.router, prefix='/api')
            client = TestClient(app)
            key = client.post('/api/fulltext-audio/identity', json={'identity': 'fixture-chat:story'}).json()['key']
            endpoint = '/api/fulltext-audio/' + key
            self.assertFalse(client.get(endpoint + '/status').json()['exists'])
            original = wav()
            self.assertEqual(client.put(endpoint, content=original).status_code, 200)
            # A new client recovers the file without any synthesis dependency.
            self.assertTrue(TestClient(app).get(endpoint + '/status').json()['exists'])
            self.assertEqual(client.get(endpoint).content, original)
            self.assertEqual(client.put(endpoint, content=b'not audio').status_code, 400)
            self.assertEqual(client.put(endpoint, content=original[:-8]).status_code, 400)
            self.assertEqual(client.get(endpoint).content, original)
            replacement = wav(b'\x01\x00' * 80)
            self.assertEqual(client.put(endpoint, content=replacement).status_code, 200)
            self.assertEqual(client.get(endpoint).content, replacement)
            self.assertEqual(client.get('/api/fulltext-audio/not-a-key').status_code, 400)
            with patch.object(fulltext_audio, 'MAX_BYTES', 8):
                self.assertEqual(client.put(endpoint, content=original).status_code, 413)
            self.assertEqual(client.get(endpoint).content, replacement)
            self.assertEqual(len(list((Path(directory) / 'fulltext_audio').iterdir())), 1)


if __name__ == '__main__':
    unittest.main()
