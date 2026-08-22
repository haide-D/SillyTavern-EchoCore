// frontend/js/settings_ui.js
import { resolveBackendUrls } from './utils.js';

const MODULE_NAME = 'st_direct_tts';
// 动态基于当前模块定位 settings.html，自动兼容任何文件夹名称 (st-direct-tts 或 SillyTavern-GPT-SoVITS 等)
const HTML_PATH = new URL('../settings.html', import.meta.url).pathname;

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
 * 获取当前 Manager URL
 */
function getCurrentManagerUrls(config) {
    return resolveBackendUrls({
        useRemote: config.use_remote,
        ip: config.remote_ip,
        port: config.remote_port
    });
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
            $('#tts-minimax-model').val(config.provider_settings.minimax.model || 'speech-01-turbo');
            $('#tts-minimax-voice-id').val(config.provider_settings.minimax.voice_id || 'female-shaonv');
        }
        if (config.provider_settings?.doubao) {
            $('#tts-doubao-api-key').val(config.provider_settings.doubao.api_key || '');
        }

        // 更新管理面板跳转链接
        const updateAdminLink = () => {
            const urls = getCurrentManagerUrls(config);
            $('#tts-ext-open-admin-btn').attr('href', urls.adminUrl);
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

        // 远程 IP / URL
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

        // MiniMax 字段同步
        const syncMinimaxBackend = () => {
            const mm = config.provider_settings.minimax;
            if (window.TTS_API && typeof window.TTS_API.updateSettings === 'function') {
                window.TTS_API.updateSettings({
                    minimax_tts: {
                        api_key: mm.api_key || '',
                        group_id: mm.group_id || '',
                        model: mm.model || 'speech-01-turbo',
                        default_voice_id: mm.voice_id || 'female-shaonv'
                    }
                }).catch(() => {});
            }
        };

        $('#tts-minimax-api-key').on('input', (e) => {
            if (!config.provider_settings.minimax) config.provider_settings.minimax = {};
            config.provider_settings.minimax.api_key = $(e.target).val().trim();
            context.saveSettingsDebounced();
            syncMinimaxBackend();
        });
        $('#tts-minimax-group-id').on('input', (e) => {
            if (!config.provider_settings.minimax) config.provider_settings.minimax = {};
            config.provider_settings.minimax.group_id = $(e.target).val().trim();
            context.saveSettingsDebounced();
            syncMinimaxBackend();
        });
        $('#tts-minimax-model').on('change', (e) => {
            if (!config.provider_settings.minimax) config.provider_settings.minimax = {};
            config.provider_settings.minimax.model = $(e.target).val();
            context.saveSettingsDebounced();
            syncMinimaxBackend();
        });
        $('#tts-minimax-voice-id').on('input', (e) => {
            if (!config.provider_settings.minimax) config.provider_settings.minimax = {};
            config.provider_settings.minimax.voice_id = $(e.target).val().trim();
            context.saveSettingsDebounced();
            syncMinimaxBackend();
        });

        // 测试 MiniMax 连通性
        $('#tts-minimax-test-btn').on('click', async () => {
            const $res = $('#tts-minimax-test-result');
            const apiKey = $('#tts-minimax-api-key').val().trim();
            const groupId = $('#tts-minimax-group-id').val().trim();

            if (!apiKey || !groupId) {
                $res.text('❌ 请先填写 API Key 和 Group ID').css('color', '#ff5555');
                return;
            }

            $res.text('🔄 正在测试连接...').css('color', '#aaa');

            try {
                const res = await fetch(window.TTS_API._url('/api/tts/minimax/test'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: apiKey, group_id: groupId })
                });
                const data = await res.json();
                if (data.success) {
                    $res.text(`✅ ${data.message}`).css('color', '#55ff55');
                } else {
                    $res.text(`❌ ${data.message}`).css('color', '#ff5555');
                }
            } catch (err) {
                $res.text(`❌ 连接失败: ${err.message}`).css('color', '#ff5555');
            }
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
