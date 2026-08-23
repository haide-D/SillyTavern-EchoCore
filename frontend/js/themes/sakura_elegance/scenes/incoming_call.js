/**
 * 平安京·落樱雅境 - 专属全屏沉浸式通话场景 (纸鹤传音)
 */

import { buildCallScreen, createNavbarForApps } from './shared.js';
import { SAKURA_ICONS } from '../assets.js';
import { STATUS_SVGS } from '../../theme_status_helper.js';
import * as PhoneCallApp from '../../../mobile_apps/phone_call_app.js';
import { ChatInjector } from '../../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';
import { renderAvatarHtml } from '../../../mobile_apps/shared/utils.js';
import { loadExtensionSettings } from '../../../settings_ui.js';
import { CallQueueManager } from '../../../call_queue_manager.js';

function renderCustomSakuraCall(container, callData, ctx) {
    container.empty();
    $('#tts-sakura-modal').stop(true, true).hide();
    $('#sakura-fullscreen-call').remove();
    $('#tts-sakura-trigger').hide();

    const pendingCount = CallQueueManager.getPendingCount();
    const queueSubtitle = pendingCount > 1 ? `✦ 纸鹤传音 (${pendingCount} 封待启) ✦` : '✦ 灵鸟衔枝 · 传音入密 ✦';

    const avatarHtml = renderAvatarHtml(callData.char_name, 'sakura-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <p class="sakura-call-status">${queueSubtitle}</p>
        <div class="sakura-actions">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action hangup" id="sakura-btn-reject" title="回绝纸鹤">${SAKURA_ICONS.hangup}</button>
                <span style="font-size:11px; color:#E8A598; letter-spacing:1px;">回绝</span>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action answer" id="sakura-btn-answer" title="引纳灵鸟">${SAKURA_ICONS.answer}</button>
                <span style="font-size:11px; color:#F5D0A9; letter-spacing:1px;">拆信</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('sakura-fullscreen-call', 'sakura-theme-pink', avatarHtml, callData.char_name || '未知式神', bodyHtml);
    $('body').append($content);

    $content.find('#sakura-btn-reject').click(function () {
        $content.remove();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'phone_call') {
                renderCustomSakuraCall(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('eavesdrop');
            }
            return;
        }

        delete window.TTS_IncomingCall;
        $('#tts-sakura-trigger').show();
        $('#tts-sakura-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    });

    $content.find('#sakura-btn-answer').click(async function () {
        const settings = loadExtensionSettings();
        if (settings.auto_inject_on_answer) {
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'phone_call',
                    segments: callData.segments || [],
                    callerName: callData.char_name || callData.selected_speaker || callData.caller || '式神传信',
                    target: callData.target_user || callData.target || '你',
                    callReason: callData.call_reason || callData.reason || '纸鹤传音',
                    callId: callData.call_id,
                    audioUrl: callData.audio_url
                });
                console.log('[SakuraElegance] ✅ 纸鹤传音已自动注入');
            } catch (error) {
                console.error('[SakuraElegance] 自动注入失败:', error);
            }
        }

        $content.remove();
        showCustomInCallUI(container, callData, ctx);
    });
}

function showCustomInCallUI(container, callData, ctx) {
    container.empty();
    $('#tts-sakura-modal').stop(true, true).hide();
    $('#sakura-fullscreen-call').remove();
    $('#tts-sakura-trigger').hide();

    const avatarHtml = renderAvatarHtml(callData.char_name, 'sakura-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <div class="sakura-call-wave">
            <div class="sakura-wave-bar"></div><div class="sakura-wave-bar"></div>
            <div class="sakura-wave-bar"></div><div class="sakura-wave-bar"></div>
            <div class="sakura-wave-bar"></div>
        </div>
        <div class="sakura-subtitle call-subtitle-area">
            <div class="subtitle-line">
                <span class="subtitle-speaker" style="display:none;"></span>
                <span class="subtitle-text">式神传音中...</span>
            </div>
        </div>
        <div class="sakura-actions">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action inject" id="sakura-btn-inject" title="铭刻卷轴">📜</button>
                <span style="font-size:11px; color:#F5D0A9;" id="sakura-inject-label">铭刻</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action next" id="sakura-btn-next" title="下一封">⏭️</button>
                <span style="font-size:11px; color:#F5D0A9;">下一封</span>
            </div>
            ` : ''}
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action hangup" id="sakura-btn-hangup" title="收纳纸鹤">${SAKURA_ICONS.hangup}</button>
                <span style="font-size:11px; color:#E8A598;">收纳</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('sakura-fullscreen-call', 'sakura-theme-pink', avatarHtml, callData.char_name || '未知式神', bodyHtml);
    $('body').append($content);

    let hasInjected = false;
    $content.find('#sakura-btn-inject').click(async function () {
        if (hasInjected) return;
        const $btn = $(this);
        const $lbl = $('#sakura-inject-label');
        $lbl.text('铭刻中...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: callData.segments || [],
                callerName: callData.char_name || callData.selected_speaker || callData.caller || '式神传信',
                target: callData.target_user || callData.target || '你',
                callReason: callData.call_reason || callData.reason || '纸鹤传音',
                callId: callData.call_id,
                audioUrl: callData.audio_url
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(34, 197, 94, 0.3)', borderColor: '#22c55e', color: '#86efac' }).text('✓');
            $lbl.text('已铭刻').css('color', '#86efac');
        } catch (e) {
            console.error('[SakuraElegance] 手动铭刻失败:', e);
            $lbl.text('重试铭刻');
        }
    });

    $content.find('#sakura-btn-next').click(function () {
        player.stop();
        doCleanup();
    });

    let player = null;

    const doCleanup = () => {
        $content.remove();
        cleanupGlobalPlayer();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'phone_call') {
                renderCustomSakuraCall(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('eavesdrop');
            }
            return;
        }

        CallQueueManager.clear();
        delete window.TTS_IncomingCall;
        $('#tts-sakura-trigger').show();
        $('#tts-sakura-modal').show();
        if (ctx && ctx.data && typeof ctx.data.onReturn === 'function') {
            ctx.data.onReturn();
        } else if (ctx && ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    };

    $content.find('#sakura-btn-hangup').click(function () {
        if (player) player.stop();
        doCleanup();
    });

    player = new AudioPlayer({
        $container: $content,
        segments: callData.segments || [],
        showSpeaker: false,
        onEnd: () => {
            setTimeout(doCleanup, 1200);
        },
        onError: (err) => {
            console.error('[SakuraElegance] 音频播放异常:', err);
            setTimeout(doCleanup, 1500);
        }
    });

    setGlobalPlayer(player);

    if (callData.audio_url) {
        player.play(callData.audio_url);
    } else {
        doCleanup();
    }
}

export const incomingCallScene = {
    render($container, ctx) {
        const callData = (ctx && ctx.data && (ctx.data.audio_url || ctx.data.char_name)) 
            ? ctx.data 
            : (window.TTS_IncomingCall || CallQueueManager.getCurrent());

        if (callData) {
            renderCustomSakuraCall($container, callData, ctx);
        } else {
            $('#tts-sakura-trigger').show();
            $('#tts-sakura-modal').show();
            PhoneCallApp.render($container, createNavbarForApps);
        }
    },

    cleanup() {
        $('#sakura-fullscreen-call').remove();
    }
};
