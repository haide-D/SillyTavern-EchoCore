"""
活人感引擎 - 多维度角色状态分析和动态触发

职责:
- 开放式角色状态分析(物理、情绪、认知、社交四维度)
- 动态评估角色潜在行动
- 灵活触发不同类型的行为
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
from database import DatabaseManager
from config import load_json, SETTINGS_FILE


class LiveCharacterEngine:
    """活人感引擎 - 让每个角色都"活起来\""""
    
    def __init__(self):
        self.db = DatabaseManager()
        
        # 加载配置 - 从 analysis_engine 读取
        settings = load_json(SETTINGS_FILE)
        self.config = settings.get("analysis_engine", {})
        
        # 默认配置
        self.enabled = self.config.get("enabled", True)
        self.threshold = self.config.get("trigger_threshold", 60)
        
        # 行动类型处理器注册表
        self.action_handlers = {
            "phone_call": self._handle_phone_call,
            "side_conversation": self._handle_side_conversation,
            "leave_scene": self._handle_leave_scene,
            "self_talk": self._handle_self_talk,
            # 可无限扩展
        }
        
        print(f"[LiveCharacterEngine] 初始化完成 - 阈值: {self.threshold}")
    
    def build_analysis_prompt(
        self, 
        context: List[Dict], 
        speakers: List[str], 
        call_history: List[Dict] = None, 
        chat_branch: str = None,
        character_persona: str = "",
        world_info: str = ""
    ) -> str:
        """
        构建开放式角色状态分析的LLM Prompt (深度融合世界书、角色人设与前情总结)
        
        Args:
            context: 对话上下文
            speakers: 说话人列表
            call_history: 近期通话历史（可选）
            chat_branch: 对话分支ID（用于查询触发历史）
            character_persona: 角色卡人设设定 (从SillyTavern自动注入)
            world_info: 世界书/世界观设定 (从SillyTavern自动注入)
            
        Returns:
            LLM Prompt
        """
        # 导入消息过滤工具和配置
        from config import load_json, SETTINGS_FILE
        from phone_call_utils.message_filter import MessageFilter
        
        settings = load_json(SETTINGS_FILE)
        msg_processing = settings.get("message_processing", {})
        extract_tag = msg_processing.get("extract_tag", "")
        filter_tags = msg_processing.get("filter_tags", "")
        
        # 构建上下文文本（应用过滤，轻量化取最近10条）
        context_lines = []
        for msg in context[-10:]:
            name = msg.get('name', '未知')
            content = msg.get('mes', '')
            # 应用消息过滤
            if extract_tag or filter_tags:
                content = MessageFilter.extract_and_filter(content, extract_tag, filter_tags)
            context_lines.append(f"{name}: {content}")
        
        context_text = "\n".join(context_lines)
        speakers_list = "、".join(speakers)
        
        # 从数据库中拉取前情剧情总结与场景摘要 (轻量长程记忆)
        fingerprints = []
        for msg in context:
            fp = msg.get("fingerprint") or msg.get("fp")
            if fp:
                fingerprints.append(fp)

        summary_ctx = self.db.get_latest_summary_context(chat_branch=chat_branch, fingerprints=fingerprints)
        summary_text = summary_ctx.get("formatted", "无历史剧情总结")
        
        # 获取已绑定 TTS 模型的角色列表
        from config import get_bound_characters
        bound_characters = get_bound_characters()
        
        bound_speakers = [s for s in speakers if s in bound_characters]
        unbound_speakers = [s for s in speakers if s not in bound_characters]
        
        if bound_speakers:
            voice_available_text = f"以下角色有语音功能，可以打电话: {', '.join(bound_speakers)}"
        else:
            voice_available_text = "当前没有角色配置了语音功能，不建议触发电话"
        
        if unbound_speakers:
            voice_available_text += f"\n以下角色没有语音功能，不能作为打电话者: {', '.join(unbound_speakers)}"
        
        # 格式化通话历史
        call_history_text = "无近期通话记录"
        if call_history:
            history_lines = []
            for call in call_history[:5]:
                caller = call.get("char_name", "未知")
                segments = call.get("segments", [])
                if isinstance(segments, str):
                    import json
                    try:
                        segments = json.loads(segments)
                    except:
                        segments = []
                content_preview = ""
                if segments and isinstance(segments, list):
                    texts = [s.get("translation") or s.get("text", "") for s in segments[:2] if isinstance(s, dict)]
                    content_preview = "...".join(texts)[:50]
                history_lines.append(f"- {caller}：{content_preview}...")
            call_history_text = "\n".join(history_lines)
        
        # 触发历史
        trigger_history_text = "无历史触发记录"
        diversity_guidance = ""
        
        if fingerprints:
            trigger_history = self.db.get_recent_trigger_history(fingerprints=fingerprints, limit=5)
            if trigger_history:
                history_items = []
                phone_call_count = 0
                eavesdrop_count = 0
                none_count = 0
                
                for item in trigger_history:
                    action = item.get("action", "none")
                    char = item.get("character", "")
                    
                    if action == "phone_call":
                        phone_call_count += 1
                        history_items.append(f"phone_call({char or '未知'})")
                    elif action == "eavesdrop":
                        eavesdrop_count += 1
                        history_items.append("eavesdrop")
                    else:
                        none_count += 1
                        history_items.append("none")
                
                trigger_history_text = "最近触发: " + ", ".join(history_items)
                
                if phone_call_count >= 2:
                    diversity_guidance = "⛔ 最近已多次触发电话，请优先选择 eavesdrop (窃听) 或 none。"
                elif none_count >= 3:
                    diversity_guidance = "🌟 最近较少触发事件，当前是绝佳时机！若多人在场优先推荐 eavesdrop。"

        # 动态获取工坊生效剧本池
        from services.preset_service import PresetService
        phone_call_cfg = settings.get("phone_call", {})
        active_call_ids = phone_call_cfg.get("active_preset_ids") or [phone_call_cfg.get("active_preset_id") or "standard_call"]
        active_eavesdrop_ids = phone_call_cfg.get("active_eavesdrop_preset_ids") or [phone_call_cfg.get("active_eavesdrop_preset_id") or "standard_eavesdrop"]
        
        all_phone_presets = PresetService.list_presets("phone_call")
        all_eavesdrop_presets = PresetService.list_presets("eavesdrop")

        active_call_presets = [p for p in all_phone_presets if p.get("id") in active_call_ids] or all_phone_presets[:1]
        active_eavesdrop_presets = [p for p in all_eavesdrop_presets if p.get("id") in active_eavesdrop_ids] or all_eavesdrop_presets[:1]

        call_presets_text = "\n".join([
            f"- id: \"{p.get('id')}\" | 剧本: 「{p.get('name')}」 | 场景特征: {p.get('description', '无')}"
            for p in active_call_presets
        ])
        eavesdrop_presets_text = "\n".join([
            f"- id: \"{p.get('id')}\" | 剧本: 「{p.get('name')}」 | 场景特征: {p.get('description', '无')}"
            for p in active_eavesdrop_presets
        ])

        # 组装世界书与人设段落
        world_persona_section = ""
        if character_persona or world_info or summary_text:
            wp_parts = []
            if character_persona:
                wp_parts.append(f"## 角色卡设定 (Character Persona):\n{character_persona}")
            if world_info:
                wp_parts.append(f"## 世界书背景 (World Info):\n{world_info}")
            if summary_text and summary_text != "无历史剧情总结":
                wp_parts.append(f"## 历史剧情总结 (Story Memory):\n{summary_text}")
            world_persona_section = "\n\n# 世界观设定与角色档案 (World Info & Personas)\n" + "\n\n".join(wp_parts)

        prompt = f"""
请以JSON格式分析当前场景中每个角色的状态，并判断是否应该触发特殊事件。你同时扮演【剧情总导演】，根据当前对话氛围、人物性格与世界书背景，从剧本池中挑选最适合当前剧情的剧本。
{world_persona_section}

# 对话上下文 (最近对话)
{context_text}

# 需分析的角色
{speakers_list}

# 近期通话历史（供判断参考，避免重复）
{call_history_text}

# 触发历史（多样性参考）
{trigger_history_text}
{diversity_guidance}

# 剧本工坊 - 可选剧本池 (Workshop Presets)
## 候选来电剧本 (若触发 phone_call，请依据剧情张力从中挑选最契合的一项):
{call_presets_text}

## 候选窃听剧本 (若触发 eavesdrop，请依据剧情张力从中挑选最契合的一项):
{eavesdrop_presets_text}

# 分析要求
对每个角色,请提供以下维度的分析:

## 1. 物理状态 (physical)
- location: 在场/离场,具体位置
- action: 正在做什么
- posture: 姿态、表情

## 2. 情绪状态 (emotional)
- current: 当前情绪(自然语言描述)
- intensity: 情绪强度(1-10)
- trend: 情绪变化趋势

## 3. 认知状态 (cognitive)
- focus: 注意力焦点
- concerns: 担心的事情(列表)
- desires: 想做什么(列表)

## 4. 社交状态 (social)
- engagement: 对话投入度
- relationship_dynamics: 和其他角色的互动
- hidden_thoughts: 可能没说出口的想法

## 5. 潜在行动 (potential_actions)
列出角色可能采取的行动,每个行动包括:
- type: 行动类型(如phone_call, side_conversation, leave_scene等)
- target: 行动对象(如果有)
- reason: 原因

# 场景触发建议

## 电话触发判断
判断是否有角色想给用户打电话，**不限于离场场景**。以下情况都可能触发：
- 角色离场后想联系用户
- 角色在场但有特别想说的话（叮嘱、表白、倾诉、警告）
- 角色突然想起重要的事情
- 角色想分享心情或轻松聊天
- 角色处于强烈情绪中想要倾诉

## 偷听触发判断（重要！这是独特体验）
当2+有语音功能的角色在场时，考虑触发 eavesdrop（用户"偷听"角色私下对话）。
适合触发的场景：
- 角色间有未说出口的心思或秘密
- 角色在讨论与用户相关的事情
- 角色之间有戏剧张力（争执、八卦、密谋、吃醋）
- 用户刚离开，角色开始私下交流

# 输出格式
{{
    "character_states": {{
        "角色名1": {{
            "physical": {{}},
            "emotional": {{}},
            "cognitive": {{}},
            "social": {{}},
            "potential_actions": []
        }},
        "角色名2": {{...}}
    }},
    "scene_trigger": {{
        "suggested_action": "phone_call|eavesdrop|none",
        "characters_present": ["在场角色列表"],
        "reason": "简短解释判断原因",
        
        // 电话触发详情（仅当 suggested_action 为 "phone_call" 时填写）
        "phone_call_details": {{
            "caller": "打电话的角色名",
            "call_reason": "为什么要打这个电话（自然语言描述）",
            "call_tone": "通话氛围（如：轻松闲聊、温柔叮嘱、深情倾诉、兴奋分享、担心关切、傲娇醉酒等）",
            "selected_preset": "从上述来电剧本候选池中挑选的最优 id (必填)",
            "preset_reason": "简要说明选择该剧本的剧情理由"
        }},
        
        // 偷听配置（仅当 suggested_action 为 "eavesdrop" 时填写）
        "eavesdrop_config": {{
            "conversation_theme": "对话的核心主题",
            "selected_preset": "从上述窃听剧本候选池中挑选的最优 id (必填)",
            "preset_reason": "简要说明选择该剧本的剧情理由",
            "conversation_outline": ["对话阶段1", "对话阶段2", "对话阶段3"],
            "dramatic_tension": "戏剧张力描述",
            "hidden_information": "对话中可能透露的用户不知道的信息",
            "emotional_arc": "情绪弧线"
        }}
    }}
}}

⚠️ **JSON 格式要求（必须遵守）**：
1. 只输出纯 JSON，不要包含 markdown 代码块标记
2. 不要在数组或对象的最后一个元素后面添加逗号（如 [1, 2, 3,] 是错误的）
3. 所有字符串值必须用双引号包围
4. 确保所有括号正确闭合

请保持分析的自然性和灵活性,不要受固定模式限制。

"""
        return prompt


    
    def _sanitize_json_string(self, json_str: str) -> str:
        """
        预处理 JSON 字符串，修复常见的 LLM 输出格式问题
        
        Args:
            json_str: 原始 JSON 字符串
            
        Returns:
            清理后的 JSON 字符串
        """
        import re
        
        # 1. 移除可能的 BOM 和特殊不可见字符
        json_str = json_str.strip()
        if json_str.startswith('\ufeff'):
            json_str = json_str[1:]
        
        # 2. 移除 // 和 /* */ 风格的注释（LLM 有时会添加）
        json_str = re.sub(r'//[^\n]*\n', '\n', json_str)
        json_str = re.sub(r'/\*[\s\S]*?\*/', '', json_str)
        
        # 3. 移除 JSON 对象/数组末尾的多余逗号
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # 4. 修复常见的布尔值问题 (True -> true, False -> false, None -> null)
        json_str = re.sub(r':\s*True\b', ': true', json_str)
        json_str = re.sub(r':\s*False\b', ': false', json_str)
        json_str = re.sub(r':\s*None\b', ': null', json_str)
        
        # 5. 修复缺少逗号的情况
        # 模式: }\n{ 或 }\n"key" 或 ]\n[ 或 ]\n"value"
        json_str = self._fix_missing_commas(json_str)
        
        # 6. 修复未加引号的字符串值 - 这是 LLM 最常见的错误
        # 处理模式: "key": 中文或其他非JSON值的内容
        # 例如: "对杜先生": 绝对服从、崇拜 -> "对杜先生": "绝对服从、崇拜"
        lines = json_str.split('\n')
        fixed_lines = []
        
        for line in lines:
            fixed_line = self._fix_unquoted_string_values(line)
            fixed_lines.append(fixed_line)
        
        json_str = '\n'.join(fixed_lines)
        
        # 7. 尝试修复截断的 JSON（确保括号闭合）
        json_str = self._fix_truncated_json(json_str)
        
        return json_str
    
    def _fix_missing_commas(self, json_str: str) -> str:
        """
        修复缺少逗号的常见情况
        
        常见模式:
        - "value1"\n"key2" -> "value1",\n"key2"
        - }\n"key" -> },\n"key"
        - ]\n[ -> ],\n[
        - }\n{ -> },\n{
        - 数字后直接跟 "key"
        """
        import re
        
        # 模式1: 字符串值后缺少逗号，直接跟另一个key
        # "value"\n   "key" -> "value",\n   "key"
        json_str = re.sub(r'(")\s*\n(\s*"[^"]+"\s*:)', r'\1,\n\2', json_str)
        
        # 模式2: } 后缺少逗号，直接跟 "key"
        # }\n   "key" -> },\n   "key"
        json_str = re.sub(r'(\})\s*\n(\s*"[^"]+"\s*:)', r'\1,\n\2', json_str)
        
        # 模式3: ] 后缺少逗号，直接跟 "key"
        # ]\n   "key" -> ],\n   "key"
        json_str = re.sub(r'(\])\s*\n(\s*"[^"]+"\s*:)', r'\1,\n\2', json_str)
        
        # 模式4: } 后缺少逗号，直接跟 {
        # }\n   { -> },\n   {
        json_str = re.sub(r'(\})\s*\n(\s*\{)', r'\1,\n\2', json_str)
        
        # 模式5: ] 后缺少逗号，直接跟 [
        # ]\n   [ -> ],\n   [
        json_str = re.sub(r'(\])\s*\n(\s*\[)', r'\1,\n\2', json_str)
        
        # 模式6: 数字/布尔/null 后缺少逗号，直接跟 "key"
        # 123\n   "key" -> 123,\n   "key"
        json_str = re.sub(r'(\d+|true|false|null)\s*\n(\s*"[^"]+"\s*:)', r'\1,\n\2', json_str)
        
        # 模式7: 字符串值后缺少逗号，直接跟 { 或 [
        # "value"\n   { -> "value",\n   {
        json_str = re.sub(r'(")\s*\n(\s*[\[{])', r'\1,\n\2', json_str)
        
        return json_str
    
    def _fix_truncated_json(self, json_str: str) -> str:
        """
        修复被截断的 JSON，确保括号正确闭合
        """
        # 统计未闭合的括号
        open_braces = 0
        open_brackets = 0
        in_string = False
        escape_next = False
        
        for char in json_str:
            if escape_next:
                escape_next = False
                continue
            
            if char == '\\':
                escape_next = True
                continue
            
            if char == '"':
                in_string = not in_string
                continue
            
            if in_string:
                continue
            
            if char == '{':
                open_braces += 1
            elif char == '}':
                open_braces -= 1
            elif char == '[':
                open_brackets += 1
            elif char == ']':
                open_brackets -= 1
        
        # 补齐缺失的闭合括号
        if open_braces > 0 or open_brackets > 0:
            # 如果 JSON 被截断在字符串中间，先闭合字符串
            if in_string:
                json_str += '"'
            
            # 补齐括号（先 ] 后 }）
            json_str += ']' * max(0, open_brackets)
            json_str += '}' * max(0, open_braces)
            
            print(f"[LiveCharacterEngine] ⚠️ 检测到截断的 JSON，补齐了 {open_brackets} 个 ] 和 {open_braces} 个 }}")
        
        return json_str
    
    def _fix_unquoted_string_values(self, line: str) -> str:
        """
        修复单行中未加引号的字符串值
        
        例如:
        "key": 中文内容  ->  "key": "中文内容"
        "key": some text,  ->  "key": "some text",
        """
        import re
        
        # 匹配模式: "key": 后面跟着非 JSON 标准值的内容
        # JSON 标准值: "string", number, true, false, null, {, [
        # 我们要找的是冒号后面不是这些标准值开头的情况
        
        # 这个正则匹配: "key": 后面跟着不是 ", {, [, 数字, true, false, null 的内容
        pattern = r'("[\w\u4e00-\u9fff]+")\s*:\s*(?![\[\{"\d]|true|false|null)([^\n\r,}\]]+)'
        
        def fix_value(match):
            key = match.group(1)
            value = match.group(2).strip()
            
            # 如果值已经被引号包围或是空的，不处理
            if not value or value.startswith('"') or value.startswith("'"):
                return match.group(0)
            
            # 移除尾部的逗号（如果有的话）
            trailing = ''
            if value.endswith(','):
                value = value[:-1].strip()
                trailing = ','
            
            # 转义值中的引号
            value = value.replace('"', '\\"')
            
            return f'{key}: "{value}"{trailing}'
        
        return re.sub(pattern, fix_value, line)
    
    def _try_parse_json(self, json_str: str) -> Optional[Dict]:
        """
        尝试多种方式解析 JSON
        
        Args:
            json_str: JSON 字符串
            
        Returns:
            解析结果或 None
        """
        import json
        
        # 尝试 1: 直接解析
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[LiveCharacterEngine] 直接解析失败: {e}")
        
        # 尝试 2: 预处理后解析
        try:
            sanitized = self._sanitize_json_string(json_str)
            return json.loads(sanitized)
        except json.JSONDecodeError as e:
            print(f"[LiveCharacterEngine] 预处理后解析失败: {e}")
        
        # 尝试 3: 使用更宽松的解析（如果安装了demjson3）
        try:
            import demjson3
            return demjson3.decode(json_str)
        except ImportError:
            pass  # demjson3 未安装，跳过
        except Exception as e:
            print(f"[LiveCharacterEngine] demjson3 解析失败: {e}")
        
        return None
    
    def parse_llm_response(self, llm_response: str) -> Dict[str, Any]:
        """
        解析LLM返回的角色状态和触发建议
        
        Args:
            llm_response: LLM响应
            
        Returns:
            解析后的结果，包含 character_states 和 scene_trigger
        """
        import json
        import re
        
        if not llm_response or not llm_response.strip():
            print(f"[LiveCharacterEngine] ❌ LLM 响应为空")
            return {}
        
        print(f"[LiveCharacterEngine] 开始解析 LLM 响应 (长度: {len(llm_response)})")
        
        # 尝试直接解析
        result = self._try_parse_json(llm_response)
        if result:
            print(f"[LiveCharacterEngine] ✅ 直接解析 JSON 成功")
        else:
            # 如果失败，尝试提取 JSON 块
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', llm_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1).strip()
                print(f"[LiveCharacterEngine] 提取到 JSON 块 (长度: {len(json_str)})")
                
                result = self._try_parse_json(json_str)
                if result:
                    print(f"[LiveCharacterEngine] ✅ JSON 块解析成功")
                else:
                    # 详细诊断输出
                    print(f"[LiveCharacterEngine] ❌ JSON 块解析失败")
                    self._diagnose_json_error(json_str)
                    return {}
            else:
                # 尝试找到任何看起来像 JSON 对象的内容
                brace_match = re.search(r'\{[\s\S]*\}', llm_response)
                if brace_match:
                    json_str = brace_match.group(0)
                    print(f"[LiveCharacterEngine] 提取到疑似 JSON 对象 (长度: {len(json_str)})")
                    
                    result = self._try_parse_json(json_str)
                    if result:
                        print(f"[LiveCharacterEngine] ✅ 疑似 JSON 解析成功")
                    else:
                        print(f"[LiveCharacterEngine] ❌ 疑似 JSON 解析失败")
                        self._diagnose_json_error(json_str)
                        return {}
                else:
                    print(f"[LiveCharacterEngine] ❌ 未找到 JSON 块或对象")
                    print(f"[LiveCharacterEngine] 响应内容前 500 字符:")
                    print(llm_response[:500] if len(llm_response) > 500 else llm_response)
                    return {}
        
        # 兼容新旧格式
        if "character_states" in result:
            # 新格式: {character_states: {...}, scene_trigger: {...}}
            return result
        else:
            # 旧格式: 直接是角色状态字典 {角色名: {...}}
            # 转换为新格式
            return {
                "character_states": result,
                "scene_trigger": {
                    "suggested_action": "none",
                    "character_left": None,
                    "characters_present": list(result.keys()),
                    "private_conversation_likely": False,
                    "reason": "旧格式响应,无触发建议"
                }
            }
    
    def _diagnose_json_error(self, json_str: str):
        """详细诊断 JSON 解析错误"""
        import json
        
        try:
            json.loads(json_str)
        except json.JSONDecodeError as e:
            error_line = e.lineno
            error_col = e.colno
            error_pos = e.pos
            
            print(f"[LiveCharacterEngine] 📍 错误位置: 行 {error_line}, 列 {error_col}, 字符位置 {error_pos}")
            
            # 显示错误附近的内容
            lines = json_str.split('\n')
            if 0 < error_line <= len(lines):
                # 显示错误行及前后各1行
                start = max(0, error_line - 2)
                end = min(len(lines), error_line + 1)
                print(f"[LiveCharacterEngine] 📝 错误附近内容:")
                for i in range(start, end):
                    marker = ">>> " if i == error_line - 1 else "    "
                    print(f"{marker}L{i+1}: {lines[i][:100]}{'...' if len(lines[i]) > 100 else ''}")

    
    def evaluate_character_actions(
        self,
        character_name: str,
        character_state: Dict,
        chat_branch: str,
        current_floor: int
    ) -> List[Dict]:
        """
        评估角色的潜在行动,决定是否触发
        
        Args:
            character_name: 角色名称
            character_state: 角色状态(完整的四维度数据)
            chat_branch: 对话分支ID
            current_floor: 当前楼层
            
        Returns:
            应该触发的行动列表
        """
        if not self.enabled:
            return []
        
        triggered_actions = []
        potential_actions = character_state.get("potential_actions", [])
        
        for action in potential_actions:
            score = self._calculate_action_score(action, character_state)
            
            print(f"[LiveCharacterEngine] 评估 {character_name} 的行动 '{action.get('type')}': 评分={score}")
            
            if score >= self.threshold:
                # 触发行动
                triggered_actions.append({
                    **action,
                    "character_name": character_name,
                    "score": score,
                    "floor": current_floor
                })
        
        return triggered_actions
    
    def _calculate_action_score(self, action: Dict, state: Dict) -> int:
        """
        动态评分算法
        
        综合考虑:
        1. 行动紧迫度 (urgency)
        2. 情绪强度 (emotional intensity)
        3. 认知需求数量 (cognitive desires)
        4. 社交动机 (hidden thoughts)
        
        Returns:
            总评分(0-100)
        """
        score = 0
        
        # 1. 紧迫度权重(40%)
        urgency = action.get("urgency", 0)
        score += urgency * 4
        
        # 2. 情绪强度权重(30%)
        emotional = state.get("emotional", {})
        intensity = emotional.get("intensity", 0)
        score += intensity * 3
        
        # 3. 认知需求权重(20%)
        cognitive = state.get("cognitive", {})
        desires = cognitive.get("desires", [])
        score += len(desires) * 5 if desires else 0
        
        # 4. 社交动机权重(10%)
        social = state.get("social", {})
        hidden_thoughts = social.get("hidden_thoughts", "")
        if hidden_thoughts:
            score += 10
        
        return min(int(score), 100)  # 限制最大100分
    
    def trigger_action(self, action: Dict, character_state: Dict) -> Dict:
        """
        触发行动
        
        Args:
            action: 行动信息
            character_state: 角色状态
            
        Returns:
            触发结果
        """
        action_type = action.get("type", "unknown")
        handler = self.action_handlers.get(action_type)
        
        if handler:
            return handler(action, character_state)
        else:
            # 未知类型,使用通用处理
            return self._handle_generic_action(action, character_state)
    
    def _handle_phone_call(self, action: Dict, state: Dict) -> Dict:
        """处理电话行动"""
        return {
            "action_type": "phone_call",
            "character_name": action.get("character_name"),
            "target": action.get("target"),
            "reason": action.get("reason"),
            "urgency": action.get("urgency"),
            "score": action.get("score"),
            "trigger_method": "live_character_engine"
        }
    
    def _handle_side_conversation(self, action: Dict, state: Dict) -> Dict:
        """处理私下对话"""
        return {
            "action_type": "side_conversation",
            "character_name": action.get("character_name"),
            "target": action.get("target"),
            "topic": action.get("topic", action.get("reason")),
            "urgency": action.get("urgency"),
            "score": action.get("score")
        }
    
    def _handle_leave_scene(self, action: Dict, state: Dict) -> Dict:
        """处理离场"""
        return {
            "action_type": "leave_scene",
            "character_name": action.get("character_name"),
            "reason": action.get("reason"),
            "urgency": action.get("urgency")
        }
    
    def _handle_self_talk(self, action: Dict, state: Dict) -> Dict:
        """处理内心独白"""
        return {
            "action_type": "self_talk",
            "character_name": action.get("character_name"),
            "content": action.get("reason"),
            "urgency": action.get("urgency")
        }
    
    def _handle_generic_action(self, action: Dict, state: Dict) -> Dict:
        """通用行动处理器"""
        print(f"[LiveCharacterEngine] 未知行动类型: {action.get('type')}, 使用通用处理")
        return {
            "action_type": action.get("type", "unknown"),
            "character_name": action.get("character_name"),
            "raw_action": action
        }
    
    def calculate_scene_trigger_score(
        self,
        suggested_action: str,
        character_states: Dict,
        trigger_history: List[Dict] = None,
        scene_trigger: Dict = None
    ) -> Dict:
        """
        计算场景触发评分，用于验证 LLM 建议是否应该执行
        
        Args:
            suggested_action: LLM 建议的行动 (phone_call/eavesdrop/none)
            character_states: 角色状态
            trigger_history: 最近触发历史
            scene_trigger: LLM 返回的完整触发信息
            
        Returns:
            {
                "score": 0-100,
                "should_trigger": True/False,
                "adjusted_action": 最终行动,
                "reason": 判断原因
            }
        """
        if suggested_action == "none":
            return {
                "score": 0,
                "should_trigger": False,
                "adjusted_action": "none",
                "reason": "LLM 建议不触发"
            }
        
        score = 50  # 基础分（LLM 认为应该触发）
        reasons = []
        
        # 1. 触发历史惩罚（phone_call 严格，eavesdrop 宽松）
        if trigger_history:
            recent_same_action = sum(
                1 for t in trigger_history 
                if t.get("action") == suggested_action
            )
            
            if suggested_action == "phone_call":
                # 电话严格惩罚
                if recent_same_action >= 2:
                    score -= 30
                    reasons.append(f"近期已触发 {recent_same_action} 次电话 (-30)")
                elif recent_same_action == 1:
                    score -= 15
                    reasons.append(f"刚触发过电话 (-15)")
            elif suggested_action == "eavesdrop":
                # 偷听宽松惩罚（减半）
                if recent_same_action >= 3:
                    score -= 15
                    reasons.append(f"近期已触发 {recent_same_action} 次偷听 (-15)")
                elif recent_same_action >= 2:
                    score -= 8
                    reasons.append(f"近期有过偷听体验 (-8)")
                # 1次偷听不惩罚，鼓励多样性
        
        # 2. 情绪强度加成（0 ~ +25）
        max_intensity = 0
        for char_name, state in character_states.items():
            emotional = state.get("emotional", {})
            intensity = emotional.get("intensity", 0)
            if intensity > max_intensity:
                max_intensity = intensity
        
        if max_intensity >= 8:
            score += 25
            reasons.append(f"高情绪强度 {max_intensity} (+25)")
        elif max_intensity >= 6:
            score += 15
            reasons.append(f"中等情绪强度 {max_intensity} (+15)")
        elif max_intensity >= 4:
            score += 5
            reasons.append(f"情绪强度 {max_intensity} (+5)")
        
        # 3. 认知需求加成（0 ~ +15）
        total_desires = 0
        for char_name, state in character_states.items():
            cognitive = state.get("cognitive", {})
            desires = cognitive.get("desires", [])
            total_desires += len(desires) if isinstance(desires, list) else 0
        
        if total_desires >= 3:
            score += 15
            reasons.append(f"多个认知需求 ({total_desires}) (+15)")
        elif total_desires >= 1:
            score += 5
            reasons.append(f"有认知需求 ({total_desires}) (+5)")
        
        # 4. 社交动机加成（0 ~ +10）
        has_hidden_thoughts = False
        for char_name, state in character_states.items():
            social = state.get("social", {})
            if social.get("hidden_thoughts"):
                has_hidden_thoughts = True
                break
        
        if has_hidden_thoughts:
            score += 10
            reasons.append("存在未说出的想法 (+10)")
        
        # 限制范围
        score = max(0, min(100, score))
        
        # 判断是否应该触发
        should_trigger = score >= self.threshold
        adjusted_action = suggested_action if should_trigger else "none"
        
        final_reason = f"评分 {score}/{self.threshold}: " + "; ".join(reasons) if reasons else f"评分 {score}/{self.threshold}"
        
        if not should_trigger:
            final_reason += f" → 评分不足，降级为 none"
        
        print(f"[LiveCharacterEngine] 🎯 场景评分: {score}, 阈值: {self.threshold}, 触发: {should_trigger}")
        
        return {
            "score": score,
            "should_trigger": should_trigger,
            "adjusted_action": adjusted_action,
            "reason": final_reason
        }

    def generate_summary(self, character_states: Dict) -> str:
        """
        生成简短摘要(专门给LLM用)
        
        压缩策略:
        - 只保留关键信息
        - 使用简洁的自然语言
        - 限制在200字以内
        
        Args:
            character_states: 完整的角色状态
            
        Returns:
            简短摘要文本
        """
        summaries = []
        
        for char_name, state in character_states.items():
            physical = state.get("physical", {})
            emotional = state.get("emotional", {})
            
            location = physical.get("location", "未知")
            emotion = emotional.get("current", "未知")
            intensity = emotional.get("intensity", 0)
            
            # 生成单行摘要
            char_summary = f"{char_name}({location}, {emotion}_{intensity})"
            summaries.append(char_summary)
        
        return "; ".join(summaries)
