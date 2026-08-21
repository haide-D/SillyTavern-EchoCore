import os
from io import BytesIO
from typing import List, Dict, Optional, Tuple
from pydub import AudioSegment as PydubSegment

from config import get_sovits_host
from phone_call_utils.response_parser import EmotionSegment
from phone_call_utils.tts_service import TTSService
from phone_call_utils.audio_merger import AudioMerger
from services.emotion_service import EmotionService
from services.model_weight_service import model_weight_service


class AudioPipeline:
    """音频合成与合并流水线服务"""

    def __init__(self, sovits_host: Optional[str] = None):
        self.sovits_host = sovits_host or get_sovits_host()
        self.tts_service = TTSService(self.sovits_host)
        self.audio_merger = AudioMerger()

    async def synthesize_segments(
        self,
        char_name: str,
        segments: List[EmotionSegment],
        tts_config: Dict,
        audio_merge_config: Dict,
        lock_context_id: str = "general_audio_pipeline"
    ) -> Tuple[Optional[bytes], List[EmotionSegment]]:
        """
        按情绪切片合成多段音频，并在模型锁保护下执行音色融合与多段合并
        
        Args:
            char_name: 说话人/角色名
            segments: 情绪切片列表
            tts_config: TTS 生成配置
            audio_merge_config: 音频合并配置
            lock_context_id: 模型加锁追踪 ID
            
        Returns:
            Tuple[合并后的音频字节 (或 None), 计算好时间戳的 segments]
        """
        if not segments:
            return None, segments

        audio_bytes_list = []
        previous_emotion = None
        previous_ref_audio = None

        # 使用统一模型权重锁，确保合成期间不被其他并发任务打断或篡改权重
        async with model_weight_service.use_model(char_name, lock_context_id) as switch_success:
            if not switch_success:
                print(f"[AudioPipeline] ⚠️ 权重切换失败，将使用当前加载的模型继续生成")

            for i, segment in enumerate(segments):
                print(f"[AudioPipeline] 生成片段 {i+1}/{len(segments)}: [{segment.emotion}] {segment.text[:30]}...")

                ref_audio = EmotionService.select_ref_audio(char_name, segment.emotion)
                if not ref_audio:
                    print(f"[AudioPipeline] 警告: 未找到角色 '{char_name}' 情绪 '{segment.emotion}' 的参考音频，跳过")
                    continue

                emotion_changed = previous_emotion is not None and previous_emotion != segment.emotion

                try:
                    audio_bytes = await self.tts_service.generate_audio(
                        segment=segment,
                        ref_audio=ref_audio,
                        tts_config=tts_config,
                        previous_ref_audio=previous_ref_audio if emotion_changed else None
                    )

                    # 计算音频时长 (秒)
                    try:
                        audio_seg = PydubSegment.from_file(BytesIO(audio_bytes), format="wav")
                        duration_seconds = len(audio_seg) / 1000.0
                        segment.audio_duration = duration_seconds
                    except Exception as dur_err:
                        print(f"[AudioPipeline] ⚠️ 计算音频时长失败: {dur_err}")

                    audio_bytes_list.append(audio_bytes)
                    previous_emotion = segment.emotion
                    previous_ref_audio = ref_audio

                except Exception as e:
                    print(f"[AudioPipeline] ❌ 片段 {i+1} 生成失败: {e}")
                    continue

        if not audio_bytes_list:
            return None, segments

        # 合并音频 (释放模型锁后进行纯 CPU 音频合并)
        print(f"[AudioPipeline] 正在合并 {len(audio_bytes_list)} 段音频...")
        merged_audio = self.audio_merger.merge_segments(audio_bytes_list, audio_merge_config)

        # 计算音轨起始时间与停顿同步
        current_time = 0.0
        default_pause = audio_merge_config.get("silence_between_segments", 0.3)
        for i, segment in enumerate(segments):
            segment.start_time = current_time
            if segment.audio_duration:
                current_time += segment.audio_duration
            if i < len(segments) - 1:
                pause = segment.pause_after if segment.pause_after is not None else default_pause
                current_time += pause

        return merged_audio, segments
