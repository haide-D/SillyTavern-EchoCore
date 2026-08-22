/**
 * 来电与通话记录 App 主入口 (Incoming Call App)
 * 调度来电振铃 (Ringing)、通话中 (In-Call)、通话记录列表 (History) 与全屏回放 (Playback)
 */

import { cleanupGlobalPlayer } from './shared/audio_player.js';
import { renderRingingView } from './incoming_call/ringing_view.js';
import { renderHistoryView } from './incoming_call/history_view.js';
import { showHistoryPlaybackUI as _showHistoryPlaybackUI } from './incoming_call/playback_view.js';

// 注册全局辅助，方便深层回退
if (typeof window !== 'undefined') {
    window.TTS_RenderIncomingCallApp = (c, n) => render(c, n);
}

/**
 * 渲染来电 App
 * @param {jQuery} container - App 容器
 * @param {Function} createNavbar - 创建导航栏函数
 */
export async function render(container, createNavbar) {
    const callData = window.TTS_IncomingCall;

    // ========== 状态1: 有来电 - 显示接听/拒绝界面 ==========
    if (callData) {
        renderRingingView(container, createNavbar, callData, () => {
            render(container, createNavbar);
        });
        return;
    }

    // ========== 状态2: 无来电 - 显示历史记录列表 ==========
    await renderHistoryView(container, createNavbar, () => {
        render(container, createNavbar);
    });
}

/**
 * 显示历史记录播放界面 (导出供全屏重温复用)
 * @param {jQuery} container - App 容器
 * @param {Object} call - 历史来电数据
 * @param {Function} createNavbar - 创建导航栏函数
 * @param {Function} [onReturn] - 可选的退出回退回调
 */
export function showHistoryPlaybackUI(container, call, createNavbar, onReturn = null) {
    return _showHistoryPlaybackUI(container, call, createNavbar, onReturn, () => {
        render(container, createNavbar);
    });
}

/**
 * 停止当前正在播放的音频
 * 用于在退出 App 或点击返回时清理资源
 */
export function cleanup() {
    console.log('[IncomingCallApp] 清理来电记录 App 资源');
    cleanupGlobalPlayer();
}

export default { render, cleanup };
