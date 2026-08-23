console.log("🔵 [1] TTS_Utils.js 开始加载...");

// 2. CSS 状态管理
let globalStyleContent = "";

// 1. 正则表达式体系
// ElevenLabs V3 格式: [角色名, 情绪] 或 [角色名, New] 紧跟对白文本
export const ELEVENLABS_V3_REGEX = /\[([^\],:\n]{1,30})\s*[,，]\s*([^\]\n]{1,30})\](?:\s*([^[\n<]+))?/gi;

// 旧版兼容格式: [TTSVoice:角色名:情绪:对白文本]
export const LEGACY_VOICE_TAG_REGEX = /(\s*)\[TTSVoice[:：]\s*([^:：]+)\s*[:：]\s*([^:：]*)\s*[:：]\s*(.*?)\]/gi;

// 默认统一正则 (对外兼容)
export const VOICE_TAG_REGEX = ELEVENLABS_V3_REGEX;

export function getStyleContent() {
    return globalStyleContent;
}

// 动态注入/更新 <link rel="stylesheet"> 标签
export function injectStyleLink(id, url) {
    let $link = $(`#${id}`);
    if ($link.length === 0) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = url;
        document.head.appendChild(link);
    } else {
        $link.attr('href', url);
    }
}

// 注入主页面样式
export function injectStyles() {
    if (!globalStyleContent || $('#tts-style-injection').length > 0) return;
    $('head').append(`<style id="tts-style-injection">${globalStyleContent}</style>`);
}

// 加载 CSS (包含回调机制与标准 link 注入)
export async function loadGlobalCSS(url, afterLoadCallback) {
    try {
        // 优先使用标准 link 标签注入，保障相对路径 @import 正确寻址
        injectStyleLink('tts-global-style-link', url);

        const res = await fetch(url);
        if (res.ok) {
            globalStyleContent = await res.text();
            console.log("[TTS] Style loaded successfully.");

            // 执行回调 (通常用于处理 Iframe 穿透)
            if (afterLoadCallback) afterLoadCallback(globalStyleContent);
        } else {
            console.error("[TTS] Failed to load style.css. Status:", res.status);
        }
    } catch (e) {
        console.error("[TTS] CSS Load Error:", e);
    }
}

// 3. 通知提示 (优化版：支持手机端可靠关闭)
let notificationTimer = null;

export function showNotification(msg, type = 'error') {
    // 清除之前的定时器，避免多个通知冲突
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }

    let $bar = $('#tts-notification-bar');
    if ($bar.length === 0) {
        $('body').append(`
            <div id="tts-notification-bar">
                <span class="tts-notif-msg"></span>
                <span class="tts-notif-close">✕</span>
            </div>
        `);
        $bar = $('#tts-notification-bar');

        // 添加样式（如果尚未添加）
        if ($('#tts-notif-style').length === 0) {
            $('head').append(`
                <style id="tts-notif-style">
                    #tts-notification-bar {
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%) translateY(-100px);
                        padding: 12px 40px 12px 16px;
                        border-radius: 8px;
                        color: white;
                        font-size: 14px;
                        z-index: 99999;
                        opacity: 0;
                        transition: transform 0.3s ease, opacity 0.3s ease;
                        cursor: pointer;
                        max-width: 90%;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    #tts-notification-bar.show {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                    #tts-notification-bar .tts-notif-close {
                        position: absolute;
                        right: 12px;
                        top: 50%;
                        transform: translateY(-50%);
                        font-size: 16px;
                        opacity: 0.7;
                        cursor: pointer;
                        padding: 4px;
                    }
                    #tts-notification-bar .tts-notif-close:hover {
                        opacity: 1;
                    }
                </style>
            `);
        }

        // 点击通知栏任意位置关闭
        $bar.on('click', function () {
            hideNotification();
        });
    }

    const bgColor = type === 'error' ? '#d32f2f' : (type === 'success' ? '#43a047' : '#1976d2');
    $bar.find('.tts-notif-msg').text(msg);
    $bar.css('background', bgColor);

    // 使用 requestAnimationFrame 确保样式应用后再添加动画类
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            $bar.addClass('show');
        });
    });

    // 4秒后自动关闭
    notificationTimer = setTimeout(() => {
        hideNotification();
    }, 4000);
}

function hideNotification() {
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }
    const $bar = $('#tts-notification-bar');
    $bar.removeClass('show');
}

// 4. 拖拽逻辑
export function makeDraggable($el, onClick) {
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, startLeft, startTop;
    const el = $el[0];

    const start = (clientX, clientY) => {
        isDragging = true; hasMoved = false;
        startX = clientX; startY = clientY;
        const rect = el.getBoundingClientRect();
        startLeft = rect.left; startTop = rect.top;
        el.style.right = 'auto';
        el.style.left = startLeft + 'px';
        el.style.top = startTop + 'px';
        $el.css('opacity', '0.8');
    };

    const move = (clientX, clientY) => {
        if (!isDragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved = true;
        el.style.left = (startLeft + dx) + 'px';
        el.style.top = (startTop + dy) + 'px';
    };

    const end = () => {
        isDragging = false;
        $el.css('opacity', '1');
        if (!hasMoved && onClick) onClick();
    };

    $el.on('mousedown', e => { start(e.clientX, e.clientY); });
    $(document).on('mousemove', e => { if (isDragging) { e.preventDefault(); move(e.clientX, e.clientY); } });
    $(document).on('mouseup', () => { if (isDragging) end(); });
    $el.on('touchstart', e => { const touch = e.originalEvent.touches[0]; start(touch.clientX, touch.clientY); });
    $el.on('touchmove', e => { if (isDragging) { if (e.cancelable) e.preventDefault(); const touch = e.originalEvent.touches[0]; move(touch.clientX, touch.clientY); } });
    $el.on('touchend', () => { if (isDragging) end(); });
}

export function generateFingerprint(text) {
    const cleanText = cleanContent(text);
    const len = cleanText.length;
    if (len === 0) return "empty";
    if (len <= 30) {
        return `short_${len}_${cleanText}`;
    }
    const start = cleanText.substring(0, 10);
    const end = cleanText.substring(len - 10);
    const midIndex = Math.floor(len / 2) - 5;
    const mid = cleanText.substring(midIndex, midIndex + 10);
    return `v3_${len}_${start}_${mid}_${end}`;
}

export function extractTextFromNode($node) {
    // 1. 优先使用 data-text (如果存在且不为空) - 修复指纹获取问题
    if ($node.attr('data-text')) {
        return $node.attr('data-text');
    }

    // 2. 查找容器 (兼容 .mes和 .message-body)
    const $mes = $node.is('.mes, .message-body') ? $node : $node.closest('.mes, .message-body');

    if ($mes.length) {
        const $textDiv = $mes.find('.mes_text, .markdown-content');
        if ($textDiv.length) {
            return $textDiv.text();
        }
        return $mes.text();
    }

    return $node.text() || "";
}

function cleanContent(text) {
    if (!text) return "";
    let str = String(text);
    // 排除追加的电话/窃听内容（使用独特标签，不影响指纹计算）
    str = str.replace(/<st-tts-call>[\s\S]*?<\/st-tts-call>/gi, "");
    str = str.replace(/<st-tts-eavesdrop>[\s\S]*?<\/st-tts-eavesdrop>/gi, "");
    // 排除 think 标签
    str = str.replace(/<think>[\s\S]*?<\/think>/gi, "");
    str = str.replace(/\s+/g, "");
    return str;
}

export function getFingerprint($element) {
    const text = extractTextFromNode($element);
    return generateFingerprint(text);
}

/**
 * 生成增强型消息指纹,支持分支共享
 * 策略: mesid + 角色名 + 内容哈希
 * 
 * 优势:
 * - 相同位置、相同内容 → 相同指纹 (跨分支共享)
 * - 相同位置、不同内容 → 不同指纹 (区分分支差异)
 * - 不依赖 chatId,避免分支切换丢失收藏
 */
export function getEnhancedFingerprint($element) {
    try {
        // ✅ 新方案:使用 SillyTavern API 而不是 DOM
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const stContext = window.SillyTavern.getContext();
            const chatMessages = stContext.chat;

            // 1. 从 bubble 的 data-text 获取文本
            let bubbleText = $element.attr('data-text') || $element.data('text');
            if (!bubbleText) {
                bubbleText = extractTextFromNode($element);
            }

            // 2. 在 chat 数组中查找匹配的消息
            // 遍历消息,找到包含这段文本的消息
            let foundMesid = null;
            for (let i = chatMessages.length - 1; i >= 0; i--) {
                const msg = chatMessages[i];
                const msgText = msg.mes || '';

                // 检查消息是否包含这段文本
                if (msgText.includes(bubbleText)) {
                    foundMesid = i;
                    break;
                }
            }

            if (foundMesid === null) {
                foundMesid = 'unknown';
            }

            // 3. 生成指纹
            const textHash = generateSimpleHash(bubbleText);
            const fingerprint = `m${foundMesid}_${textHash}`;

            return fingerprint;
        }

        // ❌ 回退:如果 API 不可用,使用 DOM 方式
        const $msgContainer = $element.closest('.mes, .message-body');
        let messageIndex = 'unknown';
        if ($msgContainer.length) {
            messageIndex = $msgContainer.attr('mesid') || 'unknown';
        }

        let text = $element.attr('data-text') || $element.data('text');
        if (!text) {
            text = extractTextFromNode($element);
        }

        const textHash = generateSimpleHash(text);
        const fingerprint = `m${messageIndex}_${textHash}`;

        return fingerprint;
    } catch (e) {
        return getFingerprint($element);
    }
}

/**
 * 生成简单的文本哈希 (用于指纹)
 * 使用快速哈希算法,确保相同文本产生相同哈希
 */
export function generateSimpleHash(text) {
    const cleanText = cleanContent(text);
    if (!cleanText) return 'empty';

    // 使用简单但有效的哈希算法
    let hash = 0;
    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // 转换为正数并转为36进制(更短)
    return Math.abs(hash).toString(36);
}

/**
 * 获取当前聊天上下文中所有消息的增强指纹
 * 用于收藏匹配、电话历史功能
 * 
 * ✅ 使用 SillyTavern API,不依赖 DOM
 */
export function getCurrentContextFingerprints() {
    const fps = [];

    try {
        // ✅ 使用 SillyTavern API
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const stContext = window.SillyTavern.getContext();
            const chatMessages = stContext.chat;

            // 遍历所有消息
            for (let i = 0; i < chatMessages.length; i++) {
                const msg = chatMessages[i];

                // 跳过系统消息
                if (msg.is_system) continue;

                const msgText = msg.mes || '';
                if (!msgText) continue;

                // 生成消息指纹（基于消息索引 + 内容哈希）
                const textHash = generateSimpleHash(msgText);
                const fp = `m${i}_${textHash}`;
                fps.push(fp);
            }

            return fps;
        }

    } catch (e) {
        // API 失败,使用 DOM 回退
    }

    // DOM 回退方案
    let bubbleCount = 0;
    $('.voice-bubble').each(function () {
        const $bubble = $(this);
        bubbleCount++;

        const $mes = $bubble.closest('.mes, .message-body');
        if (!$mes.length) return;

        const mesid = $mes.attr('mesid');
        if (!mesid) return;

        if ($mes.attr('is_system') === 'true') return;

        let text = $bubble.attr('data-text') || $bubble.data('text');
        if (!text) {
            text = extractTextFromNode($bubble);
        }
        if (!text || text.trim() === '') return;

        const textHash = generateSimpleHash(text);
        const fp = `m${mesid}_${textHash}`;

        if (fp && fp !== 'empty') {
            fps.push(fp);
        }
    });

    return fps;
}

export function getCurrentChatBranch() {
    try {
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            if (ctx.chatId) return ctx.chatId.replace(/\.(jsonl|json)$/i, "");
        }
    } catch (e) { console.error(e); }
    return "default";
}

/**
 * 从消息文本中提取说话人名称
 * @param {string} messageText - 消息文本
 * @returns {string|null} 说话人名称,如果没有找到则返回 null
 */
export function extractSpeaker(messageText) {
    if (!messageText) return null;

    // 1. 优先匹配 ElevenLabs V3 格式: [Speaker, emotion]
    ELEVENLABS_V3_REGEX.lastIndex = 0;
    const v3Match = ELEVENLABS_V3_REGEX.exec(messageText);
    if (v3Match && v3Match[1]) {
        const name = v3Match[1].trim();
        if (name && !name.toLowerCase().startsWith('tts') && name.length <= 30) {
            return name;
        }
    }

    // 2. 兜底匹配旧版 [TTSVoice:Speaker:emotion:text]
    LEGACY_VOICE_TAG_REGEX.lastIndex = 0;
    const legacyMatch = LEGACY_VOICE_TAG_REGEX.exec(messageText);
    return legacyMatch ? legacyMatch[2].trim() : null;
}

/**
 * 从对话消息列表中全面提取所有在场 Speaker (去重)
 * 1. 扫描 ElevenLabs V3 [Speaker, emotion] 标签
 * 2. 兼容扫描旧版 [TTSVoice:Speaker:...] 标签
 * 3. 提取非用户/非系统的发言人字段 msg.name
 * 
 * @param {Array} messages - 消息列表
 * @returns {Array<string>} 去重后的说话人列表
 */
export function extractAllSpeakers(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return [];
    const speakers = new Set();

    for (const msg of messages) {
        if (!msg || msg.is_system) continue;

        // 1. 提取非用户的消息发送者名称 (若有)
        if (!msg.is_user && msg.name && typeof msg.name === 'string') {
            const trimmedName = msg.name.trim();
            if (trimmedName && trimmedName !== 'System' && trimmedName !== 'User') {
                speakers.add(trimmedName);
            }
        }

        const msgText = msg.mes || '';
        if (!msgText) continue;

        // 2. 扫描 ElevenLabs V3 格式: [Speaker, emotion]
        ELEVENLABS_V3_REGEX.lastIndex = 0;
        let match;
        while ((match = ELEVENLABS_V3_REGEX.exec(msgText)) !== null) {
            const speaker = match[1];
            if (speaker && speaker.trim()) {
                const clean = speaker.trim();
                if (!clean.toLowerCase().startsWith('tts') && clean.length <= 30) {
                    speakers.add(clean);
                }
            }
        }

        // 3. 兜底扫描旧版 [TTSVoice:Speaker:...]
        LEGACY_VOICE_TAG_REGEX.lastIndex = 0;
        while ((match = LEGACY_VOICE_TAG_REGEX.exec(msgText)) !== null) {
            const speaker = match[2];
            if (speaker && speaker.trim()) {
                speakers.add(speaker.trim());
            }
        }
    }

    return Array.from(speakers);
}

/**
 * 消息内容提取与过滤
 * 与后端 message_filter.py 逻辑保持一致
 */

/**
 * 提取指定标签内的内容
 * @param {string} text - 原始文本
 * @param {string} tagName - 标签名称（如 "conxt"）
 * @returns {string} - 提取的内容，未找到则返回原文本
 */
export function extractTagContent(text, tagName) {
    if (!text || !tagName || !tagName.trim()) return text;

    // 转义正则特殊字符
    const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`<${escapedTag}>([\\s\\S]*?)</${escapedTag}>`, 'i');
    const match = text.match(pattern);

    return match ? match[1] : text;
}

/**
 * 应用过滤标签
 * 支持三种格式:
 * 1. <xxx> - 过滤 <xxx>...</xxx> 包裹的内容
 * 2. [xxx] - 过滤 [xxx]...[/xxx] 包裹的内容
 * 3. 前缀|后缀 - 过滤以前缀开头、后缀结尾的内容
 * 
 * @param {string} text - 原始文本
 * @param {string} filterTags - 过滤标签配置（逗号分隔）
 * @returns {string} - 过滤后的文本
 */
export function applyFilterTags(text, filterTags) {
    if (!text || !filterTags || !filterTags.trim()) return text;

    let filtered = text;
    const tags = filterTags.split(',').map(t => t.trim()).filter(t => t);

    for (const tag of tags) {
        // 格式3: 前缀|后缀
        if (tag.includes('|')) {
            const parts = tag.split('|');
            if (parts.length === 2 && parts[0] && parts[1]) {
                const prefix = parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const suffix = parts[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(`${prefix}[\\s\\S]*?${suffix}`, 'gi');
                filtered = filtered.replace(pattern, '');
            }
        }
        // 格式1: HTML 风格标签 <xxx>
        else if (tag.startsWith('<') && tag.endsWith('>')) {
            const tagName = tag.slice(1, -1);
            const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`<${escapedTag}[^>]*>[\\s\\S]*?</${escapedTag}>`, 'gi');
            filtered = filtered.replace(pattern, '');
        }
        // 格式2: 方括号风格标签 [xxx]
        else if (tag.startsWith('[') && tag.endsWith(']')) {
            const tagName = tag.slice(1, -1);
            const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`\\[${escapedTag}\\][\\s\\S]*?\\[/${escapedTag}\\]`, 'gi');
            filtered = filtered.replace(pattern, '');
        }
    }

    return filtered;
}

/**
 * 提取并过滤消息内容
 * 1. 如果配置了 extract_tag，先提取标签内容
 * 2. 然后应用 filter_tags 过滤
 * 
 * @param {string} text - 原始文本
 * @param {string} extractTag - 提取标签名称
 * @param {string} filterTags - 过滤标签配置
 * @returns {string} - 处理后的文本
 */
export function extractAndFilter(text, extractTag, filterTags) {
    if (!text) return text;

    let processed = text;

    // 步骤1: 提取标签内容
    if (extractTag && extractTag.trim()) {
        processed = extractTagContent(processed, extractTag.trim());
    }

    // 步骤2: 应用过滤标签
    if (filterTags && filterTags.trim()) {
        processed = applyFilterTags(processed, filterTags);
    }

    // 步骤3: 应用文本发音/敏感字/多音字替换字典
    const settings = (window.TTS_State && window.TTS_State.CACHE && window.TTS_State.CACHE.settings) || {};
    const replacements = (settings.message_processing && settings.message_processing.text_replacements) || null;
    if (replacements && typeof replacements === 'object') {
        processed = applyTextReplacements(processed, replacements);
    }

    return processed;
}

/**
 * 对待合成 TTS 文本执行发音纠正与多音字替换
 * @param {string} text 
 * @param {Object} replacements 
 * @returns {string}
 */
export function applyTextReplacements(text, replacements = {}) {
    if (!text || !replacements || typeof replacements !== 'object') return text;
    const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);
    let result = text;
    for (const key of sortedKeys) {
        if (key && result.includes(key)) {
            result = result.replaceAll(key, String(replacements[key]));
        }
    }
    return result;
}

/**
 * 获取系统最新的远程配置（智能双向同步合并 酒馆 extensionSettings 与 localStorage）
 */
export function getLatestRemoteConfig() {
    let config = { useRemote: false, ip: '', port: 3000, token: '' };
    try {
        let localConfig = null;
        const saved = localStorage.getItem('tts_plugin_remote_config');
        if (saved) {
            try {
                localConfig = JSON.parse(saved);
            } catch (e) { }
        }

        let extConfig = null;
        let context = null;
        if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
            context = window.SillyTavern.getContext();
            extConfig = context?.extensionSettings?.st_direct_tts;
        }

        const localValid = !!(localConfig && localConfig.useRemote && (localConfig.ip || '').trim());
        const extValid = !!(extConfig && extConfig.use_remote && (extConfig.remote_ip || '').trim());

        // 决策：优先使用用户在当前浏览器最新保存的 localConfig，彻底杜绝回退覆盖旧域名
        if (localValid) {
            config.useRemote = true;
            config.ip = (localConfig.ip || '').trim();
            config.port = parseInt(localConfig.port) || 3000;
            config.token = (localConfig.token || '').trim();
            // 同步至 extensionSettings
            if (context && context.extensionSettings) {
                if (!context.extensionSettings.st_direct_tts) {
                    context.extensionSettings.st_direct_tts = {};
                }
                const ext = context.extensionSettings.st_direct_tts;
                ext.use_remote = true;
                ext.remote_ip = config.ip;
                ext.remote_port = config.port;
                ext.remote_token = config.token;
                if (typeof context.saveSettingsDebounced === 'function') {
                    context.saveSettingsDebounced();
                }
            }
        } else if (extValid) {
            config.useRemote = true;
            config.ip = (extConfig.remote_ip || '').trim();
            config.port = parseInt(extConfig.remote_port) || 3000;
            config.token = (extConfig.remote_token || '').trim();
            // 同步至 localStorage
            localStorage.setItem('tts_plugin_remote_config', JSON.stringify({
                useRemote: true,
                ip: config.ip,
                port: config.port,
                token: config.token
            }));
        } else if (localConfig) {
            config.useRemote = !!localConfig.useRemote;
            config.ip = (localConfig.ip || '').trim();
            config.port = parseInt(localConfig.port) || 3000;
            config.token = (localConfig.token || '').trim();
        } else if (extConfig) {
            config.useRemote = !!extConfig.use_remote;
            config.ip = (extConfig.remote_ip || '').trim();
            config.port = parseInt(extConfig.remote_port) || 3000;
            config.token = (extConfig.remote_token || '').trim();
        }
    } catch (e) {
        console.warn("[TTS] 获取远程配置异常:", e);
    }
    return config;
}

/**
 * 标准解析后端 Manager API 与 WebSocket 连接地址 (彻底修复 Issue #2 反向代理 HTTPS 支持)
 * @param {Object} remoteConfig - { useRemote: boolean, ip: string, port: number }
 * @returns {{ httpUrl: string, wsUrl: (path: string) => string, adminUrl: string, isHttps: boolean }}
 */
export function resolveBackendUrls(remoteConfig = {}) {
    const isRemote = !!remoteConfig.useRemote;
    const rawIp = (remoteConfig.ip || '').trim();
    const portVal = parseInt(remoteConfig.port) || 3000;

    // 1. 本地/自动探测
    if (!isRemote || !rawIp) {
        const current = window.location.hostname;
        const isLanOrIPv6 = /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\.|:/.test(current);
        let host = '127.0.0.1';
        if (current === 'localhost' || current === '127.0.0.1') {
            host = '127.0.0.1';
        } else if (isLanOrIPv6) {
            host = current;
        }

        if (host.includes(':') && !host.startsWith('[')) {
            host = `[${host}]`;
        }

        const httpUrl = `http://${host}:${portVal}`;
        return {
            httpUrl,
            wsUrl: (path) => `ws://${host}:${portVal}${path.startsWith('/') ? path : '/' + path}`,
            adminUrl: `${httpUrl}/admin`,
            isHttps: false
        };
    }

    // 2. 远程模式：用户填入完整 http:// 或 https:// URL
    if (/^https?:\/\//i.test(rawIp)) {
        const cleanUrl = rawIp.replace(/\/+$/, '');
        const isHttps = /^https:/i.test(cleanUrl);
        const wsProto = isHttps ? 'wss:' : 'ws:';
        const hostAndPath = cleanUrl.replace(/^https?:\/\//i, '');
        return {
            httpUrl: cleanUrl,
            wsUrl: (path) => `${wsProto}//${hostAndPath}${path.startsWith('/') ? path : '/' + path}`,
            adminUrl: `${cleanUrl}/admin`,
            isHttps
        };
    }

    // 3. 远程模式：用户填入裸 IP 或域名 (如 192.168.1.100 或 tts.example.com 或 192.168.1.5:8000)
    let host = rawIp;
    let port = portVal;

    // 如果包含端口 (非 IPv6)
    if (!host.startsWith('[') && host.includes(':')) {
        const parts = host.split(':');
        if (parts.length === 2 && /^\d+$/.test(parts[1])) {
            host = parts[0];
            port = parseInt(parts[1]);
        }
    }

    if (host.includes(':') && !host.startsWith('[')) {
        host = `[${host}]`;
    }

    const httpUrl = `http://${host}:${port}`;
    return {
        httpUrl,
        wsUrl: (path) => `ws://${host}:${port}${path.startsWith('/') ? path : '/' + path}`,
        adminUrl: `${httpUrl}/admin`,
        isHttps: false
    };
}

/**
 * 获取所有的 MiniMax 音色 (包含官方预设 + 用户自定义保存的克隆音色)
 */
export function getAllMiniMaxVoices() {
    const defaultPresets = [
        { id: "female-shaonv", name: "少女音", description: "清澈灵动、青春活力" },
        { id: "female-yujie", name: "御姐音", description: "成熟知性、冷静优雅" },
        { id: "female-tianmei", name: "甜美音", description: "软萌温柔、甜美治愈" },
        { id: "female-chengshu", name: "成熟女性", description: "沉稳端庄、富有亲和力" },
        { id: "presenter_female", name: "女主持人", description: "标准播音腔、字正腔圆" },
        { id: "audiobook_female_1", name: "女播音员 1", description: "温和叙事、适合故事朗读" },
        { id: "audiobook_female_2", name: "女播音员 2", description: "沉稳大气、情绪充沛" },
        { id: "male-qn-qingse", name: "青涩青年", description: "阳光少年、自然清新" },
        { id: "male-qn-jingying", name: "精英青年", description: "沉稳干练、自信温润" },
        { id: "male-qn-badao", name: "霸道青年", description: "磁性低沉、富有掌控感" },
        { id: "male-qn-daxuesheng", name: "男大学生", description: "清爽随和、日常口语化" },
        { id: "presenter_male", name: "男主持人", description: "浑厚庄重、新闻级播音" },
        { id: "audiobook_male_1", name: "男播音员 1", description: "故事感强、磁性浑厚" },
        { id: "audiobook_male_2", name: "男播音员 2", description: "深度纪录片质感" }
    ];

    const cacheVoices = (window.TTS_State && window.TTS_State.CACHE && Array.isArray(window.TTS_State.CACHE.minimax_voices))
        ? window.TTS_State.CACHE.minimax_voices
        : null;

    let presetVoices = defaultPresets;
    let customVoices = [];

    if (cacheVoices && cacheVoices.length > 0) {
        // 从全局缓存(来自后端)中提取预设与自定义
        const cachePresets = cacheVoices.filter(v => v.category !== 'custom');
        if (cachePresets.length > 0) presetVoices = cachePresets;

        cacheVoices.forEach(v => {
            if (v.category === 'custom' || !presetVoices.some(p => p.id === v.id)) {
                if (!customVoices.some(c => c.id === v.id)) {
                    customVoices.push({
                        id: v.id,
                        name: v.name || v.id,
                        gender: v.gender || 'female',
                        category: 'custom',
                        description: v.description || '用户自定义克隆音色'
                    });
                }
            }
        });
    } else {
        // 兜底: 如果后端缓存尚未到达，尝试从 localStorage 读取
        try {
            const saved = localStorage.getItem('tts_custom_minimax_voices');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) customVoices = parsed;
            }
        } catch (e) { }
    }

    return { presetVoices, customVoices };
}

/**
 * 注册或更新一个用户自定义 MiniMax 音色 (存入本地、全局缓存并持久化至后端)
 */
export async function saveCustomMiniMaxVoice(id, name, gender = 'female') {
    if (!id) return;
    const cleanId = id.startsWith('minimax:') ? id.slice(8) : (id.startsWith('minimax_') ? id.slice(8) : id);
    const cleanName = (name || cleanId).trim();
    
    // 1. 同步更新全局 CACHE
    if (window.TTS_State && window.TTS_State.CACHE) {
        if (!Array.isArray(window.TTS_State.CACHE.minimax_voices)) {
            window.TTS_State.CACHE.minimax_voices = [];
        }
        const list = window.TTS_State.CACHE.minimax_voices;
        const existIdx = list.findIndex(v => v.id === cleanId);
        const item = { id: cleanId, name: cleanName, gender, category: 'custom', description: '用户自定义克隆音色' };
        if (existIdx >= 0) {
            list[existIdx] = { ...list[existIdx], ...item };
        } else {
            list.push(item);
        }
    }

    // 2. 同步更新 localStorage 兜底
    try {
        let localList = [];
        const saved = localStorage.getItem('tts_custom_minimax_voices');
        if (saved) localList = JSON.parse(saved) || [];
        const idx = localList.findIndex(v => v.id === cleanId);
        if (idx >= 0) {
            localList[idx].name = cleanName;
            localList[idx].gender = gender;
        } else {
            localList.push({ id: cleanId, name: cleanName, gender, category: 'custom', description: '用户自定义克隆音色' });
        }
        localStorage.setItem('tts_custom_minimax_voices', JSON.stringify(localList));
    } catch (e) { }

    // 3. 异步持久化到后端
    try {
        if (window.TTS_API && typeof window.TTS_API.addMinimaxVoice === 'function') {
            const res = await window.TTS_API.addMinimaxVoice({
                id: cleanId,
                name: cleanName,
                gender,
                category: 'custom'
            });
            if (res && Array.isArray(res.voices) && window.TTS_State && window.TTS_State.CACHE) {
                window.TTS_State.CACHE.minimax_voices = res.voices;
            }
        }
    } catch (err) {
        console.warn('[ST-Direct-TTS] 持久化自定义音色至后端失败:', err);
    }

    // 4. 局部刷新所有下拉菜单，无缝联动
    if (window.TTS_UI && typeof window.TTS_UI.renderModelOptions === 'function') {
        window.TTS_UI.renderModelOptions();
    }

    return getAllMiniMaxVoices().customVoices;
}

/**
 * 删除一个用户自定义 MiniMax 音色 (同步清理缓存与后端)
 */
export async function deleteCustomMiniMaxVoice(id) {
    if (!id) return;
    const cleanId = id.startsWith('minimax:') ? id.slice(8) : (id.startsWith('minimax_') ? id.slice(8) : id);

    // 1. 清理全局 CACHE
    if (window.TTS_State && window.TTS_State.CACHE && Array.isArray(window.TTS_State.CACHE.minimax_voices)) {
        window.TTS_State.CACHE.minimax_voices = window.TTS_State.CACHE.minimax_voices.filter(v => v.id !== cleanId);
    }

    // 2. 清理 localStorage
    try {
        let localList = [];
        const saved = localStorage.getItem('tts_custom_minimax_voices');
        if (saved) {
            localList = (JSON.parse(saved) || []).filter(v => v.id !== cleanId);
            localStorage.setItem('tts_custom_minimax_voices', JSON.stringify(localList));
        }
    } catch (e) { }

    // 3. 异步请求后端删除
    try {
        if (window.TTS_API && typeof window.TTS_API.deleteMinimaxVoice === 'function') {
            const res = await window.TTS_API.deleteMinimaxVoice(cleanId);
            if (res && Array.isArray(res.voices) && window.TTS_State && window.TTS_State.CACHE) {
                window.TTS_State.CACHE.minimax_voices = res.voices;
            }
        }
    } catch (err) {
        console.warn('[ST-Direct-TTS] 后端删除音色失败:', err);
    }

    // 4. 局部刷新下拉菜单
    if (window.TTS_UI && typeof window.TTS_UI.renderModelOptions === 'function') {
        window.TTS_UI.renderModelOptions();
    }
}

/**
 * 根据 Voice ID 获取友好显示名称 (带标签)
 */
export function getVoiceDisplayName(voiceId) {
    if (!voiceId) return '';
    if (!voiceId.startsWith('minimax:') && !voiceId.startsWith('minimax_')) {
        return voiceId;
    }
    const cleanId = voiceId.startsWith('minimax:') ? voiceId.slice(8) : (voiceId.startsWith('minimax_') ? voiceId.slice(8) : voiceId);
    const { presetVoices, customVoices } = getAllMiniMaxVoices();
    const foundPreset = presetVoices.find(v => v.id === cleanId);
    const foundCustom = customVoices.find(v => v.id === cleanId);
    if (foundCustom) return `✨ ${foundCustom.name} (${cleanId})`;
    if (foundPreset) return `☁️ ${foundPreset.name} (${cleanId})`;
    return `☁️ MiniMax (${cleanId})`;
}

/**
 * 获取携带鉴权 Token 的标准请求头
 * @param {Object} extra - 附加 Headers
 * @returns {Object} 带有 Authorization 与 X-Api-Token 的 Headers
 */
export function getAuthHeaders(extra = {}) {
    const headers = { ...extra };
    let token = '';
    if (window.TTS_API && window.TTS_API.apiToken) {
        token = window.TTS_API.apiToken;
    } else {
        const cfg = getLatestRemoteConfig();
        token = cfg.token || '';
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Api-Token'] = token;
    }
    return headers;
}

if (window.TTS_Utils) {
    window.TTS_Utils.getAuthHeaders = getAuthHeaders;
}

console.log("🟢 [2] TTS_Utils.js 执行完毕");

