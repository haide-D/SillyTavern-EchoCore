// frontend/js/providers/provider_manager.js
import { GPTSoVITSProvider } from './gpt_sovits_provider.js';
import { MiniMaxProvider } from './minimax_provider.js';
import { DoubaoProvider } from './doubao_provider.js';

export const ProviderManager = {
    providers: {},

    /**
     * 获取当前全局默认启用的 Provider 实例
     * @returns {import('./base_provider.js').BaseTTSProvider}
     */
    getCurrentProvider() {
        const extensionSettings = window.SillyTavern ? window.SillyTavern.getContext().extensionSettings : {};
        const config = extensionSettings.st_direct_tts || {};
        const activeProviderId = config.active_provider || 'gpt_sovits';

        const providerConfig = config.provider_settings ? config.provider_settings[activeProviderId] : {};

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
        if (mappedModel && (mappedModel.startsWith('minimax:') || mappedModel.startsWith('minimax_'))) {
            const extensionSettings = window.SillyTavern ? window.SillyTavern.getContext().extensionSettings : {};
            const config = extensionSettings.st_direct_tts || {};
            const providerConfig = config.provider_settings ? config.provider_settings['minimax'] : {};
            return new MiniMaxProvider(providerConfig);
        }
        return this.getCurrentProvider();
    }
};
