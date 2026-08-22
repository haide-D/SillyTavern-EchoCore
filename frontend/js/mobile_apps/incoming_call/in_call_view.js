/**
 * 通话中沉浸界面模块 (In-Call View)
 * 提供实时音频可视化、实时字幕滚动、进度条、手动注入与下一条待听调度
 */

import { ChatInjector } from '../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer } from '../shared/audio_player.js';
import { renderAvatarHtml } from '../shared/utils.js';
import { CallQueueManager } from '../../call_queue_manager.js';
import { clearCallState } from './utils.js';

/**
 * 显示通话中界面
 * @param {jQuery} container - App 容器
 * @param {Object} callData - 来电数据
 * @param {Object} context - 上下文与回调 { onRerender }
 */
export function showInCallUI(container, callData, context = {}) {
    const { onRerender } = context;
    container.empty();

    const avatarHtml = renderAvatarHtml(callData.char_name, 'in-call-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    // 创建通话中界面
    const $inCallContent = $(`
        <div class="in-call-container">
            <div class="call-header">
                <div class="call-avatar" style="width:96px; height:96px; border-radius:50%; overflow:hidden; margin:0 auto 10px auto; border:2px solid rgba(16,185,129,0.5); box-shadow:0 0 20px rgba(16,185,129,0.2);">${avatarHtml}</div>
                <div class="call-name">${callData.char_name || '神秘角色'}</div>
                <div class="call-duration">00:00</div>
            </div>

            <!-- 音频可视化 -->
            <div class="audio-visualizer">
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
            </div>

            <!-- 字幕区域 -->
            <div class="call-subtitle-area">
                <div class="subtitle-line">
                    <span class="subtitle-text"></span>
                </div>
            </div>

            <div class="audio-progress">
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: 0%;"></div>
                </div>
                <div class="progress-time">
                    <span class="current-time">0:00</span>
                    <span class="total-time">0:00</span>
                </div>
            </div>

            <!-- 操作按钮组: 挂断、下一条与手动注入 -->
            <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-top:20px;">
                <button id="in-call-inject-btn" style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.5); color:#93c5fd; padding:10px 16px; border-radius:24px; font-size:13px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;">
                    📝 注入
                </button>
                ${CallQueueManager.hasNext() ? `
                <button id="in-call-next-btn" style="background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.5); color:#6ee7b7; padding:10px 16px; border-radius:24px; font-size:13px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;" title="跳到下一条传讯">
                    ⏭️ 下一条 (${CallQueueManager.getPendingCount() - 1})
                </button>
                ` : ''}
                <button id="mobile-hangup-btn" class="hangup-btn" style="margin:0;" title="结束通话">✕</button>
            </div>
        </div>
    `);

    container.append($inCallContent);

    // 绑定手动注入事件
    let hasInjected = false;
    $inCallContent.find('#in-call-inject-btn').on('click', async function () {
        if (hasInjected) return;
        const $btn = $(this);
        $btn.text('正在注入...').prop('disabled', true);
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: callData.segments || [],
                callerName: callData.char_name,
                callId: callData.call_id,
                audioUrl: callData.audio_url
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(16,185,129,0.2)', borderColor: '#10b981', color: '#6ee7b7' }).text('✅ 已注入');
        } catch (err) {
            console.error('[InCallView] 手动注入失败:', err);
            $btn.prop('disabled', false).text('❌ 注入失败');
        }
    });

    function playNextOrEnd() {
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            console.log('[InCallView] 自动切换到下一条待听传讯:', nextItem);
            if (typeof onRerender === 'function') {
                onRerender();
            }
        } else {
            endCall();
        }
    }

    function endCall() {
        CallQueueManager.clear();
        clearCallState();
        $('#mobile-home-btn').click();
    }

    // 使用共享音频播放器
    const player = new AudioPlayer({
        $container: $inCallContent,
        segments: callData.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[InCallView] 通话播放结束');
            playNextOrEnd();
        },
        onError: (err) => {
            console.error('[InCallView] 播放错误:', err);
            alert('音频播放失败');
            playNextOrEnd();
        }
    });

    // 设置为全局播放器
    setGlobalPlayer(player);

    // 绑定跳到下一条事件
    $inCallContent.find('#in-call-next-btn').on('click', function () {
        console.log('[InCallView] 用户点击跳到下一条待听传讯');
        player.stop();
        playNextOrEnd();
    });

    // 挂断按钮
    $inCallContent.find('#mobile-hangup-btn').click(function () {
        console.log('[InCallView] 用户挂断电话');
        player.stop();
        endCall();
    });

    // 开始播放
    if (callData.audio_url) {
        player.play(callData.audio_url);
    } else {
        console.warn('[InCallView] 没有音频 URL');
        playNextOrEnd();
    }
}
