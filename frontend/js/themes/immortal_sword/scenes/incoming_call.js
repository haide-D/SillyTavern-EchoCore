/**
 * 仙途凌霄 - 专属全屏沉浸式通话场景 (飞剑传书)
 */

import { buildCallScreen, createNavbarForApps } from './shared.js';
import { HANGUP_SVG, ANSWER_SVG } from '../assets.js';
import { STATUS_SVGS } from '../../theme_status_helper.js';
import * as PhoneCallApp from '../../../mobile_apps/phone_call_app.js';
import { ChatInjector } from '../../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';
import { renderAvatarHtml } from '../../../mobile_apps/shared/utils.js';
import { loadExtensionSettings } from '../../../settings_ui.js';
import { CallQueueManager } from '../../../call_queue_manager.js';

function renderCustomImmortalCall(container, callData, ctx) {
    container.empty();
    $('#tts-immortal-modal').stop(true, true).hide();
    $('#immortal-fullscreen-call').remove();
    $('#tts-immortal-trigger').hide();

    const pendingCount = CallQueueManager.getPendingCount();
    const queueSubtitle = pendingCount > 1 ? `✦ 飞剑传书 (${pendingCount} 封待启) ✦` : '✦ 飞剑破空 · 万里传音 ✦';

    const avatarHtml = renderAvatarHtml(callData.char_name, 'immortal-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <p class="immortal-call-status">${queueSubtitle}</p>
        <div class="immortal-call-actions">
            <div class="immortal-action-group">
                <button class="immortal-action-btn reject" id="immortal-btn-reject" title="切断剑意/拒接">${HANGUP_SVG}</button>
                <span class="immortal-action-label">拒收</span>
            </div>
            <div class="immortal-action-group">
                <button class="immortal-action-btn answer" id="immortal-btn-answer" title="引纳剑意/接听">${ANSWER_SVG}</button>
                <span class="immortal-action-label">纳书</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('immortal-fullscreen-call', 'immortal-theme-jade', avatarHtml, callData.char_name || '未知仙友', bodyHtml);
    $('body').append($content);

    $content.find('#immortal-btn-reject').click(function () {
        $content.remove();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'phone_call') {
                renderCustomImmortalCall(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('eavesdrop');
            }
            return;
        }

        delete window.TTS_IncomingCall;
        $('#tts-immortal-trigger').show();
        $('#tts-immortal-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    });

    $content.find('#immortal-btn-answer').click(async function () {
        const settings = loadExtensionSettings();
        if (settings.auto_inject_on_answer) {
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'phone_call',
                    segments: callData.segments || [],
                    callerName: callData.char_name || callData.selected_speaker || callData.caller || '道友传音',
                    target: callData.target_user || callData.target || '你',
                    callReason: callData.call_reason || callData.reason || '万里飞剑传书',
                    callId: callData.call_id,
                    audioUrl: callData.audio_url
                });
                console.log('[ImmortalSword] ✅ 飞剑传书已自动注入聊天');
            } catch (error) {
                console.error('[ImmortalSword] 自动注入聊天失败:', error);
            }
        }

        $content.remove();
        showCustomInCallUI(container, callData, ctx);
    });
}

function showCustomInCallUI(container, callData, ctx) {
    container.empty();
    $('#tts-immortal-modal').stop(true, true).hide();
    $('#immortal-fullscreen-call').remove();
    $('#tts-immortal-trigger').hide();

    const avatarHtml = renderAvatarHtml(callData.char_name, 'immortal-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <div class="immortal-call-wave">
            <div class="immortal-wave-bar"></div><div class="immortal-wave-bar"></div>
            <div class="immortal-wave-bar"></div><div class="immortal-wave-bar"></div>
            <div class="immortal-wave-bar"></div>
        </div>
        <div class="immortal-subtitle call-subtitle-area">
            <div class="subtitle-line">
                <span class="subtitle-speaker" style="display:none;"></span>
                <span class="subtitle-text">神识共鸣中...</span>
            </div>
        </div>
        <div class="immortal-call-actions in-call" style="margin-top: 18px;">
            <div class="immortal-action-group">
                <button class="immortal-action-btn inject" id="immortal-btn-inject" title="祭炼铭刻入聊天" style="background:rgba(52, 211, 153, 0.2); border-color:rgba(110, 231, 183, 0.6); color:#a7f3d0; width:48px; height:48px;">📜</button>
                <span id="immortal-inject-label" class="immortal-action-label" style="color:#a7f3d0;">铭刻</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div class="immortal-action-group">
                <button class="immortal-action-btn next" id="immortal-btn-next" title="下一封飞剑传书" style="background:rgba(20, 28, 36, 0.8); border-color:rgba(52, 211, 153, 0.5); color:#6ee7b7; width:48px; height:48px;">⏭️</button>
                <span class="immortal-action-label">下一封</span>
            </div>
            ` : ''}
            <div class="immortal-action-group">
                <button class="immortal-action-btn hangup" id="immortal-btn-hangup" title="收纳本命灵剑" style="width:48px; height:48px;">${HANGUP_SVG}</button>
                <span class="immortal-action-label">收剑</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('immortal-fullscreen-call', 'immortal-theme-jade', avatarHtml, callData.char_name || '未知仙友', bodyHtml);
    $('body').append($content);

    let hasInjected = false;
    $content.find('#immortal-btn-inject').click(async function () {
        if (hasInjected) return;
        const $btn = $(this);
        const $lbl = $('#immortal-inject-label');
        $lbl.text('祭炼中...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: callData.segments || [],
                callerName: callData.char_name || callData.selected_speaker || callData.caller || '道友传音',
                target: callData.target_user || callData.target || '你',
                callReason: callData.call_reason || callData.reason || '万里飞剑传书',
                callId: callData.call_id,
                audioUrl: callData.audio_url
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(52, 211, 153, 0.4)', borderColor: '#34d399', color: '#ecfdf5' }).text('✓');
            $lbl.text('已铭刻').css('color', '#34d399');
        } catch (e) {
            console.error('[ImmortalSword] 手动注入聊天失败:', e);
            $lbl.text('重试铭刻');
        }
    });

    $content.find('#immortal-btn-next').click(function () {
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
                renderCustomImmortalCall(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('eavesdrop');
            }
            return;
        }

        CallQueueManager.clear();
        delete window.TTS_IncomingCall;
        $('#tts-immortal-trigger').show();
        $('#tts-immortal-modal').show();
        if (ctx && ctx.data && typeof ctx.data.onReturn === 'function') {
            ctx.data.onReturn();
        } else if (ctx && ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    };

    $content.find('#immortal-btn-hangup').click(function () {
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
            console.error('[ImmortalSword] 音频播放异常:', err);
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
            renderCustomImmortalCall($container, callData, ctx);
        } else {
            $('#tts-immortal-trigger').show();
            $('#tts-immortal-modal').show();
            PhoneCallApp.render($container, createNavbarForApps);
        }
    },
    cleanup() {
        $('#immortal-fullscreen-call').remove();
        $('#tts-immortal-trigger').show();
        $('#tts-immortal-modal').show();
        cleanupGlobalPlayer();
        if (PhoneCallApp.cleanup) PhoneCallApp.cleanup();
    }
};
