"""
Weekly / Batch RP Preset Pool Generator (AI Driven or Local Template)
Supports OpenAI / DeepSeek / OneAPI or Local Template Generation
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error
from pathlib import Path

# 强制 UTF-8 输出
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# 添加父级目录以便导入 database 模块
sys.path.insert(0, str(Path(__file__).parent.parent))
from database import Database

THEMES = [
    {"theme": "深夜微醺反差", "category": "phone_call", "tone": "私密轻语、语气模糊、含糊娇憨"},
    {"theme": "突击查岗修罗场", "category": "phone_call", "tone": "警惕质问、呼吸急促、醋意大发"},
    {"theme": "暴风雨夜断电求助", "category": "phone_call", "tone": "害怕雷声、颤抖弱气、寻求安慰"},
    {"theme": "暗杀/特工加密对讲", "category": "eavesdrop", "tone": "冷酷短促、背景杂音、暗号交接"},
    {"theme": "病娇地下室独白", "category": "phone_call", "tone": "执念病娇、忽笑忽怒、占有欲爆棚"},
    {"theme": "重逢前夕的旧友来电", "category": "phone_call", "tone": "感慨怀旧、欲言又止、温柔试探"},
    {"theme": "街角咖啡馆的情报交易", "category": "eavesdrop", "tone": "压低声音、翻动纸张、紧张隐秘"},
    {"theme": "醉酒失恋后的误拨通话", "category": "phone_call", "tone": "断断续续、带哭腔、胡言乱语"}
]

SYSTEM_PROMPT = """你是一名资深互动小说与角色扮演（Roleplay）情境设计师。
请根据给定的【主题】和【分类】，设计一个极具沉浸感、适合语音合成与大模型演绎的场景预设。
输出必须是纯 JSON 格式，不要包含任何 markdown 代码块或额外文本。

JSON 格式要求：
{
  "id": "英文字符与下划线组成的唯一标识符",
  "category": "phone_call 或 eavesdrop",
  "title": "充满吸引力的预设标题 (如: 🌙 深夜被窝偷听·微醺反差)",
  "author": "haide",
  "is_nsfw": true 或 false,
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "一两句话说明该预设的玩法特色、情绪重点与LLM回复要求",
  "preview_dialogue": [
    "台词片段1 (包含少量动作括号)",
    "台词片段2"
  ],
  "preset_data": {
    "name": "预设中文名",
    "category": "phone_call 或 eavesdrop",
    "plot_template": "详细的情节发展与场景设定说明",
    "system_template": "针对该场景注入给大模型的系统指示（设定情绪、语气和短句规范）",
    "prompt_template": "场景核心诱导提示词"
  }
}"""

def generate_with_ai(api_key: str, base_url: str, model: str, theme_info: dict) -> dict:
    """调用 OpenAI 兼容 API 生成单个预设"""
    prompt = f"请为以下情境生成一个高水准的剧本预设：\n主题：{theme_info['theme']}\n分类：{theme_info['category']}\n语气基调：{theme_info['tone']}"
    
    url = f"{base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.85,
        "response_format": {"type": "json_object"}
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        content = res["choices"][0]["message"]["content"]
        # 兼容部分未去除 markdown 包裹的情况
        content = content.strip()
        if content.startswith("```"):
            lines = content.splitlines()
            content = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
        return json.loads(content)

def main():
    parser = argparse.ArgumentParser(description="批量生成 RP 预设池剧本")
    parser.add_argument("--count", type=int, default=5, help="生成预设数量")
    parser.add_argument("--api-key", type=str, default=os.getenv("OPENAI_API_KEY", ""), help="OpenAI API Key")
    parser.add_argument("--base-url", type=str, default=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"), help="API Base URL")
    parser.add_argument("--model", type=str, default=os.getenv("MODEL_NAME", "gpt-4o-mini"), help="模型名称")
    parser.add_argument("--output", type=str, default="", help="导出为 JSON 文件路径 (可选)")
    parser.add_argument("--no-db", action="store_true", help="不直接写入本地数据库")

    args = parser.parse_args()

    generated_presets = []

    print(f"🚀 开始批量生成 {args.count} 个预设...")

    if args.api_key:
        print(f"🤖 正在通过 AI 模型 [{args.model}] 生成...")
        import random
        for i in range(args.count):
            theme = THEMES[i % len(THEMES)]
            print(f"  [{i+1}/{args.count}] 生成主题: {theme['theme']} ({theme['category']})...")
            try:
                preset = generate_with_ai(args.api_key, args.base_url, args.model, theme)
                generated_presets.append(preset)
                print(f"  ✅ 成功: {preset.get('title')}")
            except Exception as e:
                print(f"  ❌ 生成失败: {e}")
    else:
        print("💡 未检测到 OPENAI_API_KEY，正在使用内置精品模板库生成...")
        import random
        for i in range(args.count):
            theme = THEMES[i % len(THEMES)]
            pid = f"auto_{theme['category']}_{i+1}_{int(random.random()*10000)}"
            preset = {
                "id": pid,
                "category": theme["category"],
                "title": f"✨ {theme['theme']}",
                "author": "haide",
                "is_nsfw": False,
                "tags": [theme["theme"], "特色盲盒", theme["category"]],
                "summary": f"设定为【{theme['theme']}】情境，基调表现为：{theme['tone']}。",
                "preview_dialogue": [
                    f"（伴随着{theme['tone']}的氛围...）",
                    "喂？你现在能听到我说话吗……"
                ],
                "preset_data": {
                    "name": theme["theme"],
                    "category": theme["category"],
                    "plot_template": f"情景设定：{theme['theme']}。基调：{theme['tone']}。",
                    "system_template": f"你正在进行【{theme['theme']}】对话。请注意情感细腻度，多使用拟声词与短句。",
                    "prompt_template": f"进入【{theme['theme']}】情境模式。"
                }
            }
            generated_presets.append(preset)
            print(f"  ✅ 载入模板: {preset['title']}")

    if not args.no_db and generated_presets:
        db = Database()
        count = db.import_presets(generated_presets)
        print(f"\n🎉 成功将 {count} 个预设导入本地 SQLite 数据库 stats.db！")

    if args.output and generated_presets:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(generated_presets, f, ensure_ascii=False, indent=2)
        print(f"📄 预设已导出至文件: {args.output}")

if __name__ == "__main__":
    main()
