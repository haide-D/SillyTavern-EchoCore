// frontend/js/providers/base_provider.js

/**
 * 抽象基类：定义所有 TTS 供应商的适配规范
 */
export class BaseTTSProvider {
    /**
     * @param {Object} config - 对应供应商的配置，来自扩展设置 extensionSettings.st_direct_tts
     */
    constructor(config) {
        this.config = config || {};
        this.name = 'BaseProvider';
    }

    /**
     * 验证配置是否完整，子类必须实现
     */
    validateConfig() {
        throw new Error("validateConfig() must be implemented by subclasses");
    }

    /**
     * 检查是否有缓存
     * @param {Object} task - 生成任务，包含 {text, emotion, charName, ...}
     * @param {Object} modelConfig - 模型配置（对于本地模型可能有用）
     * @returns {Promise<{cached: boolean, filename?: string, audioUrl?: string}>}
     */
    async checkCache(task, modelConfig) {
        return { cached: false };
    }

    /**
     * 执行实际的音频生成
     * @param {Object} task - 生成任务，包含 {text, emotion, charName, ...}
     * @param {Object} modelConfig - 模型配置
     * @returns {Promise<{blob: Blob, audioUrl: string, filename?: string}>}
     */
    async generateAudio(task, modelConfig) {
        throw new Error("generateAudio() must be implemented by subclasses");
    }

    /**
     * 获取通用的错误提示语
     */
    getErrorMessage(error) {
        return `[${this.name}] 生成失败: ${error.message || error}`;
    }
}
