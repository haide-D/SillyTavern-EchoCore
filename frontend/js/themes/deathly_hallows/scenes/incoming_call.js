import { buildCallScreen, createNavbarForApps } from './shared.js';
import { HANGUP_SVG, ANSWER_SVG, USER_SVG } from '../assets.js';
import * as PhoneCallApp from '../../../mobile_apps/phone_call_app.js';
import { ChatInjector } from '../../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';

function renderCustomDeathlyHallowsCall(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const avatarHtml = callData.avatar_url 
        ? `<img src="${callData.avatar_url}" alt="${callData.char_name}">` 
        : `<div class="dh-call-avatar-placeholder">${USER_SVG}</div>`;

    const bodyHtml = `
        <p class="dh-call-status">Incoming Transmission</p>
        <div class="dh-call-actions">
            <div class="dh-action-group">
                <button class="dh-action-btn reject" id="dh-btn-reject">${HANGUP_SVG}</button>
                <span class="dh-action-label">拒绝</span>
            </div>
            <div class="dh-action-group">
                <button class="dh-action-btn answer" id="dh-btn-answer">${ANSWER_SVG}</button>
                <span class="dh-action-label">接听</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('dh-true-fullscreen-call', 'dh-theme-gold', avatarHtml, callData.char_name || '未知', bodyHtml);
    $('body').append($content);

    $content.find('#dh-btn-reject').click(function () {
        $content.remove();
        delete window.TTS_IncomingCall;
        $('#tts-dh-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    });

    $content.find('#dh-btn-answer').click(async function () {
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: callData.segments || [],
                callerName: callData.char_name,
                callId: callData.call_id,
                audioUrl: callData.audio_url
            });
        } catch (error) {
            console.error('[DeathlyHallows] 注入聊天失败:', error);
        }
        $content.remove();
        showCustomInCallUI(container, callData, ctx);
    });
}

function showCustomInCallUI(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const avatarHtml = callData.avatar_url 
        ? `<img src="${callData.avatar_url}" alt="${callData.char_name}">` 
        : `<div class="dh-call-avatar-placeholder">${USER_SVG}</div>`;

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
                <button class="dh-action-btn hangup" id="dh-btn-hangup">${HANGUP_SVG}</button>
                <span class="dh-action-label">挂断</span>
            </div>
        </div>
    `;
    const $content = buildCallScreen('dh-true-fullscreen-call', 'dh-theme-gold', avatarHtml, callData.char_name || '未知', bodyHtml);
    $('body').append($content);

    const player = new AudioPlayer({
        $container: $content,
        segments: callData.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[DeathlyHallows] 通话结束');
            endCall();
        },
        onError: (err) => {
            console.error('[DeathlyHallows] 播放错误:', err);
            endCall();
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
        endCall();
    }

    function endCall() {
        $content.remove();
        delete window.TTS_IncomingCall;
        cleanupGlobalPlayer();
        $('#tts-dh-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    }
}

export const incomingCallScene = {
    render($container, ctx) {
        const callData = window.TTS_IncomingCall;
        if (!callData) {
            // 如果没有实时来电，直接使用具备三子列表与剧本工坊联动的主动电话 App UI
            const $appContainer = $(`<div class="dh-magic-app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:transparent; color:rgba(220, 200, 150, 0.9);"></div>`);
            PhoneCallApp.render($appContainer, createNavbarForApps);
            $container.empty().append($appContainer);
            return;
        }
        
        // 有来电时，渲染自定义死亡圣器主题界面
        renderCustomDeathlyHallowsCall($container, callData, ctx);
    },
    cleanup() {
        $('#dh-true-fullscreen-call').remove();
        $('#tts-dh-modal').show();
        if (PhoneCallApp.cleanup) PhoneCallApp.cleanup();
        cleanupGlobalPlayer();
    }
};
