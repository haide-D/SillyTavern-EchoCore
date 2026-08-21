// frontend/js/providers/gpt_sovits_provider.js
import { BaseTTSProvider } from './base_provider.js';

export class GPTSoVITSProvider extends BaseTTSProvider {
    constructor(config) {
        super(config);
        this.name = 'GPT-SoVITS';
    }

    validateConfig() {
        // 验证基本配置
    }

    validateModel(modelName, config) {
        let missing = [];
        if (!config.gpt_path) missing.push("GPT权重");
        if (!config.sovits_path) missing.push("SoVITS权重");

        const langs = config.languages || {};
        if (Object.keys(langs).length === 0) {
            missing.push("参考音频 (reference_audios)");
        }

        if (missing.length > 0) {
            window.TTS_Utils.showNotification(`模型 "${modelName}" 缺失: ${missing.join(', ')}`, 'error');
            return false;
        }
        return true;
    }

    async checkCache(task, modelConfig) {
        try {
            const ref = task.selectedRef;
            if (!ref) return { cached: false };

            const params = {
                text: task.text,
                text_lang: "zh",
                ref_audio_path: ref.path,
                prompt_text: ref.text,
                prompt_lang: "zh",
                emotion: task.emotion
            };
            return await window.TTS_API.checkCache(params);
        } catch { 
            return { cached: false }; 
        }
    }

    async generateAudio(task, modelConfig) {
        this.validateConfig();
        const { text, emotion, key, selectedRef } = task;

        if (!selectedRef) {
            throw new Error("Missing reference audio for GPT-SoVITS generation");
        }

        // 获取全局设置（由于历史原因，部分设置放在 window.TTS_State.CACHE.settings）
        const settings = window.TTS_State ? window.TTS_State.CACHE.settings : {};
        const currentLang = settings.default_lang || 'default';
        
        let promptLangCode = "zh";
        if (currentLang === "Japanese" || currentLang === "日语") promptLangCode = "ja";
        if (currentLang === "English" || currentLang === "英语") promptLangCode = "en";

        const params = {
            text: text,
            text_lang: promptLangCode,
            ref_audio_path: selectedRef.path,
            prompt_text: selectedRef.text,
            prompt_lang: promptLangCode,
            emotion: emotion
        };

        const { blob, filename } = await window.TTS_API.generateAudio(params);
        
        return {
            blob: blob,
            audioUrl: URL.createObjectURL(blob),
            filename: filename
        };
    }

    /**
     * GPT-SoVITS 专属方法：切换模型权重
     */
    async switchModel(config) {
        if (!window.TTS_State) return;
        const CURRENT_LOADED = window.TTS_State.CURRENT_LOADED;

        if (CURRENT_LOADED.gpt_path === config.gpt_path && CURRENT_LOADED.sovits_path === config.sovits_path) return;

        if (CURRENT_LOADED.gpt_path !== config.gpt_path) {
            await window.TTS_API.switchWeights('proxy_set_gpt_weights', config.gpt_path);
            CURRENT_LOADED.gpt_path = config.gpt_path;
        }
        if (CURRENT_LOADED.sovits_path !== config.sovits_path) {
            await window.TTS_API.switchWeights('proxy_set_sovits_weights', config.sovits_path);
            CURRENT_LOADED.sovits_path = config.sovits_path;
        }
    }

    selectRefAudio(task, modelConfig) {
        const settings = window.TTS_State.CACHE.settings;
        const currentLang = settings.default_lang || 'default';
        let availableLangs = modelConfig.languages || {};
        let targetRefs = availableLangs[currentLang];

        if (!targetRefs) {
            if (availableLangs['default']) targetRefs = availableLangs['default'];
            else {
                const keys = Object.keys(availableLangs);
                if (keys.length > 0) targetRefs = availableLangs[keys[0]];
            }
        }

        if (!targetRefs || targetRefs.length === 0) return null;

        let matchedRefs = targetRefs.filter(r => r.emotion === task.emotion);
        if (matchedRefs.length === 0) matchedRefs = targetRefs.filter(r => r.emotion === 'default');
        if (matchedRefs.length === 0) matchedRefs = targetRefs;

        return matchedRefs[Math.floor(Math.random() * matchedRefs.length)];
    }
}
