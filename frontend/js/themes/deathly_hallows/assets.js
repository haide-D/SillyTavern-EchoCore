// ==================== 专属死亡圣器 UI SVGs ====================

// 死亡圣器 SVG 水印 (监听与通话中共享)
export const HALLOWS_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,10 92,82 8,82" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="50" cy="57" r="25" stroke="currentColor" stroke-width="1.5"/>
    <line x1="50" y1="10" x2="50" y2="82" stroke="currentColor" stroke-width="1.5"/>
</svg>`;

// 等待分隔符
export const DOT_SVG = `<svg viewBox="0 0 4 4"><circle cx="2" cy="2" r="2" fill="currentColor" opacity="0.6"/></svg>`;

// 挂断/停止按鈕 SVG (不同主题可有不同实现，当前为 DeathlyHallows 风格)
export const HANGUP_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 012 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.07 8.18 2 2 0 015 6h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 13.9"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
</svg>`;

// 接听/播放按鈕 SVG
export const ANSWER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.18 2 2 0 015 6h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 13.9a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
</svg>`;

export const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <polygon points="5 3 19 12 5 21 5 3"/>
</svg>`;

// 用户头像占位符 SVG
export const USER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="52" height="52">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
</svg>`;

// 双面镜通讯 (镜子)
export const ICON_INCOMING_CALL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <rect x="5" y="3" width="14" height="18" rx="3" ry="3"/>
    <path d="M15 3v18M9 3v18"/>
    <path d="M12 8l-2 2 2 2"/>
    <path d="M12 16l2-2-2-2"/>
</svg>`;

// 有求必应屋 (门)
export const ICON_SETTINGS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M18 20V6a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v14"/>
    <path d="M2 20h20"/>
    <circle cx="15" cy="12" r="1"/>
</svg>`;

// 冥想盆记忆 (盆与水波)
export const ICON_FAVORITES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M22 9c0 2.2-4.5 4-10 4S2 11.2 2 9s4.5-4 10-4 10 1.8 10 4z"/>
    <path d="M2 9v2c0 2.2 4.5 4 10 4s10-1.8 10-4V9"/>
    <path d="M6 13.5v2c0 2.2 2.5 4 6 4s6-1.8 6-4v-2"/>
    <path d="M12 9c-1 1-2 1-3 0s-2-2-1-3"/>
</svg>`;

// 伸缩耳探听 (耳朵/细线)
export const ICON_EAVESDROP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M11.5 2C15.6 2 19 5.4 19 9.5c0 3.3-2.1 6.2-5 7.1L12 22h-2v-4.5c-2.8-.7-5-3.3-5-6.3 0-3.9 3.1-7 7-7z"/>
    <path d="M11 7c2 0 3 1 3 3 0 1.7-1 2.5-2.5 3"/>
</svg>`;

// 占卜预言图标 (水晶球)
export const ICON_LLM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
    <circle cx="12" cy="10" r="8"/>
    <path d="M8 22h8"/>
    <path d="M10 18h4"/>
    <path d="M12 18v4"/>
    <path d="M10 6a3 3 0 0 1 3 3"/>
</svg>`;

// 呼神护卫图标 (羽毛笔/飞鸟)
export const ICON_PHONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
    <line x1="16" y1="8" x2="2" y2="22"/>
    <line x1="17.5" y1="15" x2="9" y2="6.5"/>
</svg>`;

// 变幻工坊 (魔法调色板与星芒法阵)
export const ICON_THEME_STORE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M12 2a10 10 0 0 0-10 10c0 4.42 3.58 8 8 8 1 0 1.5-.5 1.5-1.2 0-.4-.2-.8-.2-1.3 0-1.7 1.3-3 3-3h1.7c3.3 0 6-2.7 6-6 0-3.6-4.5-6.5-10-6.5z"/>
    <circle cx="6.5" cy="8.5" r="1" fill="currentColor"/>
    <circle cx="10" cy="5.5" r="1" fill="currentColor"/>
    <circle cx="6.5" cy="13" r="1" fill="currentColor"/>
    <path d="M16 16l5-5M19.5 9.5l1.5 1.5M14 18l1.5-1.5"/>
    <path d="M19 3l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z"/>
</svg>`;

