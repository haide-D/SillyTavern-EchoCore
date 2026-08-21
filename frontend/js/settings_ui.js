// frontend/js/settings_ui.js
import { eventSource, event_types } from '../../../../../../script.js';

const MODULE_NAME = 'st_direct_tts';
const HTML_PATH = '/scripts/extensions/third-party/st-direct-tts/frontend/settings.html';

const defaultSettings = {
    active_provider: 'gpt_sovits',
    provider_settings: {
        gpt_sovits: {},
        minimax: { api_key: '', group_id: '' },
        doubao: { api_key: '' }
    }
};

/**
 * 补全默认设置
 */
function loadSettings() {
    const context = window.SillyTavern ? window.SillyTavern.getContext() : null;
    if (!context) return null;

    const extensionSettings = context.extensionSettings;
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = JSON.parse(JSON.stringify(defaultSettings));
    }
    
    // 确保 provider_settings 存在
    if (!extensionSettings[MODULE_NAME].provider_settings) {
        extensionSettings[MODULE_NAME].provider_settings = JSON.parse(JSON.stringify(defaultSettings.provider_settings));
    }

    return extensionSettings[MODULE_NAME];
}

/**
 * 切换显示的面板
 */
function switchPanel(providerId) {
    $('.tts-provider-panel').hide();
    $(`#tts-provider-panel-${providerId}`).show();
}

/**
 * 初始化并挂载 UI
 */
export async function initSettingsUI() {
    const context = window.SillyTavern ? window.SillyTavern.getContext() : null;
    if (!context) {
        console.warn("[ST-Direct-TTS] SillyTavern Context not found, skipping native settings mount.");
        return;
    }

    const config = loadSettings();
    if (!config) return;

    try {
        const settingsHtml = await $.get(HTML_PATH);
        $('#extensions_settings').append(settingsHtml);

        // 1. 绑定初始值
        const $providerSelect = $('#tts-provider-select');
        $providerSelect.val(config.active_provider || 'gpt_sovits');
        switchPanel(config.active_provider || 'gpt_sovits');

        if (config.provider_settings.minimax) {
            $('#tts-minimax-api-key').val(config.provider_settings.minimax.api_key || '');
            $('#tts-minimax-group-id').val(config.provider_settings.minimax.group_id || '');
        }
        if (config.provider_settings.doubao) {
            $('#tts-doubao-api-key').val(config.provider_settings.doubao.api_key || '');
        }

        // 2. 绑定事件
        $providerSelect.on('change', (e) => {
            const val = $(e.target).val();
            config.active_provider = val;
            switchPanel(val);
            context.saveSettingsDebounced();
        });

        // MiniMax
        $('#tts-minimax-api-key').on('input', (e) => {
            if (!config.provider_settings.minimax) config.provider_settings.minimax = {};
            config.provider_settings.minimax.api_key = $(e.target).val();
            context.saveSettingsDebounced();
        });
        $('#tts-minimax-group-id').on('input', (e) => {
            if (!config.provider_settings.minimax) config.provider_settings.minimax = {};
            config.provider_settings.minimax.group_id = $(e.target).val();
            context.saveSettingsDebounced();
        });

        // Doubao
        $('#tts-doubao-api-key').on('input', (e) => {
            if (!config.provider_settings.doubao) config.provider_settings.doubao = {};
            config.provider_settings.doubao.api_key = $(e.target).val();
            context.saveSettingsDebounced();
        });

        console.log('[ST-Direct-TTS] 供应商原生设置面板挂载完成');

    } catch (error) {
        console.error('[ST-Direct-TTS] 原生设置面板挂载失败:', error);
    }
}
