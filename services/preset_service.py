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
                            # 若自定义存在同名则不强行覆盖，但标记
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
                    return data
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
                    return data
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

        prompt_template = preset_data.get("prompt_template", "").strip()
        if not prompt_template:
            raise ValueError("提示词模板 (prompt_template) 不能为空")

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
            "prompt_template": prompt_template,
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
        prompt_template = data.get("prompt_template", "").strip()

        if not name or not prompt_template:
            raise ValueError("导入的预设缺少必要字段 (name 或 prompt_template)")

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

