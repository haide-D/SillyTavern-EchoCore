/**
 * 来电振铃接听/拒绝界面模块 (Ringing View)
 * 处理系统来电推送事件，提供接听、自动注入判断与队列跳过调度
 */

import { ChatInjector } from '../../chat_injector.js';
import { renderAvatarHtml } from '../shared/utils.js';
import { loadExtensionSettings } from '../../settings_ui.js';
import { CallQueueManager } from '../../call_queue_manager.js';
import { clearCallState } from './utils.js';
import { showInCallUI } from './in_call_view.js';

/**
 * 渲染来电振铃界面
 * @param {jQuery} container - App 容器
 * @param {Function} createNavbar - 创建导航栏函数
 * @param {Object} callData - 来电数据
 * @param {Function} rerenderApp - 重新渲染 App 回调
 */
export function renderRingingView(container, createNavbar, callData, rerenderApp) {
    container.empty();

    const pendingCount = CallQueueManager.getPendingCount();
    const queueHint = pendingCount > 1 ? `<div style="font-size:12px; color:#10b981; margin-top:4px; font-weight:600;">📋 待听队列 (${pendingCount} 条传讯)</div>` : '';

    const avatarHtml = renderAvatarHtml(callData.char_name, 'call-incoming-avatar', 'width:100%; height:100%; border-radius:50%; object-fit:cover;');

    const $content = $(`
        <div class="incoming-call-container">
            <div class="call-icon" style="width:110px; height:110px; border-radius:50%; overflow:hidden; margin:0 auto 16px auto; border:3px solid rgba(255,255,255,0.2); box-shadow:0 8px 24px rgba(0,0,0,0.3);">${avatarHtml}</div>
            <div class="caller-name">${callData.char_name || '神秘来电'}</div>
            <div class="call-status">来电中...</div>
            ${queueHint}

            <div class="call-buttons">
                <button id="mobile-reject-call-btn" class="call-btn reject-btn" title="拒绝/跳过">✕</button>
                <button id="mobile-answer-call-btn" class="call-btn answer-btn" title="接听">✓</button>
            </div>
        </div>
    `);

    container.append($content);

    // 拒绝来电 / 跳过当前条目
    $content.find('#mobile-reject-call-btn').click(function () {
        console.log('[RingingView] 用户拒绝/跳过当前来电');
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            rerenderApp();
        } else {
            clearCallState();
            $('#mobile-home-btn').click();
        }
    });

    // 接听来电
    $content.find('#mobile-answer-call-btn').click(async function () {
        console.log('[RingingView] 用户接听来电');

        // 检查是否开启自动注入
        const settings = loadExtensionSettings();
        if (settings.auto_inject_on_answer) {
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'phone_call',
                    segments: callData.segments || [],
                    callerName: callData.char_name || callData.selected_speaker || callData.caller || '神秘角色',
                    target: callData.target_user || callData.target || '你',
                    callReason: callData.call_reason || callData.reason || '主动致电',
                    callId: callData.call_id,
                    audioUrl: callData.audio_url
                });
                console.log('[RingingView] ✅ 通话内容已自动追加到聊天');
            } catch (error) {
                console.error('[RingingView] ❌ 自动注入聊天失败:', error);
            }
        } else {
            console.log('[RingingView] ℹ️ 自动注入未开启，用户可手动在通话界面点击注入');
        }

        // 显示通话中界面
        showInCallUI(container, callData, {
            onRerender: rerenderApp
        });
    });
}
