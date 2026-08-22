/**
 * 历史通话全屏回放界面模块 (Playback View)
 * 提供可跨模块复用的全屏沉浸式历史录音播放、波形可视化、字幕同步与手动注入
 */

import { ChatInjector } from '../../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../shared/audio_player.js';
import { renderAvatarHtml } from '../shared/utils.js';

/**
 * 显示历史记录播放界面 (导出供全屏重温复用)
 * @param {jQuery} container - App 容器
 * @param {Object} call - 历史来电/密谈数据
 * @param {Function} createNavbar - 创建导航栏函数
 * @param {Function} [onReturn] - 可选的退出回退回调
 * @param {Function} [onFallbackRender] - 默认回退重渲染函数
 */
export function showHistoryPlaybackUI(container, call, createNavbar, onReturn = null, onFallbackRender = null) {
    container.empty();

    // 添加导航栏(带返回按钮)
    const $navbar = createNavbar ? createNavbar("播放历史通话") : $(`<div class="pc-immersive-nav"><button class="nav-left" style="background:transparent;border:none;color:#fef08a;cursor:pointer;padding:8px 12px;font-size:14px;">← 返回</button><span style="font-weight:600;">播放历史通话</span></div>`);
    container.append($navbar);

    const handleExit = () => {
        cleanupGlobalPlayer();
        if (typeof onReturn === 'function') {
            onReturn();
        } else if (typeof onFallbackRender === 'function') {
            onFallbackRender();
        } else if (createNavbar) {
            if (typeof window.TTS_RenderIncomingCallApp === 'function') {
                window.TTS_RenderIncomingCallApp(container, createNavbar);
            } else {
                $('#mobile-home-btn').click();
            }
        } else {
            $('#mobile-home-btn').click();
        }
    };

    // 监听返回按钮点击 - 停止音频播放
    $navbar.find('.nav-left').off('click').on('click', function () {
        console.log('[PlaybackView] 用户点击返回, 停止音频播放');
        handleExit();
    });

    const charName = call.char_name || call.selected_speaker || '未知角色';
    const avatarHtml = renderAvatarHtml(charName, 'history-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

    // 创建播放界面
    const $playbackContent = $(`
        <div class="in-call-container">
            <div class="call-header">
                <div class="call-avatar" style="width:96px; height:96px; border-radius:50%; overflow:hidden; margin:0 auto 10px auto; border:2px solid rgba(255,255,255,0.2);">${avatarHtml}</div>
                <div class="call-name">${call.char_name || '未知角色'}</div>
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

            <div style="display:flex; align-items:center; justify-content:center; gap:20px; margin-top:20px;">
                <button id="history-inject-btn" style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.5); color:#93c5fd; padding:10px 18px; border-radius:24px; font-size:13px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;">
                    📝 注入当前聊天
                </button>
                <button id="history-stop-btn" class="hangup-btn" style="margin:0;">⏹</button>
            </div>
        </div>
    `);

    container.append($playbackContent);

    // 绑定手动注入事件
    let hasInjected = false;
    $playbackContent.find('#history-inject-btn').on('click', async function () {
        if (hasInjected) return;
        const $btn = $(this);
        $btn.text('正在注入...').prop('disabled', true);
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: call.segments || [],
                callerName: call.char_name || call.selected_speaker || call.caller || '神秘角色',
                target: call.target_user || call.target || '你',
                callReason: call.call_reason || call.reason || '主动致电',
                callId: call.id || call.call_id,
                audioUrl: call.audio_url
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(16,185,129,0.2)', borderColor: '#10b981', color: '#6ee7b7' }).text('✅ 已注入聊天');
        } catch (err) {
            console.error('[PlaybackView] 手动注入失败:', err);
            $btn.prop('disabled', false).text('❌ 注入失败 (重试)');
        }
    });

    // 使用共享音频播放器
    const player = new AudioPlayer({
        $container: $playbackContent,
        segments: call.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[PlaybackView] 历史播放完成');
            endPlayback();
        },
        onError: (err) => {
            console.error('[PlaybackView] 历史播放错误:', err);
            alert('音频播放失败');
            endPlayback();
        }
    });

    // 设置为全局播放器
    setGlobalPlayer(player);

    // 停止按钮
    $playbackContent.find('#history-stop-btn').click(function () {
        console.log('[PlaybackView] 用户停止播放');
        player.stop();
        endPlayback();
    });

    // 开始播放
    if (call.audio_url) {
        player.play(call.audio_url);
    } else {
        console.warn('[PlaybackView] 历史记录没有音频 URL');
        alert('该记录没有音频文件');
        endPlayback();
    }

    function endPlayback() {
        handleExit();
    }
}
