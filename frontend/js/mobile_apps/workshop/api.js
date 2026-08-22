/**
 * 剧本工坊数据访问层与上下文提取器
 */
import { PhoneCallAPIClient } from '../../phone_call_api_client.js';
import { WorldInfoExtractor } from '../../world_info_extractor.js';

let _boundSpeakersCache = [];

/**
 * 获取 API 地址
 */
export function getApiHost() {
    if (window.TTS_ThemeEngine && typeof window.TTS_ThemeEngine.getApiHost === 'function' && window.TTS_ThemeEngine.getApiHost()) {
        return window.TTS_ThemeEngine.getApiHost();
    }
    if (typeof PhoneCallAPIClient !== 'undefined' && PhoneCallAPIClient.getApiHost) {
        return PhoneCallAPIClient.getApiHost();
    }
    if (window.TTS_API && window.TTS_API.baseUrl) {
        return window.TTS_API.baseUrl;
    }
    return 'http://127.0.0.1:3000';
}

/**
 * 提取当前角色、已绑定 Speakers、SillyTavern 角色人设与世界书
 */
export async function getContextInfo() {
    // 1. 获取后端已绑定 TTS 模型的 Speaker 列表
    try {
        const apiHost = getApiHost();
        const dataRes = await fetch(`${apiHost}/api/get_data`).then(r => r.json());
        if (dataRes && dataRes.mappings) {
            _boundSpeakersCache = Object.keys(dataRes.mappings);
        }
    } catch (e) {
        console.warn('[Workshop] 获取已绑定 Speaker 失败:', e);
    }

    // 2. 通过标准提取器获取 SillyTavern 角色卡、世界书与轻量化上下文
    const enriched = WorldInfoExtractor.getEnrichedContext({ maxMessages: 12 });

    // 过滤出真正已绑定 TTS 模型的有效 Speakers
    let validBoundSpeakers = _boundSpeakersCache;
    if (validBoundSpeakers.length === 0 && enriched.charName) {
        validBoundSpeakers = [enriched.charName];
    }

    return { 
        charName: enriched.charName, 
        context: enriched.context, 
        activeSpeakers: enriched.speakers, 
        boundSpeakers: validBoundSpeakers, 
        userName: enriched.userName, 
        characterPersona: enriched.characterPersona, 
        worldInfo: enriched.worldInfo,
        chatBranch: enriched.chatBranch,
        contextFingerprint: enriched.contextFingerprint
    };
}

/**
 * 角色模型语言感知提示
 */
export function getSpeakerLanguageHint(speakerName) {
    if (!speakerName) return { recommended: 'zh', hint: '默认' };
    const models = (window.TTS_State && window.TTS_State.CACHE && window.TTS_State.CACHE.models) || {};
    const speakerModel = models[speakerName];
    if (!speakerModel || !speakerModel.languages) {
        return { recommended: 'zh', hint: '默认' };
    }
    const langs = Object.keys(speakerModel.languages);
    if (langs.includes('Japanese') && !langs.includes('Chinese')) {
        return { recommended: 'ja', hint: '💡 模型含纯日语音频，推荐日文' };
    }
    if (langs.includes('English') && !langs.includes('Chinese')) {
        return { recommended: 'en', hint: '💡 模型含英文音频，推荐英文' };
    }
    if (langs.includes('Japanese')) {
        return { recommended: 'ja', hint: '✨ 支持中/日双语' };
    }
    return { recommended: 'zh', hint: '🇨🇳 中文' };
}

/**
 * 加载预设列表
 */
export async function fetchPresets(category) {
    const apiHost = getApiHost();
    const res = await fetch(`${apiHost}/api/presets?category=${category}`);
    if (!res.ok) throw new Error(`加载预设列表失败 (${res.status})`);
    const data = await res.json();
    return data.presets || [];
}

/**
 * 加载激活的预设
 */
export async function fetchActivePresets() {
    const apiHost = getApiHost();
    const res = await fetch(`${apiHost}/api/presets/active`);
    if (!res.ok) throw new Error(`加载激活状态失败 (${res.status})`);
    const data = await res.json();
    return data.active_presets || { phone_call: ['standard_call'], eavesdrop: ['standard_eavesdrop'] };
}

/**
 * 切换单预设激活
 */
export async function togglePresetActive(category, presetId) {
    const apiHost = getApiHost();
    const res = await fetch(`${apiHost}/api/presets/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            category: category,
            toggle_preset_id: presetId
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '切换生效状态失败');
    }
    return await res.json();
}

/**
 * 批量设置激活预设
 */
export async function setBatchActivePresets(category, presetIds) {
    const apiHost = getApiHost();
    const res = await fetch(`${apiHost}/api/presets/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            category: category,
            preset_ids: presetIds
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '批量设置失败');
    }
    return await res.json();
}

/**
 * 保存预设
 */
export async function savePreset(category, payload) {
    const apiHost = getApiHost();
    const res = await fetch(`${apiHost}/api/presets/${category}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '保存剧本失败');
    }
    return await res.json();
}

/**
 * 删除预设
 */
export async function deletePreset(category, presetId) {
    const apiHost = getApiHost();
    const res = await fetch(`${apiHost}/api/presets/${category}/${presetId}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '删除剧本失败');
    }
    return await res.json();
}

/**
 * 导入预设
 */
export async function importPreset(category, rawJson) {
    const apiHost = getApiHost();
    const res = await fetch(`${apiHost}/api/presets/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            category: category,
            raw_json: rawJson
        })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '导入剧本失败');
    }
    return await res.json();
}
