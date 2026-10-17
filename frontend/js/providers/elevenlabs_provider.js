import { BaseTTSProvider } from './base_provider.js';

export function elevenLabsCredentialFingerprint(value) {
    let fingerprint = 2166136261;
    for (const char of String(value || '')) {
        fingerprint ^= char.charCodeAt(0);
        fingerprint = Math.imul(fingerprint, 16777619);
    }
    return (fingerprint >>> 0).toString(16);
}

export class ElevenLabsProvider extends BaseTTSProvider {
    constructor(config) { super(config || {}); this.name = 'ElevenLabs'; }
    validateConfig() { return true; }
    validateModel() { return true; }
    getCacheIdentity(charName) {
        const cfg = window.TTS_State?.CACHE?.settings?.elevenlabs_tts || {};
        return [this.name, window.TTS_State?.CACHE?.mappings?.[charName], cfg.default_voice_id,
            cfg.api_base, cfg.model || 'eleven_v3', elevenLabsCredentialFingerprint(cfg.api_key), cfg.stability ?? 0.5, cfg.audio_tags !== false,
            window.TTS_PromptInjector?.getModelSpeed?.(charName) || 1];
    }
    params(task) {
        const target = window.TTS_State?.CACHE?.mappings?.[task.charName] || '';
        return { text: task.text, emotion: task.emotion || 'default', provider: 'elevenlabs',
            voice_id: target.startsWith('elevenlabs:') ? target.slice(11) : '',
            speed: window.TTS_PromptInjector?.getModelSpeed?.(task.charName) || 1 };
    }
    async checkCache(task) { return window.TTS_API.checkCache(this.params(task)); }
    async generateAudio(task) {
        const params = this.params(task);
        if (task.forceRegenerate) params.force_regenerate = true;
        const result = await window.TTS_API.generateAudio(params);
        return { ...result, audioUrl: URL.createObjectURL(result.blob) };
    }
    getErrorMessage(error) { return error?.message || 'ElevenLabs 合成失败，请检查设置'; }
}
