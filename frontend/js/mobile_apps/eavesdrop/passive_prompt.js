/**
 * 被动推送待监听界面组件 (Eavesdrop Passive Prompt View)
 * 处理系统异步推送检测到的私下密谈事件，提供即时监听与忽略调度
 */

import { ChatInjector } from '../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../shared/audio_player.js';
import { renderAvatarHtml } from '../shared/utils.js';
import { loadExtensionSettings } from '../../settings_ui.js';
import { STATUS_SVGS } from '../../themes/theme_status_helper.js';

const SVG = STATUS_SVGS;

/**
 * 渲染被动待监听界面
 * @param {jQuery} container - 容器
 * @param {Object} eavesdropData - 推送的密谈数据
 * @param {Object} context - 上下文与回调 { onListenAccepted }
 */
export function renderPassivePrompt(container, eavesdropData, context = {}) {
    const { onListenAccepted } = context;
    const speakers = eavesdropData.speakers || [];
    const speakersText = speakers.join(' 与 ') || '角色私聊';

    const avatarStackHtml = speakers.map((s, idx) => `
        <div style="width:52px; height:52px; border-radius:50%; overflow:hidden; border:3px solid rgba(217,119,6,0.6); margin-left:${idx === 0 ? '0' : '-16px'}; z-index:${10 - idx}; display:inline-block; box-shadow:0 4px 12px rgba(0,0,0,0.5);" title="${s}">
            ${renderAvatarHtml(s, '', 'width:100%; height:100%; object-fit:cover;')}
        </div>
    `).join('');

    const $prompt = $(`
        <div class="ed-app-container">
            <div class="ed-prompt-container">
                <div style="display:flex; justify-content:center; align-items:center; margin-bottom:12px;">
                    ${avatarStackHtml}
                </div>
                <h3 style="margin:0; font-size:18px; color:#fef08a;">检测到密谈: ${speakersText}</h3>
                <p style="margin:0; font-size:13px; color:rgba(220,200,160,0.85);">${eavesdropData.scene_description || '角色们正在私底下商讨重要事宜...'}</p>
                
                <div style="display:flex; gap:12px; margin-top:10px;">
                    <button id="ed-ignore-btn" style="padding:10px 20px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#d1d5db; cursor:pointer;">
                        忽略
                    </button>
                    <button id="ed-listen-btn" class="ed-main-btn" style="padding:10px 24px;">
                        ${SVG.ear} 立即监听
                    </button>
                </div>
            </div>
        </div>
    `);

    container.append($prompt);

    $prompt.find('#ed-ignore-btn').on('click', () => {
        window.TTS_EavesdropData = null;
        window.TTS_EavesdropReady = null;
        if (window.TTS_ThemeEngine) {
            window.TTS_ThemeEngine.notify('call_ended', {});
            window.TTS_ThemeEngine.showScene('home');
        } else {
            $('#mobile-home-btn').click();
        }
    });

    $prompt.find('#ed-listen-btn').on('click', async () => {
        window.TTS_EavesdropData = null;
        window.TTS_EavesdropReady = null;
        if (window.TTS_ThemeEngine) {
            window.TTS_ThemeEngine.notify('call_ended', {});
        }

        // 检查是否开启自动注入
        const settings = loadExtensionSettings();
        if (settings.auto_inject_on_answer) {
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'eavesdrop',
                    segments: eavesdropData.segments || [],
                    speakers: eavesdropData.speakers || [],
                    callId: eavesdropData.record_id || Date.now(),
                    audioUrl: eavesdropData.audio_url,
                    sceneDescription: eavesdropData.scene_description
                });
                console.log('[EavesdropPassive] ✅ 密谈内容已自动追加到聊天');
            } catch (e) {
                console.error('[EavesdropPassive] 自动注入失败:', e);
            }
        } else {
            console.log('[EavesdropPassive] ℹ️ 自动注入未开启，用户可手动在卡片上点击注入');
        }

        // 自动播放
        if (eavesdropData.audio_url) {
            cleanupGlobalPlayer();
            const player = new AudioPlayer({ audioUrl: eavesdropData.audio_url, segments: eavesdropData.segments || [] });
            setGlobalPlayer(player);
            player.play();
        }

        if (typeof onListenAccepted === 'function') {
            onListenAccepted(eavesdropData);
        }
    });
}
