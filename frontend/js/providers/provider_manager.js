// frontend/js/providers/provider_manager.js
import { GPTSoVITSProvider } from './gpt_sovits_provider.js';
import { MiniMaxProvider } from './minimax_provider.js';
import { DoubaoProvider } from './doubao_provider.js';

export const ProviderManager = {
    providers: {},

    /**
     * 获取当前启用的 Provider 实例
     * @returns {import('./base_provider.js').BaseTTSProvider}
     */
    getCurrentProvider() {
        // 从 SillyTavern 扩展设置获取当前所选的供应商
        const extensionSettings = window.SillyTavern ? window.SillyTavern.getContext().extensionSettings : {};
        const config = extensionSettings.st_direct_tts || {};
        const activeProviderId = config.active_provider || 'gpt_sovits';

        // 获取特定供应商的配置
        const providerConfig = config.provider_settings ? config.provider_settings[activeProviderId] : {};

        // 单例缓存，如果切换了供应商或配置变了，最好重新实例化或更新 config
        switch (activeProviderId) {
            case 'minimax':
                return new MiniMaxProvider(providerConfig);
            case 'doubao':
                return new DoubaoProvider(providerConfig);
            case 'gpt_sovits':
            default:
                return new GPTSoVITSProvider(providerConfig);
        }
    }
};
