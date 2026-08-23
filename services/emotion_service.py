import os
import re
import random
from typing import List, Optional, Dict
from fastapi import HTTPException
from config import load_json, MAPPINGS_FILE, SETTINGS_FILE, get_current_dirs
from utils import scan_audio_files


class EmotionService:
    """情绪管理服务"""
    
    LANG_DIR_MAP = {
        "zh": ("Chinese", "中文"),
        "chinese": ("Chinese", "中文"),
        "all_zh": ("Chinese", "中文"),
        "en": ("English", "英文"),
        "english": ("English", "英文"),
        "ja": ("Japanese", "日文"),
        "japanese": ("Japanese", "日文"),
        "all_ja": ("Japanese", "日文")
    }

    @staticmethod
    def _resolve_lang_info(lang_code: Optional[str]) -> tuple[str, str]:
        """将语言代码解析为 (目录名, 显示名)"""
        if not lang_code or lang_code == "auto":
            settings = load_json(SETTINGS_FILE)
            lang_code = settings.get("phone_call", {}).get("tts_config", {}).get("prompt_lang") or settings.get("phone_call", {}).get("tts_config", {}).get("text_lang", "zh")
        key = str(lang_code).lower().strip()
        return EmotionService.LANG_DIR_MAP.get(key, ("Chinese", "中文"))

    @staticmethod
    def _resolve_model_target(char_name: str) -> str:
        """解析角色对应的模型目标 (支持 mapping 与模型名直通)"""
        mappings = load_json(MAPPINGS_FILE)
        base_dir, _ = get_current_dirs()
        
        if char_name in mappings:
            return str(mappings[char_name])
        
        if os.path.exists(os.path.join(base_dir, char_name)):
            return char_name
            
        raise HTTPException(
            status_code=404, 
            detail=f"角色【{char_name}】未绑定模型，且模型库中未找到同名模型文件夹。"
        )

    @staticmethod
    def get_available_emotions(char_name: str, lang: Optional[str] = None) -> List[str]:
        """
        获取角色在指定语言下的可用情绪列表
        
        Args:
            char_name: 角色名称
            lang: 语言代码 (zh/en/ja/auto)
            
        Returns:
            情绪列表 (已排序)
        """
        model_target = EmotionService._resolve_model_target(char_name)

        # ========== MiniMax 角色情绪处理 ==========
        if model_target.startswith("minimax:") or model_target.startswith("minimax_"):
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

            return [
                "default", "neutral", "happy", "sad", "angry", 
                "fear", "whisper", "surprise", "disgust", 
                "smug", "panting", "climax"
            ]
        
        model_folder = model_target
        base_dir, _ = get_current_dirs()
        lang_dir, lang_display = EmotionService._resolve_lang_info(lang)
        
        # 优先使用配置的语言目录下的 emotions 文件夹
        ref_dir = os.path.join(base_dir, model_folder, "reference_audios", lang_dir, "emotions")
        
        # 兼容性回退：检查语言根目录
        if not os.path.exists(ref_dir):
            lang_root = os.path.join(base_dir, model_folder, "reference_audios", lang_dir)
            if os.path.exists(lang_root):
                ref_dir = lang_root
            else:
                fallback_dir = os.path.join(base_dir, model_folder, "reference_audios")
                if os.path.exists(fallback_dir):
                    ref_dir = fallback_dir
                else:
                    ref_dir = None

        if not ref_dir or not os.path.exists(ref_dir):
            raise HTTPException(
                status_code=400,
                detail=f"角色【{char_name}】绑定的模型【{model_folder}】在【{lang_display} ({lang_dir})】路径下未找到可用参考音频，请在模型管理中添加对应语言音频或切换为支持的语言。"
            )
        
        # 扫描音频文件
        audio_files = scan_audio_files(ref_dir)
        if not audio_files:
            raise HTTPException(
                status_code=400,
                detail=f"角色【{char_name}】绑定的模型【{model_folder}】在【{lang_display} ({lang_dir})】路径下音频文件为空，请先添加参考音频。"
            )
        
        # 提取唯一的情绪标签
        emotions = set(a["emotion"] for a in audio_files if a.get("emotion"))
        if not emotions:
            emotions = {"default", "neutral"}
        
        return sorted(list(emotions))
    
    @staticmethod
    def select_ref_audio(char_name: str, emotion: str, prompt_lang: Optional[str] = None) -> Optional[Dict[str, str]]:
        """
        根据角色与情绪选择参考音频 (统一参考音频选择器)
        
        Args:
            char_name: 角色名称
            emotion: 情绪名称
            prompt_lang: 可选语言代码 (zh/en/ja/auto)
            
        Returns:
            参考音频信息 {"path": str, "text": str} 或 None
        """
        model_target = EmotionService._resolve_model_target(char_name)

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
        lang_dir, lang_display = EmotionService._resolve_lang_info(prompt_lang)
        
        ref_dir = os.path.join(base_dir, model_folder, "reference_audios", lang_dir, "emotions")
        
        if not os.path.exists(ref_dir):
            lang_root = os.path.join(base_dir, model_folder, "reference_audios", lang_dir)
            if os.path.exists(lang_root):
                ref_dir = lang_root
            else:
                fallback_dir = os.path.join(base_dir, model_folder, "reference_audios")
                if os.path.exists(fallback_dir):
                    ref_dir = fallback_dir
                else:
                    print(f"[EmotionService] 错误: 角色【{char_name}】模型【{model_folder}】的参考音频目录不存在: {ref_dir}")
                    return None
        
        audio_files = scan_audio_files(ref_dir)
        matching_audios = [a for a in audio_files if a.get("emotion") == emotion]
        
        if not matching_audios:
            if audio_files:
                selected = audio_files[0]
                print(f"[EmotionService] ⚠️ 未找到角色【{char_name}】情绪【{emotion}】的参考音频, 兜底使用该语言下首个音频: {selected['path']}")
                return {
                    "path": selected["path"],
                    "text": selected["text"]
                }
            print(f"[EmotionService] 警告: 角色【{char_name}】在【{lang_display}】目录下无可用音频")
            return None
        
        selected = random.choice(matching_audios)
        return {
            "path": selected["path"],
            "text": selected["text"]
        }

    @staticmethod
    def validate_emotion(char_name: str, emotion: str, lang: Optional[str] = None) -> bool:
        """
        验证情绪是否可用
        
        Args:
            char_name: 角色名称
            emotion: 情绪名称
            lang: 语言代码
            
        Returns:
            是否可用
        """
        try:
            available_emotions = EmotionService.get_available_emotions(char_name, lang=lang)
            return emotion in available_emotions
        except Exception:
            return False

