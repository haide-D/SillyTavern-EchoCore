/**
 * 来电历史记录列表模块 (Incoming Call History View)
 * 提供基于上下文指纹的高效历史记录查询、卡片渲染、录音下载与全屏回放唤起
 */

import { renderAvatarHtml, getCharacterAvatar } from '../shared/utils.js';
import { downloadAudio } from './utils.js';
import { showHistoryPlaybackUI } from './playback_view.js';

/**
 * 渲染来电历史记录主视图
 * @param {jQuery} container - App 容器
 * @param {Function} createNavbar - 创建导航栏函数
 * @param {Function} onRerenderApp - 重新渲染 App 回调
 */
export async function renderHistoryView(container, createNavbar, onRerenderApp) {
    container.empty();
    container.append(createNavbar("来电记录"));

    const $content = $(`
        <div class="call-history-content">
            <div class="call-history-empty">
                <div class="call-history-empty-icon">📞</div>
                <div>正在加载来电记录...</div>
            </div>
        </div>
    `);
    container.append($content);

    // 获取当前对话的所有指纹
    let fingerprints = [];
    try {
        if (window.TTS_Utils && window.TTS_Utils.getCurrentContextFingerprints) {
            fingerprints = window.TTS_Utils.getCurrentContextFingerprints();
            console.log('[HistoryView] 获取到指纹数量:', fingerprints.length);
        }
    } catch (e) {
        console.error('[HistoryView] 获取指纹失败:', e);
    }

    if (!fingerprints || fingerprints.length === 0) {
        $content.html(`
            <div class="call-history-empty">
                <div class="call-history-empty-icon">⚠️</div>
                <div>未检测到对话</div>
            </div>
        `);
        return;
    }

    // 获取历史记录 (按指纹列表查询，支持跨分支匹配)
    try {
        console.log('[HistoryView] 获取来电历史 (by fingerprints):', fingerprints.length, '条指纹');
        const result = await window.TTS_API.getAutoCallHistoryByFingerprints(fingerprints, 500);

        if (result.status !== 'success' || !result.history || result.history.length === 0) {
            $content.html(`
                <div class="call-history-empty">
                    <div class="call-history-empty-icon">📞</div>
                    <div>暂无来电记录</div>
                </div>
            `);
            return;
        }

        // 渲染历史记录列表
        renderHistoryList($content, result.history, container, createNavbar, onRerenderApp);

    } catch (error) {
        console.error('[HistoryView] 获取历史记录失败:', error);
        $content.html(`
            <div class="call-history-empty" style="color:#ef4444;">
                <div class="call-history-empty-icon">❌</div>
                <div>加载失败: ${error.message}</div>
            </div>
        `);
    }
}

/**
 * 渲染历史记录列表项
 */
export function renderHistoryList($content, history, container, createNavbar, onRerenderApp) {
    const historyHtml = history.map(call => {
        const date = call.created_at ? new Date(call.created_at).toLocaleString('zh-CN') : '未知时间';
        const statusText = call.status === 'completed' ? '已完成' : call.status === 'failed' ? '失败' : '处理中';
        const statusClass = call.status === 'completed' ? 'completed' : call.status === 'failed' ? 'failed' : 'processing';

        // 头像 HTML
        const avatarHtml = renderAvatarHtml(call.char_name, 'call-history-avatar-img', 'width:100%; height:100%; object-fit:cover; border-radius:50%;');

        return `
            <div class="call-history-item" data-call-id="${call.id}">
                <div class="call-history-layout">
                    <!-- 头像 -->
                    <div class="call-history-avatar" style="width:48px; height:48px; border-radius:50%; overflow:hidden; flex-shrink:0;">
                        ${avatarHtml}
                    </div>

                    <!-- 内容区域 -->
                    <div class="call-history-content-area">
                        <div class="call-history-header">
                            <strong class="call-history-name">${call.char_name || '未知角色'}</strong>
                            <span class="call-history-status ${statusClass}">● ${statusText}</span>
                        </div>

                        <div class="call-history-date">
                            📅 ${date}
                        </div>

                        ${call.status === 'completed' && call.audio_url ? `
                            <div style="display:flex; align-items:center; gap:8px;">
                                <div class="play-area" style="flex:1;">
                                    <div class="call-history-play-area">
                                        <span class="call-history-play-icon">🎵</span>
                                        <span class="call-history-play-text">点击播放</span>
                                        <span class="call-history-play-arrow">→</span>
                                    </div>
                                </div>
                                <button class="call-history-download-btn" style="background:transparent; border:none; color:#3b82f6; font-size:20px; padding:5px; cursor:pointer;">📥</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    $content.html(historyHtml);

    // 绑定点击事件 - 全屏播放
    $content.find('.call-history-item').click(function (e) {
        // 如果点击的是下载按钮,不触发播放
        if ($(e.target).closest('.call-history-download-btn').length > 0) {
            return;
        }

        const callId = $(this).data('call-id');
        const call = history.find(c => c.id === callId);

        if (!call || call.status !== 'completed' || !call.audio_url) {
            alert('该来电记录无法播放');
            return;
        }

        console.log('[HistoryView] 播放历史来电(全屏):', call);

        // 进入全屏播放界面
        showHistoryPlaybackUI(container, call, createNavbar, () => {
            if (typeof onRerenderApp === 'function') {
                onRerenderApp();
            }
        });
    });

    // 绑定下载按钮点击事件
    $content.find('.call-history-download-btn').click(async function (e) {
        e.stopPropagation();

        const $item = $(this).closest('.call-history-item');
        const callId = $item.data('call-id');
        const call = history.find(c => c.id === callId);

        if (!call || !call.audio_url) {
            alert('该记录没有音频文件');
            return;
        }

        await downloadAudio(call);
    });
}
