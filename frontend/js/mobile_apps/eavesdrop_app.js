/**
 * 对话追踪 App 模块
 * 处理对话监听界面、监听播放、历史记录
 */

import { ChatInjector } from '../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from './shared/audio_player.js';
import { getApiHost, getChatBranch, formatTime } from './shared/utils.js';
import { themeManager } from '../theme_manager.js';

/**
 * 渲染对话追踪 App
 * @param {jQuery} container - App 容器
 * @param {Function} createNavbar - 创建导航栏函数
 */
export async function render(container, createNavbar) {
    const eavesdropData = window.TTS_EavesdropData;

    // ========== 状态1: 有对话追踪数据 - 显示监听界面 ==========
    if (eavesdropData) {
        container.empty();

        const speakersText = eavesdropData.speakers?.join(' & ') || '角色私聊';

        const $content = $(`
            <div class="eavesdrop-container">
                <div class="eavesdrop-icon">🎧</div>
                <div class="eavesdrop-title">${speakersText}</div>
                <div class="eavesdrop-status">${eavesdropData.scene_description || '正在私下对话...'}</div>
                
                <div class="eavesdrop-buttons">
                    <button id="eavesdrop-ignore-btn" class="eavesdrop-btn ignore-btn">忽略</button>
                    <button id="eavesdrop-listen-btn" class="eavesdrop-btn listen-btn">🎧 监听</button>
                </div>
            </div>
        `);

        container.append($content);

        // 忽略
        $content.find('#eavesdrop-ignore-btn').click(function () {
            console.log('[Eavesdrop] 用户忽略对话追踪');
            clearEavesdropState();
            $('#mobile-home-btn').click();
        });

        // 监听
        $content.find('#eavesdrop-listen-btn').click(async function () {
            console.log('[Eavesdrop] 用户开始监听');

            // 注入对话追踪内容到聊天（追加到最后一条AI消息，不新增楼层）
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'eavesdrop',
                    segments: eavesdropData.segments || [],
                    speakers: eavesdropData.speakers || [],
                    callId: eavesdropData.record_id,
                    audioUrl: eavesdropData.audio_url,
                    sceneDescription: eavesdropData.scene_description
                });
                console.log('[Eavesdrop] ✅ 对话追踪内容已追加到聊天');
            } catch (error) {
                console.error('[Eavesdrop] ❌ 注入聊天失败:', error);
            }

            showListeningUI(container, eavesdropData);
        });

        return;
    }

    // ========== 状态2: 无数据 - 显示历史记录 ==========
    container.empty();
    container.append(createNavbar("对话追踪记录"));

    const $content = $(`
        <div class="eavesdrop-history-content">
            <div class="eavesdrop-history-empty">
                <div class="eavesdrop-history-empty-icon">🎧</div>
                <div>正在加载对话追踪记录...</div>
            </div>
        </div>
    `);
    container.append($content);

    // 获取历史记录
    try {
        const chatBranch = getChatBranch();
        if (!chatBranch) {
            $content.html(`
                <div class="eavesdrop-history-empty">
                    <div class="eavesdrop-history-empty-icon">⚠️</div>
                    <div>未检测到对话</div>
                </div>
            `);
            return;
        }

        const apiHost = getApiHost();
        const response = await fetch(`${apiHost}/api/eavesdrop/history/${encodeURIComponent(chatBranch)}?limit=50`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.records || result.records.length === 0) {
            $content.html(`
                <div class="eavesdrop-history-empty">
                    <div class="eavesdrop-history-empty-icon">🎧</div>
                    <div>暂无对话追踪记录</div>
                </div>
            `);
            return;
        }

        // 渲染历史记录列表
        renderHistoryList($content, result.records, container, createNavbar);

    } catch (error) {
        console.error('[Eavesdrop] 获取历史记录失败:', error);
        $content.html(`
            <div class="eavesdrop-history-empty" style="color:#ef4444;">
                <div class="eavesdrop-history-empty-icon">❌</div>
                <div>加载失败: ${error.message}</div>
            </div>
        `);
    }
}

/**
 * 渲染历史记录列表
 * @param {jQuery} $content - 内容容器
 * @param {Array} records - 历史记录数组
 * @param {jQuery} container - App 容器（用于全屏导航）
 * @param {Function} createNavbar - 创建导航栏函数
 */
function renderHistoryList($content, records, container, createNavbar) {
    const historyHtml = records.map(record => {
        const date = record.created_at ? new Date(record.created_at).toLocaleString('zh-CN') : '未知时间';
        const speakers = record.speakers?.join(' & ') || '未知角色';

        return `
            <div class="eavesdrop-history-item" data-record-id="${record.id}">
                <div class="eavesdrop-history-header">
                    <strong class="eavesdrop-history-speakers">🎧 ${speakers}</strong>
                </div>
                <div class="eavesdrop-history-date">📅 ${date}</div>
                ${record.audio_url ? `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div class="play-area" style="flex:1;">
                            <div class="eavesdrop-history-play-area">
                                <span class="eavesdrop-history-play-icon">🎵</span>
                                <span class="eavesdrop-history-play-text">点击重听</span>
                                <span class="eavesdrop-history-play-arrow">→</span>
                            </div>
                        </div>
                        <button class="eavesdrop-history-download-btn" style="background:transparent; border:none; color:#3b82f6; font-size:20px; padding:5px; cursor:pointer;">📥</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    $content.html(historyHtml);

    // 绑定点击事件 - 全屏播放
    $content.find('.eavesdrop-history-item').click(function (e) {
        // 如果点击的是下载按钮,不触发播放
        if ($(e.target).closest('.eavesdrop-history-download-btn').length > 0) {
            return;
        }

        const recordId = $(this).data('record-id');
        const record = records.find(r => r.id === recordId);

        if (!record || !record.audio_url) {
            alert('该记录无法播放');
            return;
        }

        console.log('[Eavesdrop] 播放历史记录(全屏):', record);

        // 进入全屏播放界面
        showHistoryPlaybackUI(container, record, createNavbar);
    });

    // 绑定下载按钮点击事件
    $content.find('.eavesdrop-history-download-btn').click(async function (e) {
        e.stopPropagation();

        const $item = $(this).closest('.eavesdrop-history-item');
        const recordId = $item.data('record-id');
        const record = records.find(r => r.id === recordId);

        if (!record || !record.audio_url) {
            alert('该记录没有音频文件');
            return;
        }

        await downloadAudio(record);
    });
}

/**
 * 显示历史记录播放界面
 * @param {jQuery} container - App 容器
 * @param {Object} record - 历史记录数据
 * @param {Function} createNavbar - 创建导航栏函数
 */
function showHistoryPlaybackUI(container, record, createNavbar) {
    container.empty();

    // 添加导航栏(带返回按钮)
    const $navbar = createNavbar("播放对话追踪");
    container.append($navbar);

    // 监听返回按钮点击 - 停止音频播放
    $navbar.find('.nav-left').off('click').on('click', function () {
        console.log('[Eavesdrop] 用户点击返回,停止音频播放');
        cleanupGlobalPlayer();
        $('#mobile-home-btn').click();
    });

    const speakersText = record.speakers?.join(' & ') || '私聊';

    // 创建播放界面
    const $playbackContent = $(`
        <div class="listening-container">
            <div class="listening-header">
                <div class="listening-avatar">🎧</div>
                <div class="listening-title">${speakersText}</div>
                <div class="listening-duration">00:00</div>
            </div>

            <!-- 音频可视化 -->
            <div class="audio-visualizer listening-visualizer">
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
            </div>

            <!-- 字幕区域 - 多说话人支持 -->
            <div class="listening-subtitle-area">
                <div class="subtitle-speaker"></div>
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

            <div class="listening-playback-buttons">
                <button id="listening-stop-btn" class="listening-stop-btn">■ 停止监听</button>
            </div>
        </div>
    `);

    container.append($playbackContent);

    // 使用共享音频播放器
    const player = new AudioPlayer({
        $container: $playbackContent,
        segments: record.segments || [],
        showSpeaker: true, // eavesdrop 显示说话人
        onEnd: () => {
            console.log('[Eavesdrop] 历史播放完成');
            endPlayback();
        },
        onError: (err) => {
            console.error('[Eavesdrop] 历史播放错误:', err);
            alert('音频播放失败');
            endPlayback();
        }
    });

    // 设置为全局播放器
    setGlobalPlayer(player);

    // 停止按钮
    $playbackContent.find('#listening-stop-btn').click(function () {
        console.log('[Eavesdrop] 用户停止播放');
        player.stop();
        endPlayback();
    });


    // 开始播放
    if (record.audio_url) {
        player.play(record.audio_url);
    } else {
        console.warn('[Eavesdrop] 历史记录没有音频 URL');
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
async function downloadAudio(record) {
    console.log('[Eavesdrop] 用户点击下载对话追踪音频');

    let fullUrl = record.audio_url;
    const apiHost = getApiHost();
    if (fullUrl && fullUrl.startsWith('/')) {
        fullUrl = apiHost + fullUrl;
    }

    const speakers = record.speakers?.join(' & ') || '对话追踪';
    const text = record.segments && record.segments.length > 0
        ? record.segments.map(seg => seg.translation || seg.text || '').join(' ')
        : '历史对话';

    console.log('📥 下载对话追踪音频');
    console.log('  - audioUrl:', fullUrl);
    console.log('  - speakers:', speakers);
    console.log('  - text:', text);

    // 使用 TTS_Events.downloadAudio 下载
    if (window.TTS_Events && window.TTS_Events.downloadAudio) {
        try {
            await window.TTS_Events.downloadAudio(fullUrl, speakers, text);
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
 * 显示监听中界面
 * @param {jQuery} container - App 容器
 * @param {Object} eavesdropData - 对话追踪数据
 */
function showListeningUI(container, eavesdropData) {
    container.empty();

    const speakersText = eavesdropData.speakers?.join(' & ') || '私聊';

    const $listeningContent = $(`
        <div class="listening-container">
            <div class="listening-header">
                <div class="listening-avatar">🎧</div>
                <div class="listening-title">${speakersText}</div>
                <div class="listening-duration">00:00</div>
            </div>
            
            <!-- 音频可视化 -->
            <div class="audio-visualizer listening-visualizer">
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
                <div class="audio-bar"></div>
            </div>

            <!-- 字幕区域 - 多说话人支持 -->
            <div class="listening-subtitle-area">
                <div class="subtitle-speaker"></div>
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

            <button id="listening-stop-btn" class="listening-stop-btn">⏹ 停止监听</button>
        </div>
    `);

    container.append($listeningContent);

    // 使用共享音频播放器
    const player = new AudioPlayer({
        $container: $listeningContent,
        segments: eavesdropData.segments || [],
        showSpeaker: true, // eavesdrop 显示说话人
        onEnd: () => {
            console.log('[Eavesdrop] 监听结束');
            endListening();
        },
        onError: (err) => {
            console.error('[Eavesdrop] 播放错误:', err);
            alert('音频播放失败');
            endListening();
        }
    });

    // 设置为全局播放器（用于外部控制）
    setGlobalPlayer(player);

    // 停止按钮
    $listeningContent.find('#listening-stop-btn').click(function () {
        console.log('[Eavesdrop] 用户停止监听');
        player.stop();
        endListening();
    });

    // 开始播放
    if (eavesdropData.audio_url) {
        player.play(eavesdropData.audio_url);
    } else {
        console.warn('[Eavesdrop] 没有音频 URL');
        endListening();
    }

    function endListening() {
        clearEavesdropState();
        $('#mobile-home-btn').click();
    }
}

/**
 * 清除对话追踪状态
 */
function clearEavesdropState() {
    delete window.TTS_EavesdropData;
    $('#tts-manager-btn').removeClass('eavesdrop-available');
    themeManager.setEavesdropAvailable(false);
}

/**
 * 清理资源
 */
export function cleanup() {
    console.log('[Eavesdrop] 清理资源');
    cleanupGlobalPlayer();
}

export default { render, cleanup };
