import os
import re
import random
from typing import List, Optional, Dict
from fastapi import HTTPException
from config import load_json, MAPPINGS_FILE, SETTINGS_FILE, get_current_dirs
from utils import scan_audio_files


class EmotionService:
    """情绪管理服务"""
    
    @staticmethod
    def get_available_emotions(char_name: str) -> List[str]:
        """
        获取角色可用情绪列表
        
        Args:
            char_name: 角色名称
            
        Returns:
            情绪列表 (已排序)
        """
        mappings = load_json(MAPPINGS_FILE)
        
        if char_name not in mappings:
            raise HTTPException(status_code=404, detail=f"角色 {char_name} 未绑定模型")
        
        model_target = str(mappings[char_name])

        # ========== MiniMax 角色情绪处理 ==========
        if model_target.startswith("minimax:") or model_target.startswith("minimax_"):
            # 优先从系统配置中读取用户自定义配置的 MiniMax 情绪列表
            try:
                settings = load_json(SETTINGS_FILE)
                minimax_cfg = settings.get("minimax_tts", {})
                custom_emotions = minimax_cfg.get("custom_emotions")
                
                if custom_emotions:
                    if isinstance(custom_emotions, str) and custom_emotions.strip():
                        em_list = [e.strip() for e in custom_emotions.replace('，', ',').split(',') if e.strip()]
                        if em_list:
                            return em_list
                    elif isinstance(custom_emotions, list) and len(custom_emotions) > 0:
                        em_list = [str(e).strip() for e in custom_emotions if str(e).strip()]
                        if em_list:
                            return em_list
            except Exception as e:
                print(f"[EmotionService] ⚠️ 读取 MiniMax 自定义情绪配置异常: {e}")

            # MiniMax 云端音色原生默认支持的全量情绪
            return [
                "default", "neutral", "happy", "sad", "angry", 
                "fear", "whisper", "surprise", "disgust", 
                "smug", "panting", "climax"
            ]
        
        model_folder = model_target
        base_dir, _ = get_current_dirs()
        
        # 从 tts_config.prompt_lang 读取语言设置并转换为目录名
        settings = load_json(SETTINGS_FILE)
        prompt_lang = settings.get("phone_call", {}).get("tts_config", {}).get("prompt_lang", "zh")
        
        # 语言代码转目录名映射
        lang_map = {
            "zh": "Chinese",
            "en": "English",
            "ja": "Japanese",
            "all_zh": "Chinese",
            "all_ja": "Japanese"
        }
        lang_dir = lang_map.get(prompt_lang, "Chinese")
        
        # 使用配置的语言目录下的 emotions 文件夹
        ref_dir = os.path.join(base_dir, model_folder, "reference_audios", lang_dir, "emotions")
        
        # 兼容性回退：如果不存在子目录，回退到 reference_audios 根目录
        if not os.path.exists(ref_dir):
            fallback_dir = os.path.join(base_dir, model_folder, "reference_audios")
            if os.path.exists(fallback_dir):
                ref_dir = fallback_dir
            else:
                print(f"[EmotionService] 警告: 参考音频目录不存在: {ref_dir}")
                return []
        
        # 使用 scan_audio_files 扫描
        audio_files = scan_audio_files(ref_dir)
        
        # 提取唯一的情绪标签
        emotions = set(a["emotion"] for a in audio_files if a.get("emotion"))
        
        return sorted(list(emotions))
    
    @staticmethod
    def select_ref_audio(char_name: str, emotion: str, prompt_lang: Optional[str] = None) -> Optional[Dict[str, str]]:
        """
        根据角色与情绪选择参考音频 (统一参考音频选择器)
        
        Args:
            char_name: 角色名称
            emotion: 情绪名称
            prompt_lang: 可选语言代码 (zh/en/ja)，如不传则从 settings.json 中读取
            
        Returns:
            参考音频信息 {"path": str, "text": str} 或 None
        """
        mappings = load_json(MAPPINGS_FILE)
        
        if char_name not in mappings:
            print(f"[EmotionService] 错误: 角色 {char_name} 未绑定模型")
            return None
        
        model_target = str(mappings[char_name])

        # ========== MiniMax 角色参考音频虚拟对象 ==========
        if model_target.startswith("minimax:") or model_target.startswith("minimax_"):
            voice_id = model_target.split(":", 1)[1] if ":" in model_target else model_target.split("_", 1)[1]
            return {
                "path": f"minimax:{voice_id}",
                "text": "",
                "is_minimax": True,
                "voice_id": voice_id
            }

        model_folder = model_target
        base_dir, _ = get_current_dirs()
        
        if not prompt_lang:
            settings = load_json(SETTINGS_FILE)
            prompt_lang = settings.get("phone_call", {}).get("tts_config", {}).get("prompt_lang", "zh")
        
        lang_map = {
            "zh": "Chinese",
            "en": "English",
            "ja": "Japanese",
            "all_zh": "Chinese",
            "all_ja": "Japanese"
        }
        lang_dir = lang_map.get(prompt_lang, "Chinese")
        
        # 使用配置的语言目录
        ref_dir = os.path.join(base_dir, model_folder, "reference_audios", lang_dir, "emotions")
        
        # 兼容性回退
        if not os.path.exists(ref_dir):
            fallback_dir = os.path.join(base_dir, model_folder, "reference_audios")
            if os.path.exists(fallback_dir):
                ref_dir = fallback_dir
            else:
                print(f"[EmotionService] 错误: 参考音频目录不存在: {ref_dir}")
                return None
        
        audio_files = scan_audio_files(ref_dir)
        matching_audios = [a for a in audio_files if a.get("emotion") == emotion]
        
        if not matching_audios:
            if audio_files:
                selected = audio_files[0]
                print(f"[EmotionService] ⚠️ 未找到角色 '{char_name}' 情绪 '{emotion}' 的参考音频, 自动兜底使用首个可用音频: {selected['path']}")
                return {
                    "path": selected["path"],
                    "text": selected["text"]
                }
            print(f"[EmotionService] 警告: 未找到角色 '{char_name}' 情绪 '{emotion}' 的参考音频，且角色无可用音频")
            return None
        
        selected = random.choice(matching_audios)
        return {
            "path": selected["path"],
            "text": selected["text"]
        }

    @staticmethod
    def validate_emotion(char_name: str, emotion: str) -> bool:
        """
        验证情绪是否可用
        
        Args:
            char_name: 角色名称
            emotion: 情绪名称
            
        Returns:
            是否可用
        """
        available_emotions = EmotionService.get_available_emotions(char_name)
        return emotion in available_emotions
