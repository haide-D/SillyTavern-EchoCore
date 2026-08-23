/**
 * 夜之城·边缘行者 - 专属全屏沉浸式通话场景 (脑机通讯)
 */

import { buildCallScreen, createNavbarForApps } from './shared.js';
import { CYBER_ICONS } from '../assets.js';
import { STATUS_SVGS } from '../../theme_status_helper.js';
import * as PhoneCallApp from '../../../mobile_apps/phone_call_app.js';
import { ChatInjector } from '../../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';
import { renderAvatarHtml } from '../../../mobile_apps/shared/utils.js';
import { loadExtensionSettings } from '../../../settings_ui.js';
import { CallQueueManager } from '../../../call_queue_manager.js';

function renderCustomCyberCall(container, callData, ctx) {
    container.empty();
    $('#tts-cyber-modal').stop(true, true).hide();
    $('#cyber-fullscreen-call').remove();
    $('#tts-cyber-trigger').hide();

    const pendingCount = CallQueueManager.getPendingCount();
    const queueSubtitle = pendingCount > 1 ? `[PENDING COMM: ${pendingCount} INCOMING]` : '✦ NEURO-LINK // INCOMING CALL ✦';

    const avatarHtml = renderAvatarHtml(callData.char_name, 'cyber-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <p class="cyber-call-status">${queueSubtitle}</p>
        <div class="cyber-actions">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action hangup" id="cyber-btn-reject" title="切断频段">${CYBER_ICONS.hangup}</button>
                <span style="font-size:11px; color:#FF003C; font-weight:700; letter-spacing:1px;">REJECT</span>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action answer" id="cyber-btn-answer" title="接入神经直连">${CYBER_ICONS.answer}</button>
                <span style="font-size:11px; color:#00F0FF; font-weight:700; letter-spacing:1px;">ACCEPT</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('cyber-fullscreen-call', 'cyber-theme-neon', avatarHtml, callData.char_name || '未知神经频段', bodyHtml);
    $('body').append($content);

    $content.find('#cyber-btn-reject').click(function () {
        $content.remove();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'phone_call') {
                renderCustomCyberCall(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('eavesdrop');
            }
            return;
        }

        delete window.TTS_IncomingCall;
        $('#tts-cyber-trigger').show();
        $('#tts-cyber-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    });

    $content.find('#cyber-btn-answer').click(async function () {
        const settings = loadExtensionSettings();
        if (settings.auto_inject_on_answer) {
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'phone_call',
                    segments: callData.segments || [],
                    callerName: callData.char_name || callData.selected_speaker || callData.caller || '夜之城通讯',
                    target: callData.target_user || callData.target || '你',
                    callReason: callData.call_reason || callData.reason || '神经直连来电',
                    callId: callData.call_id,
                    audioUrl: callData.audio_url
                });
                console.log('[CyberpunkEdgerunners] ✅ 神经通话已自动注入聊天');
            } catch (error) {
                console.error('[CyberpunkEdgerunners] 自动注入失败:', error);
            }
        }

        $content.remove();
        showCustomInCallUI(container, callData, ctx);
    });
}

function showCustomInCallUI(container, callData, ctx) {
    container.empty();
    $('#tts-cyber-modal').stop(true, true).hide();
    $('#cyber-fullscreen-call').remove();
    $('#tts-cyber-trigger').hide();

    const avatarHtml = renderAvatarHtml(callData.char_name, 'cyber-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <div class="cyber-call-wave">
            <div class="cyber-wave-bar"></div><div class="cyber-wave-bar"></div>
            <div class="cyber-wave-bar"></div><div class="cyber-wave-bar"></div>
            <div class="cyber-wave-bar"></div>
        </div>
        <div class="cyber-subtitle call-subtitle-area">
            <div class="subtitle-line">
                <span class="subtitle-speaker" style="display:none;"></span>
                <span class="subtitle-text">神经数据流解密中...</span>
            </div>
        </div>
        <div class="cyber-actions" style="margin-top: 24px;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action inject" id="cyber-btn-inject" title="注入本地网络" style="border-color:#38BDF8; color:#38BDF8;">💾</button>
                <span style="font-size:10px; color:#38BDF8; font-family:monospace;" id="cyber-inject-label">INJECT</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action next" id="cyber-btn-next" title="下一条频段" style="border-color:#F59E0B; color:#F59E0B;">⏭️</button>
                <span style="font-size:10px; color:#F59E0B; font-family:monospace;">NEXT</span>
            </div>
            ` : ''}
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action hangup" id="cyber-btn-hangup" title="断开连接">${CYBER_ICONS.hangup}</button>
                <span style="font-size:10px; color:#FF003C; font-family:monospace;">DISCONNECT</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('cyber-fullscreen-call', 'cyber-theme-neon', avatarHtml, callData.char_name || '未知神经频段', bodyHtml);
    $('body').append($content);

    let hasInjected = false;
    $content.find('#cyber-btn-inject').click(async function () {
        if (hasInjected) return;
        const $btn = $(this);
        const $lbl = $('#cyber-inject-label');
        $lbl.text('UPLOADING...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: callData.segments || [],
                callerName: callData.char_name || callData.selected_speaker || callData.caller || '夜之城通讯',
                target: callData.target_user || callData.target || '你',
                callReason: callData.call_reason || callData.reason || '神经直连来电',
                callId: callData.call_id,
                audioUrl: callData.audio_url
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(34, 197, 94, 0.3)', borderColor: '#22C55E', color: '#22C55E' }).text('✓');
            $lbl.text('INJECTED').css('color', '#22C55E');
        } catch (e) {
            console.error('[CyberpunkEdgerunners] 手动注入失败:', e);
            $lbl.text('RETRY');
        }
    });

    const doCleanup = () => {
        $content.remove();
        cleanupGlobalPlayer();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'phone_call') {
                renderCustomCyberCall(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('eavesdrop');
            }
            return;
        }

        CallQueueManager.clear();
        delete window.TTS_IncomingCall;
        $('#tts-cyber-trigger').show();
        $('#tts-cyber-modal').show();
        if (ctx && ctx.data && typeof ctx.data.onReturn === 'function') {
            ctx.data.onReturn();
        } else if (ctx && ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    };

    $content.find('#cyber-btn-next').click(function () {
        player.stop();
        doCleanup();
    });

    $content.find('#cyber-btn-hangup').click(function () {
        if (player) player.stop();
        doCleanup();
    });

    let player = null;
    if (callData.audio_url) {
        player = new AudioPlayer({
            $container: $content,
            segments: callData.segments || [],
            showSpeaker: false,
            onEnd: () => {
                setTimeout(doCleanup, 1000);
            },
            onError: (err) => {
                console.error('[CyberpunkEdgerunners] 音频播放错误:', err);
                setTimeout(doCleanup, 1200);
            }
        });
        setGlobalPlayer(player);
        player.play(callData.audio_url);
    } else {
        doCleanup();
    }
}

export const incomingCallScene = {
    render($container, ctx) {
        const callData = (ctx && ctx.data && (ctx.data.audio_url || ctx.data.char_name || ctx.data.caller)) 
            ? ctx.data 
            : (window.TTS_IncomingCall || CallQueueManager.getCurrent());

        if (callData) {
            renderCustomCyberCall($container, callData, ctx);
        } else {
            $('#tts-cyber-trigger').show();
            $('#tts-cyber-modal').show();
            $container.empty();
            const createNav = (typeof ctx === 'function') ? ctx : (ctx.createNavbar || createNavbarForApps);
            PhoneCallApp.render($container, createNav);
        }
    },

    cleanup() {
        $('#cyber-fullscreen-call').remove();
        cleanupGlobalPlayer();
    }
};
