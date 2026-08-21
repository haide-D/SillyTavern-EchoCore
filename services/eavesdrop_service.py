"""
对话追踪服务

用于生成多人私下对话内容
"""
import os
import random
from typing import List, Dict, Optional
from config import load_json, SETTINGS_FILE, get_current_dirs, get_sovits_host
from services.llm_service import LLMService
from services.emotion_service import EmotionService
from phone_call_utils.prompt_builder import PromptBuilder
from phone_call_utils.response_parser import ResponseParser
from phone_call_utils.models import MultiSpeakerSegment, EavesdropResult
from phone_call_utils.tts_service import TTSService
from phone_call_utils.audio_merger import AudioMerger
from utils import scan_audio_files


class EavesdropService:
    """对话追踪服务 - 生成多人私下对话"""
    
    def __init__(self):
        self.llm_service = LLMService()
        self.emotion_service = EmotionService()
        self.prompt_builder = PromptBuilder()
        self.response_parser = ResponseParser()
        self.tts_service = TTSService(get_sovits_host())
        self.audio_merger = AudioMerger()
    
    async def build_prompt(
        self,
        context: List[Dict],
        speakers: List[str],
        user_name: str = "用户",
        text_lang: str = "zh",
        max_context_messages: int = 20,
        scene_description: str = None,
        eavesdrop_config: Dict = None  # 分析 LLM 提供的对话主题和框架
    ) -> Dict:
        """
        构建对话追踪 Prompt
        
        Args:
            context: 对话上下文
            speakers: 参与角色列表（在场角色）
            user_name: 用户名
            text_lang: 文本语言
            max_context_messages: 最大上下文消息数
            scene_description: 场景描述（可选）
            eavesdrop_config: 分析 LLM 提供的对话主题、框架等配置
            
        Returns:
            包含 prompt、speakers_emotions 等信息的字典
        """
        print(f"[EavesdropService] 构建 Prompt: speakers={speakers}, text_lang={text_lang}")
        
        if eavesdrop_config:
            print(f"[EavesdropService] 🎭 使用分析 LLM 提供的配置:")
            print(f"  - 对话主题: {eavesdrop_config.get('conversation_theme', '未指定')}")
            print(f"  - 戏剧张力: {eavesdrop_config.get('dramatic_tension', '未指定')}")
        
        # 获取所有说话人的可用情绪
        speakers_emotions = {}
        valid_speakers = []
        
        for speaker in speakers:
            try:
                emotions = self.emotion_service.get_available_emotions(speaker)
                speakers_emotions[speaker] = emotions
                valid_speakers.append(speaker)
                print(f"[EavesdropService] {speaker} 可用情绪: {emotions}")
            except Exception as e:
                print(f"[EavesdropService] ⚠️ 跳过角色 {speaker}: {e}")
        
        if len(valid_speakers) < 2:
            raise ValueError(f"需要至少2个有效角色进行对话追踪,当前只有 {len(valid_speakers)} 个")
        
        # 创作者工坊预设对接
        from services.preset_service import PresetService
        settings = load_json(SETTINGS_FILE)
        phone_call_config = settings.get("phone_call", {})
        active_preset_id = phone_call_config.get("active_eavesdrop_preset_id") or phone_call_config.get("eavesdrop_preset_id") or "standard_eavesdrop"
        custom_template = None
        preset = PresetService.get_preset("eavesdrop", active_preset_id)
        if preset and preset.get("prompt_template"):
            custom_template = preset["prompt_template"]
            print(f"[EavesdropService] 🎨 成功加载创作者工坊窃听预设: {preset.get('name')} ({active_preset_id})")

        # 构建 Prompt（使用分析 LLM 提供的配置）
        prompt = self.prompt_builder.build_eavesdrop_prompt(
            context=context,
            speakers_emotions=speakers_emotions,
            user_name=user_name,
            text_lang=text_lang,
            max_context_messages=max_context_messages,
            eavesdrop_config=eavesdrop_config,  # ✅ 传递对话主题和框架
            template=custom_template
        )
        
        # 读取 LLM 配置
        llm_config = phone_call_config.get("llm", {})
        
        print(f"[EavesdropService] ✅ Prompt 构建完成: {len(prompt)} 字符")
        
        return {
            "prompt": prompt,
            "speakers": valid_speakers,
            "speakers_emotions": speakers_emotions,
            "text_lang": text_lang,
            "llm_config": {
                "api_url": llm_config.get("api_url"),
                "api_key": llm_config.get("api_key"),
                "model": llm_config.get("model"),
                "temperature": llm_config.get("temperature", 0.8),
                "max_tokens": llm_config.get("max_tokens", 5000)
            },
            "message": "请使用前端 LLM 调用此 Prompt,然后将响应发送到 /api/eavesdrop/complete_generation"
        }
    
    async def complete_generation(
        self,
        llm_response: str,
        speakers_emotions: Dict[str, List[str]],
        text_lang: str = "zh"
    ) -> Dict:
        """
        完成对话追踪生成（解析 LLM 响应并生成音频）
        
        优化策略：按说话人分组生成，减少模型权重切换次数
        
        Args:
            llm_response: LLM 返回的响应
            speakers_emotions: 说话人情绪映射
            text_lang: 文本语言
            
        Returns:
            包含 segments、audio_url 等信息的字典
        """
        from services.model_weight_service import model_weight_service
        from phone_call_utils.response_parser import EmotionSegment
        from collections import defaultdict
        
        print(f"[EavesdropService] 开始解析响应并生成音频")
        
        # 1. 解析响应
        segments = self.response_parser.parse_multi_speaker_response(
            response=llm_response,
            speakers_emotions=speakers_emotions
        )
        
        if not segments:
            raise ValueError("未能解析出任何对话片段")
        
        print(f"[EavesdropService] 解析到 {len(segments)} 个对话片段")
        
        # 读取 TTS 配置
        settings = load_json(SETTINGS_FILE)
        tts_config = settings.get("phone_call", {}).get("tts_config", {})
        
        # 2. 按说话人分组，记录原始索引
        # 格式: {speaker: [(original_index, segment, ref_audio), ...]}
        speaker_groups = defaultdict(list)
        
        for i, seg in enumerate(segments):
            ref_audio = self._select_ref_audio(seg.speaker, seg.emotion)
            if not ref_audio:
                print(f"[EavesdropService] ⚠️ 跳过片段 {i}: 无参考音频 (speaker={seg.speaker})")
                continue
            speaker_groups[seg.speaker].append((i, seg, ref_audio))
        
        print(f"[EavesdropService] 🎭 按说话人分组: {', '.join(f'{s}({len(items)}个)' for s, items in speaker_groups.items())}")
        
        # 3. 按说话人批量生成音频（每个说话人只切换一次模型）
        # 格式: {original_index: audio_bytes}
        audio_results = {}
        
        for speaker, items in speaker_groups.items():
            print(f"[EavesdropService] 🔊 开始生成 {speaker} 的 {len(items)} 个片段")
            
            # 使用 ModelWeightService 切换到该说话人的模型
            async with model_weight_service.use_model(speaker, f"eavesdrop_{speaker}") as success:
                if not success:
                    print(f"[EavesdropService] ❌ 无法切换到 {speaker} 的模型，跳过该角色")
                    continue
                
                # 批量生成该说话人的所有片段
                for original_index, seg, ref_audio in items:
                    try:
                        emotion_segment = EmotionSegment(
                            emotion=seg.emotion,
                            text=seg.text,
                            speed=seg.speed
                        )
                        
                        audio_bytes = await self.tts_service.generate_audio(
                            segment=emotion_segment,
                            ref_audio=ref_audio,
                            tts_config=tts_config,
                            previous_ref_audio=None  # 分组生成时不使用情绪过渡
                        )
                        
                        audio_results[original_index] = audio_bytes
                        print(f"[EavesdropService] ✅ 片段 {original_index} ({speaker}) 生成成功")
                        
                    except Exception as e:
                        print(f"[EavesdropService] ⚠️ 生成片段 {original_index} ({speaker}) TTS 失败: {e}")
                        continue
        
        # 4. 按原始顺序重组音频列表
        audio_bytes_list = []
        valid_segments = []
        
        for i, seg in enumerate(segments):
            if i in audio_results:
                audio_bytes_list.append(audio_results[i])
                valid_segments.append(seg)

        
        if not audio_bytes_list:
            raise ValueError("所有片段的 TTS 生成都失败了")
        
        print(f"[EavesdropService] ✅ 共生成 {len(audio_bytes_list)} 个有效音频片段")
        
        # 5. 合并音频
        settings = load_json(SETTINGS_FILE)
        phone_call_config = settings.get("phone_call", {})
        audio_merger_config = phone_call_config.get("audio_merge", {})
        
        # 添加多说话人合并配置
        audio_merger_config["speaker_change_pause"] = audio_merger_config.get("speaker_change_pause", 0.6)
        audio_merger_config["same_speaker_pause"] = audio_merger_config.get("same_speaker_pause", 0.3)
        
        merged_audio = self.audio_merger.merge_multi_speaker_segments(
            segments=valid_segments,  # 使用按原始顺序排列的有效片段
            audio_bytes_list=audio_bytes_list,
            config=audio_merger_config
        )
        
        print(f"[EavesdropService] ✅ 音频合并完成: {len(merged_audio)} bytes")
        
        # 6. 保存音频文件
        import time
        timestamp = int(time.time())
        filename = f"eavesdrop_{timestamp}.wav"
        
        cache_dir = os.path.join(os.path.dirname(SETTINGS_FILE), "Cache", "eavesdrop")
        os.makedirs(cache_dir, exist_ok=True)
        
        audio_path = os.path.join(cache_dir, filename)
        with open(audio_path, "wb") as f:
            f.write(merged_audio)
        
        print(f"[EavesdropService] ✅ 音频保存到: {audio_path}")
        
        # 7. 返回结果
        return {
            "segments": [seg.model_dump() for seg in valid_segments],
            "audio_path": audio_path,
            "audio_url": f"/api/audio/eavesdrop/{filename}",
            "segment_count": len(audio_bytes_list)
        }
    
    def _select_ref_audio(self, char_name: str, emotion: str) -> Optional[Dict]:
        """根据情绪选择参考音频"""
        mappings = load_json(os.path.join(os.path.dirname(SETTINGS_FILE), "character_mappings.json"))
        
        if char_name not in mappings:
            print(f"[EavesdropService] 错误: 角色 {char_name} 未绑定模型")
            return None
        
        model_folder = mappings[char_name]
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
        
        # 使用配置的语言目录 + emotions 子目录
        ref_dir = os.path.join(base_dir, model_folder, "reference_audios", lang_dir, "emotions")
        
        if not os.path.exists(ref_dir):
            print(f"[EavesdropService] 错误: 参考音频目录不存在: {ref_dir}")
            return None
        
        audio_files = scan_audio_files(ref_dir)
        matching_audios = [a for a in audio_files if a["emotion"] == emotion]
        
        if not matching_audios:
            # 尝试使用 default 作为后备
            matching_audios = [a for a in audio_files if a["emotion"] == "default"]
        
        if not matching_audios:
            # 如果还没有，随机选一个
            if audio_files:
                print(f"[EavesdropService] 警告: 未找到情绪 '{emotion}'，使用随机参考音频")
                matching_audios = audio_files
        
        if not matching_audios:
            print(f"[EavesdropService] 警告: 未找到情绪 '{emotion}' 的参考音频")
            return None
        
        selected = random.choice(matching_audios)
        return {
            "path": selected["path"],
            "text": selected["text"]
        }

