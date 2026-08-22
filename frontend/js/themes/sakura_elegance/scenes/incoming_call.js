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
    $('#tts-sakura-modal').hide();
    $('#sakura-fullscreen-call').remove();

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
    $('#tts-sakura-modal').hide();
    $('#sakura-fullscreen-call').remove();

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
                <span class="subtitle-text">式神感应中...</span>
            </div>
        </div>
        <div class="sakura-actions in-call" style="margin-top: 18px;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action inject" id="sakura-btn-inject" title="将此番传书铭刻入聊天" style="background:rgba(244, 166, 184, 0.2); border-color:rgba(245, 208, 169, 0.5); color:#F5D0A9; width:48px; height:48px;">${STATUS_SVGS.scroll}</button>
                <span id="sakura-inject-label" style="font-size:11px; color:#F5D0A9; letter-spacing:1px;">铭刻信笺</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action next" id="sakura-btn-next" title="启阅下一封纸鹤" style="background:rgba(30, 18, 26, 0.8); border-color:rgba(245, 208, 169, 0.5); color:#E8A598; width:48px; height:48px;">${STATUS_SVGS.import}</button>
                <span style="font-size:11px; color:#E8A598; letter-spacing:1px;">下一封 (${CallQueueManager.getPendingCount() - 1})</span>
            </div>
            ` : ''}
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action hangup" id="sakura-btn-hangup" title="结束共鸣" style="width:48px; height:48px;">${SAKURA_ICONS.hangup}</button>
                <span style="font-size:11px; color:#E8A598; letter-spacing:1px;">断念</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('sakura-fullscreen-call', 'sakura-theme-pink', avatarHtml, callData.char_name || '未知式神', bodyHtml);
    $('body').append($content);

    // 手动铭刻入聊天
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
            $btn.css({ background: 'rgba(244, 166, 184, 0.35)', borderColor: '#F5D0A9', color: '#FFF0F5' }).html(STATUS_SVGS.check);
            $lbl.text('已铭刻').css('color', '#F5D0A9');
        } catch (e) {
            console.error('[SakuraElegance] 手动注入失败:', e);
            $lbl.text('重试铭刻');
        }
    });

    let player = null;
    let isCleaningUp = false;

    const doCleanup = () => {
        if (isCleaningUp) return;
        isCleaningUp = true;
        cleanupGlobalPlayer();
        $content.remove();
        delete window.TTS_IncomingCall;
        $('#tts-sakura-modal').show();

        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'phone_call') {
                renderCustomSakuraCall(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('eavesdrop');
            }
            return;
        }

        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    };

    $content.find('#sakura-btn-next').click(() => {
        if (player) player.stop();
        doCleanup();
    });

    $content.find('#sakura-btn-hangup').click(() => {
        if (player) player.stop();
        doCleanup();
    });

    // 正确实例化 AudioPlayer，传入 $container 与 segments 驱动实时字幕
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
        const callData = (ctx && ctx.data && ctx.data.audio_url) ? ctx.data : window.TTS_IncomingCall;
        if (callData && callData.audio_url) {
            renderCustomSakuraCall($container, callData, ctx);
        } else {
            $('#tts-sakura-modal').show();
            PhoneCallApp.render($container, createNavbarForApps);
        }
    },

    cleanup() {
        $('#sakura-fullscreen-call').remove();
    }
};
