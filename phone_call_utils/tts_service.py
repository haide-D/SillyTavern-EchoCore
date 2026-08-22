import re
import httpx
from typing import Dict, Optional
from phone_call_utils.response_parser import EmotionSegment


class TTSService:
    """TTS服务封装 - 用于主动电话与私下密谈"""
    
    def __init__(self, sovits_host: str):
        self.sovits_host = sovits_host

    @staticmethod
    def detect_text_language(text: str, current_lang: Optional[str] = None) -> str:
        """
        智能感知文本语种，防止语种配置错配导致 GPT-SoVITS 音频空白
        """
        if not text:
            return current_lang or "zh"
        
        has_japanese = bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF]', text))
        has_chinese = bool(re.search(r'[\u4e00-\u9fa5]', text))
        has_english = bool(re.search(r'[a-zA-Z]', text))

        # 日文假名优先级最高（日文中可能混杂汉字，但含有假名必为日文）
        if has_japanese:
            return "ja"
        
        # 中文汉字
        if has_chinese:
            # 如果配置误标为英文，但实际含有大量中文且无英文字母，强制纠偏为中文
            if current_lang == "en" and not has_english:
                print(f"[TTSService] [Safeguard] 纠偏 text_lang: en -> zh (检测到纯中文台词: {text[:20]})")
                return "zh"
            # 若无特别指定或为 auto，判定为中文
            if not current_lang or current_lang in ("auto", "all_zh"):
                return "zh"
            return current_lang

        # 纯英文
        if has_english and not has_chinese:
            return "en"

        return current_lang or "zh"

    @staticmethod
    def detect_prompt_language(ref_audio: Dict, default_prompt_lang: str = "zh") -> str:
        """
        根据参考音频路径与内容智能推断 prompt_lang
        """
        path = ref_audio.get("path", "")
        text = ref_audio.get("text", "")

        if "Japanese" in path or "/ja/" in path or re.search(r'[\u3040-\u309F\u30A0-\u30FF]', text):
            return "ja"
        if "English" in path or "/en/" in path:
            return "en"
        if "Chinese" in path or "/zh/" in path or re.search(r'[\u4e00-\u9fa5]', text):
            return "zh"
        
        return default_prompt_lang
    
    async def generate_audio(
        self,
        segment: EmotionSegment,
        ref_audio: Dict,
        tts_config: Dict,
        previous_ref_audio: Optional[Dict] = None
    ) -> bytes:
        """
        为单个情绪片段生成音频
        
        Args:
            segment: 情绪片段
            ref_audio: 参考音频信息 {path, text}
            tts_config: TTS配置参数
            previous_ref_audio: 上一个情绪的参考音频 {path, text} (可选)
                               当情绪变化时,将上一个情绪的音频加入副音频进行音色融合
        
        Returns:
            音频字节数据
        """
        url = f"{self.sovits_host}/tts"
        
        # 智能感知与校验语言
        raw_text_lang = tts_config.get("text_lang", "zh")
        effective_text_lang = self.detect_text_language(segment.text, raw_text_lang)
        
        raw_prompt_lang = tts_config.get("prompt_lang", "zh")
        effective_prompt_lang = self.detect_prompt_language(ref_audio, raw_prompt_lang)

        # 合并配置
        params = {
            "text": segment.text,
            "text_lang": effective_text_lang,
            "ref_audio_path": ref_audio["path"],
            "prompt_text": ref_audio["text"],
            "prompt_lang": effective_prompt_lang,
            "text_split_method": tts_config.get("text_split_method", "cut4"),
            "streaming_mode": "false"  # 明确关闭流式
        }
        
        # 如果提供了上一个情绪的参考音频,且配置允许,加入副音频列表进行音色融合
        use_aux_ref = tts_config.get("use_aux_ref_audio", False)
        if use_aux_ref and previous_ref_audio:
            params["aux_ref_audio_paths"] = [previous_ref_audio["path"]]
            print(f"[TTSService] ✅ 副参考音频已启用,加入副音频: {previous_ref_audio['path']}")
        elif previous_ref_audio and not use_aux_ref:
            print(f"[TTSService] ⚠️ 副参考音频已禁用 (use_aux_ref_audio=false)")
        
        # 添加语速参数(如果指定)
        if segment.speed is not None:
            params["speed_factor"] = segment.speed
            print(f"[TTSService] 使用语速: {segment.speed}x")
        
        print(f"[TTSService] 调用 SoVITS: {url}")
        print(f"[TTSService] 参数: text={params['text'][:30]}... (lang={effective_text_lang}), ref_audio={ref_audio['path']} (prompt_lang={effective_prompt_lang})")
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.get(url, params=params)
            
            if response.status_code != 200:
                print(f"[TTSService] ❌ HTTP错误: {response.status_code}")
                print(f"[TTSService] 错误详情: {response.text[:500]}")
                raise Exception(f"SoVITS Error: {response.status_code}")
            
            content = response.content
            # 校验返回内容是否为异常 JSON 错误字符串
            if content.startswith(b'{"') and b'"message"' in content:
                error_msg = content.decode('utf-8', errors='ignore')
                print(f"[TTSService] ❌ GPT-SoVITS 返回了 JSON 错误信息: {error_msg}")
                raise Exception(f"GPT-SoVITS 内部错误: {error_msg}")
            
            if len(content) < 100:
                print(f"[TTSService] ⚠️ 警告: GPT-SoVITS 返回音频过短 ({len(content)} 字节)，可能存在语言分词不匹配或无声台词！")

            print(f"[TTSService] ✅ 音频生成成功: {len(content)} 字节")
            return content
            
        except (httpx.ConnectError, httpx.RequestError) as e:
            print(f"[TTSService] ❌ 请求失败: {e}")
            raise

