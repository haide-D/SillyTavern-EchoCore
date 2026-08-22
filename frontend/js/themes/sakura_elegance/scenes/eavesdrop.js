/**
 * 平安京·落樱雅境 - 专属全屏沉浸式窃听场景 (灵视言灵)
 * 双阶段完整生命周期：阶段 1 (灵视感应/选择探查或无视) -> 阶段 2 (正式探听/播放字幕与铭刻)
 */

import { buildCallScreen, createNavbarForApps } from './shared.js';
import { SAKURA_ICONS } from '../assets.js';
import { STATUS_SVGS } from '../../theme_status_helper.js';
import { ChatInjector } from '../../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';
import { renderAvatarHtml } from '../../../mobile_apps/shared/utils.js';
import { loadExtensionSettings } from '../../../settings_ui.js';
import { CallQueueManager } from '../../../call_queue_manager.js';
import * as EavesdropApp from '../../../mobile_apps/eavesdrop_app.js';

/**
 * 阶段 1: 灵视感应确认界面
 */
function renderCustomSakuraEavesdrop(container, data, ctx) {
    container.empty();
    $('#tts-sakura-modal').hide();
    $('#sakura-fullscreen-eavesdrop').remove();

    const pendingCount = CallQueueManager.getPendingCount();
    const queueSubtitle = pendingCount > 1 
        ? `✦ 感应到密语私言 (${pendingCount} 待探) ✦` 
        : '✦ 感应到隐秘言灵 ✦';

    const speakers = data.speakers || (data.char_name ? [data.char_name] : ['隐秘式神']);
    const title = speakers.join(' ✦ ');

    // 多角色交叠薄樱光环头像
    const avatarStackHtml = speakers.length > 0
        ? `<div style="display:flex; justify-content:center; align-items:center;">
            ${speakers.map((s, idx) => `
                <div style="width:68px; height:68px; border-radius:50%; overflow:hidden; border:2px solid #F4A6B8; margin-left:${idx === 0 ? '0' : '-22px'}; z-index:${10 - idx}; box-shadow:0 4px 16px rgba(244,166,184,0.4);" title="${s}">
                    ${renderAvatarHtml(s, '', 'width:100%; height:100%; object-fit:cover;')}
                </div>
            `).join('')}
           </div>`
        : `<div class="sakura-call-avatar-placeholder">${STATUS_SVGS.sakura || SAKURA_ICONS.eavesdrop}</div>`;

    const bodyHtml = `
        <p class="sakura-call-status">${queueSubtitle}</p>
        <div class="sakura-actions">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action hangup" id="sakura-ed-btn-reject" title="收敛灵识 · 无视">${SAKURA_ICONS.hangup}</button>
                <span style="font-size:11px; color:#E8A598; letter-spacing:1px;">无视</span>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action answer" id="sakura-ed-btn-answer" title="结界灵视 · 探查">${SAKURA_ICONS.answer}</button>
                <span style="font-size:11px; color:#F5D0A9; letter-spacing:1px;">探查</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('sakura-fullscreen-eavesdrop', 'sakura-theme-pink', avatarStackHtml, title, bodyHtml);
    $('body').append($content);

    $content.find('#sakura-ed-btn-reject').click(function () {
        $content.remove();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'eavesdrop') {
                renderCustomSakuraEavesdrop(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('incoming_call');
            }
            return;
        }

        delete window.TTS_EavesdropReady;
        delete window.TTS_EavesdropData;
        $('#tts-sakura-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    });

    $content.find('#sakura-ed-btn-answer').click(async function () {
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
                console.log('[SakuraElegance] ✅ 言灵私语已自动记录');
            } catch (e) {
                console.error('[SakuraElegance] 自动注入言灵失败:', e);
            }
        }
        $content.remove();
        showCustomEavesdropUI(container, data, ctx);
    });
}

/**
 * 阶段 2: 正式灵视播放态
 */
function showCustomEavesdropUI(container, data, ctx) {
    container.empty();
    $('#tts-sakura-modal').hide();
    $('#sakura-fullscreen-eavesdrop').remove();

    const speakers = data.speakers || (data.char_name ? [data.char_name] : ['隐秘式神']);
    const title = speakers.join(' ✦ ');
    const firstSpeaker = speakers[0] || '';

    const avatarHtml = renderAvatarHtml(firstSpeaker, 'sakura-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <div class="sakura-call-wave">
            <div class="sakura-wave-bar"></div><div class="sakura-wave-bar"></div>
            <div class="sakura-wave-bar"></div><div class="sakura-wave-bar"></div>
            <div class="sakura-wave-bar"></div>
        </div>
        <div class="sakura-subtitle call-subtitle-area">
            <div class="subtitle-line">
                <span class="subtitle-speaker" style="display:none;"></span>
                <span class="subtitle-text">结界感应中...</span>
            </div>
        </div>
        <div class="sakura-actions in-call" style="margin-top: 18px;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action inject" id="sakura-btn-eavesdrop-inject" title="将此番私语铭刻入聊天" style="background:rgba(244, 166, 184, 0.2); border-color:rgba(245, 208, 169, 0.5); color:#F5D0A9; width:48px; height:48px;">${STATUS_SVGS.scroll}</button>
                <span id="sakura-eavesdrop-inject-label" style="font-size:11px; color:#F5D0A9; letter-spacing:1px;">铭刻言灵</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action next" id="sakura-btn-eavesdrop-next" title="探听下一条言灵" style="background:rgba(30, 18, 26, 0.8); border-color:rgba(245, 208, 169, 0.5); color:#E8A598; width:48px; height:48px;">${STATUS_SVGS.import}</button>
                <span style="font-size:11px; color:#E8A598; letter-spacing:1px;">下一条 (${CallQueueManager.getPendingCount() - 1})</span>
            </div>
            ` : ''}
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="sakura-btn-action hangup" id="sakura-btn-eavesdrop-stop" title="收敛灵识" style="width:48px; height:48px;">${SAKURA_ICONS.hangup}</button>
                <span style="font-size:11px; color:#E8A598; letter-spacing:1px;">收摄</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('sakura-fullscreen-eavesdrop', 'sakura-theme-pink', avatarHtml, title, bodyHtml);
    $('body').append($content);

    let hasInjected = false;
    $content.find('#sakura-btn-eavesdrop-inject').click(async function () {
        if (hasInjected) return;
        const $btn = $(this);
        const $lbl = $('#sakura-eavesdrop-inject-label');
        $lbl.text('铭刻中...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'eavesdrop',
                speakers: speakers,
                segments: data.segments || [],
                target: data.target_user || '暗中探查',
                callReason: data.call_reason || '灵视言灵',
                callId: data.call_id || Date.now(),
                audioUrl: data.audio_url
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(244, 166, 184, 0.35)', borderColor: '#F5D0A9', color: '#FFF0F5' }).html(STATUS_SVGS.check);
            $lbl.text('已铭刻').css('color', '#F5D0A9');
        } catch (e) {
            console.error('[SakuraElegance] 言灵手动注入失败:', e);
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
        $('#tts-sakura-modal').show();

        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'phone_call') {
                ctx.engine.showScene('incoming_call');
            } else {
                renderCustomSakuraEavesdrop(container, nextItem, ctx);
            }
            return;
        }

        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    };

    $content.find('#sakura-btn-eavesdrop-next').click(() => {
        if (player) player.stop();
        doCleanup();
    });

    $content.find('#sakura-btn-eavesdrop-stop').click(() => {
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
            console.error('[SakuraElegance] 言灵音频播放异常:', err);
            setTimeout(doCleanup, 1200);
        }
    });

    // 监听说话人切换，平滑刷新当前头像与式神名字
    player.on('speaker_change', ({ speaker }) => {
        if (!speaker) return;
        $content.find('.sakura-call-title').text(speaker);
        const $avatarBox = $content.find('.sakura-call-avatar-img');
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
        const data = (ctx && ctx.data && ctx.data.audio_url) ? ctx.data : (window.TTS_EavesdropReady || window.TTS_EavesdropData);
        if (data && data.audio_url) {
            renderCustomSakuraEavesdrop($container, data, ctx);
        } else {
            $('#tts-sakura-modal').show();
            EavesdropApp.render($container, createNavbarForApps);
        }
    },

    cleanup() {
        $('#sakura-fullscreen-eavesdrop').remove();
    }
};
