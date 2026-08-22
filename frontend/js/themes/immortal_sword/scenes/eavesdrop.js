/**
 * 仙途凌霄 - 专属全屏沉浸式窃听场景 (神识探查)
 * 双阶段完整生命周期：阶段 1 (神识感应/选择探查或无视) -> 阶段 2 (正式探听/播放字幕与铭刻)
 */

import { buildCallScreen, createNavbarForApps } from './shared.js';
import { HANGUP_SVG, PLAY_SVG, ANSWER_SVG } from '../assets.js';
import { STATUS_SVGS } from '../../theme_status_helper.js';
import { ChatInjector } from '../../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';
import { renderAvatarHtml } from '../../../mobile_apps/shared/utils.js';
import { loadExtensionSettings } from '../../../settings_ui.js';
import { CallQueueManager } from '../../../call_queue_manager.js';
import * as EavesdropApp from '../../../mobile_apps/eavesdrop_app.js';

/**
 * 阶段 1: 神识感应确认界面 (带「无视」与「探查」按键)
 */
function renderCustomImmortalEavesdrop(container, data, ctx) {
    container.empty();
    $('#tts-immortal-modal').hide();
    $('#immortal-fullscreen-eavesdrop').remove();

    const pendingCount = CallQueueManager.getPendingCount();
    const queueSubtitle = pendingCount > 1 
        ? `✦ 感应到隐秘道音 (${pendingCount} 待探) ✦` 
        : '✦ 感应到隐秘道音 ✦';

    const speakers = data.speakers || (data.char_name ? [data.char_name] : ['隐秘仙友']);
    const title = speakers.join(' ✦ ');

    // 多角色交叠青玉光环头像
    const avatarStackHtml = speakers.length > 0
        ? `<div style="display:flex; justify-content:center; align-items:center;">
            ${speakers.map((s, idx) => `
                <div style="width:68px; height:68px; border-radius:50%; overflow:hidden; border:2px solid #34d399; margin-left:${idx === 0 ? '0' : '-22px'}; z-index:${10 - idx}; box-shadow:0 4px 16px rgba(16,185,129,0.4);" title="${s}">
                    ${renderAvatarHtml(s, '', 'width:100%; height:100%; object-fit:cover;')}
                </div>
            `).join('')}
           </div>`
        : `<div class="immortal-call-avatar-placeholder">${STATUS_SVGS.bagua}</div>`;

    const bodyHtml = `
        <p class="immortal-call-status">${queueSubtitle}</p>
        <div class="immortal-call-actions">
            <div class="immortal-action-group">
                <button class="immortal-action-btn reject" id="immortal-ed-btn-reject" title="收敛神识 · 无视">${HANGUP_SVG}</button>
                <span class="immortal-action-label">无视</span>
            </div>
            <div class="immortal-action-group">
                <button class="immortal-action-btn answer" id="immortal-ed-btn-answer" title="展开神识 · 探查">${ANSWER_SVG}</button>
                <span class="immortal-action-label">探查</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('immortal-fullscreen-eavesdrop', 'immortal-theme-jade', avatarStackHtml, title, bodyHtml);
    $('body').append($content);

    // 绑定「无视 / 拒绝」按钮
    $content.find('#immortal-ed-btn-reject').click(function () {
        $content.remove();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'eavesdrop') {
                renderCustomImmortalEavesdrop(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('incoming_call');
            }
            return;
        }

        delete window.TTS_EavesdropReady;
        delete window.TTS_EavesdropData;
        $('#tts-immortal-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    });

    // 绑定「探查 / 接听」按钮 -> 进入阶段 2 播放与字幕态
    $content.find('#immortal-ed-btn-answer').click(async function () {
        const settings = loadExtensionSettings();
        if (settings.auto_inject_on_answer) {
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'eavesdrop',
                    speakers: data.speakers || [],
                    segments: data.segments || [],
                    callId: data.record_id || Date.now(),
                    audioUrl: data.audio_url,
                    sceneDescription: data.scene_description
                });
                console.log('[ImmortalSword] ✅ 神识私语已自动注入仙卷');
            } catch (e) {
                console.error('[ImmortalSword] 自动注入神识失败:', e);
            }
        }
        $content.remove();
        showActiveImmortalEavesdropUI(container, data, ctx);
    });
}

/**
 * 阶段 2: 正式探听播放界面 (带波形、实时字幕、铭刻仙卷与收神按键)
 */
function showActiveImmortalEavesdropUI(container, data, ctx) {
    container.empty();
    $('#tts-immortal-modal').hide();
    $('#immortal-fullscreen-eavesdrop').remove();

    const speakers = data.speakers || (data.char_name ? [data.char_name] : ['隐秘仙友']);
    const title = speakers.join(' ✦ ');
    const firstSpeaker = speakers[0] || '';

    const avatarHtml = renderAvatarHtml(firstSpeaker, 'immortal-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <div class="immortal-waveform">
            <div class="immortal-waveform-bar"></div><div class="immortal-waveform-bar"></div>
            <div class="immortal-waveform-bar"></div><div class="immortal-waveform-bar"></div>
            <div class="immortal-waveform-bar"></div><div class="immortal-waveform-bar"></div>
            <div class="immortal-waveform-bar"></div>
        </div>
        <div class="immortal-subtitle call-subtitle-area">
            <div class="subtitle-line">
                <span class="subtitle-speaker" style="display:none;"></span>
                <span class="subtitle-text">神识探听中...</span>
            </div>
        </div>
        <div class="immortal-call-actions in-call">
            <div class="immortal-action-group">
                <button class="immortal-action-btn inject" id="immortal-btn-eavesdrop-inject" title="将此番神识私语铭刻入酒馆聊天" style="background:rgba(92, 141, 137, 0.18); border:0.8px solid rgba(140, 181, 174, 0.35); color:#8cb5ae; font-size:15px;">${STATUS_SVGS.scroll}</button>
                <span class="immortal-action-label" id="immortal-eavesdrop-inject-label">铭刻仙卷</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div class="immortal-action-group">
                <button class="immortal-action-btn next" id="immortal-btn-eavesdrop-next" title="探听下一条神识" style="background:rgba(18, 24, 29, 0.8); border:0.8px solid rgba(194, 166, 117, 0.35); color:#c2a675; font-size:15px;">${STATUS_SVGS.import}</button>
                <span class="immortal-action-label">下一条 (${CallQueueManager.getPendingCount() - 1})</span>
            </div>
            ` : ''}
            <div class="immortal-action-group">
                <button class="immortal-action-btn hangup" id="immortal-btn-eavesdrop-stop" title="收敛神识">${HANGUP_SVG}</button>
                <span class="immortal-action-label">收神</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('immortal-fullscreen-eavesdrop', 'immortal-theme-jade', avatarHtml, title, bodyHtml);
    $('body').append($content);

    let hasInjected = false;
    $content.find('#immortal-btn-eavesdrop-inject').click(async function () {
        if (hasInjected) return;
        const $btn = $(this);
        const $lbl = $('#immortal-eavesdrop-inject-label');
        $lbl.text('铭刻中...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'eavesdrop',
                speakers: speakers,
                segments: data.segments || [],
                target: data.target_user || '暗中探查',
                callReason: data.call_reason || '神识探查',
                callId: data.call_id || Date.now(),
                audioUrl: data.audio_url
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(92, 141, 137, 0.3)', borderColor: '#c2a675', color: '#f1f5f9' }).html(STATUS_SVGS.check);
            $lbl.text('已铭刻').css('color', '#c2a675');
        } catch (e) {
            console.error('[ImmortalSword] 神识手动注入失败:', e);
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
        delete window.TTS_EavesdropData;
        delete window.TTS_EavesdropReady;
        $('#tts-immortal-modal').show();

        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'phone_call') {
                ctx.engine.showScene('incoming_call');
            } else {
                renderCustomImmortalEavesdrop(container, nextItem, ctx);
            }
            return;
        }

        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    };

    $content.find('#immortal-btn-eavesdrop-next').click(() => {
        if (player) player.stop();
        doCleanup();
    });

    $content.find('#immortal-btn-eavesdrop-stop').click(() => {
        if (player) player.stop();
        doCleanup();
    });

    // 正确实例化 AudioPlayer，传入 $container 与 segments
    player = new AudioPlayer({
        $container: $content,
        segments: data.segments || [],
        showSpeaker: true,
        onEnd: () => {
            setTimeout(doCleanup, 1000);
        },
        onError: (err) => {
            console.error('[ImmortalSword] 神识音频播放异常:', err);
            setTimeout(doCleanup, 1200);
        }
    });

    // 监听说话人切换，平滑刷新当前法相与道友名号
    player.on('speaker_change', ({ speaker }) => {
        if (!speaker) return;
        $content.find('.immortal-call-title').text(speaker);
        const $avatarBox = $content.find('.immortal-call-avatar-img');
        if ($avatarBox.length) {
            $avatarBox.css({ transition: 'opacity 0.15s ease, transform 0.15s ease', opacity: '0.3', transform: 'scale(0.92)' });
            setTimeout(() => {
                $avatarBox.html(renderAvatarHtml(speaker, '', 'width:100%; height:100%; object-fit:cover; border-radius:50%;'));
                $avatarBox.css({ opacity: '1', transform: 'scale(1)' });
            }, 150);
        }
    });

    setGlobalPlayer(player);

    if (data.audio_url) {
        player.play(data.audio_url);
    } else {
        doCleanup();
    }
}

export const eavesdropScene = {
    render($container, ctx) {
        const eavesdropData = (ctx && ctx.data && ctx.data.audio_url) 
            ? ctx.data 
            : (window.TTS_EavesdropData || window.TTS_EavesdropReady);

        if (eavesdropData && eavesdropData.audio_url) {
            // 路径 1: 全屏沉浸式神识探查 (双阶段完整流转)
            renderCustomImmortalEavesdrop($container, eavesdropData, ctx);
        } else {
            // 路径 2: 模态框内浏览神识历史记录
            $('#tts-immortal-modal').show();
            EavesdropApp.render($container, createNavbarForApps);
        }
    },
    cleanup() {
        $('#immortal-fullscreen-eavesdrop').remove();
        cleanupGlobalPlayer();
        if (EavesdropApp.cleanup) EavesdropApp.cleanup();
    }
};
