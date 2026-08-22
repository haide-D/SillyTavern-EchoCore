// frontend/js/providers/minimax_provider.js
import { BaseTTSProvider } from './base_provider.js';

export class MiniMaxProvider extends BaseTTSProvider {
    constructor(config) {
        super(config || {});
        this.name = 'MiniMax';
    }

    validateConfig() {
        // 后端已有 system_settings.json 存储与验证，前端放行
        return true;
    }

    validateModel(modelName, config) {
        // MiniMax 为云端音色，无需本地 ckpt/pth 权重文件
        return true;
    }

    async checkCache(task, modelConfig) {
        try {
            const charName = task.charName;
            const text = task.text;
            const emotion = task.emotion || 'default';
            
            const mappings = (window.TTS_State && window.TTS_State.CACHE) ? window.TTS_State.CACHE.mappings : {};
            let voiceId = this.config.voice_id || 'female-shaonv';
            const mapped = mappings[charName];
            if (mapped && (mapped.startsWith('minimax:') || mapped.startsWith('minimax_'))) {
                voiceId = mapped.startsWith('minimax:') ? mapped.slice(8) : mapped.slice(8);
            }

            const speed = (window.TTS_PromptInjector && typeof window.TTS_PromptInjector.getModelSpeed === 'function')
                ? window.TTS_PromptInjector.getModelSpeed(charName)
                : 1.0;

            const params = {
                text: text,
                emotion: emotion,
                speed: speed,
                speed_factor: speed,
                provider: 'minimax',
                voice_id: voiceId
            };

            return await window.TTS_API.checkCache(params);
        } catch {
            return { cached: false };
        }
    }

    async generateAudio(task, modelConfig) {
        const { text, emotion, charName } = task;
        const mappings = (window.TTS_State && window.TTS_State.CACHE) ? window.TTS_State.CACHE.mappings : {};
        
        let voiceId = this.config.voice_id || 'female-shaonv';
        const mapped = mappings[charName];
        if (mapped && (mapped.startsWith('minimax:') || mapped.startsWith('minimax_'))) {
            voiceId = mapped.startsWith('minimax:') ? mapped.slice(8) : mapped.slice(8);
        }

        const speed = (window.TTS_PromptInjector && typeof window.TTS_PromptInjector.getModelSpeed === 'function')
            ? window.TTS_PromptInjector.getModelSpeed(charName)
            : 1.0;

        console.log(`[MiniMax Provider] 🎙️ 请求云端合成: ${charName} (voice=${voiceId}, emotion=${emotion}): "${text.slice(0, 30)}"`);

        const params = {
            text: text,
            emotion: emotion || 'default',
            speed: speed,
            speed_factor: speed,
            provider: 'minimax',
            voice_id: voiceId
        };

        const { blob, filename } = await window.TTS_API.generateAudio(params);
        return {
            blob: blob,
            audioUrl: URL.createObjectURL(blob),
            filename: filename
        };
    }

    getErrorMessage(error) {
        if (!error) return "MiniMax 语音合成未知异常";
        const msg = error.message || String(error);
        if (msg.includes("1004") || msg.includes("余额不足")) {
            return "MiniMax 账户余额不足，请前往 MiniMax 开放平台充值";
        }
        if (msg.includes("1001") || msg.includes("鉴权")) {
            return "MiniMax API Key 或 Group ID 无效，请在设置中检查";
        }
        if (msg.includes("1002") || msg.includes("频率")) {
            return "MiniMax 请求频率超限，请稍候重试";
        }
        return `MiniMax 语音生成失败: ${msg}`;
    }
}
