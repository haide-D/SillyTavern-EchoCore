import { buildCallScreen, createNavbarForApps } from './shared.js';
import { HANGUP_SVG, ANSWER_SVG, USER_SVG } from '../assets.js';
import * as PhoneCallApp from '../../../mobile_apps/phone_call_app.js';
import { ChatInjector } from '../../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';
import { renderAvatarHtml, getCharacterAvatar } from '../../../mobile_apps/shared/utils.js';
import { loadExtensionSettings } from '../../../settings_ui.js';
import { CallQueueManager } from '../../../call_queue_manager.js';

function renderCustomDeathlyHallowsCall(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const pendingCount = CallQueueManager.getPendingCount();
    const queueSubtitle = pendingCount > 1 ? `Incoming Transmission (${pendingCount} 待听)` : 'Incoming Transmission';

    const avatarHtml = renderAvatarHtml(callData.char_name, 'dh-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <p class="dh-call-status">${queueSubtitle}</p>
        <div class="dh-call-actions">
            <div class="dh-action-group">
                <button class="dh-action-btn reject" id="dh-btn-reject" title="拒绝/跳过">${HANGUP_SVG}</button>
                <span class="dh-action-label">拒绝</span>
            </div>
            <div class="dh-action-group">
                <button class="dh-action-btn answer" id="dh-btn-answer" title="接听">${ANSWER_SVG}</button>
                <span class="dh-action-label">接听</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('dh-true-fullscreen-call', 'dh-theme-gold', avatarHtml, callData.char_name || '未知', bodyHtml);
    $('body').append($content);

    $content.find('#dh-btn-reject').click(function () {
        $content.remove();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'phone_call') {
                renderCustomDeathlyHallowsCall(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('eavesdrop');
            }
            return;
        }

        delete window.TTS_IncomingCall;
        $('#tts-dh-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    });

    $content.find('#dh-btn-answer').click(async function () {
        const settings = loadExtensionSettings();
        if (settings.auto_inject_on_answer) {
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'phone_call',
                    segments: callData.segments || [],
                    callerName: callData.char_name || callData.selected_speaker || callData.caller || '神秘角色',
                    target: callData.target_user || callData.target || '你',
                    callReason: callData.call_reason || callData.reason || '主动致电',
                    callId: callData.call_id,
                    audioUrl: callData.audio_url
                });
                console.log('[DeathlyHallows] ✅ 通话已自动注入聊天');
            } catch (error) {
                console.error('[DeathlyHallows] 自动注入聊天失败:', error);
            }
        }

        $content.remove();
        showCustomInCallUI(container, callData, ctx);
    });
}

function showCustomInCallUI(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const avatarHtml = renderAvatarHtml(callData.char_name, 'dh-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <div class="dh-waveform">
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div>
        </div>
        <div class="dh-subtitle call-subtitle-area">
            <div class="subtitle-line">
                <span class="subtitle-speaker" style="display:none;"></span>
                <span class="subtitle-text">聆听中...</span>
            </div>
        </div>
        <div class="dh-call-actions">
            <div class="dh-action-group">
                <button class="dh-action-btn inject" id="dh-btn-inject" style="background:rgba(59,130,246,0.25); border-color:rgba(59,130,246,0.6); color:#93c5fd; font-size:18px;">📝</button>
                <span class="dh-action-label" id="dh-inject-label">注入聊天</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div class="dh-action-group">
                <button class="dh-action-btn next" id="dh-btn-next" style="background:rgba(16,185,129,0.25); border-color:rgba(16,185,129,0.6); color:#6ee7b7; font-size:18px;">⏭️</button>
                <span class="dh-action-label">下一条 (${CallQueueManager.getPendingCount() - 1})</span>
            </div>
            ` : ''}
            <div class="dh-action-group">
                <button class="dh-action-btn hangup" id="dh-btn-hangup">${HANGUP_SVG}</button>
                <span class="dh-action-label">挂断</span>
            </div>
        </div>
    `;
    const $content = buildCallScreen('dh-true-fullscreen-call', 'dh-theme-gold', avatarHtml, callData.char_name || '未知', bodyHtml);
    $('body').append($content);

    let hasInjected = false;
    $content.find('#dh-btn-inject').click(async function () {
        if (hasInjected) return;
        const $btn = $(this);
        const $lbl = $('#dh-inject-label');
        $lbl.text('注入中...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: callData.segments || [],
                callerName: callData.char_name || callData.selected_speaker || callData.caller || '神秘角色',
                target: callData.target_user || callData.target || '你',
                callReason: callData.call_reason || callData.reason || '主动致电',
                callId: callData.call_id,
                audioUrl: callData.audio_url
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(16,185,129,0.3)', borderColor: '#10b981', color: '#6ee7b7' }).text('✓');
            $lbl.text('已注入').css('color', '#6ee7b7');
        } catch (e) {
            console.error('[DeathlyHallows] 手动注入失败:', e);
            $lbl.text('重试注入');
        }
    });

    $content.find('#dh-btn-next').click(function () {
        console.log('[DeathlyHallows] 用户点击下一条传讯');
        player.stop();
        playNextOrEnd();
    });

    const player = new AudioPlayer({
        $container: $content,
        segments: callData.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[DeathlyHallows] 通话播放结束');
            playNextOrEnd();
        },
        onError: (err) => {
            console.error('[DeathlyHallows] 播放错误:', err);
            playNextOrEnd();
        }
    });

    setGlobalPlayer(player);

    $content.find('#dh-btn-hangup').click(function () {
        player.stop();
        endCall();
    });

    if (callData.audio_url) {
        player.play(callData.audio_url);
    } else {
        playNextOrEnd();
    }

    function playNextOrEnd() {
        $content.remove();
        cleanupGlobalPlayer();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            console.log('[DeathlyHallows] 自动切换到下一条待听传讯:', nextItem);
            if (nextItem.type === 'phone_call') {
                renderCustomDeathlyHallowsCall(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('eavesdrop');
            }
            return;
        }
        endCall();
    }

    function endCall() {
        $content.remove();
        CallQueueManager.clear();
        delete window.TTS_IncomingCall;
        cleanupGlobalPlayer();
        $('#tts-dh-modal').show();
        if (ctx && ctx.data && typeof ctx.data.onReturn === 'function') {
            ctx.data.onReturn();
        } else if (ctx && ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    }
}

export const incomingCallScene = {
    render($container, ctx) {
        // 优先获取 ctx.data 传入的指定通话数据（如重温播放），其次取全局 TTS_IncomingCall
        const callData = (ctx && ctx.data && ctx.data.audio_url) ? ctx.data : window.TTS_IncomingCall;
        if (!callData) {
            // 如果没有实时来电且非重温，直接使用具备三子列表与剧本工坊联动的主动电话 App UI
            const $appContainer = $(`<div class="dh-magic-app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:transparent; color:rgba(220, 200, 150, 0.9);"></div>`);
            PhoneCallApp.render($appContainer, createNavbarForApps);
            $container.empty().append($appContainer);
            return;
        }
        
        // 如果是重温播放 (isReplay)，直接打开死亡圣器专属金色全屏通话界面
        if (ctx && ctx.data && ctx.data.isReplay) {
            showCustomInCallUI($container, callData, ctx);
            return;
        }

        // 有实时来电时，渲染自定义死亡圣器主题待接听界面
        renderCustomDeathlyHallowsCall($container, callData, ctx);
    },
    cleanup() {
        $('#dh-true-fullscreen-call').remove();
        $('#tts-dh-modal').show();
        if (PhoneCallApp.cleanup) PhoneCallApp.cleanup();
        cleanupGlobalPlayer();
    }
};
