// frontend/js/providers/fish_audio_provider.js
import { BaseTTSProvider } from './base_provider.js';

export class FishAudioProvider extends BaseTTSProvider {
    constructor(config) {
        super(config || {});
        this.name = 'FishAudio';
    }

    validateConfig() {
        // 后端已有 system_settings.json 存储与验证，前端放行
        return true;
    }

    validateModel(modelName, config) {
        // Fish Audio 为云端模型/声线，无需本地 ckpt/pth 权重文件
        return true;
    }

    async checkCache(task, modelConfig) {
        try {
            const charName = task.charName;
            const text = task.text;
            
            const mappings = (window.TTS_State && window.TTS_State.CACHE) ? window.TTS_State.CACHE.mappings : {};
            let voiceId = this.config.default_voice_id || '';
            const mapped = mappings[charName];
            if (mapped && (mapped.startsWith('fish:') || mapped.startsWith('fish_audio:'))) {
                voiceId = mapped.startsWith('fish:') ? mapped.slice(5) : mapped.slice(11);
            }

            const speed = (window.TTS_PromptInjector && typeof window.TTS_PromptInjector.getModelSpeed === 'function')
                ? window.TTS_PromptInjector.getModelSpeed(charName)
                : 1.0;

            const params = {
                text: text,
                emotion: task.emotion || 'default',
                speed: speed,
                speed_factor: speed,
                provider: 'fish_audio',
                voice_id: voiceId
            };

            return await window.TTS_API.checkCache(params);
        } catch {
            return { cached: false };
        }
    }

    async generateAudio(task, modelConfig) {
        const { text, charName } = task;
        const mappings = (window.TTS_State && window.TTS_State.CACHE) ? window.TTS_State.CACHE.mappings : {};
        
        let voiceId = this.config.default_voice_id || '';
        const mapped = mappings[charName];
        if (mapped && (mapped.startsWith('fish:') || mapped.startsWith('fish_audio:'))) {
            voiceId = mapped.startsWith('fish:') ? mapped.slice(5) : mapped.slice(11);
        }

        const speed = (window.TTS_PromptInjector && typeof window.TTS_PromptInjector.getModelSpeed === 'function')
            ? window.TTS_PromptInjector.getModelSpeed(charName)
            : 1.0;

        console.log(`[Fish Audio Provider] 🐟 请求云端合成: ${charName} (voice=${voiceId}): "${text.slice(0, 30)}"`);

        const params = {
            text: text,
                emotion: task.emotion || 'default',
            speed: speed,
            speed_factor: speed,
            provider: 'fish_audio',
            voice_id: voiceId
        };

        if (task.forceRegenerate) params.force_regenerate = true;
        const { blob, filename } = await window.TTS_API.generateAudio(params);
        return {
            blob: blob,
            audioUrl: URL.createObjectURL(blob),
            filename: filename
        };
    }

    getErrorMessage(error) {
        if (!error) return "Fish.audio 语音合成未知异常";
        const msg = error.message || String(error);
        if (msg.includes("401") || msg.includes("未授权") || msg.includes("Key 无效")) {
            return "Fish.audio API Key 无效或已过期，请在扩展设置中检查";
        }
        if (msg.includes("402") || msg.includes("余额") || msg.includes("credits")) {
            return "Fish.audio 账户余额不足，请前往 Fish.audio 开放平台充值";
        }
        if (msg.includes("429") || msg.includes("频率")) {
            return "Fish.audio API 请求频率超限，请稍候重试";
        }
        if (msg.includes("422")) {
            return `Fish.audio 请求参数校验失败（请检查 Voice ID 是否存在）: ${msg}`;
        }
        return `Fish.audio 语音生成失败: ${msg}`;
    }
}
