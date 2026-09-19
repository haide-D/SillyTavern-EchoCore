"""Validate the shared v1 prompt-preset document before replacing it on disk."""
import re

PROVIDERS = {'gpt_sovits', 'minimax', 'fish_audio', 'elevenlabs', 'edge_tts', 'doubao'}


def validate_prompt_presets(data):
    def text(value, limit, required=True):
        return isinstance(value, str) and len(value) <= limit and (not required or bool(value.strip()))

    if (not isinstance(data, dict) or type(data.get('version')) is not int or data['version'] != 1
            or not isinstance(data.get('presets'), dict) or not isinstance(data.get('active_presets'), dict)):
        raise ValueError('预设文件格式或版本不支持')
    if len(data['presets']) > 200:
        raise ValueError('预设数量不能超过 200')
    result = {'version': 1, 'presets': {}, 'active_presets': {}}
    for key, item in data['presets'].items():
        if (not re.fullmatch(r'custom_[a-zA-Z0-9_-]{1,100}', key) or not isinstance(item, dict)
                or item.get('id') != key or item.get('provider') not in PROVIDERS
                or not text(item.get('name'), 100) or not text(item.get('template'), 50000)
                or not text(item.get('punctuation_guide'), 10000, False)
                or not isinstance(item.get('allowed_emotions'), list) or len(item['allowed_emotions']) > 100
                or any(not text(emotion, 50) for emotion in item['allowed_emotions'])):
            raise ValueError('预设字段不合法')
        result['presets'][key] = {field: item[field] for field in
                                  ('id', 'provider', 'name', 'template', 'punctuation_guide', 'allowed_emotions')}
        result['presets'][key].update(name=item['name'].strip(), is_builtin=False)
    for provider, key in data['active_presets'].items():
        if (provider not in PROVIDERS or not isinstance(key, str) or
                (key != f'builtin_{provider}' and result['presets'].get(key, {}).get('provider') != provider)):
            raise ValueError('生效预设与供应商不匹配')
        result['active_presets'][provider] = key
    return result
