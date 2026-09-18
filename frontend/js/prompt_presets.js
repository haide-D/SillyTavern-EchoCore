// Versioned browser-local presets. Built-ins are never overwritten by imports.
export const PROVIDER_RULES = Object.freeze({
    gpt_sovits: ['GPT-SoVITS', 'Use concise standard punctuation. Avoid repeated ellipses and long dashes; use commas or periods. Keep actions outside speech. Do not insert audio tags.', []],
    minimax: ['MiniMax', 'Use standard punctuation and the listed emotion field. Do not add inline audio tags. Whisper is an application voice adjustment, not a native emotion enum.', ['default', 'happy', 'sad', 'angry', 'fear', 'disgust', 'surprise', 'whisper']],
    fish_audio: ['Fish.audio', 'Use natural punctuation sparingly. Put emotion in the character emotion field; the provider converts it into model-specific cues. Avoid redundant inline cues.', ['default', 'happy', 'sad', 'angry', 'fear', 'whisper', 'excited']],
    elevenlabs: ['ElevenLabs', 'Use natural punctuation. Audio tags depend on the voice model; only use inline tags when the configured model supports them (v3).', ['default', 'happy', 'sad', 'angry', 'whisper', 'excited']],
    edge_tts: ['Edge-TTS', 'Use plain spoken text with standard punctuation, without inline audio tags.', ['default']],
    doubao: ['豆包', 'Use standard punctuation and only the emotions supported by the bound voice. Keep actions outside speech.', ['default']],
});
export function providerForModel(model = '') {
    const prefix = model.split(':')[0];
    if (prefix === 'fish') return 'fish_audio';
    if (model.startsWith('minimax_')) return 'minimax';
    return Object.hasOwn(PROVIDER_RULES, prefix) ? prefix : 'gpt_sovits';
}
const KEY = 'tts_provider_prompt_presets_v1';
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
export class PromptPresetStore {
    constructor(baseTemplate, storage = localStorage) {
        this.storage = storage;
        this.builtins = Object.fromEntries(Object.entries(PROVIDER_RULES).map(([provider, [name, rules, emotions]]) => {
            const id = `builtin_${provider}`;
            return [id, { id, provider, name: `${name} 默认`, template: baseTemplate,
                punctuation_guide: rules, allowed_emotions: emotions, is_builtin: true }];
        }));
        this.state = { version: 1, presets: {}, active_presets: {} };
        const raw = storage.getItem(KEY);
        if (raw) {
            try { this.state = this.validate(JSON.parse(raw)); }
            catch { this.loadError = '已存预设损坏，暂用内置预设。原数据未覆盖；保存后将写入新配置。'; }
        }
    }
    validate(data) {
        if (!plain(data) || data.version !== 1 || !plain(data.presets) || !plain(data.active_presets)) throw new Error('预设文件格式或版本不支持');
        const result = { version: 1, presets: {}, active_presets: {} };
        if (Object.keys(data.presets).length > 200) throw new Error('预设数量不能超过 200');
        for (const [id, item] of Object.entries(data.presets)) {
            if (!/^(custom_)[a-zA-Z0-9_-]{1,100}$/.test(id) || !plain(item) || item.id !== id || !Object.hasOwn(PROVIDER_RULES, item.provider) ||
                typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100 ||
                typeof item.template !== 'string' || !item.template.trim() || item.template.length > 50000 ||
                typeof item.punctuation_guide !== 'string' || item.punctuation_guide.length > 10000 ||
                !Array.isArray(item.allowed_emotions) || item.allowed_emotions.length > 100 ||
                item.allowed_emotions.some(e => typeof e !== 'string' || !e.trim() || e.length > 50)) throw new Error('预设字段不合法');
            result.presets[id] = { id, provider: item.provider, name: item.name.trim(), template: item.template,
                punctuation_guide: item.punctuation_guide, allowed_emotions: [...item.allowed_emotions], is_builtin: false };
        }
        for (const [provider, id] of Object.entries(data.active_presets)) {
            const preset = result.presets[id] || this.builtins[id];
            if (!Object.hasOwn(PROVIDER_RULES, provider) || !preset || preset.provider !== provider) throw new Error('生效预设与供应商不匹配');
            result.active_presets[provider] = id;
        }
        return result;
    }
    commit(next) {
        const valid = this.validate(next);
        this.storage.setItem(KEY, JSON.stringify(valid));
        this.state = valid;
    }
    list(provider) { return Object.values({ ...this.builtins, ...this.state.presets }).filter(p => p.provider === provider); }
    active(provider) { return this.list(provider).find(p => p.id === this.state.active_presets[provider]) || this.builtins[`builtin_${provider}`] || this.builtins.builtin_gpt_sovits; }
    select(provider, id) { this.commit({ ...this.state, active_presets: { ...this.state.active_presets, [provider]: id } }); }
    save(preset, copy = false) {
        const id = copy || preset.is_builtin ? `custom_${crypto.randomUUID()}` : preset.id;
        this.commit({ ...this.state, presets: { ...this.state.presets, [id]: { ...preset, id } },
            active_presets: { ...this.state.active_presets, [preset.provider]: id } });
        return id;
    }
    remove(id) {
        if (!this.state.presets[id]) throw new Error('内置预设不能删除');
        const next = JSON.parse(JSON.stringify(this.state));
        const provider = next.presets[id].provider;
        delete next.presets[id];
        if (next.active_presets[provider] === id) delete next.active_presets[provider];
        this.commit(next);
    }
    export(id) {
        if (!id) return JSON.stringify(this.state, null, 2);
        const preset = this.state.presets[id] || this.builtins[id];
        const customId = preset.is_builtin ? `custom_export_${preset.provider}` : id;
        return JSON.stringify({ version: 1, presets: { [customId]: { ...preset, id: customId, is_builtin: false } }, active_presets: { [preset.provider]: customId } }, null, 2);
    }
    import(raw, overwrite = false) {
        if (raw.length > 2000000) throw new Error('预设文件不能超过 2MB');
        const data = this.validate(JSON.parse(raw));
        const next = JSON.parse(JSON.stringify(this.state));
        for (const [id, preset] of Object.entries(data.presets)) {
            const dest = next.presets[id] && !overwrite ? `custom_${crypto.randomUUID()}` : id;
            next.presets[dest] = { ...preset, id: dest };
            if (data.active_presets[preset.provider] === id) data.active_presets[preset.provider] = dest;
        }
        Object.assign(next.active_presets, data.active_presets);
        this.commit(next);
    }
}
