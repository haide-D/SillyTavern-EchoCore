// frontend/js/settings_ui.js
import { resolveBackendUrls, getAllMiniMaxVoices } from './utils.js';
import { TTS_API } from './api.js';
import { mountPromptPresets } from './prompt_presets_ui.js';

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
        doubao: { api_key: '' },
        fish_audio: { api_key: '', api_url: 'https://api.fish.audio/v1/tts', model: 's2.1-pro', voice_id: '' }
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
    if (config.telemetry_enabled === undefined) {
        config.telemetry_enabled = true;
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
 * 从后端 settings 同步并回填到酒馆设置 UI 与 extensionSettings 中
 * 确保 Admin 面板保存的云端配置能即时同步到酒馆插件界面
 */
export function syncUIFromBackendSettings(backendSettings) {
    if (!backendSettings || typeof backendSettings !== 'object') return;
    const context = window.SillyTavern ? window.SillyTavern.getContext() : null;
    const config = loadExtensionSettings();

    let changed = false;

    // 1. 同步 MiniMax 配置
    if (backendSettings.minimax_tts && typeof backendSettings.minimax_tts === 'object') {
        const mm = backendSettings.minimax_tts;
        if (!config.provider_settings) config.provider_settings = {};
        if (!config.provider_settings.minimax) config.provider_settings.minimax = {};

        const localMm = config.provider_settings.minimax;
        if (mm.api_key !== undefined && mm.api_key !== localMm.api_key) {
            localMm.api_key = mm.api_key;
            changed = true;
        }
        if (mm.group_id !== undefined && mm.group_id !== localMm.group_id) {
            localMm.group_id = mm.group_id;
            changed = true;
        }
        if (mm.model !== undefined && mm.model !== localMm.model) {
            localMm.model = mm.model;
            changed = true;
        }
        if (mm.default_voice_id !== undefined && mm.default_voice_id !== localMm.voice_id) {
            localMm.voice_id = mm.default_voice_id;
            changed = true;
        }
        if (mm.custom_emotions !== undefined && mm.custom_emotions !== localMm.custom_emotions) {
            localMm.custom_emotions = mm.custom_emotions;
            changed = true;
        }

        // 如果 DOM 已经渲染，立即回填输入框
        if ($('#tts-minimax-api-key').length > 0) {
            $('#tts-minimax-api-key').val(localMm.api_key || '');
            $('#tts-minimax-group-id').val(localMm.group_id || '');
            if (localMm.model) $('#tts-minimax-model').val(localMm.model);
            $('#tts-minimax-voice-id').val(localMm.voice_id || 'female-shaonv');
            if (localMm.custom_emotions) $('#tts-minimax-custom-emotions').val(localMm.custom_emotions);
        }
    }

    // 2. 同步 Fish.audio 配置
    if (backendSettings.fish_audio_tts && typeof backendSettings.fish_audio_tts === 'object') {
        const fa = backendSettings.fish_audio_tts;
        if (!config.provider_settings) config.provider_settings = {};
        if (!config.provider_settings.fish_audio) config.provider_settings.fish_audio = {};

        const localFa = config.provider_settings.fish_audio;
        if (fa.api_key !== undefined && fa.api_key !== localFa.api_key) {
            localFa.api_key = fa.api_key;
            changed = true;
        }
        if (fa.api_url !== undefined && fa.api_url !== localFa.api_url) {
            localFa.api_url = fa.api_url;
            changed = true;
        }
        if (fa.model !== undefined && fa.model !== localFa.model) {
            localFa.model = fa.model;
            changed = true;
        }
        if (fa.default_voice_id !== undefined && fa.default_voice_id !== localFa.voice_id) {
            localFa.voice_id = fa.default_voice_id;
            changed = true;
        }

        // 如果 DOM 已经渲染，立即回填输入框
        if ($('#tts-fish-api-key').length > 0) {
            $('#tts-fish-api-key').val(localFa.api_key || '');
            $('#tts-fish-api-url').val(localFa.api_url || 'https://api.fish.audio/v1/tts');
            if (localFa.model) $('#tts-fish-model').val(localFa.model);
            $('#tts-fish-voice-id').val(localFa.voice_id || '');
        }
    }

    if (changed && context && typeof context.saveSettingsDebounced === 'function') {
        context.saveSettingsDebounced();
    }
}

// 挂载到全局供 index.js 与调试调用
window.TTS_SettingsUI = { syncUIFromBackendSettings };

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
        $('#tts-ext-telemetry-enabled').prop('checked', config.telemetry_enabled !== false);

        const $providerSelect = $('#tts-provider-select');
        $providerSelect.val(config.active_provider || 'gpt_sovits');
        switchProviderPanel(config.active_provider || 'gpt_sovits');
        mountPromptPresets();

        if (config.provider_settings?.minimax) {
            $('#tts-minimax-api-key').val(config.provider_settings.minimax.api_key || '');
            $('#tts-minimax-group-id').val(config.provider_settings.minimax.group_id || '');
            $('#tts-minimax-model').val(config.provider_settings.minimax.model || 'speech-01-turbo');
            $('#tts-minimax-voice-id').val(config.provider_settings.minimax.voice_id || 'female-shaonv');
            $('#tts-minimax-custom-emotions').val(config.provider_settings.minimax.custom_emotions || 'default, neutral, happy, sad, angry, fear, whisper, surprise, disgust, smug, panting, climax');
        }
        if (config.provider_settings?.doubao) {
            $('#tts-doubao-api-key').val(config.provider_settings.doubao.api_key || '');
        }
        if (config.provider_settings?.fish_audio) {
            $('#tts-fish-api-key').val(config.provider_settings.fish_audio.api_key || '');
            $('#tts-fish-api-url').val(config.provider_settings.fish_audio.api_url || 'https://api.fish.audio/v1/tts');
            $('#tts-fish-model').val(config.provider_settings.fish_audio.model || 's2.1-pro');
            $('#tts-fish-voice-id').val(config.provider_settings.fish_audio.voice_id || '');
        }

        // 更新管理面板跳转链接
        const updateAdminLink = () => {
            const urls = getCurrentManagerUrls(config);
            $('#tts-ext-open-admin-btn').attr('href', urls.adminUrl);
            const api = window.TTS_API || TTS_API;
            if (api) {
                if (typeof api.reconfigure === 'function') {
                    api.reconfigure(urls.httpUrl, urls.wsUrl, config.remote_token || '');
                } else if (typeof api.init === 'function') {
                    api.init(urls.httpUrl, config.remote_token || '');
                }
            }
        };
        updateAdminLink();

        // 1.5 自动从后端拉取并双向对齐系统级云端配置 (彻底打通 Admin 控制台与酒馆插件设置)
        const cachedSettings = window.TTS_State?.CACHE?.settings;
        if (cachedSettings) {
            syncUIFromBackendSettings(cachedSettings);
        }
        (async () => {
            try {
                const api = window.TTS_API || TTS_API;
                if (api && typeof api.getData === 'function') {
                    const latestData = await api.getData();
                    if (latestData && latestData.settings) {
                        if (window.TTS_State?.CACHE) {
                            window.TTS_State.CACHE.settings = { ...window.TTS_State.CACHE.settings, ...latestData.settings };
                        }
                        syncUIFromBackendSettings(latestData.settings);
                    }
                }
            } catch (syncErr) {
                console.warn('[ST-Direct-TTS] 异步同步后端系统配置跳过(可能离线):', syncErr.message);
            }
        })();

        // 绑定手动同步服务端配置按钮
        $('#tts-ext-sync-backend-btn').on('click', async function () {
            const $btn = $(this);
            const origHtml = $btn.html();
            $btn.prop('disabled', true).html('<span>🔄 同步中...</span>');
            try {
                const api = window.TTS_API || TTS_API;
                const latestData = await api.getData();
                if (latestData && latestData.settings) {
                    if (window.TTS_State?.CACHE) {
                        window.TTS_State.CACHE.settings = { ...window.TTS_State.CACHE.settings, ...latestData.settings };
                    }
                    syncUIFromBackendSettings(latestData.settings);
                    alert('✅ 成功从服务端同步最新的 MiniMax / Fish.audio 配置！');
                } else {
                    alert('⚠️ 服务端未返回配置数据，请检查后端连接');
                }
            } catch (err) {
                alert(`❌ 同步失败: ${err.message}`);
            } finally {
                $btn.prop('disabled', false).html(origHtml);
            }
        });

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
            window.TTS_PromptInjector?.refreshAndInject();
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
                        default_voice_id: mm.voice_id || 'female-shaonv',
                        custom_emotions: mm.custom_emotions || 'default, neutral, happy, sad, angry, fear, whisper, surprise, disgust, smug, panting, climax'
                    }
                }).catch(() => { });
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
        $('#tts-minimax-custom-emotions').on('input', (e) => {
            if (!config.provider_settings.minimax) config.provider_settings.minimax = {};
            config.provider_settings.minimax.custom_emotions = $(e.target).val().trim();
            context.saveSettingsDebounced();
            syncMinimaxBackend();
        });
        $('#tts-minimax-reset-emotions-btn').on('click', () => {
            const defEmotions = 'default, neutral, happy, sad, angry, fear, whisper, surprise, disgust, smug, panting, climax';
            $('#tts-minimax-custom-emotions').val(defEmotions);
            if (!config.provider_settings.minimax) config.provider_settings.minimax = {};
            config.provider_settings.minimax.custom_emotions = defEmotions;
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
                    headers: window.TTS_API._headers({ 'Content-Type': 'application/json' }),
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
        // MiniMax 声线与音色库管理交互 (Tab分类、分页、紧凑列表、增删改)
        // ============================================================
        let cachedMinimaxVoices = [];
        let currentTab = 'all'; // 'all' | 'preset' | 'custom'
        let currentPage = 1;
        const pageSize = 6;
        let editingVoiceId = null;
        let currentPreviewAudio = null;

        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };

        const updateTabCounts = () => {
            const total = cachedMinimaxVoices.length;
            const preset = cachedMinimaxVoices.filter(v => v.category !== 'custom').length;
            const custom = cachedMinimaxVoices.filter(v => v.category === 'custom').length;

            $('#tts-minimax-tab-count-all').text(total);
            $('#tts-minimax-tab-count-preset').text(preset);
            $('#tts-minimax-tab-count-custom').text(custom);
        };

        const renderMinimaxVoicesList = (filterText = '') => {
            const $list = $('#tts-minimax-voices-list');
            const $count = $('#tts-minimax-voice-count');
            const $pagination = $('#tts-minimax-pagination');
            if ($list.length === 0) return;

            updateTabCounts();

            const q = filterText.trim().toLowerCase();
            const filtered = cachedMinimaxVoices.filter(v => {
                // 1. Tab 类别过滤
                const isCustom = v.category === 'custom';
                if (currentTab === 'preset' && isCustom) return false;
                if (currentTab === 'custom' && !isCustom) return false;

                // 2. 关键词模糊搜索过滤
                if (!q) return true;
                const name = (v.name || '').toLowerCase();
                const id = (v.id || '').toLowerCase();
                const desc = (v.description || '').toLowerCase();
                return name.includes(q) || id.includes(q) || desc.includes(q);
            });

            const totalFiltered = filtered.length;
            $count.text(`(共 ${cachedMinimaxVoices.length} 个${q ? `，搜索出 ${totalFiltered} 个` : ''})`);

            if (totalFiltered === 0) {
                $list.html('<div style="text-align: center; color: #888; font-size: 11.5px; padding: 12px;">未找到匹配声线</div>');
                $pagination.hide();
                return;
            }

            // 分页计算
            const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            const startIndex = (currentPage - 1) * pageSize;
            const pageVoices = filtered.slice(startIndex, startIndex + pageSize);

            // 更新分页条
            if (totalPages > 1 || totalFiltered > pageSize) {
                $pagination.show();
                $('#tts-minimax-page-summary').text(`第 ${currentPage}/${totalPages} 页 (显示 ${startIndex + 1}-${Math.min(startIndex + pageSize, totalFiltered)} / 共 ${totalFiltered} 条)`);
                $('#tts-minimax-page-info').text(`${currentPage} / ${totalPages}`);
                $('#tts-minimax-page-prev').prop('disabled', currentPage <= 1);
                $('#tts-minimax-page-next').prop('disabled', currentPage >= totalPages);
            } else {
                $pagination.hide();
            }

            let html = '';
            pageVoices.forEach(v => {
                const isCustom = v.category === 'custom';
                const genderIcon = v.gender === 'female' ? '♀' : (v.gender === 'male' ? '♂' : '⚥');
                const badgeClass = isCustom ? 'st-tts-badge-custom' : 'st-tts-badge-preset';
                const badgeText = isCustom ? '自定义' : '预设';

                html += `
                <div class="st-tts-voice-row" data-id="${escapeHtml(v.id)}">
                    <div class="st-tts-voice-info">
                        <span class="st-tts-badge ${badgeClass}">${badgeText}</span>
                        <span class="st-tts-voice-gender" title="性别: ${escapeHtml(v.gender || 'unknown')}">${genderIcon}</span>
                        <span class="st-tts-voice-name" title="${escapeHtml(v.name || v.id)}">${escapeHtml(v.name || v.id)}</span>
                        <span class="st-tts-voice-id-tag" title="Voice ID: ${escapeHtml(v.id)}">${escapeHtml(v.id)}</span>
                    </div>
                    <div class="st-tts-voice-actions">
                        <button type="button" class="st-tts-btn st-tts-btn-xs btn-preview-voice" data-id="${escapeHtml(v.id)}" title="试听当前声线">▶️ 试听</button>
                        <button type="button" class="st-tts-btn st-tts-btn-xs btn-set-default-voice" data-id="${escapeHtml(v.id)}" title="填入默认音色输入框">⭐ 设默认</button>
                        ${isCustom ? `
                            <button type="button" class="st-tts-btn st-tts-btn-xs btn-edit-custom-voice" data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name || '')}" data-gender="${escapeHtml(v.gender || 'female')}" title="修改此自定义声线信息">✏️</button>
                            <button type="button" class="st-tts-btn st-tts-btn-xs st-tts-btn-danger btn-del-custom-voice" data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name || v.id)}" title="删除此自定义音色">🗑️</button>
                        ` : ''}
                    </div>
                </div>`;
            });

            $list.html(html);
        };

        const loadMinimaxVoices = async (isManualRefresh = false) => {
            const $count = $('#tts-minimax-voice-count');
            const $list = $('#tts-minimax-voices-list');

            // 阶段 1: Cache-First 0毫秒秒开渲染 (优先提取内置官方预设与本地自定义音色)
            const { presetVoices, customVoices } = getAllMiniMaxVoices();
            const localCombined = [...presetVoices, ...customVoices];

            if (cachedMinimaxVoices.length === 0 || localCombined.length > 0) {
                cachedMinimaxVoices = localCombined;
                renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
            }

            if (isManualRefresh) {
                $count.text('(同步中...)');
            }

            // 阶段 2: 异步向后端同步最新的云端+自定义音色 (4秒超时保护)
            try {
                const api = window.TTS_API || TTS_API;
                if (api && typeof api.getMinimaxVoices === 'function') {
                    const data = await api.getMinimaxVoices();
                    if (data && Array.isArray(data.voices) && data.voices.length > 0) {
                        cachedMinimaxVoices = data.voices;
                        if (window.TTS_State && window.TTS_State.CACHE) {
                            window.TTS_State.CACHE.minimax_voices = data.voices;
                        }
                        if (window.TTS_UI && typeof window.TTS_UI.renderModelOptions === 'function') {
                            window.TTS_UI.renderModelOptions();
                        }
                        renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
                    }
                }
            } catch (err) {
                console.warn('[ST-Direct-TTS] 异步同步 MiniMax 声线列表失败(已优雅降级至本地预设):', err);
                if (cachedMinimaxVoices.length === 0) {
                    $list.html('<div style="text-align: center; color: #f87171; font-size: 11px; padding: 10px;">加载声线失败，请确认后端连接正常</div>');
                    $count.text('(加载失败)');
                } else if (isManualRefresh) {
                    $count.text(`(共 ${cachedMinimaxVoices.length} 个)`);
                }
            }
        };

        // 初始加载 (立即使用 Cache-First 呈现，无需等待网络)
        loadMinimaxVoices();

        // 刷新按钮 (手动同步)
        $('#tts-minimax-refresh-voices-btn').on('click', () => {
            loadMinimaxVoices(true);
        });

        // Tab 分类切换
        $('#tts-minimax-category-tabs').on('click', '.st-tts-tab-item', function () {
            $('#tts-minimax-category-tabs .st-tts-tab-item').removeClass('active');
            $(this).addClass('active');
            currentTab = $(this).data('tab') || 'all';
            currentPage = 1;
            renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
        });

        // 分页按钮事件
        $('#tts-minimax-page-prev').on('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
            }
        });

        $('#tts-minimax-page-next').on('click', () => {
            currentPage++;
            renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
        });

        // 搜索过滤
        $('#tts-minimax-voice-search').on('input', (e) => {
            currentPage = 1;
            renderMinimaxVoicesList($(e.target).val());
        });

        // 折叠/展开录入抽屉
        const resetEntryForm = () => {
            editingVoiceId = null;
            $('#tts-minimax-new-voice-name').val('');
            $('#tts-minimax-new-voice-id').val('');
            $('#tts-minimax-new-voice-gender').val('female');
            $('#tts-minimax-form-title').text('➕ 录入自定义 / 克隆声线');
            $('#tts-minimax-editing-hint').hide();
            $('#tts-minimax-add-btn-text').text('➕ 保存到声线库');
            $('#tts-minimax-cancel-edit-btn').hide();
            $('#tts-minimax-add-voice-status').text('');
        };

        $('#tts-minimax-toggle-add-btn').on('click', () => {
            const $drawer = $('#tts-minimax-add-drawer');
            const isExpanded = $drawer.hasClass('expanded');
            if (isExpanded) {
                $drawer.removeClass('expanded');
                $('#tts-minimax-toggle-add-text').text('➕ 录入声线');
                resetEntryForm();
            } else {
                $drawer.addClass('expanded');
                $('#tts-minimax-toggle-add-text').text('❌ 收起');
                $('#tts-minimax-new-voice-name').focus();
            }
        });

        // 取消编辑
        $('#tts-minimax-cancel-edit-btn').on('click', () => {
            resetEntryForm();
            $('#tts-minimax-add-drawer').removeClass('expanded');
            $('#tts-minimax-toggle-add-text').text('➕ 录入声线');
        });

        // 保存自定义声线 (新增 / 修改)
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

            const api = window.TTS_API || TTS_API;

            // 本地镜像先保存 (保障无后端/离线环境依然可用)
            try {
                const saved = localStorage.getItem('tts_custom_minimax_voices');
                let list = saved ? JSON.parse(saved) : [];
                if (!Array.isArray(list)) list = [];
                list = list.filter(v => v.id !== voiceId && v.id !== editingVoiceId);
                list.push({ id: voiceId, name: name || voiceId, gender: gender || 'female', category: 'custom', description: '用户自定义克隆音色' });
                localStorage.setItem('tts_custom_minimax_voices', JSON.stringify(list));
            } catch (e) { }

            try {
                // 如果处于编辑模式且修改了原 ID，先删除原 ID
                if (editingVoiceId && editingVoiceId !== voiceId) {
                    try {
                        if (api && typeof api.deleteMinimaxVoice === 'function') {
                            await api.deleteMinimaxVoice(editingVoiceId);
                        }
                    } catch (e) {
                        console.warn('[ST-Direct-TTS] 删除旧声线 ID 失败:', e);
                    }
                }

                let res = null;
                if (api && typeof api.addMinimaxVoice === 'function') {
                    res = await api.addMinimaxVoice({
                        id: voiceId,
                        name: name || voiceId,
                        gender: gender || 'female',
                        category: 'custom'
                    });
                }

                $status.text('✅ 已保存！').css('color', '#55ff55');
                resetEntryForm();
                $('#tts-minimax-add-drawer').removeClass('expanded');
                $('#tts-minimax-toggle-add-text').text('➕ 录入声线');

                if (res && Array.isArray(res.voices)) {
                    cachedMinimaxVoices = res.voices;
                    if (window.TTS_State && window.TTS_State.CACHE) {
                        window.TTS_State.CACHE.minimax_voices = res.voices;
                    }
                    if (window.TTS_UI && typeof window.TTS_UI.renderModelOptions === 'function') {
                        window.TTS_UI.renderModelOptions();
                    }
                    renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
                } else {
                    loadMinimaxVoices();
                }
                setTimeout(() => $status.text(''), 3000);
            } catch (err) {
                $status.text(`⚠️ 后端未响应，已保存至本地: ${err.message}`).css('color', '#fde047');
                resetEntryForm();
                $('#tts-minimax-add-drawer').removeClass('expanded');
                $('#tts-minimax-toggle-add-text').text('➕ 录入声线');
                loadMinimaxVoices();
                setTimeout(() => $status.text(''), 4000);
            }
        });

        // 列表事件委托: 试听
        $('#tts-minimax-voices-list').on('click', '.btn-preview-voice', async function () {
            const $btn = $(this);
            const voiceId = $btn.data('id');
            if (!voiceId) return;

            const originText = $btn.text();
            $btn.text('⏳...').prop('disabled', true);

            if (currentPreviewAudio) {
                currentPreviewAudio.pause();
                currentPreviewAudio = null;
            }

            const api = window.TTS_API || TTS_API;

            try {
                if (api && typeof api.previewMinimaxVoice === 'function') {
                    const blob = await api.previewMinimaxVoice(voiceId);
                    const audioUrl = URL.createObjectURL(blob);
                    currentPreviewAudio = new Audio(audioUrl);
                    $btn.text('🔊 播放中');
                    currentPreviewAudio.onended = () => {
                        $btn.text(originText).prop('disabled', false);
                    };
                    currentPreviewAudio.onerror = () => {
                        $btn.text(originText).prop('disabled', false);
                    };
                    await currentPreviewAudio.play();
                } else {
                    throw new Error("TTS API 未初始化");
                }
            } catch (err) {
                alert(`试听失败: ${err.message}`);
                $btn.text(originText).prop('disabled', false);
            }
        });

        // 设为默认
        $('#tts-minimax-voices-list').on('click', '.btn-set-default-voice', function () {
            const voiceId = $(this).data('id');
            if (voiceId) {
                $('#tts-minimax-voice-id').val(voiceId).trigger('input');
                alert(`已将「${voiceId}」填入默认音色输入框！`);
            }
        });

        // 编辑自定义声线 (回填表单)
        $('#tts-minimax-voices-list').on('click', '.btn-edit-custom-voice', function () {
            const voiceId = $(this).data('id');
            const voiceName = $(this).data('name') || '';
            const voiceGender = $(this).data('gender') || 'female';

            editingVoiceId = voiceId;
            $('#tts-minimax-new-voice-name').val(voiceName);
            $('#tts-minimax-new-voice-id').val(voiceId);
            $('#tts-minimax-new-voice-gender').val(voiceGender);

            $('#tts-minimax-form-title').text('✏️ 修改自定义声线');
            $('#tts-minimax-editing-hint').show();
            $('#tts-minimax-add-btn-text').text('💾 保存修改');
            $('#tts-minimax-cancel-edit-btn').show();

            const $drawer = $('#tts-minimax-add-drawer');
            $drawer.addClass('expanded');
            $('#tts-minimax-toggle-add-text').text('❌ 收起');

            $('#tts-minimax-new-voice-name').focus();
        });

        // 删除自定义声线
        $('#tts-minimax-voices-list').on('click', '.btn-del-custom-voice', async function () {
            const voiceId = $(this).data('id');
            const voiceName = $(this).data('name');
            if (!voiceId) return;

            if (!confirm(`确定要从自定义音色库删除声线「${voiceName}」吗？`)) return;

            const api = window.TTS_API || TTS_API;

            // 先清理本地 localStorage 镜像
            try {
                const saved = localStorage.getItem('tts_custom_minimax_voices');
                if (saved) {
                    const list = (JSON.parse(saved) || []).filter(v => v.id !== voiceId && v.id !== `minimax:${voiceId}`);
                    localStorage.setItem('tts_custom_minimax_voices', JSON.stringify(list));
                }
            } catch (e) { }

            try {
                if (api && typeof api.deleteMinimaxVoice === 'function') {
                    const res = await api.deleteMinimaxVoice(voiceId);
                    if (res && Array.isArray(res.voices)) {
                        cachedMinimaxVoices = res.voices;
                        if (window.TTS_State && window.TTS_State.CACHE) {
                            window.TTS_State.CACHE.minimax_voices = res.voices;
                        }
                        if (window.TTS_UI && typeof window.TTS_UI.renderModelOptions === 'function') {
                            window.TTS_UI.renderModelOptions();
                        }
                        renderMinimaxVoicesList($('#tts-minimax-voice-search').val() || '');
                    } else {
                        loadMinimaxVoices();
                    }
                } else {
                    loadMinimaxVoices();
                }
            } catch (err) {
                alert(`后端删除同步异常 (已在本地移除): ${err.message}`);
                loadMinimaxVoices();
            }
        });

        // 豆包 字段
        $('#tts-doubao-api-key').on('input', (e) => {
            if (!config.provider_settings.doubao) config.provider_settings.doubao = {};
            config.provider_settings.doubao.api_key = $(e.target).val();
            context.saveSettingsDebounced();
        });

        // ============================================================
        // Fish.audio 字段同步与交互
        // ============================================================
        const syncFishAudioBackend = () => {
            const fa = config.provider_settings.fish_audio || {};
            if (window.TTS_API && typeof window.TTS_API.updateSettings === 'function') {
                window.TTS_API.updateSettings({
                    fish_audio_tts: {
                        api_key: fa.api_key || '',
                        api_url: fa.api_url || 'https://api.fish.audio/v1/tts',
                        model: fa.model || 's2.1-pro',
                        default_voice_id: fa.voice_id || ''
                    }
                }).catch(() => { });
            }
        };

        $('#tts-fish-api-key').on('input', (e) => {
            if (!config.provider_settings.fish_audio) config.provider_settings.fish_audio = {};
            config.provider_settings.fish_audio.api_key = $(e.target).val().trim();
            context.saveSettingsDebounced();
            syncFishAudioBackend();
        });

        $('#tts-fish-api-url').on('input', (e) => {
            if (!config.provider_settings.fish_audio) config.provider_settings.fish_audio = {};
            config.provider_settings.fish_audio.api_url = $(e.target).val().trim();
            context.saveSettingsDebounced();
            syncFishAudioBackend();
        });

        $('#tts-fish-model').on('change', (e) => {
            if (!config.provider_settings.fish_audio) config.provider_settings.fish_audio = {};
            config.provider_settings.fish_audio.model = $(e.target).val();
            context.saveSettingsDebounced();
            syncFishAudioBackend();
        });

        $('#tts-fish-voice-id').on('input', (e) => {
            if (!config.provider_settings.fish_audio) config.provider_settings.fish_audio = {};
            config.provider_settings.fish_audio.voice_id = $(e.target).val().trim();
            context.saveSettingsDebounced();
            syncFishAudioBackend();
        });

        // 测试 Fish.audio 连通性
        $('#tts-fish-test-btn').on('click', async () => {
            const $res = $('#tts-fish-test-result');
            const apiKey = $('#tts-fish-api-key').val().trim();
            const apiUrl = $('#tts-fish-api-url').val().trim() || 'https://api.fish.audio/v1/tts';
            const model = $('#tts-fish-model').val() || 's2.1-pro';

            if (!apiKey) {
                $res.text('❌ 请先填写 Fish.audio API Key').css('color', '#ff5555');
                return;
            }

            $res.text('🔄 正在测试连接...').css('color', '#aaa');

            try {
                const api = window.TTS_API || TTS_API;
                const data = await api.testFishAudio(apiKey, apiUrl, model);
                if (data.success) {
                    $res.text(`✅ ${data.message}`).css('color', '#55ff55');
                } else {
                    $res.text(`❌ ${data.message}`).css('color', '#ff5555');
                }
            } catch (err) {
                $res.text(`❌ 连接失败: ${err.message}`).css('color', '#ff5555');
            }
        });

        // 一键同步 Fish.audio 远程个人音色库
        $('#tts-fish-sync-btn').on('click', async () => {
            const $btn = $('#tts-fish-sync-btn');
            const $res = $('#tts-fish-test-result');
            const apiKey = $('#tts-fish-api-key').val().trim();

            if (!apiKey) {
                $res.text('❌ 请先填写 Fish.audio API Key').css('color', '#ff5555');
                return;
            }

            $btn.prop('disabled', true).text('🔄 正在同步官方音色库...');
            $res.text('🔄 正在从官方拉取当前账号收藏的声音模型...').css('color', '#aaa');

            try {
                const api = window.TTS_API || TTS_API;
                const result = await api.syncFishAudioRemoteVoices(apiKey);
                if (result.success) {
                    $res.text(`✅ ${result.message}`).css('color', '#55ff55');
                    if (window.TTS_State && window.TTS_State.CACHE && result.voices) {
                        window.TTS_State.CACHE.fish_audio_voices = result.voices;
                    }
                    loadFishVoices();
                    if (window.TTS_UI && typeof window.TTS_UI.renderModelOptions === 'function') {
                        window.TTS_UI.renderModelOptions();
                    }
                } else {
                    $res.text(`❌ 同步失败: ${result.message || '未知错误'}`).css('color', '#ff5555');
                }
            } catch (err) {
                $res.text(`❌ 同步异常: ${err.message}`).css('color', '#ff5555');
            } finally {
                $btn.prop('disabled', false).html('<span>🔄 一键同步个人音色库</span>');
            }
        });

        // ============================================================
        // Fish.audio 音色列表展示与管理
        // ============================================================
        let cachedFishVoices = [];
        let fishPreviewAudio = null;

        const renderFishVoicesList = (filterText = '') => {
            const $list = $('#tts-fish-voices-list');
            const $count = $('#tts-fish-voice-count');
            if ($list.length === 0) return;

            const q = filterText.trim().toLowerCase();
            const filtered = cachedFishVoices.filter(v => {
                if (!q) return true;
                const name = (v.name || '').toLowerCase();
                const id = (v.id || '').toLowerCase();
                const desc = (v.description || '').toLowerCase();
                return name.includes(q) || id.includes(q) || desc.includes(q);
            });

            $count.text(`(共 ${cachedFishVoices.length} 个${q ? `，过滤出 ${filtered.length} 个` : ''})`);

            if (filtered.length === 0) {
                $list.html('<div style="text-align: center; color: #888; font-size: 11.5px; padding: 12px;">未找到匹配声线</div>');
                return;
            }

            let html = '';
            filtered.forEach(v => {
                const isCustom = v.category !== 'preset';
                const genderIcon = v.gender === 'female' ? '♀' : (v.gender === 'male' ? '♂' : '⚥');
                const badgeText = v.category === 'preset' ? '预设' : (v.category === 'remote_sync' ? '云同步' : '自定义');
                const badgeClass = v.category === 'preset' ? 'st-tts-badge-preset' : 'st-tts-badge-custom';

                html += `
                <div class="st-tts-voice-row" data-id="${escapeHtml(v.id)}">
                    <div class="st-tts-voice-info">
                        <span class="st-tts-badge ${badgeClass}">${badgeText}</span>
                        <span class="st-tts-voice-gender">${genderIcon}</span>
                        <span class="st-tts-voice-name" title="${escapeHtml(v.name || v.id)}">${escapeHtml(v.name || v.id)}</span>
                        <span class="st-tts-voice-id-tag" title="Model ID: ${escapeHtml(v.id)}">${escapeHtml(v.id)}</span>
                    </div>
                    <div class="st-tts-voice-actions">
                        <button type="button" class="st-tts-btn st-tts-btn-xs btn-preview-fish-voice" data-id="${escapeHtml(v.id)}" title="试听当前声线">▶️ 试听</button>
                        <button type="button" class="st-tts-btn st-tts-btn-xs btn-set-default-fish-voice" data-id="${escapeHtml(v.id)}" title="填入默认音色输入框">⭐ 设默认</button>
                        ${isCustom ? `
                            <button type="button" class="st-tts-btn st-tts-btn-xs btn-edit-fish-voice" data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name || v.id)}" data-gender="${escapeHtml(v.gender || 'female')}" title="编辑此声线">✏️</button>
                            <button type="button" class="st-tts-btn st-tts-btn-xs st-tts-btn-danger btn-del-fish-voice" data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name || v.id)}" title="从库中删除此音色">🗑️</button>
                        ` : ''}
                    </div>
                </div>`;
            });

            $list.html(html);
        };

        const loadFishVoices = async (isManualRefresh = false) => {
            const $count = $('#tts-fish-voice-count');
            if (isManualRefresh) $count.text('(正在刷新...)');

            const { presetVoices, customVoices } = (window.TTS_Utils && typeof window.TTS_Utils.getAllFishAudioVoices === 'function')
                ? window.TTS_Utils.getAllFishAudioVoices()
                : { presetVoices: [], customVoices: [] };

            const localCombined = [...presetVoices, ...customVoices];
            if (cachedFishVoices.length === 0 || localCombined.length > 0) {
                cachedFishVoices = localCombined;
                renderFishVoicesList($('#tts-fish-voice-search').val() || '');
            }

            try {
                const api = window.TTS_API || TTS_API;
                if (api && typeof api.getFishAudioVoices === 'function') {
                    const data = await api.getFishAudioVoices();
                    if (data && Array.isArray(data.voices)) {
                        cachedFishVoices = data.voices;
                        if (window.TTS_State && window.TTS_State.CACHE) {
                            window.TTS_State.CACHE.fish_audio_voices = data.voices;
                        }
                        renderFishVoicesList($('#tts-fish-voice-search').val() || '');
                    }
                }
            } catch (err) {
                if (cachedFishVoices.length === 0) {
                    $('#tts-fish-voices-list').html(`<div style="text-align: center; color: #ff7777; font-size: 11.5px; padding: 10px;">读取音色库失败: ${err.message}</div>`);
                }
            }
        };

        loadFishVoices();

        $('#tts-fish-btn-refresh-voices').on('click', () => {
            loadFishVoices(true);
        });

        $('#tts-fish-voice-search').on('input', (e) => {
            renderFishVoicesList($(e.target).val());
        });

        // 抽屉状态与重置
        let editingFishVoiceId = null;
        let editingFishVoiceName = null;
        const resetFishEntryForm = () => {
            editingFishVoiceId = null;
            editingFishVoiceName = null;
            $('#tts-fish-new-voice-name').val('');
            $('#tts-fish-new-voice-id').val('').prop('disabled', false);
            $('#tts-fish-new-voice-gender').val('female');
            $('#tts-fish-form-title').text('➕ 录入自定义 / 官方声线');
            $('#tts-fish-editing-hint').hide();
            $('#tts-fish-save-btn-text').text('➕ 保存到音色库');
            $('#tts-fish-cancel-edit-btn').hide();
            $('#tts-fish-add-voice-status').text('');
        };

        // 展开/收起录入抽屉
        $('#tts-fish-btn-add-voice').on('click', () => {
            const $drawer = $('#tts-fish-add-drawer');
            const isExpanded = $drawer.hasClass('expanded');
            if (isExpanded) {
                $drawer.removeClass('expanded');
                $('#tts-fish-toggle-add-text').text('➕ 添加音色');
                resetFishEntryForm();
            } else {
                $drawer.addClass('expanded');
                $('#tts-fish-toggle-add-text').text('❌ 收起');
                $('#tts-fish-new-voice-name').focus();
            }
        });

        // 取消编辑
        $('#tts-fish-cancel-edit-btn').on('click', () => {
            resetFishEntryForm();
            $('#tts-fish-add-drawer').removeClass('expanded');
            $('#tts-fish-toggle-add-text').text('➕ 添加音色');
        });

        // 保存自定义声线 (直接允许重复 ID 新增 / 修改)
        $('#tts-fish-save-voice-btn').on('click', async () => {
            const name = $('#tts-fish-new-voice-name').val().trim();
            const rawId = $('#tts-fish-new-voice-id').val().trim();
            const gender = $('#tts-fish-new-voice-gender').val() || 'female';
            const $status = $('#tts-fish-add-voice-status');

            if (!rawId) {
                $status.text('❌ 请填写 Model ID').css('color', '#ff5555');
                $('#tts-fish-new-voice-id').focus();
                return;
            }

            const cleanId = rawId.startsWith('fish:') ? rawId.slice(5) : (rawId.startsWith('fish_audio:') ? rawId.slice(11) : rawId);
            $status.text('⏳ 保存中...').css('color', '#aaa');

            try {
                // 如果处于编辑模式且修改了原 ID 或原名称，先删除旧项
                if (editingFishVoiceId && (editingFishVoiceId !== cleanId || editingFishVoiceName !== name)) {
                    if (window.TTS_Utils && typeof window.TTS_Utils.deleteCustomFishAudioVoice === 'function') {
                        await window.TTS_Utils.deleteCustomFishAudioVoice(editingFishVoiceId, editingFishVoiceName);
                    }
                }

                if (window.TTS_Utils && typeof window.TTS_Utils.saveCustomFishAudioVoice === 'function') {
                    await window.TTS_Utils.saveCustomFishAudioVoice(cleanId, name || cleanId, gender);
                }

                $status.text('✅ 已保存！').css('color', '#55ff55');
                resetFishEntryForm();
                $('#tts-fish-add-drawer').removeClass('expanded');
                $('#tts-fish-toggle-add-text').text('➕ 添加音色');

                await loadFishVoices();
                if (window.TTS_UI && typeof window.TTS_UI.renderModelOptions === 'function') {
                    window.TTS_UI.renderModelOptions();
                }
                setTimeout(() => $status.text(''), 3000);
            } catch (err) {
                $status.text(`❌ 保存失败: ${err.message}`).css('color', '#ff5555');
            }
        });

        // 设默认按钮
        $('#tts-fish-voices-list').on('click', '.btn-set-default-fish-voice', (e) => {
            const voiceId = $(e.currentTarget).data('id');
            $('#tts-fish-voice-id').val(voiceId);
            if (!config.provider_settings.fish_audio) config.provider_settings.fish_audio = {};
            config.provider_settings.fish_audio.voice_id = voiceId;
            context.saveSettingsDebounced();
            syncFishAudioBackend();
            alert(`已将「${voiceId}」设为 Fish.audio 默认 Voice ID`);
        });

        // 编辑自定义音色 (回填抽屉)
        $('#tts-fish-voices-list').on('click', '.btn-edit-fish-voice', (e) => {
            const $btn = $(e.currentTarget);
            const voiceId = $btn.data('id');
            const voiceName = $btn.data('name');
            const voiceGender = $btn.data('gender') || 'female';

            editingFishVoiceId = voiceId;
            editingFishVoiceName = voiceName || voiceId;
            $('#tts-fish-new-voice-name').val(voiceName || voiceId);
            $('#tts-fish-new-voice-id').val(voiceId);
            $('#tts-fish-new-voice-gender').val(voiceGender);
            $('#tts-fish-form-title').text('✏️ 编辑 Fish.audio 声线');
            $('#tts-fish-editing-hint').show();
            $('#tts-fish-save-btn-text').text('💾 保存修改');
            $('#tts-fish-cancel-edit-btn').show();

            const $drawer = $('#tts-fish-add-drawer');
            $drawer.addClass('expanded');
            $('#tts-fish-toggle-add-text').text('❌ 收起');
            $('#tts-fish-new-voice-name').focus();
        });

        // 试听按钮
        $('#tts-fish-voices-list').on('click', '.btn-preview-fish-voice', async (e) => {
            const $btn = $(e.currentTarget);
            const voiceId = $btn.data('id');

            if (fishPreviewAudio) {
                fishPreviewAudio.pause();
                fishPreviewAudio = null;
                $('.btn-preview-fish-voice').text('▶️ 试听').prop('disabled', false);
            }

            const model = $('#tts-fish-model').val() || 's2.1-pro';
            $btn.prop('disabled', true).text('⏳ 合成中...');

            try {
                const api = window.TTS_API || TTS_API;
                const blob = await api.previewFishAudioVoice(voiceId, "主人，您好！这是我的Fish.audio语音合成试听效果。", model);
                const audioUrl = URL.createObjectURL(blob);
                fishPreviewAudio = new Audio(audioUrl);
                $btn.prop('disabled', false).text('⏹️ 停止');

                fishPreviewAudio.onended = () => {
                    $btn.text('▶️ 试听');
                    fishPreviewAudio = null;
                };
                fishPreviewAudio.onerror = () => {
                    $btn.text('▶️ 试听');
                    fishPreviewAudio = null;
                    alert('试听音频播放失败');
                };
                await fishPreviewAudio.play();
            } catch (err) {
                $btn.prop('disabled', false).text('▶️ 试听');
                alert(`试听失败: ${err.message}`);
            }
        });

        // 删除按钮
        $('#tts-fish-voices-list').on('click', '.btn-del-fish-voice', async (e) => {
            const $btn = $(e.currentTarget);
            const voiceId = $btn.data('id');
            const voiceName = $btn.data('name');

            if (!confirm(`确定要从音色库中移除「${voiceName || voiceId}」吗？`)) return;

            if (window.TTS_Utils && typeof window.TTS_Utils.deleteCustomFishAudioVoice === 'function') {
                await window.TTS_Utils.deleteCustomFishAudioVoice(voiceId, voiceName);
            }
            loadFishVoices();
        });

        /* 
        // 每日剧本盲盒与匿名统计开关 (暂未开放)
        $('#tts-ext-telemetry-enabled').on('change', (e) => {
            const enabled = $(e.target).prop('checked');
            config.telemetry_enabled = enabled;
            context.saveSettingsDebounced();
            if (DailyEgg) {
                DailyEgg.state.isEnabled = enabled;
                if (enabled) {
                    DailyEgg.init();
                } else {
                    DailyEgg.renderUI();
                }
            d杜宇航35448
            
        });

        // 初始化每日盲盒与无感打点
        DailyEgg.init().catch(err => {
            console.warn('[ST-Direct-TTS] 每日盲盒初始化异常:', err);
        });
        */

        console.log('[ST-Direct-TTS] ✅ 酒馆原生扩展设置面板挂载并初始化完成');

    } catch (error) {
        console.error('[ST-Direct-TTS] ❌ 酒馆原生设置面板挂载失败:', error);
    }
}
