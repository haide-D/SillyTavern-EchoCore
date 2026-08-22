/**
 * 夜之城·边缘行者 - 专属全屏沉浸式窃听场景 (深网潜行)
 * 双阶段完整生命周期：阶段 1 (频段截获/选择破冰或无视) -> 阶段 2 (正式探听/播放字幕与刻录)
 */

import { buildCallScreen, createNavbarForApps } from './shared.js';
import { CYBER_ICONS } from '../assets.js';
import { STATUS_SVGS } from '../../theme_status_helper.js';
import { ChatInjector } from '../../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';
import { renderAvatarHtml } from '../../../mobile_apps/shared/utils.js';
import { loadExtensionSettings } from '../../../settings_ui.js';
import { CallQueueManager } from '../../../call_queue_manager.js';
import * as EavesdropApp from '../../../mobile_apps/eavesdrop_app.js';

/**
 * 阶段 1: 深网频段截获确认界面
 */
function renderCustomCyberEavesdrop(container, data, ctx) {
    container.empty();
    $('#tts-cyber-modal').hide();
    $('#cyber-fullscreen-eavesdrop').remove();

    const pendingCount = CallQueueManager.getPendingCount();
    const queueSubtitle = pendingCount > 1 
        ? `[ICE-BREAKER: ${pendingCount} TARGETS DETECTED]` 
        : '✦ DEEP-NET // INTERCEPTED FREQUENCY ✦';

    const speakers = data.speakers || (data.char_name ? [data.char_name] : ['未知神经频段']);
    const title = speakers.join(' // ');

    // 多角色交叠赛博霓虹光环头像
    const avatarStackHtml = speakers.length > 0
        ? `<div style="display:flex; justify-content:center; align-items:center;">
            ${speakers.map((s, idx) => `
                <div style="width:68px; height:68px; border-radius:50%; overflow:hidden; border:2px solid #00F0FF; margin-left:${idx === 0 ? '0' : '-22px'}; z-index:${10 - idx}; box-shadow:0 0 16px rgba(0,240,255,0.6);" title="${s}">
                    ${renderAvatarHtml(s, '', 'width:100%; height:100%; object-fit:cover;')}
                </div>
            `).join('')}
           </div>`
        : `<div class="cyber-call-avatar-placeholder">${STATUS_SVGS.ear || CYBER_ICONS.eavesdrop}</div>`;

    const bodyHtml = `
        <p class="cyber-call-status">${queueSubtitle}</p>
        <div class="cyber-actions">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action hangup" id="cyber-ed-btn-reject" title="切断深网链路 · 无视">${CYBER_ICONS.hangup}</button>
                <span style="font-size:11px; color:#FF003C; font-family:monospace; font-weight:700; letter-spacing:1px;">IGNORE</span>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action answer" id="cyber-ed-btn-answer" title="注入 ICE 破冰协议 · 探听">${CYBER_ICONS.answer}</button>
                <span style="font-size:11px; color:#00F0FF; font-family:monospace; font-weight:700; letter-spacing:1px;">BREACH</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('cyber-fullscreen-eavesdrop', 'cyber-theme-neon', avatarStackHtml, title, bodyHtml);
    $('body').append($content);

    $content.find('#cyber-ed-btn-reject').click(function () {
        $content.remove();
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'eavesdrop') {
                renderCustomCyberEavesdrop(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('incoming_call');
            }
            return;
        }

        delete window.TTS_EavesdropReady;
        delete window.TTS_EavesdropData;
        $('#tts-cyber-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    });

    $content.find('#cyber-ed-btn-answer').click(async function () {
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
                console.log('[CyberpunkEdgerunners] ✅ 深网窃听已自动记录');
            } catch (e) {
                console.error('[CyberpunkEdgerunners] 自动注入窃听失败:', e);
            }
        }
        $content.remove();
        showCustomEavesdropUI(container, data, ctx);
    });
}

/**
 * 阶段 2: 正式破冰监听播放态
 */
function showCustomEavesdropUI(container, data, ctx) {
    container.empty();
    $('#tts-cyber-modal').hide();
    $('#cyber-fullscreen-eavesdrop').remove();

    const speakers = data.speakers || (data.char_name ? [data.char_name] : ['未知神经频段']);
    const title = speakers.join(' // ');
    const firstSpeaker = speakers[0] || '';

    const avatarHtml = renderAvatarHtml(firstSpeaker, 'cyber-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    const bodyHtml = `
        <div class="cyber-call-wave">
            <div class="cyber-wave-bar"></div><div class="cyber-wave-bar"></div>
            <div class="cyber-wave-bar"></div><div class="cyber-wave-bar"></div>
            <div class="cyber-wave-bar"></div>
        </div>
        <div class="cyber-subtitle call-subtitle-area">
            <div class="subtitle-line">
                <span class="subtitle-speaker" style="display:none;"></span>
                <span class="subtitle-text">ICE 破冰解密中...</span>
            </div>
        </div>
        <div class="cyber-actions in-call" style="margin-top: 18px;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action inject" id="cyber-btn-eavesdrop-inject" title="刻录此段破冰监听入脑" style="background:rgba(0, 240, 255, 0.2); border-color:#00F0FF; color:#00F0FF; width:48px; height:48px;">${STATUS_SVGS.import}</button>
                <span id="cyber-eavesdrop-inject-label" style="font-size:10px; color:#00F0FF; font-family:monospace; font-weight:700;">INJECT</span>
            </div>
            ${CallQueueManager.hasNext() ? `
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action next" id="cyber-btn-eavesdrop-next" title="探听下一条频段" style="background:rgba(14, 22, 36, 0.9); border-color:#FFE600; color:#FFE600; width:48px; height:48px;">${STATUS_SVGS.callOut}</button>
                <span style="font-size:10px; color:#FFE600; font-family:monospace; font-weight:700;">NEXT (${CallQueueManager.getPendingCount() - 1})</span>
            </div>
            ` : ''}
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <button class="cyber-btn-action hangup" id="cyber-btn-eavesdrop-hangup" title="关闭破冰通道" style="width:48px; height:48px;">${CYBER_ICONS.hangup}</button>
                <span style="font-size:10px; color:#FF003C; font-family:monospace; font-weight:700;">DISCONNECT</span>
            </div>
        </div>
    `;

    const $content = buildCallScreen('cyber-fullscreen-eavesdrop', 'cyber-theme-neon', avatarHtml, title, bodyHtml);
    $('body').append($content);

    // 手动铭刻入聊天
    let hasInjected = false;
    $content.find('#cyber-btn-eavesdrop-inject').click(async function () {
        if (hasInjected) return;
        const $btn = $(this);
        const $lbl = $('#cyber-eavesdrop-inject-label');
        $lbl.text('INJECTING...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'eavesdrop',
                speakers: data.speakers || [],
                segments: data.segments || [],
                callId: data.record_id || Date.now(),
                audioUrl: data.audio_url,
                sceneDescription: data.scene_description
            });
            hasInjected = true;
            $btn.css({ 'border-color': '#00F0FF', 'color': '#00F0FF' });
            $lbl.text('INJECTED');
            if (window.toastr) window.toastr.success('✦ 深网监听已成功刻录入聊天');
        } catch (error) {
            console.error('[CyberpunkEdgerunners] 注入失败:', error);
            $lbl.text('ERROR');
            if (window.toastr) window.toastr.error('刻录失败，请重试');
        }
    });

    const handleHangup = () => {
        cleanupGlobalPlayer();
        $content.remove();

        const nextItem = CallQueueManager.next();
        if (nextItem) {
            if (nextItem.type === 'eavesdrop') {
                renderCustomCyberEavesdrop(container, nextItem, ctx);
            } else {
                ctx.engine.showScene('incoming_call');
            }
            return;
        }

        delete window.TTS_EavesdropReady;
        delete window.TTS_EavesdropData;
        $('#tts-cyber-modal').show();
        if (ctx.engine) {
            ctx.engine.notify('call_ended', {});
            ctx.engine.showScene('home');
        }
    };

    $content.find('#cyber-btn-eavesdrop-hangup').click(handleHangup);
    $content.find('#cyber-btn-eavesdrop-next').click(handleHangup);

    // 播放音频并驱动分段字幕
    if (data.audio_url) {
        const player = new AudioPlayer({
            $container: $content,
            segments: data.segments || [],
            showSpeaker: true,
            onEnd: () => {
                console.log('[CyberpunkEdgerunners] 深网监听音频播毕');
            },
            onError: (err) => {
                console.error('[CyberpunkEdgerunners] 播放错误:', err);
            }
        });

        // 监听说话人切换，更新当前神经频段头像与代号
        player.on('speaker_change', ({ speaker }) => {
            if (!speaker) return;
            $content.find('.cyber-call-title').text(speaker);
            const $avatarBox = $content.find('.cyber-call-avatar-img');
            if ($avatarBox.length) {
                $avatarBox.css({ transition: 'opacity 0.15s ease, transform 0.15s ease', opacity: '0.2', transform: 'scale(0.9)' });
                setTimeout(() => {
                    $avatarBox.html(renderAvatarHtml(speaker, '', 'width:100%; height:100%; object-fit:cover; border-radius:50%;'));
                    $avatarBox.css({ opacity: '1', transform: 'scale(1)' });
                }, 150);
            }
        });

        setGlobalPlayer(player);
        player.play(data.audio_url);
    }
}

export const eavesdropScene = {
    render($container, ctx) {
        const data = (ctx && ctx.data && (ctx.data.audio_url || ctx.data.speakers || ctx.data.char_name)) 
            ? ctx.data 
            : (window.TTS_EavesdropReady || window.TTS_EavesdropData);
        if (data && (data.audio_url || data.speakers || data.char_name)) {
            renderCustomCyberEavesdrop($container, data, ctx);
        } else {
            $container.empty();
            const createNav = (typeof ctx === 'function') ? ctx : (ctx.createNavbar || createNavbarForApps);
            EavesdropApp.render($container, createNav);
        }
    },

    cleanup() {
        $('#cyber-fullscreen-eavesdrop').remove();
        cleanupGlobalPlayer();
    }
};
