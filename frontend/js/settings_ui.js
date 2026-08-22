// frontend/js/settings_ui.js
const MODULE_NAME = 'st_direct_tts';
const HTML_PATH = '/scripts/extensions/third-party/st-direct-tts/frontend/settings.html';

const defaultSettings = {
    enabled: true,
    use_remote: false,
    remote_ip: '',
    remote_port: 3000,
    active_provider: 'gpt_sovits',
    auto_inject_on_answer: false,
    speaker_avatars: {},
    provider_settings: {
        gpt_sovits: {},
        minimax: { api_key: '', group_id: '' },
        doubao: { api_key: '' }
    }
};

/**
 * 加载并补全设置
 */
export function loadExtensionSettings() {
    const context = window.SillyTavern ? window.SillyTavern.getContext() : null;
    if (!context) return defaultSettings;

    const extensionSettings = context.extensionSettings;
    if (!extensionSettings[MODULE_NAME]) {
        // 尝试从老版本的 localStorage 迁移远程配置
        let oldRemote = { useRemote: false, ip: '', port: 3000 };
        try {
            const saved = localStorage.getItem('tts_plugin_remote_config');
            if (saved) oldRemote = JSON.parse(saved);
        } catch (e) { }

        extensionSettings[MODULE_NAME] = {
            ...defaultSettings,
            use_remote: oldRemote.useRemote || false,
            remote_ip: oldRemote.ip || '',
            remote_port: oldRemote.port || 3000
        };
    }

    const config = extensionSettings[MODULE_NAME];
    if (config.auto_inject_on_answer === undefined) {
        config.auto_inject_on_answer = false;
    }
    if (!config.speaker_avatars) {
        config.speaker_avatars = {};
    }
    if (!config.provider_settings) {
        config.provider_settings = JSON.parse(JSON.stringify(defaultSettings.provider_settings));
    }

    return config;
}

/**
 * 切换显示的供应商面板
 */
function switchProviderPanel(providerId) {
    $('.tts-provider-panel').hide();
    $(`#tts-provider-panel-${providerId}`).show();
}

/**
 * 获取当前 Manager API 地址
 */
function getCurrentManagerUrl(config) {
    let host = "127.0.0.1";
    let port = config.remote_port || 3000;

    if (config.use_remote && config.remote_ip) {
        host = config.remote_ip.trim();
    } else {
        const current = window.location.hostname;
        const isLanOrIPv6 = /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\.|:/.test(current);
        if (current === 'localhost' || current === '127.0.0.1') {
            host = '127.0.0.1';
        } else if (isLanOrIPv6) {
            host = current;
        }
    }

    if (host.includes(':') && !host.startsWith('[')) {
        host = `[${host}]`;
    }

    return `http://${host}:${port}`;
}

/**
 * 初始化并挂载酒馆原生扩展设置 UI
 */
export async function initSettingsUI() {
    const context = window.SillyTavern ? window.SillyTavern.getContext() : null;
    if (!context) {
        console.warn("[ST-Direct-TTS] SillyTavern Context not found, skipping native settings mount.");
        return;
    }

    if ($('#st-direct-tts-settings').length > 0) return; // 避免重复挂载

    const config = loadExtensionSettings();

    try {
        const settingsHtml = await $.get(HTML_PATH);
        $('#extensions_settings').append(settingsHtml);

        // 1. 绑定初始值
        $('#tts-ext-master-enabled').prop('checked', config.enabled !== false);
        $('#tts-ext-use-remote').prop('checked', !!config.use_remote);
        $('#tts-ext-remote-fields').toggle(!!config.use_remote);
        $('#tts-ext-remote-ip').val(config.remote_ip || '');
        $('#tts-ext-remote-port').val(config.remote_port || 3000);
        $('#tts-ext-auto-inject').prop('checked', !!config.auto_inject_on_answer);

        const $providerSelect = $('#tts-provider-select');
        $providerSelect.val(config.active_provider || 'gpt_sovits');
        switchProviderPanel(config.active_provider || 'gpt_sovits');

        if (config.provider_settings?.minimax) {
            $('#tts-minimax-api-key').val(config.provider_settings.minimax.api_key || '');
            $('#tts-minimax-group-id').val(config.provider_settings.minimax.group_id || '');
        }
        if (config.provider_settings?.doubao) {
            $('#tts-doubao-api-key').val(config.provider_settings.doubao.api_key || '');
        }

        // 更新管理面板跳转链接
        const updateAdminLink = () => {
            const managerUrl = getCurrentManagerUrl(config);
            $('#tts-ext-open-admin-btn').attr('href', `${managerUrl}/admin`);
        };
        updateAdminLink();

        // 2. 绑定事件
        // 主开关
        $('#tts-ext-master-enabled').on('change', (e) => {
            config.enabled = $(e.target).prop('checked');
            if (window.TTS_State && window.TTS_State.CACHE && window.TTS_State.CACHE.settings) {
                window.TTS_State.CACHE.settings.enabled = config.enabled;
            }
            context.saveSettingsDebounced();
        });

        // 自动注入聊天开关
        $('#tts-ext-auto-inject').on('change', (e) => {
            config.auto_inject_on_answer = $(e.target).prop('checked');
            context.saveSettingsDebounced();
        });

        // 远程连接模式开关
        $('#tts-ext-use-remote').on('change', (e) => {
            const isRemote = $(e.target).prop('checked');
            config.use_remote = isRemote;
            $('#tts-ext-remote-fields').toggle(isRemote);
            // 同步回存 localStorage 保证全模块兼容
            localStorage.setItem('tts_plugin_remote_config', JSON.stringify({
                useRemote: isRemote,
                ip: config.remote_ip || '',
                port: config.remote_port || 3000
            }));
            updateAdminLink();
            context.saveSettingsDebounced();
        });

        // 远程 IP
        $('#tts-ext-remote-ip').on('input', (e) => {
            config.remote_ip = $(e.target).val().trim();
            localStorage.setItem('tts_plugin_remote_config', JSON.stringify({
                useRemote: config.use_remote,
                ip: config.remote_ip,
                port: config.remote_port || 3000
            }));
            updateAdminLink();
            context.saveSettingsDebounced();
        });

        // 远程端口
        $('#tts-ext-remote-port').on('input', (e) => {
            config.remote_port = parseInt($(e.target).val()) || 3000;
            localStorage.setItem('tts_plugin_remote_config', JSON.stringify({
                useRemote: config.use_remote,
                ip: config.remote_ip || '',
                port: config.remote_port
            }));
            updateAdminLink();
            context.saveSettingsDebounced();
        });

        // 供应商选择
        $providerSelect.on('change', (e) => {
            const val = $(e.target).val();
            config.active_provider = val;
            switchProviderPanel(val);
            context.saveSettingsDebounced();
        });

        // MiniMax 字段
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

        // 豆包 字段
        $('#tts-doubao-api-key').on('input', (e) => {
            if (!config.provider_settings.doubao) config.provider_settings.doubao = {};
            config.provider_settings.doubao.api_key = $(e.target).val();
            context.saveSettingsDebounced();
        });

        console.log('[ST-Direct-TTS] ✅ 酒馆原生扩展设置面板挂载并初始化完成');

    } catch (error) {
        console.error('[ST-Direct-TTS] ❌ 酒馆原生设置面板挂载失败:', error);
    }
}
