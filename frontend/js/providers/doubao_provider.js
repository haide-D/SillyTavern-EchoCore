// frontend/js/providers/doubao_provider.js
import { BaseTTSProvider } from './base_provider.js';

export class DoubaoProvider extends BaseTTSProvider {
    constructor(config) {
        super(config);
        this.name = 'Doubao';
    }

    validateConfig() {
        if (!this.config.api_key) {
            throw new Error('Doubao API Key is missing. Please configure it in extension settings.');
        }
    }

    async checkCache(task, modelConfig) {
        return { cached: false };
    }

    async generateAudio(task, modelConfig) {
        this.validateConfig();
        const { text, charName } = task;
        
        console.log(`[Doubao Provider] Preparing request for ${charName}: "${text}"`);
        
        // 占位逻辑
        throw new Error("Doubao TTS Provider is currently just a framework placeholder and not fully implemented.");
    }
}
