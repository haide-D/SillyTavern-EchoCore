/**
 * 主题感知沉浸式文案与高精 SVG 状态助手 (Theme Status Helper)
 * 共有架构：支持内置主题与导入外部主题动态注册专属拟物化文案与 SVG 视觉
 * 铁律：全面禁止使用 Emoji 表情，100% 采用高精矢量 SVG 与 currentColor 渲染！
 */

// 外部/导入主题动态注册表
const _themeStatusRegistry = {};

export const STATUS_SVGS = {
    // 呼叫与拨出
    phone: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    
    // 魔法传讯 / 魔杖
    wand: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l5 5M12 7l5 5M2 22l10-10M19 2l1.5 1.5M15 2l.5 2M22 6l-2 .5"/></svg>`,
    
    // 仙侠修真：凌霄飞剑
    sword: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>`,

    // 仙侠修真：天机道藏长卷 / 残卷
    scroll: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/></svg>`,

    // 仙侠修真：无上神识 / 天眼灵眸
    divineEye: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>`,

    // 仙侠修真：仙门八卦 / 灵印
    bagua: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a5 5 0 0 0 0 10 5 5 0 0 1 0 10"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="17" r="1.5" fill="currentColor"/></svg>`,

    // 仙侠修真：仙符灵篆
    talisman: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><line x1="9" x2="15" y1="7" y2="7"/><line x1="9" x2="15" y1="11" y2="11"/><line x1="9" x2="12" y1="15" y2="15"/></svg>`,

    // 平安落樱：五瓣樱花
    sakura: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.5c-1-2.5-3.5-3-5-2-1.5 1-1.5 3.5 0 5 1.5 1.5 5 1.5 5 1.5s3.5 0 5-1.5c1.5-1.5 1.5-4 0-5-1.5-1-4-.5-5 2z"/><path d="M7.5 12c-2.5-1-3-3.5-2-5 1-1.5 3.5-1.5 5 0 1.5 1.5 1.5 5 1.5 5s0 3.5-1.5 5c-1.5 1.5-4 1.5-5 0-1-1.5-.5-4 2-5z"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,

    // 平安落樱：纸鹤式神
    crane: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L4 11 L12 10 L20 11 Z"/><path d="M12 10 L12 21 L7 16"/><path d="M12 10 L17 16"/></svg>`,

    // 平安落樱：和风折扇
    fan: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18 A 12 12 0 0 1 21 18 L 17 19 A 7 7 0 0 0 7 19 Z"/><line x1="12" y1="21" x2="12" y2="10"/><circle cx="12" cy="21" r="1.5" fill="currentColor"/></svg>`,

    // 赛博边缘：脑机芯片 / 准星
    cyberChip: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7,2 17,2 22,7 22,17 17,22 7,22 2,17 2,7"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>`,
    cyberSignal: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M7 7 A 7 7 0 0 0 7 17"/><path d="M17 7 A 7 7 0 0 1 17 17"/></svg>`,

    // 魔法微光 / 星芒
    sparkles: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
    
    // 监听 / 伸缩耳 / 耳机
    ear: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 0 4 0"/></svg>`,
    
    // 拨出发射 / 信号直达
    callOut: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    dial: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    
    // 当前对话与气泡 (纯净矢量)
    chat: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    
    // 历史时钟
    history: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    
    // 搜索
    search: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    
    // 剧场 / 密谈
    theater: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/></svg>`,
    
    // 添加与辅助操作
    plus: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    star: `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    target: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    users: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    import: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    export: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,

    // 能量与特效
    bolt: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    spinner: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="animation: pcSpin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    play: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    inject: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`
};

/**
 * 共有方法：注册主题专属的沉浸式文案与 SVG 图标池
 * @param {string} themeId - 主题唯一 ID
 * @param {Object} statusConfig - { call: {...}, eavesdrop: {...}, workshop: Function }
 */
export function registerThemeStatusTexts(themeId, statusConfig) {
    if (!themeId || !statusConfig) return;
    _themeStatusRegistry[themeId] = statusConfig;
}

/**
 * 获取当前激活的主题 ID
 */
export function getCurrentThemeId() {
    if (typeof window === 'undefined') return 'default';
    return window.TTS_ThemeEngine?.getCurrentThemeId?.() || 'default';
}

/**
 * 判断当前是否为哈利波特（死亡圣器）主题（保持向后兼容导出）
 * @returns {boolean}
 */
export function isHarryPotterTheme() {
    return getCurrentThemeId() === 'deathly_hallows';
}

/**
 * 获取主动电话/呼叫的沉浸文案与状态
 */
export function getCallStatusTexts() {
    const themeId = getCurrentThemeId();
    const currentTheme = window.TTS_ThemeEngine?.getCurrentTheme?.();

    // 1. 优先读取主题实例自身的 statusTexts / getStatusTexts
    if (currentTheme?.statusTexts?.call) {
        return currentTheme.statusTexts.call;
    }
    if (typeof currentTheme?.getStatusTexts === 'function') {
        const res = currentTheme.getStatusTexts('phone_call');
        if (res) return res;
    }

    // 2. 读取共有注册表
    if (_themeStatusRegistry[themeId]?.call) {
        return _themeStatusRegistry[themeId].call;
    }

    // 3. 内置：夜之城·边缘行者 (cyberpunk_edgerunners) - 100% 高精矢量 SVG 结构
    if (themeId === 'cyberpunk_edgerunners') {
        return {
            tabCurrent: `${STATUS_SVGS.chat} 实时通讯`,
            tabAll: `${STATUS_SVGS.history} 通讯日志`,
            tabDial: `${STATUS_SVGS.cyberSignal} 神经直连`,
            systemHint: `${STATUS_SVGS.cyberChip} 脑机接口已接入角色神经协议与当前记忆矩阵。`,
            step1Prompt: '正在建立量子加密神经链路...',
            step2LLM: '斯安威逊超频运算中，等待对方回音...',
            step3TTS: '神经音频流解码成型，声音即将呈现...',
            btnIdle: `${STATUS_SVGS.cyberSignal} 发起脑机直连`,
            btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
            reasonLabel: '通讯动机与事件触发',
            reasonDefault: '想通过神经链路与你实时交换情报',
            targetPlaceholder: '如: 边缘行者 / 义体医生 / 佣兵队长...',
            tonePlaceholder: '如: 压低嗓音密谋、急促警报、冷峻交涉、傲娇调侃...',
            emptyIcon: STATUS_SVGS.cyberSignal,
            emptyCurrentTitle: '当前频段暂无通讯数据',
            emptyAllTitle: '深网总库暂无通讯记录',
            emptySub: '点击上方【神经直连】发起直连脑机呼叫',
            emptyBtnText: `${STATUS_SVGS.history} 查阅通讯日志`
        };
    }

    // 4. 内置：落樱雅境 (sakura_elegance) - 100% 高精矢量 SVG 结构
    if (themeId === 'sakura_elegance') {
        return {
            tabCurrent: `${STATUS_SVGS.chat} 当下前尘`,
            tabAll: `${STATUS_SVGS.scroll} 雅阁总录`,
            tabDial: `${STATUS_SVGS.crane} 纸鹤传音`,
            systemHint: `${STATUS_SVGS.sakura} 平安法仪已感应式神名号与当下言灵。`,
            step1Prompt: '正在唤出传信纸鹤...',
            step2LLM: '结界微光流转，静候式神回音...',
            step3TTS: '言灵共振，纸鹤传音即刻显现...',
            btnIdle: `${STATUS_SVGS.crane} 唤出传信纸鹤`,
            btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
            reasonLabel: '传音契机与因由',
            reasonDefault: '欲借纸鹤传音互通近况',
            targetPlaceholder: '如: 阴阳师大人 / 雅阁知己 / 神社式神...',
            tonePlaceholder: '如: 呢喃轻语、含蓄温婉、急切传信、从容雅致...',
            emptyIcon: STATUS_SVGS.crane,
            emptyCurrentTitle: '当前雅卷暂无纸鹤传讯',
            emptyAllTitle: '平安总录暂无传书记录',
            emptySub: '点击上方【纸鹤传音】呼唤式神传音入密',
            emptyBtnText: `${STATUS_SVGS.scroll} 查阅平安总录`
        };
    }

    // 4. 内置：仙途凌霄 (immortal_sword) - 100% 高精矢量 SVG 结构
    if (themeId === 'immortal_sword') {
        return {
            tabCurrent: `${STATUS_SVGS.chat} 当下前尘`,
            tabAll: `${STATUS_SVGS.scroll} 乾坤总录`,
            tabDial: `${STATUS_SVGS.sword} 祭剑传书`,
            systemHint: `${STATUS_SVGS.bagua} 乾坤法仪已感应仙友道号、仙门大势与前尘记忆。`,
            step1Prompt: '正在凝聚剑意祭出传讯灵剑...',
            step2LLM: '灵力激荡，静候仙友神识回音...',
            step3TTS: '道音破空，飞剑传书即刻显现...',
            btnIdle: `${STATUS_SVGS.sword} 祭出飞剑传书`,
            btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
            reasonLabel: '传书契机与因由',
            reasonDefault: '欲借飞剑传书互通修行近况',
            targetPlaceholder: '如: 师尊 / 剑仙道友 / 宗门掌教...',
            tonePlaceholder: '如: 神识急切示警、清冷质问、温柔呢喃、论道切磋...',
            emptyIcon: STATUS_SVGS.sword,
            emptyCurrentTitle: '当前卷轴暂无飞剑传讯',
            emptyAllTitle: '万象仙录暂无传书记录',
            emptySub: '点击上方【祭剑传书】祭出本命灵剑万里传音',
            emptyBtnText: `${STATUS_SVGS.scroll} 翻阅乾坤总录`
        };
    }

    // 4. 内置：死亡圣器 (deathly_hallows) - 100% 高精矢量 SVG 结构
    if (themeId === 'deathly_hallows') {
        return {
            tabCurrent: `${STATUS_SVGS.chat} 镜中回响`,
            tabAll: `${STATUS_SVGS.history} 冥想盆记忆`,
            tabDial: `${STATUS_SVGS.wand} 魔法传讯`,
            systemHint: `${STATUS_SVGS.sparkles} 双面镜已感应角色人设、魔法世界与当前记忆。`,
            step1Prompt: '正在挥舞魔杖连接飞路网...',
            step2LLM: '魔力激荡中，等待双面镜应答...',
            step3TTS: '魔法共鸣成型，声音即将显现...',
            btnIdle: `${STATUS_SVGS.wand} 施展魔法传讯`,
            btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
            reasonLabel: '传讯契机与事由',
            reasonDefault: '想借双面镜与你互通近况',
            targetPlaceholder: '如: 巫师伙伴 / 邓布利多 / 哈利...',
            tonePlaceholder: '如: 密谋私语、惊慌示警、傲慢质问、深情低语...',
            emptyIcon: STATUS_SVGS.wand,
            emptyCurrentTitle: '双面镜中暂无镜影回响',
            emptyAllTitle: '冥想盆中暂无传讯记忆',
            emptySub: '挥动魔杖连接双面镜发起魔法传讯',
            emptyBtnText: `${STATUS_SVGS.history} 翻阅冥想盆记忆`
        };
    }

    // 5. 默认现代主题保底 - 100% 高精矢量 SVG 结构
    return {
        tabCurrent: `${STATUS_SVGS.chat} 当前对话`,
        tabAll: `${STATUS_SVGS.history} 总历史`,
        tabDial: `${STATUS_SVGS.callOut} 主动呼叫`,
        systemHint: `${STATUS_SVGS.sparkles} 系统已挂载当前角色人设、世界设定与上下文。`,
        step1Prompt: '正在接通通讯链路...',
        step2LLM: '对方正在酝酿通话...',
        step3TTS: '正在建立实时语音通道...',
        btnIdle: `${STATUS_SVGS.callOut} 立即呼出电话`,
        btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
        reasonLabel: '通话动机',
        reasonDefault: '想与你通电话聊聊近况',
        targetPlaceholder: '如: 探长 / 旅人 / 用户名...',
        tonePlaceholder: '如: 温柔轻语、急促慌张、傲娇质问、深情想念...',
        emptyIcon: STATUS_SVGS.phone,
        emptyCurrentTitle: '当前对话暂无通话记录',
        emptyAllTitle: '暂无任何通话历史',
        emptySub: '点击上方【主动呼叫】切换至呼叫面板立即直拨',
        emptyBtnText: `${STATUS_SVGS.history} 查看总历史记录`
    };
}

/**
 * 获取密谈/窃听的沉浸文案与状态
 */
export function getEavesdropStatusTexts() {
    const themeId = getCurrentThemeId();
    const currentTheme = window.TTS_ThemeEngine?.getCurrentTheme?.();

    // 1. 优先读取主题实例自身的 statusTexts / getStatusTexts
    if (currentTheme?.statusTexts?.eavesdrop) {
        return currentTheme.statusTexts.eavesdrop;
    }
    if (typeof currentTheme?.getStatusTexts === 'function') {
        const res = currentTheme.getStatusTexts('eavesdrop');
        if (res) return res;
    }

    // 2. 读取共有注册表
    if (_themeStatusRegistry[themeId]?.eavesdrop) {
        return _themeStatusRegistry[themeId].eavesdrop;
    }

    // 3. 内置：夜之城·边缘行者 (cyberpunk_edgerunners) - 100% 高精矢量 SVG 结构
    if (themeId === 'cyberpunk_edgerunners') {
        return {
            tabCurrent: `${STATUS_SVGS.chat} 实时截获`,
            tabAll: `${STATUS_SVGS.history} 破冰日志`,
            tabLaunch: `${STATUS_SVGS.cyberChip} 深网破冰`,
            systemHint: `${STATUS_SVGS.cyberSignal} ICE 破冰协议已部署，正在侦测周围暗语频段。`,
            step1Prompt: '正在注入深网 ICE 破冰算法...',
            step2LLM: (speakers) => `正在解密拦截到的神经暗语 (${(speakers || []).join(' // ')})...`,
            step3TTS: '声纹数据流还原中，窃听音频即将接入...',
            btnIdle: `${STATUS_SVGS.cyberChip} 开启深网破冰`,
            btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
            reasonLabel: '破冰目标场景与暗语背景',
            reasonDefault: '在夜之城隐秘会所外的加密私语',
            tonePlaceholder: '如: 压低嗓音密谋、神情紧张、暗中交易、冷酷质问...',
            emptyIcon: STATUS_SVGS.cyberChip,
            emptyCurrentTitle: '当前频段暂无破冰数据',
            emptyAllTitle: '深网总库暂无截获记录',
            emptySub: '点击上方【深网破冰】锁定目标频段开启监听',
            emptyBtnText: `${STATUS_SVGS.history} 查阅破冰日志`
        };
    }

    // 4. 内置：落樱雅境 (sakura_elegance) - 100% 高精矢量 SVG 结构
    if (themeId === 'sakura_elegance') {
        return {
            tabCurrent: `${STATUS_SVGS.chat} 当下前尘`,
            tabAll: `${STATUS_SVGS.scroll} 言灵总卷`,
            tabLaunch: `${STATUS_SVGS.sakura} 结界灵视`,
            systemHint: `${STATUS_SVGS.sakura} 结界已悄然展开，感应诸位式神私语。`,
            step1Prompt: '正在展开落樱灵视结界...',
            step2LLM: (speakers) => `正在探听言灵私语 (${(speakers || []).join(' ✦ ')})...`,
            step3TTS: '言灵共鸣，密语私言即将传来...',
            btnIdle: `${STATUS_SVGS.sakura} 展开结界探查`,
            btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
            reasonLabel: '探查场景与因由',
            reasonDefault: '深夜在花阁门外的密语探讨',
            tonePlaceholder: '如: 压低嗓音、警惕探寻、暗中私语、柔声交锋...',
            emptyIcon: STATUS_SVGS.sakura,
            emptyCurrentTitle: '当前天地暂无言灵回响',
            emptyAllTitle: '平安总卷暂无私语记录',
            emptySub: '点击上方【结界灵视】展开结界探查式神私语',
            emptyBtnText: `${STATUS_SVGS.scroll} 查阅言灵总卷`
        };
    }

    // 4. 内置：仙途凌霄 (immortal_sword) - 100% 高精矢量 SVG 结构
    if (themeId === 'immortal_sword') {
        return {
            tabCurrent: `${STATUS_SVGS.chat} 当下前尘`,
            tabAll: `${STATUS_SVGS.scroll} 乾坤残卷`,
            tabLaunch: `${STATUS_SVGS.divineEye} 释放神识`,
            systemHint: `${STATUS_SVGS.bagua} 神识已悄然潜入九霄云界，感应诸位仙友密语。`,
            step1Prompt: '正在展开无上神识领域...',
            step2LLM: (speakers) => `神识正在探听隐秘道语 (${(speakers || []).join(' ✦ ')})...`,
            step3TTS: '道法共振，神识私语即将传来...',
            btnIdle: `${STATUS_SVGS.divineEye} 展开神识探查`,
            btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
            reasonLabel: '探查场景与因由',
            reasonDefault: '深夜在隐秘洞府门外的私密探讨',
            tonePlaceholder: '如: 压低道音、警惕防范、暗中推演、争执交锋...',
            emptyIcon: STATUS_SVGS.bagua,
            emptyCurrentTitle: '当前天地暂无神识回响',
            emptyAllTitle: '六界之内暂无私语残卷',
            emptySub: '点击上方【释放神识】展开神识探查天地私语',
            emptyBtnText: `${STATUS_SVGS.scroll} 查阅乾坤残卷`
        };
    }

    // 4. 内置：死亡圣器 (deathly_hallows) - 100% 高精矢量 SVG 结构
    if (themeId === 'deathly_hallows') {
        return {
            tabCurrent: `${STATUS_SVGS.chat} 门后私语`,
            tabAll: `${STATUS_SVGS.history} 隐秘秘闻`,
            tabLaunch: `${STATUS_SVGS.ear} 伸缩耳探听`,
            systemHint: `${STATUS_SVGS.sparkles} 伸缩耳已潜入周围环境，感应多角色设定与秘闻。`,
            step1Prompt: '正在悄悄投掷伸缩耳...',
            step2LLM: (speakers) => `伸缩耳正在探听门后暗语 (${(speakers || []).join(' & ')})...`,
            step3TTS: '魔法回响清晰化，声音即将传来...',
            btnIdle: `${STATUS_SVGS.wand} 开启伸缩耳探听`,
            btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
            reasonLabel: '探听场景与密谋契机',
            reasonDefault: '深夜在有求必应屋门外的秘密私语',
            tonePlaceholder: '如: 压低嗓音、警惕张望、争执试探、暗中密谋...',
            emptyIcon: STATUS_SVGS.ear,
            emptyCurrentTitle: '伸缩耳暂未捕捉到私语',
            emptyAllTitle: '冥想盆中暂无窃听秘闻',
            emptySub: '投掷伸缩耳探听门后的隐秘私语',
            emptyBtnText: `${STATUS_SVGS.history} 查阅隐秘秘闻`
        };
    }

    // 5. 默认现代主题保底 - 100% 高精矢量 SVG 结构
    return {
        tabCurrent: `${STATUS_SVGS.chat} 当前对话`,
        tabAll: `${STATUS_SVGS.history} 总历史`,
        tabLaunch: `${STATUS_SVGS.theater} 开启密谈`,
        systemHint: `${STATUS_SVGS.sparkles} 系统已锁定多角色关联设定与现场环境。`,
        step1Prompt: '正在锁定秘密通讯频段...',
        step2LLM: (speakers) => `正在侦测周围交谈声 (${(speakers || []).join(' & ')})...`,
        step3TTS: '正在降噪并解析声波链路...',
        btnIdle: `${STATUS_SVGS.callOut} 立即开启监听`,
        btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
        reasonLabel: '密谈场景 / 监听主题',
        reasonDefault: '在安静角落探讨近期的秘密计划',
        tonePlaceholder: '如: 压低声音、神色慌张、悄声密谋、冷峻交锋...',
        emptyIcon: STATUS_SVGS.ear,
        emptyCurrentTitle: '当前对话暂无监听记录',
        emptyAllTitle: '暂无任何监听历史',
        emptySub: '点击上方【主动监听】即可锁定目标频道直录',
        emptyBtnText: `${STATUS_SVGS.history} 查看总历史记录`
    };
}

/**
 * 获取剧本工坊定向生成时的 3 阶段 Toast 提示
 */
export function getWorkshopStepTexts(type, { caller = '角色', speakers = [] } = {}) {
    const themeId = getCurrentThemeId();
    const currentTheme = window.TTS_ThemeEngine?.getCurrentTheme?.();

    if (typeof currentTheme?.getWorkshopStepTexts === 'function') {
        const customRes = currentTheme.getWorkshopStepTexts(type, { caller, speakers });
        if (customRes) return customRes;
    }

    if (themeId === 'cyberpunk_edgerunners') {
        if (type === 'phone_call') {
            return {
                step1: '[1/3] 正在建立量子加密神经链路...',
                step2: `[2/3] 斯安威逊超频运算中，等待 ${caller} 神经回音...`,
                step3: `[3/3] 神经音频流解码成型，即将接通 ${caller} 的脑机语音...`
            };
        } else {
            const spkStr = (speakers && speakers.length) ? speakers.join(' // ') : '目标神经频段';
            return {
                step1: '[1/3] 正在注入深网 ICE 破冰算法...',
                step2: `[2/3] 正在解密拦截到的暗语频段... (${spkStr})`,
                step3: '[3/3] 声纹数据流还原中，窃听音频即将接入...'
            };
        }
    }

    if (themeId === 'sakura_elegance') {
        if (type === 'phone_call') {
            return {
                step1: '[1/3] 正在唤出传信纸鹤...',
                step2: `[2/3] 结界微光流转，静候 ${caller} 回音...`,
                step3: `[3/3] 言灵共振，${caller} 纸鹤传音即刻显现...`
            };
        } else {
            const spkStr = (speakers && speakers.length) ? speakers.join(' ✦ ') : '诸位式神';
            return {
                step1: '[1/3] 正在展开落樱灵视结界...',
                step2: `[2/3] 结界正在感应言灵私语... (${spkStr})`,
                step3: '[3/3] 言灵共鸣，密语私言即将传来...'
            };
        }
    }

    if (themeId === 'immortal_sword') {
        if (type === 'phone_call') {
            return {
                step1: '[1/3] 正在凝聚剑意祭出传讯灵剑...',
                step2: `[2/3] 灵力激荡，静候 ${caller} 神识回音...`,
                step3: `[3/3] 道音破空，${caller} 飞剑传书即刻显现...`
            };
        } else {
            const spkStr = (speakers && speakers.length) ? speakers.join(' ✦ ') : '诸位道友';
            return {
                step1: '[1/3] 正在展开无上神识领域...',
                step2: `[2/3] 神识正在探听天地隐秘... (${spkStr})`,
                step3: '[3/3] 道法共振，神识私语即将传来...'
            };
        }
    }

    if (themeId === 'deathly_hallows') {
        if (type === 'phone_call') {
            return {
                step1: '[1/3] 正在挥舞魔杖连接飞路网...',
                step2: '[2/3] 魔力激荡中，等待双面镜应答...',
                step3: `[3/3] 魔法共鸣成型，即将唤出 ${caller} 的声音...`
            };
        } else {
            const spkStr = (speakers && speakers.length) ? speakers.join(' & ') : '目标角色';
            return {
                step1: '[1/3] 正在悄悄投掷伸缩耳...',
                step2: `[2/3] 伸缩耳正在探听走廊暗语... (${spkStr})`,
                step3: '[3/3] 魔法回响清晰化，声音即将传来...'
            };
        }
    }

    if (type === 'phone_call') {
        return {
            step1: '[1/3] 正在接通通讯链路...',
            step2: '[2/3] 对方正在酝酿通话...',
            step3: `[3/3] 正在建立 ${caller} 的专属语音通道...`
        };
    } else {
        const spkStr = (speakers && speakers.length) ? speakers.join(' & ') : '目标角色';
        return {
            step1: '[1/3] 正在锁定秘密通讯频段...',
            step2: `[2/3] 正在侦测现场交谈声... (${spkStr})`,
            step3: '[3/3] 正在解析声波链路并准备接入...'
        };
    }
}

// 挂载到全局 window 供导入的主题与外部扩展调用
if (typeof window !== 'undefined') {
    window.TTS_ThemeStatusHelper = {
        STATUS_SVGS,
        registerThemeStatusTexts,
        getCallStatusTexts,
        getEavesdropStatusTexts,
        getWorkshopStepTexts,
        getCurrentThemeId,
        isHarryPotterTheme
    };
}
