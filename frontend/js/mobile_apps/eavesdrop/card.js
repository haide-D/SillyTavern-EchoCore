/**
 * 单条密谈卡片组件 (Eavesdrop Card Component)
 * 支持内联精致播放、说话人聚光灯、逐句高亮、沉浸重温、重新生成与注入聊天
 */

import { ChatInjector } from '../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../shared/audio_player.js';
import { formatTime, renderAvatarHtml } from '../shared/utils.js';
import { STATUS_SVGS } from '../../themes/theme_status_helper.js';
import { showHistoryPlaybackUI } from '../incoming_call_app.js';

const SVG = STATUS_SVGS;
const SVG_FULLSCREEN = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;

let _playingCardElement = null; // 当前正在内联播放的卡片
let _currentAudioPlayer = null;

export function stopCurrentPlayingCard() {
    cleanupGlobalPlayer();
    if (_playingCardElement && _playingCardElement._resetUI) {
        _playingCardElement._resetUI();
        _playingCardElement = null;
    }
}

/**
 * 创建单条密谈卡片
 * @param {Object} rec - 密谈记录
 * @param {boolean} isLatest - 是否最新高亮
 * @param {Object} options - 回调配置 { onRegenerate, currentAppContainer, currentCreateNavbar, onRerender }
 */
export function createEavesdropCard(rec, isLatest = false, options = {}) {
    const { onRegenerate, currentAppContainer, currentCreateNavbar, onRerender } = options;

    let speakers = rec.speakers || [];
    if (typeof speakers === 'string') {
        try { speakers = JSON.parse(speakers); } catch (e) { speakers = [speakers]; }
    }
    const speakersStr = speakers.join(' & ') || '多人密谈';

    const timeStr = rec.created_at ? formatTime(rec.created_at) : "刚刚";
    const theme = rec.scene_description || rec.theme || "私下交流重要事宜";
    const audioUrl = rec.audio_url || (rec.audio ? `data:audio/wav;base64,${rec.audio}` : null);

    let segments = rec.segments || [];
    if (typeof segments === 'string') {
        try { segments = JSON.parse(segments); } catch (e) { segments = []; }
    }

    const previewTexts = segments.map((s, idx) => {
        const t = s.translation || s.text || '';
        return `<div class="ed-segment-line" data-idx="${idx}"><strong>${s.speaker || '角色'}:</strong> ${t}</div>`;
    }).join('');

    // 构造多角色头像胶囊栈
    const avatarStackHtml = speakers.map((s, idx) => `
        <div class="ed-avatar-stack-item" data-speaker="${s}" style="z-index:${10 - idx};" title="${s}">
            ${renderAvatarHtml(s, '', 'width:100%; height:100%; object-fit:cover;')}
        </div>
    `).join('');

    const $card = $(`
        <div class="ed-card ${isLatest ? 'highlight' : ''}">
            <div class="ed-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="ed-avatar-stack">
                        ${avatarStackHtml}
                    </div>
                    <div class="ed-speakers-tag">
                        ${speakersStr}
                        ${isLatest ? '<span style="font-size:10px; background:#d97706; color:#fff; padding:1px 6px; border-radius:10px;">最新密谈</span>' : ''}
                    </div>
                </div>
                <div class="ed-time-wrap">
                    <span class="ed-time-playback" style="display:none;">0:00 / 0:00</span>
                    <span class="ed-time">${timeStr}</span>
                </div>
            </div>

            <div class="ed-theme">
                <strong>密谈背景:</strong> ${theme}
            </div>

            ${previewTexts ? `<div class="ed-dialog-preview">${previewTexts}</div>` : ''}

            <div class="ed-audio-progress-wrap">
                <div class="ed-audio-progress-bar"></div>
            </div>

            <div class="ed-card-actions">
                ${audioUrl ? `
                    <button class="ed-action-btn play ws-btn-play" title="播放多角色完整录音">
                        ${SVG.play} 播放录音
                    </button>
                ` : ''}
                <button class="ed-action-btn ws-btn-regen" title="以相同参数重新生成">
                    ${SVG.refresh} 重新生成
                </button>
                <button class="ed-action-btn inject ws-btn-inject" title="将密谈内容追加到 SillyTavern 聊天消息">
                    ${SVG.inject} 注入当前聊天
                </button>
                ${audioUrl ? `
                    <button class="ed-action-btn immersive ws-btn-fullscreen" title="进入全屏沉浸重温模式">
                        ${SVG_FULLSCREEN} 沉浸重温
                    </button>
                ` : ''}
            </div>
        </div>
    `);

    // 卡片 UI 状态重置
    const resetCardUI = () => {
        $card.removeClass('is-playing');
        $card.find('.ed-avatar-stack-item').removeClass('speaking dimmed');
        $card.find('.ed-segment-line').removeClass('active-segment');
        $card.find('.ed-audio-progress-wrap').hide();
        $card.find('.ed-audio-progress-bar').css('width', '0%');
        $card.find('.ed-time-playback').hide();
        $card.find('.ed-time').show();
        $card.find('.ws-btn-play').html(`${SVG.play} 播放录音`);
    };

    // 播放/暂停及说话人动态切换
    $card.find('.ws-btn-play').on('click', function () {
        if (!audioUrl) return;
        const $btn = $(this);

        // 如果本卡片正在播放，点击则暂停
        if (_playingCardElement && _playingCardElement[0] === $card[0] && _currentAudioPlayer && _currentAudioPlayer.isPlaying()) {
            _currentAudioPlayer.pause();
            $btn.html(`${SVG.play} 继续播放`);
            $card.removeClass('is-playing');
            return;
        }

        // 如果本卡片处于暂停状态，恢复播放
        if (_playingCardElement && _playingCardElement[0] === $card[0] && _currentAudioPlayer) {
            _currentAudioPlayer.play();
            $btn.html(`${SVG.pause} 暂停`);
            $card.addClass('is-playing');
            return;
        }

        // 停止并清理前一个播放器
        stopCurrentPlayingCard();

        _playingCardElement = $card;
        $card._resetUI = resetCardUI;

        // 初始化播放器并绑定事件
        _currentAudioPlayer = new AudioPlayer({ audioUrl, segments });
        setGlobalPlayer(_currentAudioPlayer);

        const $progressBar = $card.find('.ed-audio-progress-bar');
        const $progressWrap = $card.find('.ed-audio-progress-wrap');
        const $timePlayback = $card.find('.ed-time-playback');
        const $timeOriginal = $card.find('.ed-time');
        const $lines = $card.find('.ed-segment-line');

        $progressWrap.show();
        $timeOriginal.hide();
        $timePlayback.show().text('0:00 / 0:00');
        $card.addClass('is-playing');
        $btn.html(`${SVG.pause} 暂停`);

        _currentAudioPlayer.on('timeupdate', (currentTime, duration) => {
            if (duration && duration > 0) {
                const percent = Math.min(100, Math.max(0, (currentTime / duration) * 100));
                $progressBar.css('width', `${percent}%`);
                $timePlayback.text(`${formatTime(currentTime)} / ${formatTime(duration)}`);
            } else {
                $timePlayback.text(`${formatTime(currentTime)}`);
            }
        });

        // 监听说话人切换事件，动态聚光灯高亮当前发言人头像
        _currentAudioPlayer.on('speaker_change', ({ speaker }) => {
            $card.find('.ed-avatar-stack-item').each(function () {
                const spk = $(this).data('speaker');
                if (spk === speaker) {
                    $(this).addClass('speaking').removeClass('dimmed');
                } else {
                    $(this).removeClass('speaking').addClass('dimmed');
                }
            });
        });

        // 句段高亮与滚动
        _currentAudioPlayer.on('segment_change', ({ index }) => {
            $lines.removeClass('active-segment');
            const $active = $lines.filter(`[data-idx="${index}"]`).addClass('active-segment');
            if ($active.length) {
                const previewEl = $card.find('.ed-dialog-preview')[0];
                if (previewEl) {
                    const activeEl = $active[0];
                    previewEl.scrollTop = activeEl.offsetTop - previewEl.offsetTop - 10;
                }
            }
        });

        _currentAudioPlayer.on('play', () => {
            $btn.html(`${SVG.pause} 暂停`);
            $card.addClass('is-playing');
        });

        _currentAudioPlayer.on('pause', () => {
            $btn.html(`${SVG.play} 继续播放`);
            $card.removeClass('is-playing');
        });

        _currentAudioPlayer.on('ended', () => {
            resetCardUI();
            _playingCardElement = null;
        });

        _currentAudioPlayer.on('error', () => {
            resetCardUI();
            _playingCardElement = null;
        });

        _currentAudioPlayer.play();
    });

    // 沉浸重温 (调用当前激活主题的专属特殊全屏密谈页面)
    $card.find('.ws-btn-fullscreen').on('click', function () {
        if (!audioUrl) return;
        stopCurrentPlayingCard();

        const primarySpeaker = speakers[0] || '密谈角色';
        const replayData = {
            char_name: primarySpeaker,
            speakers: speakers,
            scene_description: theme,
            created_at: rec.created_at,
            audio_url: audioUrl,
            segments: segments,
            record_id: rec.record_id || rec.id || Date.now(),
            id: rec.record_id || rec.id || Date.now(),
            isReplay: true,
            onReturn: () => {
                if (window.TTS_ThemeEngine) {
                    window.TTS_ThemeEngine.showScene('eavesdrop');
                } else if (typeof onRerender === 'function') {
                    onRerender();
                }
            }
        };

        if (window.TTS_ThemeEngine) {
            console.log('[EavesdropCard] 唤起当前主题专属全屏沉浸重温:', replayData);
            window.TTS_ThemeEngine.showScene('eavesdrop', replayData);
        } else {
            const $targetContainer = currentAppContainer || $('#ed-tab-content').closest('.theme-content, .mobile-screen, .ed-app-container').parent();
            showHistoryPlaybackUI(
                $targetContainer.length ? $targetContainer : $('#ed-tab-content'),
                replayData,
                currentCreateNavbar,
                replayData.onReturn
            );
        }
    });

    // 重新生成
    $card.find('.ws-btn-regen').on('click', async () => {
        if (typeof onRegenerate === 'function') {
            onRegenerate(rec, speakers, theme);
        }
    });

    // 注入当前聊天
    $card.find('.ws-btn-inject').on('click', async function () {
        const $btn = $(this);
        $btn.prop('disabled', true).text('注入中...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'eavesdrop',
                speakers: speakers,
                segments: segments,
                callId: rec.record_id || rec.id || Date.now(),
                audioUrl: audioUrl,
                sceneDescription: theme
            });
            $btn.html(`${SVG.inject} 已注入`);
            setTimeout(() => $btn.html(`${SVG.inject} 注入当前聊天`), 2000);
        } catch (e) {
            console.error('[EavesdropCard] 注入失败:', e);
            alert(`注入失败: ${e.message}`);
            $btn.html(`${SVG.inject} 注入当前聊天`);
        } finally {
            $btn.prop('disabled', false);
        }
    });

    return $card;
}
