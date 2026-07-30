import { buildCallScreen, createNavbarForApps } from './shared.js';
import { HANGUP_SVG, ANSWER_SVG, USER_SVG } from '../assets.js';
import * as EavesdropApp from '../../../mobile_apps/eavesdrop_app.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';

function renderCustomDeathlyHallowsEavesdrop(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const avatarHtml = callData.avatar_url 
        ? `<img src="${callData.avatar_url}" alt="${callData.speakers.join(', ')}">` 
        : `<div class="dh-call-avatar-placeholder">${USER_SVG}</div>`;

    const bodyHtml = `
        <p class="dh-call-status">Whispers Detected</p>
        <div class="dh-call-actions">
            <div class="dh-action-group">
                <button class="dh-action-btn reject" id="dh-btn-reject">${HANGUP_SVG}</button>
                <span class="dh-action-label">无视</span>
            </div>
            <div class="dh-action-group">
                <button class="dh-action-btn answer" id="dh-btn-answer">${ANSWER_SVG}</button>
                <span class="dh-action-label">探知</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('dh-true-fullscreen-call', 'dh-theme-purple', avatarHtml, callData.speakers ? callData.speakers.join(' & ') : '未知目标', bodyHtml);
    $('body').append($content);

    $content.find('#dh-btn-reject').click(function () {
        $content.remove();
        delete window.TTS_EavesdropReady;
        $('#tts-mobile-trigger').removeClass('whisper-sensing');
        $('#tts-dh-modal').show();
        if (ctx.engine) ctx.engine.showScene('home');
    });

    $content.find('#dh-btn-answer').click(function () {
        $content.remove();
        showCustomEavesdropUI(container, callData, ctx);
    });
}

function showCustomEavesdropUI(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const avatarHtml = callData.avatar_url 
        ? `<img src="${callData.avatar_url}" alt="${callData.speakers.join(', ')}">` 
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
    const $content = buildCallScreen('dh-true-fullscreen-call', 'dh-theme-purple', avatarHtml, callData.speakers ? callData.speakers.join(' & ') : '未知目标', bodyHtml);
    $('body').append($content);

    const player = new AudioPlayer({
        $container: $content,
        segments: callData.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[DeathlyHallows] 窃听结束');
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
        delete window.TTS_EavesdropReady;
        cleanupGlobalPlayer();
        $('#tts-dh-modal').show();
        if (ctx.engine) ctx.engine.showScene('home');
    }
}

export const eavesdropScene = {
    render($container, ctx) {
        const data = window.TTS_EavesdropReady;
        if (!data) {
            const $appContainer = $(`<div class="dh-magic-app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:transparent; color:rgba(220, 200, 150, 0.9);"></div>`);
            EavesdropApp.render($appContainer, createNavbarForApps);
            $container.empty().append($appContainer);
            return;
        }
        
        // 有窃听就绪状态时，渲染紫色的窃听等待界面
        renderCustomDeathlyHallowsEavesdrop($container, data, ctx);
    },
    cleanup() {
        if (EavesdropApp.cleanup) EavesdropApp.cleanup();
        cleanupGlobalPlayer();
    }
};
