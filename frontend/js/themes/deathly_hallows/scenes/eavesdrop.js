import { buildCallScreen, createNavbarForApps } from './shared.js';
import { HANGUP_SVG, ANSWER_SVG, USER_SVG } from '../assets.js';
import * as EavesdropApp from '../../../mobile_apps/eavesdrop_app.js';
import { ChatInjector } from '../../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';
import { renderAvatarHtml, getCharacterAvatar } from '../../../mobile_apps/shared/utils.js';
import { loadExtensionSettings } from '../../../settings_ui.js';
import { CallQueueManager } from '../../../call_queue_manager.js';

function renderCustomDeathlyHallowsEavesdrop(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').stop(true, true).hide();
    $('#dh-true-fullscreen-call').remove();
    $('#tts-dh-trigger').hide();

    const pendingCount = CallQueueManager.getPendingCount();
    const queueSubtitle = pendingCount > 1 ? `伸缩耳秘密探听 (${pendingCount} 待听)` : '✦ 伸缩耳秘密探听 ✦';

    const speakers = callData.speakers || [];
    const avatarStackHtml = speakers.length > 0
        ? `<div style="display:flex; justify-content:center; align-items:center;">
            ${speakers.map((s, idx) => `
                <div style="width:64px; height:64px; border-radius:50%; overflow:hidden; border:2px solid #a855f7; margin-left:${idx === 0 ? '0' : '-20px'}; z-index:${10 - idx}; box-shadow:0 4px 16px rgba(168,85,247,0.4);" title="${s}">
                    ${renderAvatarHtml(s, '', 'width:100%; height:100%; object-fit:cover;')}
                </div>
            `).join('')}
           </div>`
        : `<div class="dh-call-avatar-placeholder">${USER_SVG}</div>`;

    const bodyHtml = `
        <p class="dh-call-status">${queueSubtitle}</p>
        <div class="dh-call-actions">
            <div class="dh-action-group">
                <button class="dh-action-btn reject" id="dh-btn-reject" title="无视/跳过">${HANGUP_SVG}</button>
                <span class="dh-action-label">无视</span>
            </div>
            <div class="dh-action-group">
                <button class="dh-action-btn answer" id="dh-btn-answer" title="探知">${ANSWER_SVG}</button>
                <span class="dh-action-label">探知</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('dh-true-fullscreen-call', 'dh-theme-purple', avatarStackHtml, speakers.length ? speakers.join(' & ') : '未知目标', bodyHtml);
    $('body').append($content);

    $content.find('#dh-btn-reject').click(function () {
        $content.remove();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'eavesdrop') {
                renderCustomDeathlyHallowsEavesdrop(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('incoming_call');
            }
            return;
        }

        delete window.TTS_EavesdropReady;
        delete window.TTS_EavesdropData;
        $('#tts-dh-trigger').show();
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
                    type: 'eavesdrop',
                    speakers: callData.speakers || [],
                    segments: callData.segments || [],
                    callId: callData.record_id || Date.now(),
                    audioUrl: callData.audio_url,
                    sceneDescription: callData.scene_description
                });
                console.log('[DeathlyHallows] ✅ 密谈已自动注入聊天');
            } catch (e) {
                console.error('[DeathlyHallows] 自动注入密谈失败:', e);
            }
        }
        $content.remove();
        showCustomEavesdropUI(container, callData, ctx);
    });
}

function showCustomEavesdropUI(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').stop(true, true).hide();
    $('#dh-true-fullscreen-call').remove();
    $('#tts-dh-trigger').hide();

    const speakers = callData.speakers || [];
    const firstSpeaker = speakers[0] || '';
    const avatarHtml = `<div id="dh-eavesdrop-hero-avatar" style="width:100px; height:100px; border-radius:50%; overflow:hidden; border:2px solid rgba(168,85,247,0.6); box-shadow:0 0 24px rgba(168,85,247,0.3); transition:all 0.3s ease;">
        ${renderAvatarHtml(firstSpeaker, 'dh-current-speaker-img', 'width:100%; height:100%; object-fit:cover;')}
    </div>`;

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
                <button class="dh-action-btn inject" id="dh-ed-btn-inject" style="background:rgba(168,85,247,0.25); border-color:rgba(168,85,247,0.6); color:#d8b4fe; font-size:18px;">📝</button>
                <span class="dh-action-label" id="dh-ed-inject-label">注入聊天</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div class="dh-action-group">
                <button class="dh-action-btn next" id="dh-ed-btn-next" style="background:rgba(16,185,129,0.25); border-color:rgba(16,185,129,0.6); color:#6ee7b7; font-size:18px;">⏭️</button>
                <span class="dh-action-label">下一条 (${CallQueueManager.getPendingCount() - 1})</span>
            </div>
            ` : ''}
            <div class="dh-action-group">
                <button class="dh-action-btn hangup" id="dh-btn-hangup">${HANGUP_SVG}</button>
                <span class="dh-action-label">挂断</span>
            </div>
        </div>
    `;
    const $content = buildCallScreen('dh-true-fullscreen-call', 'dh-theme-purple', avatarHtml, firstSpeaker || (speakers.join(' & ')), bodyHtml);
    $('body').append($content);

    let hasInjected = false;
    $content.find('#dh-ed-btn-inject').click(async function () {
        if (hasInjected) return;
        const $btn = $(this);
        const $lbl = $('#dh-ed-inject-label');
        $lbl.text('注入中...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'eavesdrop',
                speakers: callData.speakers || [],
                segments: callData.segments || [],
                callId: callData.record_id || Date.now(),
                audioUrl: callData.audio_url,
                sceneDescription: callData.scene_description
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(16,185,129,0.3)', borderColor: '#10b981', color: '#6ee7b7' }).text('✓');
            $lbl.text('已注入').css('color', '#6ee7b7');
        } catch (e) {
            console.error('[DeathlyHallows] 手动注入失败:', e);
            $lbl.text('重试注入');
        }
    });

    $content.find('#dh-ed-btn-next').click(function () {
        console.log('[DeathlyHallows] 用户点击下一条密谈');
        player.stop();
        playNextOrEnd();
    });

    const player = new AudioPlayer({
        $container: $content,
        segments: callData.segments || [],
        showSpeaker: true,
        onEnd: () => {
            console.log('[DeathlyHallows] 窃听播放结束');
            playNextOrEnd();
        },
        onError: (err) => {
            console.error('[DeathlyHallows] 播放错误:', err);
            playNextOrEnd();
        }
    });

    // 监听说话人切换事件，平滑更新中心头像与大标题
    player.on('speaker_change', ({ speaker }) => {
        if (!speaker) return;
        $content.find('.dh-call-name').text(speaker);
        const $avatarBox = $content.find('#dh-eavesdrop-hero-avatar');
        $avatarBox.css('opacity', '0.3');
        setTimeout(() => {
            $avatarBox.html(renderAvatarHtml(speaker, 'dh-current-speaker-img', 'width:100%; height:100%; object-fit:cover;'));
            $avatarBox.css('opacity', '1');
        }, 150);
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
            if (nextItem.type === 'eavesdrop') {
                renderCustomDeathlyHallowsEavesdrop(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('incoming_call');
            }
            return;
        }
        endCall();
    }

    function endCall() {
        $content.remove();
        CallQueueManager.clear();
        delete window.TTS_EavesdropReady;
        delete window.TTS_EavesdropData;
        cleanupGlobalPlayer();
        $('#tts-dh-trigger').show();
        $('#tts-dh-modal').show();
        if (ctx && ctx.data && typeof ctx.data.onReturn === 'function') {
            ctx.data.onReturn();
        } else if (ctx && ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    }
}

export const eavesdropScene = {
    render($container, ctx) {
        // 优先获取 ctx.data 传入的指定密谈数据（如重温播放），其次取全局 TTS_EavesdropReady/Data 或待听队列
        const data = (ctx && ctx.data && (ctx.data.audio_url || ctx.data.speakers || ctx.data.record_id)) 
            ? ctx.data 
            : (window.TTS_EavesdropReady || window.TTS_EavesdropData || CallQueueManager.getCurrent());

        if (!data) {
            $('#tts-dh-trigger').show();
            $('#tts-dh-modal').show();
            const $appContainer = $(`<div class="dh-magic-app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:transparent; color:rgba(220, 200, 150, 0.9);"></div>`);
            EavesdropApp.render($appContainer, createNavbarForApps);
            $container.empty().append($appContainer);
            return;
        }
        
        // 如果是重温播放 (isReplay)，直接打开死亡圣器专属紫色全屏密谈界面
        if (ctx && ctx.data && ctx.data.isReplay) {
            showCustomEavesdropUI($container, data, ctx);
            return;
        }

        // 有窃听就绪状态时，渲染紫色的窃听等待界面
        renderCustomDeathlyHallowsEavesdrop($container, data, ctx);
    },
    cleanup() {
        $('#dh-true-fullscreen-call').remove();
        $('#tts-dh-trigger').show();
        $('#tts-dh-modal').show();
        if (EavesdropApp.cleanup) EavesdropApp.cleanup();
        cleanupGlobalPlayer();
    }
};
