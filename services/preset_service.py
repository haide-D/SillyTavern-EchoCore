import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

logger = logging.getLogger(__name__)

class PresetService:
    """创作者工坊 - 场景预设与 Prompt 管理服务 (基于纯 JSON 文件存储)"""
    
    BASE_DIR = Path(__file__).resolve().parent.parent
    PRESETS_DIR = BASE_DIR / "presets"
    BUILTIN_DIR = PRESETS_DIR / "builtin"
    CUSTOM_DIR = PRESETS_DIR / "custom"
    
    VALID_CATEGORIES = {"phone_call", "eavesdrop"}

    # 官方标准系统注入与输出规范模板 (电话)
    DEFAULT_PHONE_SYSTEM_TEMPLATE = """**可用角色与情绪:**
{{speakers_emotions}}

**近期对话上下文:**
{{context}}

**角色卡人设与世界书设定**:
- 角色人设: {{character_persona}}
- 世界观设定: {{world_info}}

**上次通话摘要** (若有):
{{last_call_summary}}

**⚠️ 纯语音输出铁律 (TTS 规范)**:
1. text 字段只能包含**可朗读的纯台词文本**，严禁包含任何动作描述、括号心理活动或非台词字符（如 `（叹气）`、`（看向窗外）`、`*笑*`）。
2. **【情绪标签严格闭环】**: 每个 segment 的 `emotion` 字段值**必须 100% 严格从上述【可用角色与情绪】列表中选取**，严禁自行编造或臆造列表中不存在的情绪词（若无对应情绪，使用 default 或 neutral）。
3. **【translation 字段铁律】: 无论 text 字段是日文、英文还是其他任何语言，translation 字段必须且只能输出地道流畅的简体中文翻译！严禁在 translation 字段中输出英文或非中文内容！若 text 本身是中文，则复制相同中文。**

**输出格式 (严格 JSON)**:
```json
{
  "speaker": "{{caller}}",
  "segments": [
    {
      "emotion": "必须从可用情绪列表中选取",
      "text": "纯对话内容，**必须使用{{lang_display}}**",
      "translation": "简体中文翻译 (【铁律】：必须是中文！严禁输出英文或日文！若text是中文则一致)",
      "pause_after": 0.4,
      "speed": 1.0,
      "filler_word": null
    }
  ]
}
```

生成 10-15 个具有真实生活感的情感片段。"""

    # 官方标准系统注入与输出规范模板 (偷听)
    DEFAULT_EAVESDROP_SYSTEM_TEMPLATE = """**参与角色及其可用情绪**:
{{speakers_emotions}}

**对话历史参考**:
{{context}}

**角色卡与世界书背景**:
- 角色人设: {{character_persona}}
- 世界书背景: {{world_info}}

**⚠️ 纯语音输出铁律 (TTS 规范)**:
1. text 字段只能包含**纯台词**，严禁包含任何动作描述、括号心理活动或旁白（如 `（轻微吸气）`、`（身体僵硬）`）。
2. **【情绪标签严格闭环】**: 每个 segment 的 `emotion` 字段值**必须 100% 严格从该角色对应的【可用情绪列表】中选取**，严禁自行编造或臆造列表中不存在的情绪词。
3. **【translation 字段铁律】: 无论 text 字段是日文、英文还是其他任何语言，translation 字段必须且只能填写流畅地道的简体中文！严禁在 translation 字段输出英文或非中文！若 text 本身是中文则一致。**

**输出格式 (严格 JSON)**:
```json
{
  "scene_description": "场景描述",
  "segments": [
    {
      "speaker": "角色名 (必须是参与角色之一)",
      "emotion": "必须从该角色的可用情绪列表中选取",
      "text": "纯对话内容，无任何括号或动作描述，**必须使用{{lang_display}}**",
      "translation": "简体中文翻译 (【铁律】：必须是中文！严禁输出英文或日文！若text是中文则一致)",
      "pause_after": 0.5
    }
  ]
}
```

生成 10-25 个对话片段，让参与角色自然交替说话。"""

    # 官方标准剧情与细节默认模板 (电话)
    DEFAULT_PHONE_PLOT_TEMPLATE = """你是一个沉浸式剧情编剧。角色 {{caller}} 正在主动拨打电话联系 {{target}}。

**呼叫背景与动机**:
- 发起角色: {{caller}}
- 接听对象: {{target}}
- 传讯事由: {{call_reason}}
- 情绪基调: {{call_tone}}

**剧本创作核心要求与铁律**:
1. 【深度剧情锚定 (严禁割裂)】: 必须仔细阅读【近期对话上下文】！通话内容严禁脱离当前故事主线凭空闲聊，必须自然承接最新剧情（如：两人刚分开的场景、未聊完的话题、刚经历的事件、提及的物品或约定）。将「{{call_reason}}」作为情感/行动契机融入对话中。
2. 【单向通话/独角戏 (严禁假装互动)】: 这是一段单向来电/独白，接听方 {{target}} 在此阶段不会有任何语音回应。绝对禁止自导自演假装听到对方说话并自我回应（严禁出现“啊？你说什么？……哦，这样啊”等虚假互动），必须保持单向倾诉、询问或叙述的自然连贯口语感。
3. 【口语真实感与人设】: 真实还原通话的呼吸感与口语质感，开头有符合双方关系与当前情境的称呼与问候，语言风格严格符合其性格人设与背景设定。
4. speaker 字段必须为 {{caller}}。
{{followup_call_instructions}}"""

    # 官方标准剧情与细节默认模板 (偷听)
    DEFAULT_EAVESDROP_PLOT_TEMPLATE = """你是一个创意编剧，正在编写参与角色 {{speakers}} 之间的私下对话。

**剧情主题与基调**:
- 讨论主题: {{theme}}
- 剧情起因: {{call_reason}}
- 氛围张力: {{call_tone}}

**剧本创作核心要求与铁律**:
1. 【深度剧情锚定 (严禁割裂)】: 必须仔细阅读【对话历史参考】！角色私下谈话必须紧密结合刚才发生的剧情、主角刚才的举动或当前共同面临的环境，紧扣「{{theme}}」与「{{call_reason}}」展开。
2. 【多人交替互动】: 参与角色自然交替说话，展现角色私底下对彼此的真实看法、心声或不为人知的秘密，避免一人垄断台词。
3. 【性格人设与口吻】: 每个角色的说话风格严格符合其性格人设与背景设定，情绪自然起伏过渡。"""

    @classmethod
    def get_default_templates(cls, category: str) -> Dict[str, str]:
        """获取指定分类的官方默认模板 (剧情模版 + 系统注入模版)"""
        if category == "eavesdrop":
            return {
                "plot_template": cls.DEFAULT_EAVESDROP_PLOT_TEMPLATE,
                "system_template": cls.DEFAULT_EAVESDROP_SYSTEM_TEMPLATE
            }
        return {
            "plot_template": cls.DEFAULT_PHONE_PLOT_TEMPLATE,
            "system_template": cls.DEFAULT_PHONE_SYSTEM_TEMPLATE
        }

    @classmethod
    def _normalize_preset_data(cls, data: Dict[str, Any], category: str) -> Dict[str, Any]:
        """标准化预设数据结构，确保 plot_template、system_template 与 prompt_template 齐备"""
        defaults = cls.get_default_templates(category)
        
        plot_template = data.get("plot_template")
        system_template = data.get("system_template")
        prompt_template = data.get("prompt_template", "")

        # 如果已有 plot_template 和 system_template
        if plot_template is not None or system_template is not None:
            plot_val = (plot_template or "").strip()
            sys_val = (system_template if system_template is not None else defaults["system_template"]).strip()
            data["plot_template"] = plot_val
            data["system_template"] = sys_val
            # 动态组装合成 prompt_template
            if plot_val and sys_val:
                data["prompt_template"] = f"{plot_val}\n\n{sys_val}"
            elif plot_val:
                data["prompt_template"] = plot_val
            else:
                data["prompt_template"] = sys_val
        else:
            # 兼容旧版本单一 prompt_template
            raw_prompt = prompt_template.strip()
            data["plot_template"] = raw_prompt
            data["system_template"] = defaults["system_template"]
            data["prompt_template"] = raw_prompt

        return data

    @classmethod
    def ensure_dirs(cls):
        """确保预设存储目录完整"""
        cls.PRESETS_DIR.mkdir(exist_ok=True)
        cls.BUILTIN_DIR.mkdir(exist_ok=True)
        cls.CUSTOM_DIR.mkdir(exist_ok=True)
        
        for category in cls.VALID_CATEGORIES:
            (cls.BUILTIN_DIR / category).mkdir(parents=True, exist_ok=True)
            (cls.CUSTOM_DIR / category).mkdir(parents=True, exist_ok=True)

    @classmethod
    def _sanitize_id(cls, preset_id: str) -> str:
        """清理预设 ID，防止路径遍历与特殊字符注入"""
        # 仅保留字母、数字、下划线和中划线
        clean_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', preset_id.strip())
        return clean_id.strip('_') or "unnamed_preset"

    @classmethod
    def list_presets(cls, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """列出所有预设 (包含官方出厂与用户自制)"""
        cls.ensure_dirs()
        presets = []
        seen_ids = set()

        categories_to_scan = [category] if category and category in cls.VALID_CATEGORIES else list(cls.VALID_CATEGORIES)

        for cat in categories_to_scan:
            # 1. 扫描用户自制目录 (Custom)
            custom_cat_dir = cls.CUSTOM_DIR / cat
            if custom_cat_dir.exists():
                for json_file in custom_cat_dir.glob("*.json"):
                    try:
                        with open(json_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            data["is_builtin"] = False
                            data["category"] = cat
                            if "id" not in data:
                                data["id"] = json_file.stem
                            data = cls._normalize_preset_data(data, cat)
                            presets.append(data)
                            seen_ids.add((cat, data["id"]))
                    except Exception as e:
                        logger.warning(f"读取自定义预设文件失败 {json_file}: {e}")

            # 2. 扫描官方出厂目录 (Builtin)
            builtin_cat_dir = cls.BUILTIN_DIR / cat
            if builtin_cat_dir.exists():
                for json_file in builtin_cat_dir.glob("*.json"):
                    try:
                        with open(json_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            data["is_builtin"] = True
                            data["category"] = cat
                            if "id" not in data:
                                data["id"] = json_file.stem
                            data = cls._normalize_preset_data(data, cat)
                            presets.append(data)
                    except Exception as e:
                        logger.warning(f"读取出厂预设文件失败 {json_file}: {e}")

        return presets

    @classmethod
    def get_preset(cls, category: str, preset_id: str) -> Optional[Dict[str, Any]]:
        """获取单个预设详情 (优先读取 custom, 其次 builtin)"""
        cls.ensure_dirs()
        if category not in cls.VALID_CATEGORIES:
            return None
            
        clean_id = cls._sanitize_id(preset_id)
        
        # 1. 先查 custom
        custom_file = cls.CUSTOM_DIR / category / f"{clean_id}.json"
        if custom_file.is_file():
            try:
                with open(custom_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    data["is_builtin"] = False
                    data["category"] = category
                    data["id"] = clean_id
                    return cls._normalize_preset_data(data, category)
            except Exception as e:
                logger.error(f"读取自定义预设失败 {custom_file}: {e}")

        # 2. 再查 builtin
        builtin_file = cls.BUILTIN_DIR / category / f"{clean_id}.json"
        if builtin_file.is_file():
            try:
                with open(builtin_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    data["is_builtin"] = True
                    data["category"] = category
                    data["id"] = clean_id
                    return cls._normalize_preset_data(data, category)
            except Exception as e:
                logger.error(f"读取内置预设失败 {builtin_file}: {e}")

        return None

    @classmethod
    def save_preset(cls, category: str, preset_data: Dict[str, Any]) -> Dict[str, Any]:
        """保存或更新用户自定义预设 (禁止直接修改/覆盖 builtin 模式)"""
        cls.ensure_dirs()
        if category not in cls.VALID_CATEGORIES:
            raise ValueError(f"无效的预设分类: {category}")

        name = preset_data.get("name", "").strip()
        if not name:
            raise ValueError("预设名称不能为空")

        defaults = cls.get_default_templates(category)
        plot_template = preset_data.get("plot_template", "").strip()
        system_template = preset_data.get("system_template", defaults["system_template"]).strip()
        prompt_template = preset_data.get("prompt_template", "").strip()

        if not plot_template and not prompt_template:
            raise ValueError("剧情与细节设定 (plot_template) 不能为空")

        if not plot_template and prompt_template:
            plot_template = prompt_template

        # 合成完整的 prompt_template
        combined_prompt = f"{plot_template}\n\n{system_template}".strip() if system_template else plot_template

        raw_id = preset_data.get("id") or name
        clean_id = cls._sanitize_id(raw_id)

        # 确保出厂预设 ID 不被随意恶意抹除 builtin 标识
        # 如果与官方同名，则加上 _custom 后缀
        builtin_file = cls.BUILTIN_DIR / category / f"{clean_id}.json"
        if builtin_file.exists() and preset_data.get("is_builtin", False):
            clean_id = f"{clean_id}_custom"

        payload = {
            "id": clean_id,
            "name": name,
            "category": category,
            "author": preset_data.get("author", "User").strip() or "User",
            "version": preset_data.get("version", "1.0.0"),
            "description": preset_data.get("description", "").strip(),
            "tags": preset_data.get("tags", []),
            "plot_template": plot_template,
            "system_template": system_template,
            "prompt_template": combined_prompt,
            "recommended_params": preset_data.get("recommended_params", {}),
            "is_builtin": False
        }

        target_file = cls.CUSTOM_DIR / category / f"{clean_id}.json"
        with open(target_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        logger.info(f"成功保存自定义预设: {target_file}")
        return payload

    @classmethod
    def delete_preset(cls, category: str, preset_id: str) -> bool:
        """删除自定义预设 (出厂预设受保护禁止删除)"""
        cls.ensure_dirs()
        if category not in cls.VALID_CATEGORIES:
            raise ValueError(f"无效的预设分类: {category}")

        clean_id = cls._sanitize_id(preset_id)
        
        # 检查是否为出厂预设
        builtin_file = cls.BUILTIN_DIR / category / f"{clean_id}.json"
        custom_file = cls.CUSTOM_DIR / category / f"{clean_id}.json"

        if not custom_file.exists():
            if builtin_file.exists():
                raise PermissionError("官方出厂预设受系统保护，禁止删除")
            return False

        custom_file.unlink(missing_ok=True)
        logger.info(f"成功删除自定义预设: {custom_file}")
        return True

    @classmethod
    def import_preset(cls, file_content: str, force_category: Optional[str] = None) -> Dict[str, Any]:
        """导入 JSON 预设文本并校验结构"""
        cls.ensure_dirs()
        try:
            data = json.loads(file_content)
        except Exception as e:
            raise ValueError(f"JSON 格式解析失败: {str(e)}")

        category = force_category or data.get("category", "phone_call")
        if category not in cls.VALID_CATEGORIES:
            category = "phone_call"

        name = data.get("name", "").strip()
        plot_template = data.get("plot_template", "").strip()
        prompt_template = data.get("prompt_template", "").strip()

        if not name or (not plot_template and not prompt_template):
            raise ValueError("导入的预设缺少必要字段 (name，以及 plot_template 或 prompt_template)")

        return cls.save_preset(category, data)

    @classmethod
    def match_best_preset(
        cls,
        category: str,
        active_ids: Optional[List[str]] = None,
        context: Optional[List[Dict[str, Any]]] = None,
        trigger_reason: Optional[str] = None,
        call_tone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        智能剧本匹配引擎 (Auto-Match Smart Routing):
        当批量启用了多个生效剧本时，根据当前对话历史、触发原因与情绪氛围自动挑选最契合的剧本
        """
        cls.ensure_dirs()
        default_id = "standard_call" if category == "phone_call" else "standard_eavesdrop"
        
        # 整理生效池
        valid_pool = []
        if active_ids:
            for pid in active_ids:
                p = cls.get_preset(category, pid)
                if p:
                    valid_pool.append(p)
        
        if not valid_pool:
            fallback = cls.get_preset(category, default_id)
            return fallback or {"id": default_id, "name": default_id, "prompt_template": ""}

        if len(valid_pool) == 1:
            return valid_pool[0]

        # 多剧本智能匹配打分
        recent_text = ""
        if context and isinstance(context, list):
            recent_text = " ".join([str(m.get("mes", "")) for m in context[-8:]])
        
        combined_text = f"{recent_text} {trigger_reason or ''} {call_tone or ''}".lower()

        # 关键词库加权
        EMERGENCY_WORDS = {"救命", "危险", "快跑", "出事", "警察", "医院", "紧急", "受伤", "help", "danger", "crisis", "panic", "emergency"}
        NIGHT_WORDS = {"深夜", "睡不着", "晚安", "想你", "失眠", "夜深", "窗外", "月光", "心事", "whisper", "night", "sleep", "soft"}
        JEALOUSY_WORDS = {"吃醋", "吵架", "修罗场", "第三者", "背叛", "生气", "傲娇", "争执", "不满", "jealous", "angry", "fight"}
        SECRET_WORDS = {"秘密", "计划", "密谋", "隐瞒", "不可告人", "暗杀", "情报", "瞒着", "机密", "secret", "plan", "conspiracy"}

        best_preset = valid_pool[0]
        max_score = -1

        import datetime
        current_hour = datetime.datetime.now().hour
        is_night_time = (current_hour >= 22 or current_hour <= 5)

        for p in valid_pool:
            pid = p.get("id", "").lower()
            name = p.get("name", "").lower()
            desc = p.get("description", "").lower()
            tags = [t.lower() for t in p.get("tags", [])]
            score = 1  # 基础分

            # 1. 紧急求援类 (判定: emergency / 紧急 / 求助 / 突发)
            if "emergency" in pid or "紧急" in name or "求助" in name or "突发" in name:
                hit_count = sum(1 for w in EMERGENCY_WORDS if w in combined_text)
                if hit_count > 0:
                    score += hit_count * 20

            # 2. 深夜心语类 (判定: midnight / whisper / 深夜 / 私语 / 心语)
            elif "midnight" in pid or "whisper" in pid or "深夜" in name or "私语" in name:
                hit_count = sum(1 for w in NIGHT_WORDS if w in combined_text)
                if hit_count > 0:
                    score += hit_count * 15
                if is_night_time:
                    score += 10

            # 3. 修罗场/吃醋类 (判定: jealousy / gossip / 修罗场 / 吃醋 / 对质)
            elif "jealousy" in pid or "gossip" in pid or "修罗场" in name or "吃醋" in name or "对质" in name:
                hit_count = sum(1 for w in JEALOUSY_WORDS if w in combined_text)
                if hit_count > 0:
                    score += hit_count * 18

            # 4. 密谋商议类 (判定: secret / conspiracy / 密谋 / 机密 / 商议)
            elif "secret" in pid or "conspiracy" in pid or "密谋" in name or "机密" in name or "商议" in name:
                hit_count = sum(1 for w in SECRET_WORDS if w in combined_text)
                if hit_count > 0:
                    score += hit_count * 18

            # 5. 日常兜底类
            elif "standard" in pid or "日常" in name or "闲聊" in name or "闲谈" in name:
                score += 2

            # 6. 自定义剧本标签与关键词模糊加权
            for tag in tags:
                if tag and tag in combined_text:
                    score += 5

            if score > max_score:
                max_score = score
                best_preset = p

        logger.info(f"[PresetMatcher] 🧠 智能分析情境 -> 自动命中最佳剧本: 「{best_preset.get('name')}」 (匹配池大小: {len(valid_pool)}, 得分: {max_score})")
        return best_preset

