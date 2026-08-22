import os
import json
import tempfile

# ================= 路径配置 =================
# 获取当前文件所在目录作为插件根目录
PLUGIN_ROOT = os.path.dirname(os.path.abspath(__file__))

SETTINGS_FILE = os.path.join(PLUGIN_ROOT, "system_settings.json")
MAPPINGS_FILE = os.path.join(PLUGIN_ROOT, "character_mappings.json")
FRONTEND_DIR = os.path.join(PLUGIN_ROOT, "frontend")

# 默认值
DEFAULT_BASE_DIR = os.path.join(PLUGIN_ROOT, "MyCharacters")
DEFAULT_CACHE_DIR = os.path.join(PLUGIN_ROOT, "Cache")
MAX_CACHE_SIZE_MB = 500
SOVITS_HOST = "http://127.0.0.1:9880"
DEFAULT_MANAGER_PORT = 3000

# ================= 配置加载逻辑 =================
def load_json(filename):
    """读取 JSON 文件，文件不存在返回空字典，解析失败记录错误并返回空字典"""
    if not os.path.exists(filename):
        return {}
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[Config] ⚠️ 读取 {filename} 失败: {e}")
        return {}

def _safe_load_for_update(filename):
    """写入前的保护性读取：文件存在但读取为空时抛异常，防止覆盖已有数据"""
    if not os.path.exists(filename):
        return {}
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as e:
        # 文件存在但读不出来 → 拒绝返回空字典，防止调用方用空数据覆盖
        raise IOError(f"文件 {filename} 存在但读取失败，拒绝覆盖: {e}")

def save_json(filename, data):
    """原子写入 JSON：先写临时文件再 rename，避免写一半崩溃导致文件损坏"""
    try:
        dir_name = os.path.dirname(filename)
        fd, tmp_path = tempfile.mkstemp(suffix='.tmp', dir=dir_name)
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            # Windows 上 rename 目标存在会报错，需要先删除
            if os.path.exists(filename):
                os.replace(tmp_path, filename)
            else:
                os.rename(tmp_path, filename)
        except:
            # 写入失败，清理临时文件
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            raise
    except Exception as e:
        print(f"[Config] ❌ 保存 {filename} 失败: {e}")

def init_settings():
    """初始化并读取设置，确保文件和目录存在"""
    settings = load_json(SETTINGS_FILE)
    dirty = False

    # 默认值检查
    defaults = {
        "enabled": True,
        "auto_generate": True,
        "base_dir": DEFAULT_BASE_DIR,
        "cache_dir": DEFAULT_CACHE_DIR,
        "default_lang": "Chinese",
        "iframe_mode": False,
        "bubble_style": "default",
        "sovits_host": SOVITS_HOST,
        "manager_port": DEFAULT_MANAGER_PORT,
        "developer_mode": False
    }

    for key, val in defaults.items():
        if settings.get(key) is None:
            settings[key] = val
            dirty = True
        elif (key == "base_dir" or key == "cache_dir") and not settings.get(key):
            # 防止空字符串路径
            settings[key] = val
            dirty = True

    # 深度合并函数
    def deep_merge(defaults: dict, user_config: dict) -> bool:
        """深度合并配置,只补充缺失字段,返回是否有修改"""
        modified = False
        for key, default_val in defaults.items():
            if key not in user_config:
                user_config[key] = default_val
                modified = True
            elif isinstance(default_val, dict) and isinstance(user_config.get(key), dict):
                # 递归合并嵌套字典
                if deep_merge(default_val, user_config[key]):
                    modified = True
        return modified

    # 默认 TTS 文本发音替换字典 (针对多音字、口语与特殊发音纠正)
    default_text_replacements = {
        "操我": "肏我",
        "操你": "肏你",
        "我操": "我肏",
        "卧槽": "卧肏",
        "重重地": "虫虫地",
        "行了": "形了",
        "行的": "形得",
        "干嘛": "干麻",
        "噢": "哦",
        "3Q": "谢谢",
        "666": "溜溜溜",
        "233": "哈哈哈"
    }

    # message_processing 配置 - 共享的消息过滤与替换配置
    message_processing_defaults = {
        "extract_tag": "",
        "filter_tags": "<small>, [statbar]",
        "text_replacements": default_text_replacements
    }
    # 类型安全检查：如果值不是字典，用默认值覆盖
    if "message_processing" not in settings or not isinstance(settings["message_processing"], dict):
        settings["message_processing"] = message_processing_defaults
        dirty = True
    else:
        if deep_merge(message_processing_defaults, settings["message_processing"]):
            dirty = True

    # phone_call 配置 - 使用深度合并,只补充缺失字段,不覆盖用户设置
    phone_call_defaults = {
        "enabled": True,
        "trigger": {
            "type": "message_count",
            "threshold": 5
        },
        "llm": {
            "api_url": "",
            "api_key": "",
            "model": "gemini-2.5-flash",
            "temperature": 0.8,
            "max_tokens": 5000
        },
        "data_extractors": [
            {
                "name": "summary",
                "pattern": "<总结>([\\s\\S]*?)</总结>",
                "scope": "character_only",
                "description": "提取角色消息中的总结内容"
            }
        ],
        "response_parser": {
            "format": "json",
            "fallback_emotion": "default",
            "validate_speed_range": [0.5, 2.0],
            "validate_pause_range": [0.1, 3.0]
        },
        "audio_merge": {
            "silence_between_segments": 0.5,
            "normalize_volume": False,
            "output_format": "wav"
        },
        "tts_config": {
            "text_lang": "zh",
            "prompt_lang": "zh",
            "text_split_method": "cut0",
            "use_aux_ref_audio": False
        },
        "auto_generation": {
            "enabled": True,
            "trigger_strategy": "floor_interval",
            "floor_interval": 3,
            "start_floor": 3,
            "max_context_messages": 10,
            "notification_method": "websocket"
        }
    }

    # 初始化或深度合并 phone_call 配置
    # 类型安全检查
    if "phone_call" not in settings or not isinstance(settings["phone_call"], dict):
        settings["phone_call"] = phone_call_defaults
        dirty = True
    else:
        # 深度合并,保留用户已有设置
        if deep_merge(phone_call_defaults, settings["phone_call"]):
            dirty = True

    # analysis_engine 默认配置 - 分析引擎独立配置
    analysis_engine_defaults = {
        "enabled": True,
        "analysis_interval": 2,          # 每几楼层分析一次
        "max_history_records": 100,       # 最大历史记录数
        "llm_context_limit": 10,          # 发给 LLM 的历史记录数量
        "trigger_threshold": 60,          # 行动触发阈值 (0-100)
        "llm": {
            "api_url": "",
            "api_key": "",
            "model": "",
            "temperature": 0.8,
            "max_tokens": 5000
        }
    }
    
    # 类型安全检查
    if "analysis_engine" not in settings or not isinstance(settings["analysis_engine"], dict):
        settings["analysis_engine"] = analysis_engine_defaults
        dirty = True
    else:
        if deep_merge(analysis_engine_defaults, settings["analysis_engine"]):
            dirty = True

    # ui_theme 默认配置 - 沉浸式主题引擎
    ui_theme_defaults = {
        "current": "default",
        "preferences": {}
    }
    if "ui_theme" not in settings or not isinstance(settings["ui_theme"], dict):
        settings["ui_theme"] = ui_theme_defaults
        dirty = True
    else:
        if deep_merge(ui_theme_defaults, settings["ui_theme"]):
            dirty = True

    # prompt_injector 注入提示词与情感场景注释默认配置
    prompt_injector_defaults = {
        "enabled": True,
        "custom_template": "",
        "emotion_annotations": {
            "default": "日常、平和对话基准语调",
            "happy": "心情愉悦、开朗、赞许或微笑时使用",
            "sad": "失落、悲伤、委屈、低落或哭腔时使用",
            "angry": "受到直接挑衅、被激怒或发生激烈争吵时使用",
            "surprise": "遇到意料之外事件、震惊或疑惑时使用",
            "fear": "感到危险、恐惧、被威胁或极度不安时使用",
            "panting": "仅在剧烈运动、长跑、极度疲惫或身体剧烈消耗时使用 (严禁日常闲聊误用)",
            "climax": "仅在全剧情最高潮绝境、决战或情绪极值爆发时使用 (严禁轻微情绪波动时误用)",
            "whisper": "窃窃私语、耳语或私密秘密对话时使用",
            "disgust": "极度厌恶、鄙夷、嫌弃或排斥时使用",
            "smug": "自鸣得意、傲娇、得意洋洋或嘲弄时使用"
        }
    }
    if "prompt_injector" not in settings or not isinstance(settings["prompt_injector"], dict):
        settings["prompt_injector"] = prompt_injector_defaults
        dirty = True
    else:
        if deep_merge(prompt_injector_defaults, settings["prompt_injector"]):
            dirty = True

    # minimax_tts 默认配置 - 云端 TTS 商业化引擎
    minimax_tts_defaults = {
        "enabled": False,
        "api_key": "",
        "group_id": "",
        "api_url": "https://api.minimax.chat/v1/t2a_v2",
        "model": "speech-01-turbo",
        "default_voice_id": "female-shaonv",
        "speed": 1.0,
        "vol": 1.0,
        "pitch": 0,
        "audio_format": "mp3",
        "sample_rate": 32000,
        "bitrate": 128000,
        "custom_voices": []
    }
    if "minimax_tts" not in settings or not isinstance(settings["minimax_tts"], dict):
        settings["minimax_tts"] = minimax_tts_defaults
        dirty = True
    else:
        if deep_merge(minimax_tts_defaults, settings["minimax_tts"]):
            dirty = True
    
    # 迁移旧配置（兼容性处理）
    if "analysis_llm" in settings:
        # 如果用户有旧的 analysis_llm 配置，迁移到 analysis_engine.llm
        old_llm = settings.pop("analysis_llm")
        if deep_merge(old_llm, settings["analysis_engine"]["llm"]):
            pass  # 合并旧配置到新位置
        dirty = True
    
    # 迁移 phone_call 中的旧分析配置
    phone_call = settings.get("phone_call", {})
    if "continuous_analysis" in phone_call:
        old_ca = phone_call.pop("continuous_analysis")
        settings["analysis_engine"]["analysis_interval"] = old_ca.get("analysis_interval", 3)
        settings["analysis_engine"]["max_history_records"] = old_ca.get("max_history_records", 100)
        settings["analysis_engine"]["llm_context_limit"] = old_ca.get("llm_context_limit", 10)
        dirty = True
    if "live_character" in phone_call:
        old_lc = phone_call.pop("live_character")
        settings["analysis_engine"]["trigger_threshold"] = old_lc.get("threshold", 60)
        dirty = True
    if "smart_trigger" in phone_call:
        phone_call.pop("smart_trigger")  # 已废弃，直接删除
        dirty = True


    if dirty:
        save_json(SETTINGS_FILE, settings)

    # 确保物理路径存在
    base_dir = settings["base_dir"]
    cache_dir = settings["cache_dir"]

    if not os.path.exists(cache_dir): os.makedirs(cache_dir, exist_ok=True)
    if not os.path.exists(base_dir): os.makedirs(base_dir, exist_ok=True)

    return settings

# 获取当前配置的快捷函数
def get_current_dirs():
    s = init_settings()
    return s["base_dir"], s["cache_dir"]

def get_sovits_host():
    """获取配置的 GPT-SoVITS 服务地址"""
    s = init_settings()
    return s.get("sovits_host", SOVITS_HOST)


def get_manager_port():
    """获取配置的后台服务端口 (Manager Port)"""
    s = init_settings()
    try:
        return int(s.get("manager_port", DEFAULT_MANAGER_PORT))
    except (ValueError, TypeError):
        return DEFAULT_MANAGER_PORT


def get_character_mappings():
    """获取角色-模型映射表"""
    return load_json(MAPPINGS_FILE)


def get_bound_characters():
    """获取所有已绑定模型的角色名列表"""
    mappings = get_character_mappings()
    return list(mappings.keys())


def is_character_bound(char_name: str) -> bool:
    """检查角色是否已绑定模型"""
    mappings = get_character_mappings()
    return char_name in mappings


def get_character_provider(char_name: str) -> str:
    """
    获取角色所绑定的 TTS 引擎供应商
    
    Returns:
        'minimax' 或 'gpt_sovits'
    """
    mappings = get_character_mappings()
    target = str(mappings.get(char_name, ""))
    if target.startswith("minimax:") or target.startswith("minimax_"):
        return "minimax"
    return "gpt_sovits"


def is_minimax_character(char_name: str) -> bool:
    """检查角色是否绑定了 MiniMax 声线"""
    return get_character_provider(char_name) == "minimax"


def get_character_voice_id(char_name: str, default: str = "female-shaonv") -> str:
    """获取 MiniMax 角色的音色 ID"""
    mappings = get_character_mappings()
    target = str(mappings.get(char_name, ""))
    if target.startswith("minimax:"):
        return target[len("minimax:"):].strip() or default
    elif target.startswith("minimax_"):
        return target[len("minimax_"):].strip() or default
    return default


def filter_bound_speakers(speakers: list) -> list:
    """
    过滤说话人列表，只保留已绑定模型的角色
    
    Args:
        speakers: 说话人列表
        
    Returns:
        已绑定模型的说话人列表
    """
    mappings = get_character_mappings()
    bound_speakers = [s for s in speakers if s in mappings]
    
    if len(bound_speakers) < len(speakers):
        unbound = [s for s in speakers if s not in mappings]
        print(f"[Config] ⚠️ 以下角色未绑定模型，已过滤: {unbound}")
    
    return bound_speakers


def apply_text_replacements(text: str, replacements: dict = None) -> str:
    """
    对待合成 TTS 文本执行发音纠正与多音字替换
    
    Args:
        text: 待处理文本
        replacements: 替换字典 { "原词": "替换词" }，若为空则自动读取系统配置
        
    Returns:
        替换后的文本
    """
    if not text:
        return text
        
    if replacements is None:
        settings = init_settings()
        msg_processing = settings.get("message_processing", {})
        replacements = msg_processing.get("text_replacements", {})
        
    if not isinstance(replacements, dict) or not replacements:
        return text
        
    # 按原词长度降序排序（避免短词破坏长词匹配）
    sorted_pairs = sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True)
    
    processed = text
    for old_word, new_word in sorted_pairs:
        if old_word and old_word in processed:
            processed = processed.replace(old_word, str(new_word))
            
    return processed

