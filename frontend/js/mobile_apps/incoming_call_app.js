/**
 * 来电 App 模块
 * 处理来电界面、通话中界面、来电历史记录
 */

import { ChatInjector } from '../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from './shared/audio_player.js';
import { getCharacterAvatar } from './shared/utils.js';

/**
 * 渲染来电 App
 * @param {jQuery} container - App 容器
 * @param {Function} createNavbar - 创建导航栏函数
 */
export async function render(container, createNavbar) {
    const callData = window.TTS_IncomingCall;

    // ========== 状态1: 有来电 - 显示接听/拒绝界面 ==========
    if (callData) {
        container.empty();

        // 生成头像 HTML
        const avatarHtml = callData.avatar_url
            ? `<img src="${callData.avatar_url}" alt="${callData.char_name}">`
            : '📞';

        const $content = $(`
            <div class="incoming-call-container">
                <div class="call-icon">${avatarHtml}</div>
                <div class="caller-name">${callData.char_name}</div>
                <div class="call-status">来电中...</div>

                <div class="call-buttons">
                    <button id="mobile-reject-call-btn" class="call-btn reject-btn">✕</button>
                    <button id="mobile-answer-call-btn" class="call-btn answer-btn">✓</button>
                </div>
            </div>
        `);

        container.append($content);

        // 拒绝来电
        $content.find('#mobile-reject-call-btn').click(function () {
            console.log('[Mobile] 用户拒绝来电');
            clearCallState();
            $('#mobile-home-btn').click();
        });

        // 接听来电
        $content.find('#mobile-answer-call-btn').click(async function () {
            console.log('[Mobile] 用户接听来电');

            // 注入通话内容到聊天（追加到最后一条AI消息，不新增楼层）
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'phone_call',
                    segments: callData.segments || [],
                    callerName: callData.char_name,
                    callId: callData.call_id,
                    audioUrl: callData.audio_url
                });
                console.log('[Mobile] ✅ 通话内容已追加到聊天');
            } catch (error) {
                console.error('[Mobile] ❌ 注入聊天失败:', error);
            }

            // 显示通话中界面
            showInCallUI(container, callData);
        });

        return;
    }

    // ========== 状态2: 无来电 - 显示历史记录列表 ==========
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
            console.log('[Mobile] 获取到指纹数量:', fingerprints.length);
        }
    } catch (e) {
        console.error('[Mobile] 获取指纹失败:', e);
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
        console.log('[Mobile] 获取来电历史 (by fingerprints):', fingerprints.length, '条指纹');
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
        renderHistoryList($content, result.history, container, createNavbar);

    } catch (error) {
        console.error('[Mobile] 获取历史记录失败:', error);
        $content.html(`
            <div class="call-history-empty" style="color:#ef4444;">
                <div class="call-history-empty-icon">❌</div>
                <div>加载失败: ${error.message}</div>
            </div>
        `);
    }
}

/**
 * 渲染历史记录列表
 */
function renderHistoryList($content, history, container, createNavbar) {
    const historyHtml = history.map(call => {
        const date = call.created_at ? new Date(call.created_at).toLocaleString('zh-CN') : '未知时间';
        const statusText = call.status === 'completed' ? '已完成' : call.status === 'failed' ? '失败' : '处理中';
        const statusClass = call.status === 'completed' ? 'completed' : call.status === 'failed' ? 'failed' : 'processing';

        // 获取角色卡头像
        let avatarUrl = call.avatar_url || getCharacterAvatar(call.char_name);

        // 头像 HTML
        const avatarHtml = avatarUrl
            ? `<img src="${avatarUrl}" alt="${call.char_name}">`
            : `<div class="call-history-avatar-placeholder">👤</div>`;

        return `
            <div class="call-history-item" data-call-id="${call.id}">
                <div class="call-history-layout">
                    <!-- 头像 -->
                    <div class="call-history-avatar">
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

        console.log('[Mobile] 播放历史来电(全屏):', call);

        // 进入全屏播放界面
        showHistoryPlaybackUI(container, call, createNavbar);
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

/**
 * 显示通话中界面
 * @param {jQuery} container - App 容器
 * @param {Object} callData - 来电数据
 */
function showInCallUI(container, callData) {
    container.empty();

    // 创建通话中界面
    const $inCallContent = $(`
        <div class="in-call-container">
            <div class="call-header">
                <div class="call-avatar">${callData.avatar_url ? `<img src="${callData.avatar_url}" alt="${callData.char_name}">` : '👤'}</div>
                <div class="call-name">${callData.char_name}</div>
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

            <button id="mobile-hangup-btn" class="hangup-btn">✕</button>
        </div>
    `);

    container.append($inCallContent);

    // 使用共享音频播放器
    const player = new AudioPlayer({
        $container: $inCallContent,
        segments: callData.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[Mobile] 通话结束');
            endCall();
        },
        onError: (err) => {
            console.error('[Mobile] 播放错误:', err);
            alert('音频播放失败');
            endCall();
        }
    });

    // 设置为全局播放器
    setGlobalPlayer(player);

    // 挂断按钮
    $inCallContent.find('#mobile-hangup-btn').click(function () {
        console.log('[Mobile] 用户挂断电话');
        player.stop();
        endCall();
    });

    // 开始播放
    if (callData.audio_url) {
        player.play(callData.audio_url);
    } else {
        console.warn('[Mobile] 没有音频 URL');
        endCall();
    }

    function endCall() {
        clearCallState();
        $('#mobile-home-btn').click();
    }
}

/**
 * 显示历史记录播放界面
 * @param {jQuery} container - App 容器
 * @param {Object} call - 历史来电数据
 * @param {Function} createNavbar - 创建导航栏函数
 */
function showHistoryPlaybackUI(container, call, createNavbar) {
    container.empty();

    // 添加导航栏(带返回按钮)
    const $navbar = createNavbar("播放历史通话");
    container.append($navbar);

    // 监听返回按钮点击 - 停止音频播放
    $navbar.find('.nav-left').off('click').on('click', function () {
        console.log('[Mobile] 用户点击返回,停止音频播放');
        cleanupGlobalPlayer();
        $('#mobile-home-btn').click();
    });

    // 获取角色卡头像
    const avatarUrl = call.avatar_url || getCharacterAvatar(call.char_name);

    // 生成头像 HTML
    const avatarHtml = avatarUrl
        ? `<img src="${avatarUrl}" alt="${call.char_name}">`
        : '👤';

    // 创建播放界面
    const $playbackContent = $(`
        <div class="in-call-container">
            <div class="call-header">
                <div class="call-avatar">${avatarHtml}</div>
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

            <div class="call-playback-buttons">
                <button id="history-stop-btn" class="hangup-btn">⏹</button>
            </div>
        </div>
    `);

    container.append($playbackContent);

    // 使用共享音频播放器
    const player = new AudioPlayer({
        $container: $playbackContent,
        segments: call.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[Mobile] 历史播放完成');
            endPlayback();
        },
        onError: (err) => {
            console.error('[Mobile] 历史播放错误:', err);
            alert('音频播放失败');
            endPlayback();
        }
    });

    // 设置为全局播放器
    setGlobalPlayer(player);

    // 停止按钮
    $playbackContent.find('#history-stop-btn').click(function () {
        console.log('[Mobile] 用户停止播放');
        player.stop();
        endPlayback();
    });


    // 开始播放
    if (call.audio_url) {
        player.play(call.audio_url);
    } else {
        console.warn('[Mobile] 历史记录没有音频 URL');
        alert('该记录没有音频文件');
        endPlayback();
    }

    function endPlayback() {
        cleanupGlobalPlayer();
        render(container, createNavbar);
    }
}

/**
 * 下载音频
 */
async function downloadAudio(call) {
    console.log('[Mobile] 用户点击下载历史通话');

    let fullUrl = call.audio_url;
    if (fullUrl && fullUrl.startsWith('/') && window.TTS_API && window.TTS_API.baseUrl) {
        fullUrl = window.TTS_API.baseUrl + fullUrl;
    }

    const speaker = call.char_name || 'Unknown';
    const text = call.segments && call.segments.length > 0
        ? call.segments.map(seg => seg.translation || seg.text || '').join(' ')
        : '历史通话';

    console.log('📥 下载历史通话音频');
    console.log('  - audioUrl:', fullUrl);
    console.log('  - speaker:', speaker);
    console.log('  - text:', text);

    // 使用 TTS_Events.downloadAudio 下载
    if (window.TTS_Events && window.TTS_Events.downloadAudio) {
        try {
            await window.TTS_Events.downloadAudio(fullUrl, speaker, text);
            console.log('✅ 下载请求已发送');
        } catch (err) {
            console.error('❌ 下载失败:', err);
            alert('下载失败: ' + err.message);
        }
    } else {
        alert('下载功能未就绪,请刷新页面');
    }
}

/**
 * 清除来电状态
 */
function clearCallState() {
    delete window.TTS_IncomingCall;
    $('#tts-manager-btn').removeClass('incoming-call').attr('title', '🔊 TTS配置');
    $('#tts-mobile-trigger').removeClass('incoming-call');
    if (window.TTS_ThemeEngine) {
        window.TTS_ThemeEngine.notify('call_ended', {});
    }
}

/**
 * 停止当前正在播放的音频
 * 用于在退出 App 或点击返回时清理资源
 */
export function cleanup() {
    console.log('[Mobile] 清理来电记录 App 资源');
    cleanupGlobalPlayer();
}

export default { render, cleanup };
