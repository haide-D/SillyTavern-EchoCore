import { ChatInjector } from '../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from './shared/audio_player.js';
import { getCharacterAvatar, renderAvatarHtml } from './shared/utils.js';
import { loadExtensionSettings } from '../settings_ui.js';
import { CallQueueManager } from '../call_queue_manager.js';

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
            console.log('[Mobile] 用户拒绝/跳过当前来电');
            const nextItem = CallQueueManager.next();
            if (nextItem) {
                render(container, createNavbar);
            } else {
                clearCallState();
                $('#mobile-home-btn').click();
            }
        });

        // 接听来电
        $content.find('#mobile-answer-call-btn').click(async function () {
            console.log('[Mobile] 用户接听来电');

            // 检查是否开启自动注入
            const settings = loadExtensionSettings();
            if (settings.auto_inject_on_answer) {
                try {
                    await ChatInjector.appendToLastAIMessage({
                        type: 'phone_call',
                        segments: callData.segments || [],
                        callerName: callData.char_name,
                        callId: callData.call_id,
                        audioUrl: callData.audio_url
                    });
                    console.log('[Mobile] ✅ 通话内容已自动追加到聊天');
                } catch (error) {
                    console.error('[Mobile] ❌ 自动注入聊天失败:', error);
                }
            } else {
                console.log('[Mobile] ℹ️ 自动注入未开启，用户可手动在通话界面点击注入');
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
            console.error('[Mobile] 手动注入失败:', err);
            $btn.prop('disabled', false).text('❌ 注入失败');
        }
    });

    // 绑定跳到下一条事件
    $inCallContent.find('#in-call-next-btn').on('click', function () {
        console.log('[Mobile] 用户点击跳到下一条待听传讯');
        player.stop();
        playNextOrEnd();
    });

    // 使用共享音频播放器
    const player = new AudioPlayer({
        $container: $inCallContent,
        segments: callData.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[Mobile] 通话播放结束');
            playNextOrEnd();
        },
        onError: (err) => {
            console.error('[Mobile] 播放错误:', err);
            alert('音频播放失败');
            playNextOrEnd();
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
        playNextOrEnd();
    }

    function playNextOrEnd() {
        const nextItem = CallQueueManager.next();
        if (nextItem) {
            console.log('[Mobile] 自动切换到下一条待听传讯:', nextItem);
            render(container, () => {});
        } else {
            endCall();
        }
    }

    function endCall() {
        CallQueueManager.clear();
        clearCallState();
        $('#mobile-home-btn').click();
    }
}

/**
 * 显示历史记录播放界面 (导出供全屏重温复用)
 * @param {jQuery} container - App 容器
 * @param {Object} call - 历史来电数据
 * @param {Function} createNavbar - 创建导航栏函数
 * @param {Function} [onReturn] - 可选的退出回退回调
 */
export function showHistoryPlaybackUI(container, call, createNavbar, onReturn = null) {
    container.empty();

    // 添加导航栏(带返回按钮)
    const $navbar = createNavbar ? createNavbar("播放历史通话") : $(`<div class="pc-immersive-nav"><button class="nav-left" style="background:transparent;border:none;color:#fef08a;cursor:pointer;padding:8px 12px;font-size:14px;">← 返回</button><span style="font-weight:600;">播放历史通话</span></div>`);
    container.append($navbar);

    const handleExit = () => {
        cleanupGlobalPlayer();
        if (typeof onReturn === 'function') {
            onReturn();
        } else if (createNavbar) {
            render(container, createNavbar);
        } else {
            $('#mobile-home-btn').click();
        }
    };

    // 监听返回按钮点击 - 停止音频播放
    $navbar.find('.nav-left').off('click').on('click', function () {
        console.log('[Mobile] 用户点击返回, 停止音频播放');
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
                callerName: call.char_name,
                callId: call.id,
                audioUrl: call.audio_url
            });
            hasInjected = true;
            $btn.css({ background: 'rgba(16,185,129,0.2)', borderColor: '#10b981', color: '#6ee7b7' }).text('✅ 已注入聊天');
        } catch (err) {
            console.error('[Mobile] 手动注入失败:', err);
            $btn.prop('disabled', false).text('❌ 注入失败 (重试)');
        }
    });

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
        handleExit();
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
