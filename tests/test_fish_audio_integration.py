# -*- coding: utf-8 -*-
"""
Fish.audio 全链路集成与单元测试
涵盖：配置解析、服务单例、缓存算法、WAV 检测、FastAPI 端点
"""

import os
import sys
import unittest
import io
import wave
import asyncio
from fastapi.testclient import TestClient

# 将根目录添加到 sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import config
from services.fish_audio_service import fish_audio_service, FishAudioTTSService


class TestFishAudioConfig(unittest.TestCase):
    """测试 config.py 中针对 Fish.audio 的扩展"""

    def test_provider_detection(self):
        self.assertEqual(config.get_character_provider("fish:test_voice_123"), "fish_audio")
        self.assertEqual(config.get_character_provider("fish_audio:test_voice_456"), "fish_audio")
        self.assertEqual(config.get_character_provider("minimax:female-shaonv"), "minimax")
        self.assertEqual(config.get_character_provider("Character_Model_A"), "gpt_sovits")
        self.assertEqual(config.get_character_provider(""), "gpt_sovits")

    def test_is_fish_audio_character(self):
        self.assertTrue(config.is_fish_audio_character("fish:voice_id_abc"))
        self.assertTrue(config.is_fish_audio_character("fish_audio:voice_id_def"))
        self.assertFalse(config.is_fish_audio_character("minimax:voice_id_abc"))
        self.assertFalse(config.is_fish_audio_character("sovits_model"))

    def test_get_character_fish_voice_id(self):
        self.assertEqual(config.get_character_fish_voice_id("fish:7f92f8af3323"), "7f92f8af3323")
        self.assertEqual(config.get_character_fish_voice_id("fish_audio:7f92f8af3323"), "7f92f8af3323")
        self.assertEqual(config.get_character_fish_voice_id("", default="fallback"), "fallback")
        self.assertEqual(config.get_character_fish_voice_id("not_a_voice_id", default="default_val"), "default_val")

    def test_default_config_fields(self):
        defaults = config.fish_audio_tts_defaults
        self.assertIn("enabled", defaults)
        self.assertIn("api_key", defaults)
        self.assertIn("api_url", defaults)
        self.assertIn("model", defaults)
        self.assertIn("default_voice_id", defaults)
        self.assertIn("speed", defaults)
        self.assertIn("vol", defaults)
        self.assertEqual(defaults["api_url"], "https://api.fish.audio/v1/tts")
        self.assertEqual(defaults["model"], "s2.1-pro")


class TestFishAudioService(unittest.TestCase):
    """测试 FishAudioTTSService 服务核心逻辑"""

    def setUp(self):
        self.service = fish_audio_service

    def test_singleton_instance(self):
        self.assertIsInstance(self.service, FishAudioTTSService)
        cache_dir = self.service.get_cache_dir()
        self.assertTrue(os.path.isdir(cache_dir))

    def test_cache_key_deterministic(self):
        # 相同入参计算出的缓存文件名必须严格一致
        _, fn1 = self.service.get_cache_key("你好，世界", "voice_1", 1.0, "s2.1-pro")
        _, fn2 = self.service.get_cache_key("你好，世界", "voice_1", 1.0, "s2.1-pro")
        self.assertEqual(fn1, fn2)
        self.assertTrue(fn1.endswith(".wav"))

        # 不同入参应生成不同文件名
        _, fn3 = self.service.get_cache_key("你好，世界", "voice_2", 1.0, "s2.1-pro")
        self.assertNotEqual(fn1, fn3)

        _, fn4 = self.service.get_cache_key("你好，世界", "voice_1", 1.2, "s2.1-pro")
        self.assertNotEqual(fn1, fn4)

        _, fn5 = self.service.get_cache_key("你好，世界", "voice_1", 1.0, "s2.1-pro-free")
        self.assertNotEqual(fn1, fn5)

    def test_ensure_wav_format(self):
        # 构造合法的标准 WAV 字节流
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(b"\x00\x00" * 100)
        wav_bytes = buf.getvalue()

        # 检验合法 WAV 能被直接识别通过
        result = self.service._convert_to_wav(wav_bytes)
        self.assertEqual(result, wav_bytes)

    def test_test_credentials_empty_key(self):
        res = asyncio.run(self.service.test_credentials(api_key=""))
        self.assertFalse(res["success"])
        self.assertIn("API Key", res["message"])

    def test_sync_remote_empty_key(self):
        res = asyncio.run(self.service.sync_remote_voices(api_key=""))
        self.assertFalse(res["success"])
        self.assertIn("API Key", res["message"])


class TestFishAudioFastAPIRoutes(unittest.TestCase):
    """测试 FastAPI 路由接口"""

    @classmethod
    def setUpClass(cls):
        from manager import app
        cls.client = TestClient(app)

    def test_fish_audio_test_endpoint_empty(self):
        resp = self.client.post("/tts/fish_audio/test", json={"api_key": ""})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])

    def test_fish_audio_voices_crud(self):
        # 1. GET 获取声线列表
        resp = self.client.get("/tts/fish_audio/voices")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        voices = data["voices"]
        self.assertIsInstance(voices, list)
        self.assertTrue(len(voices) > 0)

        # 2. POST 添加自定义声线
        test_voice = {
            "id": "fish_test_unit_uuid_999",
            "name": "单元测试专属声线",
            "category": "自定义测试"
        }
        add_resp = self.client.post("/tts/fish_audio/voices", json=test_voice)
        self.assertEqual(add_resp.status_code, 200)
        self.assertEqual(add_resp.json()["status"], "success")

        # 验证已成功添加
        get_resp = self.client.get("/tts/fish_audio/voices")
        ids = [v["id"] for v in get_resp.json()["voices"]]
        self.assertIn("fish_test_unit_uuid_999", ids)

        # 3. DELETE 删除该自定义声线
        del_resp = self.client.delete("/tts/fish_audio/voices/fish_test_unit_uuid_999")
        self.assertEqual(del_resp.status_code, 200)
        self.assertEqual(del_resp.json()["status"], "success")

        # 验证已删除
        get_resp2 = self.client.get("/tts/fish_audio/voices")
        ids2 = [v["id"] for v in get_resp2.json()["voices"]]
        self.assertNotIn("fish_test_unit_uuid_999", ids2)

    def test_get_data_includes_fish_audio_voices(self):
        resp = self.client.get("/get_data")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("fish_audio_voices", data)
        self.assertIsInstance(data["fish_audio_voices"], list)

    def test_settings_bidirectional_sync(self):
        # 1. 模拟酒馆插件通过 /update_settings 保存 Fish.audio 配置
        update_resp = self.client.post("/update_settings", json={
            "fish_audio_tts": {
                "api_key": "test_sync_fish_key_123",
                "model": "s2.1-pro-free"
            }
        })
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.json()["status"], "success")

        # 2. 模拟酒馆插件或 Admin 控制台调用 /get_data 验证配置已被持久化
        get_resp = self.client.get("/get_data")
        self.assertEqual(get_resp.status_code, 200)
        settings = get_resp.json()["settings"]
        self.assertEqual(settings.get("fish_audio_tts", {}).get("api_key"), "test_sync_fish_key_123")
        self.assertEqual(settings.get("fish_audio_tts", {}).get("model"), "s2.1-pro-free")

        # 3. 模拟 Admin 控制台通过 /api/settings 保存 MiniMax 配置
        admin_resp = self.client.post("/api/settings", json={
            "minimax_tts": {
                "api_key": "test_sync_mm_key_456"
            }
        })
        self.assertEqual(admin_resp.status_code, 200)

        # 4. 再次验证两端配置共同存在于 system_settings.json
        get_resp2 = self.client.get("/get_data")
        settings2 = get_resp2.json()["settings"]
        self.assertEqual(settings2.get("fish_audio_tts", {}).get("api_key"), "test_sync_fish_key_123")
        self.assertEqual(settings2.get("minimax_tts", {}).get("api_key"), "test_sync_mm_key_456")


if __name__ == "__main__":
    unittest.main()
