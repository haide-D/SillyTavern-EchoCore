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
    remote_token: '',
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
        let oldRemote = { useRemote: false, ip: '', port: 3000, token: '' };
        try {
            const saved = localStorage.getItem('tts_plugin_remote_config');
            if (saved) oldRemote = JSON.parse(saved);
        } catch (e) { }

        extensionSettings[MODULE_NAME] = {
            ...defaultSettings,
            use_remote: oldRemote.useRemote || false,
            remote_ip: oldRemote.ip || '',
            remote_port: oldRemote.port || 3000,
            remote_token: oldRemote.token || ''
        };
    }

    const config = extensionSettings[MODULE_NAME];
    if (config.remote_token === undefined) {
        config.remote_token = '';
    }
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
        $('#tts-ext-remote-token').val(config.remote_token || '');
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
            if (window.TTS_API) {
                window.TTS_API.init(urls.httpUrl, config.remote_token || '');
            }
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
                port: config.remote_port || 3000,
                token: config.remote_token || ''
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
                port: config.remote_port || 3000,
                token: config.remote_token || ''
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
                port: config.remote_port,
                token: config.remote_token || ''
            }));
            updateAdminLink();
            context.saveSettingsDebounced();
        });

        // 远程 Token
        $('#tts-ext-remote-token').on('input', (e) => {
            config.remote_token = $(e.target).val().trim();
            localStorage.setItem('tts_plugin_remote_config', JSON.stringify({
                useRemote: config.use_remote,
                ip: config.remote_ip || '',
                port: config.remote_port || 3000,
                token: config.remote_token
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

            if (!apiKey) {
                $res.text('❌ 请先填写 MiniMax API Key').css('color', '#ff5555');
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

        // ============================================================
        // MiniMax 声线与音色库管理卡片交互
        // ============================================================
        let cachedMinimaxVoices = [];
        let currentPreviewAudio = null;

        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };

        const renderMinimaxVoicesList = (filterText = '') => {
            const $list = $('#tts-minimax-voices-list');
            const $count = $('#tts-minimax-voice-count');
            if ($list.length === 0) return;

            const q = filterText.trim().toLowerCase();
            const filtered = cachedMinimaxVoices.filter(v => {
                if (!q) return true;
                const name = (v.name || '').toLowerCase();
                const id = (v.id || '').toLowerCase();
                const desc = (v.description || '').toLowerCase();
                return name.includes(q) || id.includes(q) || desc.includes(q);
            });

            $count.text(`(共 ${cachedMinimaxVoices.length} 个${q ? `，过滤出 ${filtered.length} 个` : ''})`);

            if (filtered.length === 0) {
                $list.html('<div style="text-align: center; color: #888; font-size: 11.5px; padding: 12px;">未找到匹配声线</div>');
                return;
            }

            let html = '';
            filtered.forEach(v => {
                const isCustom = v.category === 'custom';
                const genderIcon = v.gender === 'female' ? '♀' : (v.gender === 'male' ? '♂' : '⚥');
                const badgeColor = isCustom ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)';
                const badgeBorder = isCustom ? 'rgba(234, 179, 8, 0.5)' : 'rgba(59, 130, 246, 0.4)';
                const badgeText = isCustom ? '🌟 自定义' : '🏛️ 预设';

                html += `
                <div class="tts-minimax-voice-item" data-id="${escapeHtml(v.id)}" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 5px; padding: 5px 8px; gap: 6px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="font-size: 10.5px; padding: 1px 4px; border-radius: 3px; background: ${badgeColor}; border: 1px solid ${badgeBorder}; color: #e5e7eb; white-space: nowrap;">${badgeText}</span>
                            <strong style="font-size: 12px; color: #f3f4f6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(v.name || v.id)}</strong>
                            <span style="font-size: 11px; color: #9ca3af;" title="性别: ${v.gender}">${genderIcon}</span>
                        </div>
                        <div style="font-family: monospace; font-size: 10.5px; color: #9ca3af; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(v.id)}">
                            ID: ${escapeHtml(v.id)}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                        <button type="button" class="menu_button btn-preview-voice" data-id="${escapeHtml(v.id)}" style="padding: 2px 6px; font-size: 11px; cursor: pointer;" title="试听当前声线">▶️ 试听</button>
                        <button type="button" class="menu_button btn-set-default-voice" data-id="${escapeHtml(v.id)}" style="padding: 2px 6px; font-size: 11px; cursor: pointer;" title="填入默认音色输入框">⭐ 设为默认</button>
                        ${isCustom ? `<button type="button" class="menu_button btn-del-custom-voice" data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name || v.id)}" style="padding: 2px 6px; font-size: 11px; cursor: pointer; color: #f87171; border-color: rgba(239, 68, 68, 0.4);" title="删除此自定义音色">🗑️</button>` : ''}
                    </div>
                </div>`;
            });

            $list.html(html);
        };

        const loadMinimaxVoices = async () => {
            const $count = $('#tts-minimax-voice-count');
            const $list = $('#tts-minimax-voices-list');
            $count.text('(加载中...)');
            try {
                if (window.TTS_API && typeof window.TTS_API.getMinimaxVoices === 'function') {
                    const data = await window.TTS_API.getMinimaxVoices();
                    if (data && data.voices) {
                        cachedMinimaxVoices = data.voices;
                        renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
                    }
                }
            } catch (err) {
                console.warn('[ST-Direct-TTS] 加载 MiniMax 声线列表失败:', err);
                $list.html('<div style="text-align: center; color: #f87171; font-size: 11px; padding: 10px;">加载声线失败，请确认后端连接正常</div>');
                $count.text('(加载失败)');
            }
        };

        // 初始加载
        loadMinimaxVoices();

        // 刷新按钮
        $('#tts-minimax-refresh-voices-btn').on('click', () => {
            loadMinimaxVoices();
        });

        // 搜索过滤
        $('#tts-minimax-voice-search').on('input', (e) => {
            renderMinimaxVoicesList($(e.target).val());
        });

        // 快捷添加自定义声线
        $('#tts-minimax-add-voice-btn').on('click', async () => {
            const name = $('#tts-minimax-new-voice-name').val().trim();
            const voiceId = $('#tts-minimax-new-voice-id').val().trim();
            const gender = $('#tts-minimax-new-voice-gender').val();
            const $status = $('#tts-minimax-add-voice-status');

            if (!voiceId) {
                $status.text('❌ 请填写 Voice ID').css('color', '#ff5555');
                return;
            }

            $status.text('⏳ 保存中...').css('color', '#aaa');

            try {
                if (window.TTS_API && typeof window.TTS_API.addMinimaxVoice === 'function') {
                    const res = await window.TTS_API.addMinimaxVoice({
                        id: voiceId,
                        name: name || voiceId,
                        gender: gender || 'female',
                        category: 'custom'
                    });
                    $status.text('✅ 已添加！').css('color', '#55ff55');
                    $('#tts-minimax-new-voice-name').val('');
                    $('#tts-minimax-new-voice-id').val('');
                    if (res && res.voices) {
                        cachedMinimaxVoices = res.voices;
                        renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
                    } else {
                        loadMinimaxVoices();
                    }
                    setTimeout(() => $status.text(''), 3000);
                }
            } catch (err) {
                $status.text(`❌ ${err.message}`).css('color', '#ff5555');
            }
        });

        // 列表事件委托: 试听、设为默认、删除
        $('#tts-minimax-voices-list').on('click', '.btn-preview-voice', async function () {
            const $btn = $(this);
            const voiceId = $btn.data('id');
            if (!voiceId) return;

            const originText = $btn.text();
            $btn.text('⏳ 生成中...').prop('disabled', true);

            if (currentPreviewAudio) {
                currentPreviewAudio.pause();
                currentPreviewAudio = null;
            }

            try {
                if (window.TTS_API && typeof window.TTS_API.previewMinimaxVoice === 'function') {
                    const blob = await window.TTS_API.previewMinimaxVoice(voiceId);
                    const audioUrl = URL.createObjectURL(blob);
                    currentPreviewAudio = new Audio(audioUrl);
                    $btn.text('🔊 播放中...');
                    currentPreviewAudio.onended = () => {
                        $btn.text(originText).prop('disabled', false);
                    };
                    currentPreviewAudio.onerror = () => {
                        $btn.text(originText).prop('disabled', false);
                    };
                    await currentPreviewAudio.play();
                }
            } catch (err) {
                alert(`试听失败: ${err.message}`);
                $btn.text(originText).prop('disabled', false);
            }
        });

        $('#tts-minimax-voices-list').on('click', '.btn-set-default-voice', function () {
            const voiceId = $(this).data('id');
            if (voiceId) {
                $('#tts-minimax-voice-id').val(voiceId).trigger('input');
                alert(`已将「${voiceId}」填入默认音色输入框！`);
            }
        });

        $('#tts-minimax-voices-list').on('click', '.btn-del-custom-voice', async function () {
            const voiceId = $(this).data('id');
            const voiceName = $(this).data('name');
            if (!voiceId) return;

            if (!confirm(`确定要从自定义音色库删除声线「${voiceName}」吗？`)) return;

            try {
                if (window.TTS_API && typeof window.TTS_API.deleteMinimaxVoice === 'function') {
                    const res = await window.TTS_API.deleteMinimaxVoice(voiceId);
                    if (res && res.voices) {
                        cachedMinimaxVoices = res.voices;
                        renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
                    } else {
                        loadMinimaxVoices();
                    }
                }
            } catch (err) {
                alert(`删除失败: ${err.message}`);
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
