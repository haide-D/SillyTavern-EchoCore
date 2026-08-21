/**
 * 主动电话 App 模块 (Phone Call App)
 * 
 * 核心功能:
 * 1. 历史来电展示与音频回放
 * 2. 现代化主动呼叫控制台 (Speaker 选择、Target 任意指定、剧本选择、事由与语气快捷标签池、参数调整)
 * 3. 即时生成结果卡片增强:
 *    - 🔊 重播音频
 *    - 🔄 修改参数重新生成
 *    - 📥 一键注入/追加到当前 SillyTavern 聊天
 */

import { ChatInjector } from '../chat_injector.js';
import { WorldInfoExtractor } from '../world_info_extractor.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from './shared/audio_player.js';
import { getApiHost, getChatBranch, formatTime } from './shared/utils.js';

export const id = 'phone_call';
export const defaultName = '主动电话';
export const defaultIcon = '📞';
export const sceneId = 'phone_call';
export const hidden = false;

// 缓存最后一次生成的结果
let _lastGeneratedCall = null;
let _currentAudioPlayer = null;

const SVG = {
    phone: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    play: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
    inject: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    sparkles: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
    dial: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
};

/**
 * 注入样式
 */
const injectCSS = () => {
    if ($('#phone-call-app-css').length) return;
    const css = `
        .pc-app-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: linear-gradient(180deg, #161224 0%, #0d0a17 100%);
            color: #e5e7eb;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            box-sizing: border-box;
        }
        .pc-header-action-bar {
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(196, 155, 79, 0.2);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-shrink: 0;
        }
        .pc-main-btn {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #fff;
            border: 1px solid rgba(16, 185, 129, 0.4);
            border-radius: 10px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
            transition: all 0.2s ease;
        }
        .pc-main-btn:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
        }
        .pc-history-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .pc-card {
            background: rgba(28, 22, 40, 0.7);
            border: 1px solid rgba(196, 155, 79, 0.2);
            border-radius: 12px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            backdrop-filter: blur(8px);
            transition: all 0.2s;
        }
        .pc-card:hover {
            border-color: rgba(196, 155, 79, 0.4);
            background: rgba(34, 27, 48, 0.85);
        }
        .pc-card.highlight {
            border-color: #10b981;
            box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
            background: linear-gradient(135deg, rgba(30, 45, 40, 0.8), rgba(20, 28, 26, 0.9));
        }
        .pc-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .pc-caller-name {
            font-size: 14px;
            font-weight: 600;
            color: #fef08a;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .pc-time {
            font-size: 11px;
            color: rgba(220, 200, 160, 0.6);
        }
        .pc-reason {
            font-size: 12px;
            color: rgba(220, 200, 160, 0.85);
            background: rgba(0, 0, 0, 0.25);
            padding: 5px 8px;
            border-radius: 6px;
            border-left: 3px solid #eab308;
        }
        .pc-dialog-preview {
            font-size: 12px;
            color: #d1d5db;
            line-height: 1.5;
            max-height: 80px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.2);
            padding: 6px 8px;
            border-radius: 6px;
        }
        .pc-card-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
            flex-wrap: wrap;
        }
        .pc-action-btn {
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
        .pc-action-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }
        .pc-action-btn.play {
            background: rgba(16, 185, 129, 0.2);
            border-color: rgba(16, 185, 129, 0.4);
            color: #6ee7b7;
        }
        .pc-action-btn.play:hover {
            background: rgba(16, 185, 129, 0.35);
        }
        .pc-action-btn.inject {
            background: rgba(234, 179, 8, 0.15);
            border-color: rgba(234, 179, 8, 0.35);
            color: #fde047;
        }
        .pc-action-btn.inject:hover {
            background: rgba(234, 179, 8, 0.3);
        }
    `;
    $('head').append(`<style id="phone-call-app-css">${css}</style>`);
};

/**
 * 渲染主动电话 App
 */
export async function render(container, createNavbar) {
    injectCSS();
    cleanupGlobalPlayer();
    container.empty();
    container.append(createNavbar("主动电话"));

    const $root = $(`
        <div class="pc-app-container">
            <!-- 顶部操作栏 -->
            <div class="pc-header-action-bar">
                <div style="font-size:12px; color:rgba(220,200,160,0.8); display:flex; align-items:center; gap:5px;">
                    ${SVG.sparkles} 沉浸式来电与语音互动
                </div>
                <button class="pc-main-btn" id="pc-btn-open-dial">
                    ${SVG.dial} 主动拨打电话
                </button>
            </div>

            <!-- 历史通话列表 -->
            <div class="pc-history-scroll" id="pc-history-list">
                <div style="text-align:center; padding:30px; color:#9ca3af;">正在加载历史通话记录...</div>
            </div>
        </div>
    `);

    container.append($root);

    // 绑定主动拨号按钮
    $root.find('#pc-btn-open-dial').on('click', () => {
        openDialModal();
    });

    // 加载历史记录
    await loadCallHistory();
}

/**
 * 加载历史来电记录
 */
async function loadCallHistory() {
    const $list = $('#pc-history-list');
    if (!$list.length) return;

    const chatBranch = getChatBranch();
    const apiHost = getApiHost();

    try {
        const url = chatBranch 
            ? `${apiHost}/api/phone_call/history?chat_branch=${encodeURIComponent(chatBranch)}&limit=40`
            : `${apiHost}/api/phone_call/history?limit=40`;
        
        const res = await fetch(url).then(r => r.json());
        const calls = (res && res.history) || [];

        renderCallList(calls);
    } catch (e) {
        console.error('[PhoneCallApp] 加载历史失败:', e);
        $list.html(`<div style="text-align:center; padding:30px; color:#ef4444;">加载失败: ${e.message}</div>`);
    }
}

/**
 * 渲染通话记录列表
 */
function renderCallList(calls) {
    const $list = $('#pc-history-list');
    if (!$list.length) return;

    $list.empty();

    // 如果有刚生成但未持久化的最新电话，置顶渲染
    if (_lastGeneratedCall) {
        const $latestCard = createCallCard(_lastGeneratedCall, true);
        $list.append($latestCard);
    }

    if (calls.length === 0 && !_lastGeneratedCall) {
        $list.html(`
            <div style="text-align:center; padding:50px 20px; color:#9ca3af;">
                <div style="font-size:32px; margin-bottom:10px;">📞</div>
                <div>暂无通话记录</div>
                <div style="font-size:11.5px; color:rgba(220,200,160,0.6); margin-top:6px;">
                    点击右上角【主动拨打电话】开启第一次通话
                </div>
            </div>
        `);
        return;
    }

    calls.forEach(call => {
        const $card = createCallCard(call, false);
        $list.append($card);
    });
}

/**
 * 创建单条通话卡片 (支持重播、重新生成与注入聊天)
 */
function createCallCard(call, isLatest = false) {
    const caller = call.selected_speaker || call.char_name || "未知角色";
    const target = call.target_user || "用户";
    const timeStr = call.created_at ? formatTime(call.created_at) : "刚刚";
    const reason = call.trigger_reason || call.call_reason || "主动问候与交流";
    const audioUrl = call.audio_url || (call.audio ? `data:audio/wav;base64,${call.audio}` : null);

    // 格式化对话片段
    let segments = call.segments || [];
    if (typeof segments === 'string') {
        try { segments = JSON.parse(segments); } catch (e) { segments = []; }
    }

    const previewTexts = segments.map(s => {
        const t = s.translation || s.text || '';
        return `<div><strong>${s.speaker || caller}:</strong> ${t}</div>`;
    }).join('');

    const $card = $(`
        <div class="pc-card ${isLatest ? 'highlight' : ''}">
            <div class="pc-card-header">
                <div class="pc-caller-name">
                    ${SVG.phone} ${caller} ➔ ${target}
                    ${isLatest ? '<span style="font-size:10px; background:#10b981; color:#fff; padding:1px 6px; border-radius:10px;">最新</span>' : ''}
                </div>
                <span class="pc-time">${timeStr}</span>
            </div>

            <div class="pc-reason">
                <strong>通话事由:</strong> ${reason}
            </div>

            ${previewTexts ? `<div class="pc-dialog-preview">${previewTexts}</div>` : ''}

            <div class="pc-card-actions">
                ${audioUrl ? `
                    <button class="pc-action-btn play ws-btn-play" title="播放完整录音">
                        ${SVG.play} 播放录音
                    </button>
                ` : ''}
                <button class="pc-action-btn ws-btn-regen" title="修改参数重新生成">
                    ${SVG.refresh} 重新生成
                </button>
                <button class="pc-action-btn inject ws-btn-inject" title="将通话记录追加到 SillyTavern 聊天消息">
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
        openDialModal({
            caller: caller,
            target: target,
            reason: reason,
            presetId: call.preset_id
        });
    });

    // 注入当前聊天
    $card.find('.ws-btn-inject').on('click', async function () {
        const $btn = $(this);
        $btn.text('正在写入...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: segments,
                speaker: caller,
                callId: call.call_id || Date.now(),
                audioUrl: audioUrl,
                callReason: reason
            });
            $btn.html(`✅ 已写入聊天`);
            setTimeout(() => $btn.html(`${SVG.inject} 注入当前聊天`), 2500);
        } catch (e) {
            console.error('[PhoneCallApp] 注入聊天失败:', e);
            alert(`写入聊天失败: ${e.message}`);
            $btn.html(`${SVG.inject} 注入当前聊天`);
        }
    });

    return $card;
}

/**
 * 弹出【主动拨打电话】控制台模态框
 */
async function openDialModal(defaultParams = {}) {
    $('#pc-dial-modal-overlay').remove();

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
        console.warn('[PhoneCallApp] 获取 mappings 失败:', e);
    }

    if (boundSpeakers.length === 0) {
        boundSpeakers = enriched.speakers.length > 0 ? enriched.speakers : [enriched.charName];
    }

    // 2. 获取可选剧本 Presets
    let presets = [];
    try {
        const pRes = await fetch(`${apiHost}/api/presets?category=phone_call`).then(r => r.json());
        presets = (pRes && pRes.presets) || [];
    } catch (e) {
        console.warn('[PhoneCallApp] 获取剧本预设失败:', e);
    }

    const defaultSpeaker = defaultParams.caller || (boundSpeakers.includes(enriched.charName) ? enriched.charName : boundSpeakers[0]);
    const callerOptions = boundSpeakers.map(s => `<option value="${s}" ${s === defaultSpeaker ? 'selected' : ''}>🎙️ 说话人: ${s}</option>`).join('');

    const defaultPreset = defaultParams.presetId || (presets[0] ? presets[0].id : 'standard_call');
    const presetOptions = presets.map(p => `<option value="${p.id}" ${p.id === defaultPreset ? 'selected' : ''}>📜 ${p.name} - ${p.description || ''}</option>`).join('');

    const quickMotivations = ["深夜想念与挂念", "突发险情与紧急求助", "日常分享与问候", "吃醋质问与试探", "秘密商量与约定", "生病探望与关心"];
    const quickTagsHtml = quickMotivations.map(m => `<span class="ws-quick-tag" data-val="${m}" style="background:rgba(255,255,255,0.06); border:1px solid rgba(196,155,79,0.25); color:rgba(220,200,160,0.9); padding:3px 8px; border-radius:12px; font-size:11px; cursor:pointer;">${m}</span>`).join('');

    const modalHtml = `
        <div class="ws-modal-overlay show" id="pc-dial-modal-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:100000; display:flex; align-items:center; justify-content:center;">
            <div style="background:linear-gradient(145deg, #1c172b, #120f1e); border:1px solid rgba(196,155,79,0.35); border-radius:14px; width:92%; max-width:500px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 16px 40px rgba(0,0,0,0.8); color:#fff; overflow:hidden;">
                <div style="padding:12px 16px; border-bottom:1px solid rgba(196,155,79,0.2); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25);">
                    <h3 style="margin:0; font-size:15px; font-weight:600; color:#fef08a; display:flex; align-items:center; gap:6px;">
                        ${SVG.dial} 主动拨打电话控制台
                    </h3>
                    <button style="background:none; border:none; color:#9ca3af; font-size:18px; cursor:pointer;" id="pc-dial-close-btn">✕</button>
                </div>

                <div style="padding:14px 16px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
                    <!-- 人设与世界书自动注入提示 -->
                    <div style="background:rgba(196,155,79,0.1); border:1px solid rgba(196,155,79,0.25); padding:6px 10px; border-radius:6px; font-size:11px; color:rgba(220,200,160,0.9);">
                        ${SVG.sparkles} 已自动挂载酒馆当前【角色人设】、【世界书】及【前情提要总结】。
                    </div>

                    <!-- 发起人与接听人 -->
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size:12px; color:#d1d5db;">📞 呼叫发起人 (Speaker):</label>
                            <select id="pc-input-caller" style="background:rgba(0,0,0,0.4); border:1px solid rgba(196,155,79,0.25); border-radius:6px; padding:7px; color:#fff; font-size:12.5px;">
                                ${callerOptions}
                            </select>
                        </div>
                        <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                            <label style="font-size:12px; color:#d1d5db;">🎯 接听对象 (可随意指定):</label>
                            <input type="text" id="pc-input-target" value="${defaultParams.target || enriched.userName}" style="background:rgba(0,0,0,0.4); border:1px solid rgba(196,155,79,0.25); border-radius:6px; padding:7px; color:#fff; font-size:12.5px;">
                        </div>
                    </div>

                    <!-- 剧本选择 -->
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:12px; color:#d1d5db;">📜 通话剧本 Preset:</label>
                        <select id="pc-input-preset" style="background:rgba(0,0,0,0.4); border:1px solid rgba(196,155,79,0.25); border-radius:6px; padding:7px; color:#fff; font-size:12.5px;">
                            ${presetOptions}
                        </select>
                    </div>

                    <!-- 通话事由 -->
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:12px; color:#d1d5db;">💬 通话事由 / 动机 (Call Reason):</label>
                        <input type="text" id="pc-input-reason" value="${defaultParams.reason || '想与你通电话聊聊近况'}" style="background:rgba(0,0,0,0.4); border:1px solid rgba(196,155,79,0.25); border-radius:6px; padding:7px; color:#fff; font-size:12.5px;">
                        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:2px;">
                            ${quickTagsHtml}
                        </div>
                    </div>

                    <!-- 语气氛围 -->
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <label style="font-size:12px; color:#d1d5db;">🎭 情绪氛围 / 语气 (Tone, 可选):</label>
                        <input type="text" id="pc-input-tone" placeholder="如: 温柔轻语、急促慌张、傲娇质问..." style="background:rgba(0,0,0,0.4); border:1px solid rgba(196,155,79,0.25); border-radius:6px; padding:7px; color:#fff; font-size:12.5px;">
                    </div>
                </div>

                <div style="padding:12px 16px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:flex-end; gap:8px; background:rgba(0,0,0,0.2);">
                    <button style="background:rgba(255,255,255,0.08); border:none; color:#d1d5db; padding:7px 14px; border-radius:8px; font-size:12px; cursor:pointer;" id="pc-dial-cancel-btn">取消</button>
                    <button class="pc-main-btn" id="pc-dial-submit-btn">
                        🚀 立即拨出电话
                    </button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    const closeModal = () => $('#pc-dial-modal-overlay').remove();
    $('#pc-dial-close-btn, #pc-dial-cancel-btn').on('click', closeModal);

    // 快捷标签点选
    $('#pc-dial-modal-overlay .ws-quick-tag').on('click', function () {
        $('#pc-input-reason').val($(this).data('val'));
    });

    // 提交拨号
    $('#pc-dial-submit-btn').on('click', async () => {
        const caller = $('#pc-input-caller').val();
        const target = $('#pc-input-target').val().trim() || enriched.userName;
        const presetId = $('#pc-input-preset').val();
        const reason = $('#pc-input-reason').val().trim();
        const tone = $('#pc-input-tone').val().trim();

        closeModal();
        await generateAndLaunchPhoneCall({ caller, target, presetId, reason, tone, enriched });
    });
}

/**
 * 执行主动电话生成全链路 (Prompt构建 -> LLM生成 -> TTS合成 -> 渲染与自动播放)
 */
async function generateAndLaunchPhoneCall({ caller, target, presetId, reason, tone, enriched }) {
    const apiHost = getApiHost();

    if (!window.LLM_Client || typeof window.LLM_Client.callLLM !== 'function') {
        alert('LLM_Client 未就绪，无法调用大模型');
        return;
    }

    const $btn = $('#pc-btn-open-dial');
    $btn.prop('disabled', true).text('正在编排电话...');

    try {
        // 1. 构建 Prompt
        const buildPayload = {
            char_name: caller,
            context: enriched.context,
            user_name: enriched.userName,
            chat_branch: enriched.chatBranch,
            preset_id: presetId,
            caller: caller,
            target: target,
            receiver: target,
            call_reason: reason,
            call_tone: tone,
            character_persona: enriched.characterPersona,
            world_info: enriched.worldInfo
        };

        const buildRes = await fetch(`${apiHost}/api/phone_call/build_prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload)
        });

        if (!buildRes.ok) {
            const err = await buildRes.text();
            throw new Error(`构建提示词失败: ${err}`);
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

        // 3. TTS 合成
        $btn.text('正在合成专属语音...');
        const parseRes = await fetch(`${apiHost}/api/phone_call/parse_and_generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                char_name: caller,
                llm_response: llmResponse,
                generate_audio: true
            })
        });

        if (!parseRes.ok) {
            const err = await parseRes.text();
            throw new Error(`TTS 合成失败: ${err}`);
        }
        const parseData = await parseRes.json();

        // 组装生成结果对象
        _lastGeneratedCall = {
            call_id: `manual_${Date.now()}`,
            char_name: caller,
            selected_speaker: caller,
            target_user: target,
            call_reason: reason,
            preset_id: presetId,
            segments: parseData.segments || [],
            audio_url: parseData.audio_url || (parseData.audio ? `data:audio/wav;base64,${parseData.audio}` : null),
            created_at: new Date().toISOString()
        };

        // 重新渲染历史列表，并将最新生成的电话高亮置顶
        await loadCallHistory();

        // 自动播放生成的音频
        if (_lastGeneratedCall.audio_url) {
            cleanupGlobalPlayer();
            _currentAudioPlayer = new AudioPlayer(_lastGeneratedCall.audio_url);
            setGlobalPlayer(_currentAudioPlayer);
            _currentAudioPlayer.play();
        }

    } catch (e) {
        console.error('[PhoneCallApp] 主动电话生成失败:', e);
        alert(`电话呼叫失败: ${e.message}`);
    } finally {
        $btn.prop('disabled', false).html(`${SVG.dial} 主动拨打电话`);
    }
}
