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
    $('#tts-cyber-modal').hide();
    $('#cyber-fullscreen-call').remove();

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
                    callerName: callData.char_name || callData.selected_speaker || callData.caller || '脑机直连',
                    target: callData.target_user || callData.target || '你',
                    callReason: callData.call_reason || callData.reason || '神经通讯',
                    callId: callData.call_id,
                    audioUrl: callData.audio_url
                });
                console.log('[CyberpunkEdgerunners] ✅ 脑机通讯已自动注入');
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
    $('#tts-cyber-modal').hide();
    $('#cyber-fullscreen-call').remove();

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
                <span class="subtitle-text">神经数据流解码中...</span>
            </div>
        </div>
        <div class="cyber-actions in-call" style="margin-top: 18px;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action inject" id="cyber-btn-inject" title="刻录此段神经通讯入脑" style="background:rgba(0, 240, 255, 0.2); border-color:#00F0FF; color:#00F0FF; width:48px; height:48px;">${STATUS_SVGS.import}</button>
                <span id="cyber-inject-label" style="font-size:10px; color:#00F0FF; font-family:monospace; font-weight:700;">INJECT</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action next" id="cyber-btn-next" title="接入下一条频段" style="background:rgba(14, 22, 36, 0.9); border-color:#FFE600; color:#FFE600; width:48px; height:48px;">${STATUS_SVGS.callOut}</button>
                <span style="font-size:10px; color:#FFE600; font-family:monospace; font-weight:700;">NEXT (${CallQueueManager.getPendingCount() - 1})</span>
            </div>
            ` : ''}
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action hangup" id="cyber-btn-hangup" title="断开神经直连" style="width:48px; height:48px;">${CYBER_ICONS.hangup}</button>
                <span style="font-size:10px; color:#FF003C; font-family:monospace; font-weight:700;">DISCONNECT</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('cyber-fullscreen-call', 'cyber-theme-neon', avatarHtml, callData.char_name || '未知神经频段', bodyHtml);
    $('body').append($content);

    // 手动铭刻入聊天
    let hasInjected = false;
    $content.find('#cyber-btn-inject').click(async function () {
        if (hasInjected) return;
        const $btn = $(this);
        const $lbl = $('#cyber-inject-label');
        $lbl.text('INJECTING...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: callData.segments || [],
                callerName: callData.char_name || callData.selected_speaker || callData.caller || '脑机直连',
                target: callData.target_user || callData.target || '你',
                callReason: callData.call_reason || callData.reason || '神经通讯',
                callId: callData.call_id,
                audioUrl: callData.audio_url
            });
            hasInjected = true;
            $btn.css({ 'border-color': '#00F0FF', 'color': '#00F0FF' });
            $lbl.text('INJECTED');
            if (window.toastr) window.toastr.success('✦ 神经通讯已成功刻录入聊天');
        } catch (error) {
            console.error('[CyberpunkEdgerunners] 注入失败:', error);
            $lbl.text('ERROR');
            if (window.toastr) window.toastr.error('刻录失败，请重试');
        }
    });

    // 挂断
    const handleHangup = () => {
        cleanupGlobalPlayer();
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
        $('#tts-cyber-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    };

    $content.find('#cyber-btn-hangup').click(handleHangup);
    $content.find('#cyber-btn-next').click(handleHangup);

    // 播放音频并驱动分段字幕
    if (callData.audio_url) {
        const player = new AudioPlayer();
        setGlobalPlayer(player);
        const $subArea = $content.find('.call-subtitle-area');

        player.on('ended', () => {
            console.log('[CyberpunkEdgerunners] 脑机通讯播毕');
        });

        player.on('error', (err) => {
            console.error('[CyberpunkEdgerunners] 音频播放错误:', err);
        });

        player.loadAndPlay(callData.audio_url, {
            segments: callData.segments,
            $subtitleArea: $subArea,
            themeType: 'modern'
        });
    }
}

export const incomingCallScene = {
    render($container, ctx) {
        const callData = window.TTS_IncomingCall;
        if (!callData) {
            $container.empty();
            const createNav = (typeof ctx === 'function') ? ctx : (ctx.createNavbar || createNavbarForApps);
            PhoneCallApp.render($container, createNav);
            return;
        }

        renderCustomCyberCall($container, callData, ctx);
    },

    cleanup() {
        $('#cyber-fullscreen-call').remove();
        cleanupGlobalPlayer();
    }
};
