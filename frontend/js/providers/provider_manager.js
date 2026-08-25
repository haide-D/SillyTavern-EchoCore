// frontend/js/providers/provider_manager.js
import { GPTSoVITSProvider } from './gpt_sovits_provider.js';
import { MiniMaxProvider } from './minimax_provider.js';
import { DoubaoProvider } from './doubao_provider.js';

export const ProviderManager = {
    /**
     * 动态扩展 Provider 注册表 (id -> 工厂函数或类)
     */
    registry: {},

    /**
     * 注册第三方/扩展 TTS Provider
     * @param {string} id - 供应商唯一标识 (如 'elevenlabs', 'edge', 'custom_tts')
     * @param {Function} factory - 接收 providerConfig 返回 Provider 实例的工厂函数或类构造器
     */
    registerProvider(id, factory) {
        if (!id || typeof factory !== 'function') {
            console.error(`[ProviderManager] 注册 Provider 失败: 无效的 id 或 factory`);
            return;
        }
        this.registry[id] = factory;
        console.log(`[ProviderManager] ✅ 成功注册扩展 Provider: ${id}`);
    },

    /**
     * 获取当前全局默认启用的 Provider 实例
     * @returns {import('./base_provider.js').BaseTTSProvider}
     */
    getCurrentProvider() {
        const extensionSettings = window.SillyTavern ? window.SillyTavern.getContext().extensionSettings : {};
        const config = extensionSettings.st_direct_tts || {};
        const activeProviderId = config.active_provider || 'gpt_sovits';

        const providerConfig = config.provider_settings ? config.provider_settings[activeProviderId] : {};

        // 1. 优先从动态注册表中实例化
        if (this.registry[activeProviderId]) {
            const Factory = this.registry[activeProviderId];
            try {
                return typeof Factory.prototype === 'object' && Factory.prototype.constructor === Factory
                    ? new Factory(providerConfig)
                    : Factory(providerConfig);
            } catch (e) {
                console.error(`[ProviderManager] 实例化注册 Provider [${activeProviderId}] 失败:`, e);
            }
        }

        // 2. 兜底回退内建 Provider
        switch (activeProviderId) {
            case 'minimax':
                return new MiniMaxProvider(providerConfig);
            case 'doubao':
                return new DoubaoProvider(providerConfig);
            case 'gpt_sovits':
            default:
                return new GPTSoVITSProvider(providerConfig);
        }
    },

    /**
     * 根据角色绑定信息动态分发对应的 Provider (支持角色混合模式)
     */
    getProviderForCharacter(charName) {
        const mappings = (window.TTS_State && window.TTS_State.CACHE) ? window.TTS_State.CACHE.mappings : {};
        const mappedModel = mappings[charName];
        if (mappedModel) {
            // 检查是否有 provider 前缀 (如 'minimax:voice_id', 'elevenlabs:voice_id')
            const separatorIndex = mappedModel.indexOf(':');
            if (separatorIndex > 0) {
                const providerPrefix = mappedModel.slice(0, separatorIndex).toLowerCase();
                const extensionSettings = window.SillyTavern ? window.SillyTavern.getContext().extensionSettings : {};
                const config = extensionSettings.st_direct_tts || {};
                const providerConfig = config.provider_settings ? config.provider_settings[providerPrefix] : {};

                if (this.registry[providerPrefix]) {
                    const Factory = this.registry[providerPrefix];
                    try {
                        return typeof Factory.prototype === 'object' && Factory.prototype.constructor === Factory
                            ? new Factory(providerConfig)
                            : Factory(providerConfig);
                    } catch (e) {
                        console.error(`[ProviderManager] 动态分发 Provider [${providerPrefix}] 失败:`, e);
                    }
                }
                if (providerPrefix === 'minimax') {
                    return new MiniMaxProvider(providerConfig);
                }
                if (providerPrefix === 'doubao') {
                    return new DoubaoProvider(providerConfig);
                }
            } else if (mappedModel.startsWith('minimax_')) {
                const extensionSettings = window.SillyTavern ? window.SillyTavern.getContext().extensionSettings : {};
                const config = extensionSettings.st_direct_tts || {};
                const providerConfig = config.provider_settings ? config.provider_settings['minimax'] : {};
                return new MiniMaxProvider(providerConfig);
            }
        }
        return this.getCurrentProvider();
    }
};
