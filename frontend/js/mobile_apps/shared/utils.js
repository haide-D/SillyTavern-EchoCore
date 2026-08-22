/**
 * 共享工具函数模块
 * 提供时间格式化、URL 解析等公共功能
 */

/**
 * 格式化时间为 m:ss 格式
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化时间为 mm:ss 格式（带前导零）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
export function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 解析音频 URL，将相对路径转为完整 URL
 * @param {string} url - 原始 URL
 * @returns {string} 完整 URL
 */
export function resolveAudioUrl(url) {
    if (!url) return '';

    // 已经是完整 URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // 相对路径，添加 API Host
    if (url.startsWith('/')) {
        const apiHost = getApiHost();
        return apiHost + url;
    }

    return url;
}

/**
 * 获取当前对话分支 ID
 * @returns {string|null} 对话分支 ID
 */
export function getChatBranch() {
    try {
        // 优先使用 TTS_Utils
        if (window.TTS_Utils && window.TTS_Utils.getCurrentChatBranch) {
            return window.TTS_Utils.getCurrentChatBranch();
        }

        // 回退到 SillyTavern API
        const context = window.SillyTavern?.getContext?.();
        if (context && context.chatId) {
            return context.chatId.replace(/\.(jsonl|json)$/i, "");
        }
    } catch (e) {
        console.error('[SharedUtils] 获取 chat_branch 失败:', e);
    }
    return null;
}

/**
 * 获取 API Host 地址
 * @returns {string} API Host URL
 */
export function getApiHost() {
    // 优先使用 TTS_API
    if (window.TTS_API && window.TTS_API.baseUrl) {
        return window.TTS_API.baseUrl;
    }

    // 优先使用 TTS_State 缓存
    if (window.TTS_State && window.TTS_State.CACHE && window.TTS_State.CACHE.API_URL) {
        return window.TTS_State.CACHE.API_URL;
    }

    // 回退到默认地址
    const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '127.0.0.1'
        : window.location.hostname;
    return `http://${apiHost}:3000`;
}

const MODULE_NAME = 'st_direct_tts';

/**
 * 获取所有 Speaker 自定义头像映射
 * @returns {Record<string, string>}
 */
export function getCustomSpeakerAvatars() {
    try {
        const context = window.SillyTavern?.getContext?.();
        if (context?.extensionSettings?.[MODULE_NAME]?.speaker_avatars) {
            return context.extensionSettings[MODULE_NAME].speaker_avatars;
        }
        const local = localStorage.getItem('tts_plugin_speaker_avatars');
        if (local) return JSON.parse(local);
    } catch (e) {
        console.warn('[SharedUtils] 读取 speaker_avatars 失败:', e);
    }
    return {};
}

/**
 * 保存单个 Speaker 自定义头像
 * @param {string} speakerName - 说话人名称
 * @param {string} avatarUrl - 头像 URL 或相对路径
 */
export function setCustomSpeakerAvatar(speakerName, avatarUrl) {
    if (!speakerName) return;
    try {
        const context = window.SillyTavern?.getContext?.();
        if (context?.extensionSettings) {
            if (!context.extensionSettings[MODULE_NAME]) {
                context.extensionSettings[MODULE_NAME] = {};
            }
            if (!context.extensionSettings[MODULE_NAME].speaker_avatars) {
                context.extensionSettings[MODULE_NAME].speaker_avatars = {};
            }
            if (avatarUrl) {
                context.extensionSettings[MODULE_NAME].speaker_avatars[speakerName] = avatarUrl;
            } else {
                delete context.extensionSettings[MODULE_NAME].speaker_avatars[speakerName];
            }
            if (context.saveSettingsDebounced) context.saveSettingsDebounced();
        }
        // 同步 localStorage 备份
        const avatars = getCustomSpeakerAvatars();
        if (avatarUrl) avatars[speakerName] = avatarUrl;
        else delete avatars[speakerName];
        localStorage.setItem('tts_plugin_speaker_avatars', JSON.stringify(avatars));
    } catch (e) {
        console.error('[SharedUtils] 保存 speaker_avatars 失败:', e);
    }
}

/**
 * 生成优雅的默认头像数据 (SVG Data URI)
 * @param {string} name - 角色名
 * @returns {string}
 */
export function getDefaultAvatarDataUrl(name = '') {
    const char = (name || '客').trim().charAt(0).toUpperCase();
    const colors = [
        ['#4f46e5', '#7c3aed'],
        ['#059669', '#10b981'],
        ['#d97706', '#f59e0b'],
        ['#dc2626', '#ef4444'],
        ['#2563eb', '#3b82f6'],
        ['#7c2d12', '#ea580c'],
        ['#475569', '#64748b']
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const colorPair = colors[Math.abs(hash) % colors.length];
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${colorPair[0]}"/>
                <stop offset="100%" stop-color="${colorPair[1]}"/>
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#grad)"/>
        <text x="50" y="50" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${char}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * 获取角色/Speaker 头像 URL (四级解析)
 * 1. Speaker 自定义独立绑定
 * 2. SillyTavern 全量角色卡匹配 (匹配 name, avatar 文件名等)
 * 3. 用户/玩家自身头像
 * 4. 当前选中的主角色卡
 * @param {string} charName - 角色/Speaker 名称
 * @returns {string|null} 头像 URL
 */
export function getCharacterAvatar(charName = '') {
    const cleanName = (charName || '').trim();

    // 1. 检查 Speaker 自定义独立绑定
    const customAvatars = getCustomSpeakerAvatars();
    if (cleanName && customAvatars[cleanName]) {
        return customAvatars[cleanName];
    }

    try {
        const context = window.SillyTavern?.getContext?.();
        if (!context) return null;

        // 2. 检查是否为用户/玩家
        const userName = (context.name1 || '用户').trim();
        if (cleanName && (cleanName === userName || cleanName === '你' || cleanName === 'User' || cleanName.toLowerCase() === 'user')) {
            if (context.user_avatar) {
                return context.getThumbnailUrl 
                    ? context.getThumbnailUrl('avatar', context.user_avatar)
                    : `/characters/${context.user_avatar}`;
            }
        }

        // 3. 在 SillyTavern 全部角色卡列表中查找
        if (context.characters && Array.isArray(context.characters)) {
            if (cleanName) {
                // 优先完全匹配名称
                let foundChar = context.characters.find(c => c && (c.name === cleanName || c.avatar === cleanName));
                // 次之大小写不敏感匹配
                if (!foundChar) {
                    foundChar = context.characters.find(c => c && c.name && c.name.toLowerCase() === cleanName.toLowerCase());
                }
                // 再次之包含匹配 (如 "哈利" 匹配 "哈利·波特")
                if (!foundChar && cleanName.length >= 2) {
                    foundChar = context.characters.find(c => c && c.name && (c.name.includes(cleanName) || cleanName.includes(c.name)));
                }

                if (foundChar?.avatar) {
                    const url = context.getThumbnailUrl 
                        ? context.getThumbnailUrl('avatar', foundChar.avatar) 
                        : `/characters/${foundChar.avatar}`;
                    return url;
                }
            }

            // 4. 若无指定角色名或未找到，回退到当前主聊角色
            if (context.characterId !== undefined && context.characters[context.characterId]) {
                const currentChar = context.characters[context.characterId];
                if (currentChar?.avatar) {
                    return context.getThumbnailUrl 
                        ? context.getThumbnailUrl('avatar', currentChar.avatar) 
                        : `/characters/${currentChar.avatar}`;
                }
            }
        }
    } catch (e) {
        console.error('[SharedUtils] ❌ 获取角色头像失败:', e);
    }

    return null;
}

/**
 * 渲染角色头像 HTML (带智能兜底)
 * @param {string} charName - 角色名
 * @param {string} [className=''] - 附加 CSS 类
 * @param {string} [style=''] - 行内样式
 * @returns {string} img 或 placeholder HTML
 */
export function renderAvatarHtml(charName = '', className = '', style = '') {
    const avatarUrl = getCharacterAvatar(charName);
    const fallbackUrl = getDefaultAvatarDataUrl(charName);
    const safeUrl = avatarUrl || fallbackUrl;
    return `<img class="${className}" src="${safeUrl}" alt="${charName || 'Avatar'}" style="${style}" onerror="this.onerror=null; this.src='${fallbackUrl}'" />`;
}

