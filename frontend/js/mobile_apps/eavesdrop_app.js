/**
 * 对话追踪 / 剧场 App 模块 (Eavesdrop & Theater App)
 * 
 * 核心功能:
 * 1. 被动来电监听与即时互动
 * 2. 历史密谈记录展示与多角色音频回放
 * 3. 现代化主动密谈控制台 (多 Speaker 勾选、剧本 Preset 选择、密谈主题快捷标签池、氛围参数)
 * 4. 即时生成结果卡片增强:
 *    - 🔊 重播音频
 *    - 🔄 修改参数重新生成
 *    - 📥 一键注入/追加到当前 SillyTavern 聊天
 */

import { ChatInjector } from '../chat_injector.js';
import { WorldInfoExtractor } from '../world_info_extractor.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from './shared/audio_player.js';
import { getApiHost, getChatBranch, formatTime } from './shared/utils.js';

export const id = 'eavesdrop';
export const defaultName = '对话追踪';
export const defaultIcon = '🎧';
export const sceneId = 'eavesdrop';
export const hidden = false;

// 缓存最后一次生成的结果
let _lastGeneratedEavesdrop = null;
let _currentAudioPlayer = null;

const SVG = {
    ear: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5v7a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><path d="M19 10v4a7 7 0 0 1-14 0v-4"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
    play: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
    inject: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    sparkles: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
    theater: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/></svg>`
};

/**
 * 注入样式
 */
const injectCSS = () => {
    if ($('#eavesdrop-app-css').length) return;
    const css = `
        .ed-app-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: linear-gradient(180deg, #13101f 0%, #0a0813 100%);
            color: #e5e7eb;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            box-sizing: border-box;
        }
        .ed-header-action-bar {
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(196, 155, 79, 0.2);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-shrink: 0;
        }
        .ed-main-btn {
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
            color: #fff;
            border: 1px solid rgba(245, 158, 11, 0.4);
            border-radius: 10px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
            transition: all 0.2s ease;
        }
        .ed-main-btn:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
        }
        .ed-history-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .ed-card {
            background: rgba(24, 18, 36, 0.75);
            border: 1px solid rgba(196, 155, 79, 0.2);
            border-radius: 12px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            backdrop-filter: blur(8px);
            transition: all 0.2s;
        }
        .ed-card:hover {
            border-color: rgba(196, 155, 79, 0.45);
            background: rgba(30, 22, 45, 0.85);
        }
        .ed-card.highlight {
            border-color: #f59e0b;
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.2);
            background: linear-gradient(135deg, rgba(40, 30, 20, 0.8), rgba(25, 18, 12, 0.9));
        }
        .ed-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .ed-speakers-tag {
            font-size: 14px;
            font-weight: 600;
            color: #fef08a;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .ed-time {
            font-size: 11px;
            color: rgba(220, 200, 160, 0.6);
        }
        .ed-theme {
            font-size: 12px;
            color: rgba(220, 200, 160, 0.9);
            background: rgba(0, 0, 0, 0.3);
            padding: 5px 8px;
            border-radius: 6px;
            border-left: 3px solid #f59e0b;
        }
        .ed-dialog-preview {
            font-size: 12px;
            color: #d1d5db;
            line-height: 1.5;
            max-height: 90px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.25);
            padding: 6px 8px;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .ed-card-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
            flex-wrap: wrap;
        }
        .ed-action-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #e5e7eb;
            border-radius: 6px;
            padding: 5px 10px;
            font-size: 11.5px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }
        .ed-action-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }
        .ed-action-btn.play {
            background: rgba(217, 119, 6, 0.2);
            border-color: rgba(217, 119, 6, 0.4);
            color: #fde047;
        }
        .ed-action-btn.play:hover {
            background: rgba(217, 119, 6, 0.35);
        }
        .ed-action-btn.inject {
            background: rgba(16, 185, 129, 0.15);
            border-color: rgba(16, 185, 129, 0.35);
            color: #6ee7b7;
        }
        .ed-action-btn.inject:hover {
            background: rgba(16, 185, 129, 0.3);
        }

        /* 监听待接听界面 */
        .ed-prompt-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 24px;
            text-align: center;
            gap: 16px;
        }
        .ed-prompt-icon {
            font-size: 48px;
            animation: ed-pulse 2s infinite ease-in-out;
        }
        @keyframes ed-pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 10px #f59e0b); }
        }
    `;
    $('head').append(`<style id="eavesdrop-app-css">${css}</style>`);
};

/**
 * 渲染对话追踪 / 剧场 App
 */
export async function render(container, createNavbar) {
    injectCSS();
    cleanupGlobalPlayer();
    container.empty();

    const eavesdropData = window.TTS_EavesdropData;

    // ========== 状态1: 接收到系统被动推送的窃听事件 ==========
    if (eavesdropData) {
        renderPassivePrompt(container, eavesdropData);
        return;
    }

    // ========== 状态2: 主界面 (历史记录 + 主动开启密谈控制台) ==========
    container.append(createNavbar("对话追踪"));

    const $root = $(`
        <div class="ed-app-container">
            <!-- 顶部操作栏 -->
            <div class="ed-header-action-bar">
                <div style="font-size:12px; color:rgba(220,200,160,0.8); display:flex; align-items:center; gap:5px;">
                    ${SVG.sparkles} 私下密谈与剧情剧场
                </div>
                <button class="ed-main-btn" id="ed-btn-open-modal">
                    ${SVG.theater} 开启私下密谈
                </button>
            </div>

            <!-- 历史密谈列表 -->
            <div class="ed-history-scroll" id="ed-history-list">
                <div style="text-align:center; padding:30px; color:#9ca3af;">正在加载对话追踪记录...</div>
            </div>
        </div>
    `);

    container.append($root);

    // 绑定主动发起按钮
    $root.find('#ed-btn-open-modal').on('click', () => {
        openEavesdropModal();
    });

    // 加载历史记录
    await loadEavesdropHistory();
}

/**
 * 渲染被动待监听界面
 */
function renderPassivePrompt(container, eavesdropData) {
    const speakersText = (eavesdropData.speakers || []).join(' 与 ') || '角色私聊';

    const $prompt = $(`
        <div class="ed-app-container">
            <div class="ed-prompt-container">
                <div class="ed-prompt-icon">🎧</div>
                <h3 style="margin:0; font-size:18px; color:#fef08a;">检测到密谈: ${speakersText}</h3>
                <p style="margin:0; font-size:13px; color:rgba(220,200,160,0.85);">${eavesdropData.scene_description || '角色们正在私底下商讨重要事宜...'}</p>
                
                <div style="display:flex; gap:12px; margin-top:10px;">
                    <button id="ed-ignore-btn" style="padding:10px 20px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#d1d5db; cursor:pointer;">
                        忽略
                    </button>
                    <button id="ed-listen-btn" class="ed-main-btn" style="padding:10px 24px;">
                        🎧 立即偷听
                    </button>
                </div>
            </div>
        </div>
    `);

    container.append($prompt);

    $prompt.find('#ed-ignore-btn').on('click', () => {
        window.TTS_EavesdropData = null;
        $('#mobile-home-btn').click();
    });

    $prompt.find('#ed-listen-btn').on('click', async () => {
        window.TTS_EavesdropData = null;
        _lastGeneratedEavesdrop = eavesdropData;

        // 自动注入聊天
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'eavesdrop',
                segments: eavesdropData.segments || [],
                speakers: eavesdropData.speakers || [],
                callId: eavesdropData.record_id || Date.now(),
                audioUrl: eavesdropData.audio_url,
                sceneDescription: eavesdropData.scene_description
            });
        } catch (e) {
            console.error('[EavesdropApp] 自动注入失败:', e);
        }

        // 自动播放
        if (eavesdropData.audio_url) {
            cleanupGlobalPlayer();
            _currentAudioPlayer = new AudioPlayer(eavesdropData.audio_url);
            setGlobalPlayer(_currentAudioPlayer);
            _currentAudioPlayer.play();
        }

        // 重新渲染为主界面展示
        render(container, () => $('<div></div>'));
    });
}

/**
 * 加载历史密谈记录
 */
async function loadEavesdropHistory() {
    const $list = $('#ed-history-list');
    if (!$list.length) return;

    const chatBranch = getChatBranch();
    const apiHost = getApiHost();

    try {
        const url = chatBranch 
            ? `${apiHost}/api/eavesdrop/history/${encodeURIComponent(chatBranch)}?limit=40`
            : `${apiHost}/api/eavesdrop/history?limit=40`;
        
        const res = await fetch(url).then(r => r.json());
        const records = (res && res.history) || [];

        renderEavesdropList(records);
    } catch (e) {
        console.error('[EavesdropApp] 加载历史失败:', e);
        $list.html(`<div style="text-align:center; padding:30px; color:#ef4444;">加载失败: ${e.message}</div>`);
    }
}

/**
 * 渲染密谈卡片列表
 */
function renderEavesdropList(records) {
    const $list = $('#ed-history-list');
    if (!$list.length) return;

    $list.empty();

    if (_lastGeneratedEavesdrop) {
        const $latestCard = createEavesdropCard(_lastGeneratedEavesdrop, true);
        $list.append($latestCard);
    }

    if (records.length === 0 && !_lastGeneratedEavesdrop) {
        $list.html(`
            <div style="text-align:center; padding:50px 20px; color:#9ca3af;">
                <div style="font-size:32px; margin-bottom:10px;">🎧</div>
                <div>暂无对话追踪记录</div>
                <div style="font-size:11.5px; color:rgba(220,200,160,0.6); margin-top:6px;">
                    点击右上角【开启私下密谈】编织专属剧场
                </div>
            </div>
        `);
        return;
    }

    records.forEach(rec => {
        const $card = createEavesdropCard(rec, false);
        $list.append($card);
    });
}

/**
 * 创建单条密谈卡片 (支持重播、重新生成与注入聊天)
 */
function createEavesdropCard(rec, isLatest = false) {
    let speakers = rec.speakers || [];
    if (typeof speakers === 'string') {
        try { speakers = JSON.parse(speakers); } catch (e) { speakers = [speakers]; }
    }
    const speakersStr = speakers.join(' & ') || '多人密谈';

    const timeStr = rec.created_at ? formatTime(rec.created_at) : "刚刚";
    const theme = rec.scene_description || rec.theme || "私下交流重要事宜";
    const audioUrl = rec.audio_url || (rec.audio ? `data:audio/wav;base64,${rec.audio}` : null);

    let segments = rec.segments || [];
    if (typeof segments === 'string') {
        try { segments = JSON.parse(segments); } catch (e) { segments = []; }
    }

    const previewTexts = segments.map(s => {
        const t = s.translation || s.text || '';
        return `<div><strong>${s.speaker || '角色'}:</strong> ${t}</div>`;
    }).join('');

    const $card = $(`
        <div class="ed-card ${isLatest ? 'highlight' : ''}">
            <div class="ed-card-header">
                <div class="ed-speakers-tag">
                    ${SVG.ear} ${speakersStr}
                    ${isLatest ? '<span style="font-size:10px; background:#d97706; color:#fff; padding:1px 6px; border-radius:10px;">最新</span>' : ''}
                </div>
                <span class="ed-time">${timeStr}</span>
            </div>

            <div class="ed-theme">
                <strong>密谈背景:</strong> ${theme}
            </div>

            ${previewTexts ? `<div class="ed-dialog-preview">${previewTexts}</div>` : ''}

            <div class="ed-card-actions">
                ${audioUrl ? `
                    <button class="ed-action-btn play ws-btn-play" title="播放多角色完整录音">
                        ${SVG.play} 播放录音
                    </button>
                ` : ''}
                <button class="ed-action-btn ws-btn-regen" title="修改参数重新生成">
                    ${SVG.refresh} 重新生成
                </button>
                <button class="ed-action-btn inject ws-btn-inject" title="将密谈内容追加到 SillyTavern 聊天消息">
                    ${SVG.inject} 注入当前聊天
                </button>
            </div>
        </div>
    `);

    // 播放/暂停
    $card.find('.ws-btn-play').on('click', function () {
        if (!audioUrl) return;
        const $btn = $(this);

        if (_currentAudioPlayer && _currentAudioPlayer.isPlaying()) {
            _currentAudioPlayer.pause();
            $btn.html(`${SVG.play} 播放录音`);
            return;
        }

        cleanupGlobalPlayer();
        _currentAudioPlayer = new AudioPlayer(audioUrl, {
            onPlay: () => $btn.html(`${SVG.pause} 暂停播放`),
            onPause: () => $btn.html(`${SVG.play} 播放录音`),
            onEnded: () => $btn.html(`${SVG.play} 播放录音`)
        });
        setGlobalPlayer(_currentAudioPlayer);
        _currentAudioPlayer.play();
    });

    // 调参重新生成
    $card.find('.ws-btn-regen').on('click', () => {
        openEavesdropModal({
            speakers: speakers,
            theme: theme,
            presetId: rec.preset_id
        });
    });

    // 注入当前聊天
    $card.find('.ws-btn-inject').on('click', async function () {
        const $btn = $(this);
        $btn.text('正在写入...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'eavesdrop',
                segments: segments,
                speakers: speakers,
                callId: rec.record_id || Date.now(),
                audioUrl: audioUrl,
                sceneDescription: theme
            });
            $btn.html(`✅ 已写入聊天`);
            setTimeout(() => $btn.html(`${SVG.inject} 注入当前聊天`), 2500);
        } catch (e) {
            console.error('[EavesdropApp] 注入聊天失败:', e);
            alert(`写入聊天失败: ${e.message}`);
            $btn.html(`${SVG.inject} 注入当前聊天`);
        }
    });

    return $card;
}

/**
 * 弹出【开启私下密谈 / 编织剧场】控制台模态框
 */
async function openEavesdropModal(defaultParams = {}) {
    $('#ed-dial-modal-overlay').remove();

    const apiHost = getApiHost();
    const enriched = WorldInfoExtractor.getEnrichedContext({ maxMessages: 12 });

    // 1. 获取已绑定 TTS 模型的 Speaker 列表
    let boundSpeakers = [];
    try {
        const dataRes = await fetch(`${apiHost}/api/get_data`).then(r => r.json());
        if (dataRes && dataRes.mappings) {
            boundSpeakers = Object.keys(dataRes.mappings);
        }
    } catch (e) {
        console.warn('[EavesdropApp] 获取 mappings 失败:', e);
    }

    if (boundSpeakers.length === 0) {
        boundSpeakers = enriched.speakers.length > 0 ? enriched.speakers : [enriched.charName];
    }

    // 2. 获取可选剧本 Presets
    let presets = [];
    try {
        const pRes = await fetch(`${apiHost}/api/presets?category=eavesdrop`).then(r => r.json());
        presets = (pRes && pRes.presets) || [];
    } catch (e) {
        console.warn('[EavesdropApp] 获取剧本预设失败:', e);
    }

    const defaultPreset = defaultParams.presetId || (presets[0] ? presets[0].id : 'standard_eavesdrop');
    const presetOptions = presets.map(p => `<option value="${p.id}" ${p.id === defaultPreset ? 'selected' : ''}>📜 ${p.name} - ${p.description || ''}</option>`).join('');

    const preSelected = defaultParams.speakers || (boundSpeakers.length >= 2 ? boundSpeakers.slice(0, 2) : boundSpeakers);
    const speakersCheckboxes = boundSpeakers.map(s => {
        const checked = preSelected.includes(s);
        return `
            <label class="ws-check-label ${checked ? 'checked' : ''}" style="display:inline-flex; align-items:center; gap:5px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); padding:5px 10px; border-radius:6px; font-size:12px; cursor:pointer; color:#d1d5db;">
                <input type="checkbox" name="ed_speakers" value="${s}" ${checked ? 'checked' : ''} style="display:none;">
                <span>🎙️ ${s}</span>
            </label>
        `;
    }).join('');

    const quickThemes = ["商议秘密行动与情报", "暗中争执与彼此试探", "讨论当前局势与隐患", "私下交流与日常吐槽"];
    const quickTagsHtml = quickThemes.map(m => `<span class="ws-quick-tag" data-val="${m}" style="background:rgba(255,255,255,0.06); border:1px solid rgba(196,155,79,0.25); color:rgba(220,200,160,0.9); padding:3px 8px; border-radius:12px; font-size:11px; cursor:pointer;">${m}</span>`).join('');

    const modalHtml = `
        <div class="ws-modal-overlay show" id="ed-dial-modal-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:100000; display:flex; align-items:center; justify-content:center;">
            <div style="background:linear-gradient(145deg, #1b1528, #110d1c); border:1px solid rgba(196,155,79,0.35); border-radius:14px; width:92%; max-width:500px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 16px 40px rgba(0,0,0,0.8); color:#fff; overflow:hidden;">
                <div style="padding:12px 16px; border-bottom:1px solid rgba(196,155,79,0.2); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25);">
                    <h3 style="margin:0; font-size:15px; font-weight:600; color:#fef08a; display:flex; align-items:center; gap:6px;">
                        ${SVG.theater} 开启私下密谈控制台
                    </h3>
                    <button style="background:none; border:none; color:#9ca3af; font-size:18px; cursor:pointer;" id="ed-dial-close-btn">✕</button>
                </div>

                <div style="padding:14px 16px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
                    <!-- 人设与世界书自动注入提示 -->
                    <div style="background:rgba(196,155,79,0.1); border:1px solid rgba(196,155,79,0.25); padding:6px 10px; border-radius:6px; font-size:11px; color:rgba(220,200,160,0.9);">
                        ${SVG.sparkles} 已自动挂载酒馆【角色人设】、【世界书阵营情报】及【前情剧情总结】。
                    </div>

                    <!-- 参与 Speakers 勾选组 -->
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <label style="font-size:12px; color:#d1d5db;">🎭 参与密谈的 Speaker (必须已绑定语音，至少2位):</label>
                        <div id="ed-speakers-checkbox-group" style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${speakersCheckboxes}
                        </div>
                    </div>

                    <!-- 剧本选择 -->
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:12px; color:#d1d5db;">📜 密谈剧本 Preset:</label>
                        <select id="ed-input-preset" style="background:rgba(0,0,0,0.4); border:1px solid rgba(196,155,79,0.25); border-radius:6px; padding:7px; color:#fff; font-size:12.5px;">
                            ${presetOptions}
                        </select>
                    </div>

                    <!-- 密谈主题 -->
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:12px; color:#d1d5db;">💬 密谈主题 / 由头 (Theme & Reason):</label>
                        <input type="text" id="ed-input-theme" value="${defaultParams.theme || '私下商讨重要事宜'}" style="background:rgba(0,0,0,0.4); border:1px solid rgba(196,155,79,0.25); border-radius:6px; padding:7px; color:#fff; font-size:12.5px;">
                        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:2px;">
                            ${quickTagsHtml}
                        </div>
                    </div>

                    <!-- 氛围张力 -->
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:12px; color:#d1d5db;">🎭 氛围张力 / 语气 (Tone, 可选):</label>
                        <input type="text" id="ed-input-tone" placeholder="如: 严肃警惕、压低耳语、剑拔弩张..." style="background:rgba(0,0,0,0.4); border:1px solid rgba(196,155,79,0.25); border-radius:6px; padding:7px; color:#fff; font-size:12.5px;">
                    </div>
                </div>

                <div style="padding:12px 16px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:flex-end; gap:8px; background:rgba(0,0,0,0.2);">
                    <button style="background:rgba(255,255,255,0.08); border:none; color:#d1d5db; padding:7px 14px; border-radius:8px; font-size:12px; cursor:pointer;" id="ed-dial-cancel-btn">取消</button>
                    <button class="ed-main-btn" id="ed-dial-submit-btn">
                        🚀 立即生成密谈
                    </button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    const closeModal = () => $('#ed-dial-modal-overlay').remove();
    $('#ed-dial-close-btn, #ed-dial-cancel-btn').on('click', closeModal);

    // 快捷标签点选
    $('#ed-dial-modal-overlay .ws-quick-tag').on('click', function () {
        $('#ed-input-theme').val($(this).data('val'));
    });

    // 勾选切换
    $('#ed-speakers-checkbox-group .ws-check-label').on('click', function (e) {
        if (e.target.tagName !== 'INPUT') {
            const $chk = $(this).find('input');
            $chk.prop('checked', !$chk.prop('checked'));
        }
        const isChecked = $(this).find('input').prop('checked');
        $(this).css({
            'background': isChecked ? 'rgba(217, 119, 6, 0.25)' : 'rgba(255,255,255,0.06)',
            'border-color': isChecked ? 'rgba(245, 158, 11, 0.6)' : 'rgba(255,255,255,0.12)',
            'color': isChecked ? '#fde047' : '#d1d5db'
        });
    });

    // 提交生成
    $('#ed-dial-submit-btn').on('click', async () => {
        const selectedSpeakers = [];
        $('#ed-speakers-checkbox-group input:checked').each(function () {
            selectedSpeakers.push($(this).val());
        });

        if (selectedSpeakers.length < 2) {
            alert('私下密谈至少需要勾选 2 位已绑定语音的 Speaker 参与交流');
            return;
        }

        const presetId = $('#ed-input-preset').val();
        const theme = $('#ed-input-theme').val().trim();
        const tone = $('#ed-input-tone').val().trim();

        closeModal();
        await generateAndLaunchEavesdrop({ speakers: selectedSpeakers, presetId, theme, tone, enriched });
    });
}

/**
 * 执行私下密谈生成全链路 (Prompt构建 -> LLM生成 -> 多角色TTS合成 -> 渲染与自动播放)
 */
async function generateAndLaunchEavesdrop({ speakers, presetId, theme, tone, enriched }) {
    const apiHost = getApiHost();

    if (!window.LLM_Client || typeof window.LLM_Client.callLLM !== 'function') {
        alert('LLM_Client 未就绪，无法调用大模型');
        return;
    }

    const $btn = $('#ed-btn-open-modal');
    $btn.prop('disabled', true).text('正在编排密谈...');

    try {
        // 1. 构建 Prompt
        const buildPayload = {
            context: enriched.context,
            speakers: speakers,
            user_name: enriched.userName,
            chat_branch: enriched.chatBranch,
            text_lang: 'zh',
            preset_id: presetId,
            theme: theme,
            call_reason: theme,
            call_tone: tone,
            character_persona: enriched.characterPersona,
            world_info: enriched.worldInfo
        };

        const buildRes = await fetch(`${apiHost}/api/eavesdrop/build_prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload)
        });

        if (!buildRes.ok) {
            const err = await buildRes.text();
            throw new Error(`构建密谈提示词失败: ${err}`);
        }
        const buildData = await buildRes.json();

        // 2. 调用 LLM
        $btn.text('大模型思考生成中...');
        const llmConfig = {
            api_url: buildData.llm_config.api_url,
            api_key: buildData.llm_config.api_key,
            model: buildData.llm_config.model,
            temperature: buildData.llm_config.temperature || 0.8,
            max_tokens: buildData.llm_config.max_tokens || 4000,
            prompt: buildData.prompt
        };

        const llmResponse = await window.LLM_Client.callLLM(llmConfig);

        // 3. 多角色 TTS 合成
        $btn.text('正在合成多角色语音...');
        const parseRes = await fetch(`${apiHost}/api/eavesdrop/parse_and_generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                llm_response: llmResponse,
                speakers: speakers,
                text_lang: 'zh'
            })
        });

        if (!parseRes.ok) {
            const err = await parseRes.text();
            throw new Error(`TTS 合成失败: ${err}`);
        }
        const parseData = await parseRes.json();

        // 组装生成结果对象
        _lastGeneratedEavesdrop = {
            record_id: `manual_${Date.now()}`,
            speakers: speakers,
            preset_id: presetId,
            scene_description: theme,
            theme: theme,
            segments: parseData.segments || [],
            audio_url: parseData.audio_url,
            created_at: new Date().toISOString()
        };

        // 重新渲染历史列表，并将最新生成的密谈高亮置顶
        await loadEavesdropHistory();

        // 自动播放生成的音频
        if (_lastGeneratedEavesdrop.audio_url) {
            cleanupGlobalPlayer();
            _currentAudioPlayer = new AudioPlayer(_lastGeneratedEavesdrop.audio_url);
            setGlobalPlayer(_currentAudioPlayer);
            _currentAudioPlayer.play();
        }

    } catch (e) {
        console.error('[EavesdropApp] 密谈生成失败:', e);
        alert(`密谈生成失败: ${e.message}`);
    } finally {
        $btn.prop('disabled', false).html(`${SVG.theater} 开启私下密谈`);
    }
}
