/**
 * 主题感知沉浸式文案与高精 SVG 状态助手
 * 负责去除生硬技术词汇，统一管理默认电话与死亡圣器（哈利波特）主题的拟真文案与 SVG 视觉呈现
 */

export const STATUS_SVGS = {
    // 呼叫与拨出
    phone: `<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    
    // 魔法传讯 / 魔杖
    wand: `<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l5 5M12 7l5 5M2 22l10-10M19 2l1.5 1.5M15 2l.5 2M22 6l-2 .5"/></svg>`,
    
    // 魔法微光 / 星芒
    sparkles: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
    
    // 监听 / 伸缩耳 / 耳机
    ear: `<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 0 4 0"/></svg>`,
    
    // 拨出发射 / 信号直达
    callOut: `<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    dial: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    
    // 当前对话与气泡
    chat: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    
    // 历史时钟
    history: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    
    // 搜索
    search: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    
    // 剧场
    theater: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/></svg>`,
    
    // 添加与辅助操作
    plus: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    star: `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    target: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    users: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    import: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    export: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,

    // 魔法能量 / 闪电共鸣
    bolt: `<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    
    // 旋转加载
    spinner: `<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="animation: pcSpin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    
    // 播放
    play: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    
    // 暂停
    pause: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    
    // 注入
    inject: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    
    // 刷新
    refresh: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`
};

/**
 * 判断当前是否为哈利波特（死亡圣器）主题
 * @returns {boolean}
 */
export function isHarryPotterTheme() {
    if (typeof window === 'undefined') return false;
    const curThemeId = window.TTS_ThemeEngine?.getCurrentThemeId?.() || '';
    return curThemeId === 'deathly_hallows';
}

/**
 * 获取主动电话/呼叫的沉浸文案与状态
 */
export function getCallStatusTexts() {
    const isHP = isHarryPotterTheme();

    if (isHP) {
        return {
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
            emptyCurrentTitle: '当前对话暂无魔法传讯',
            emptyAllTitle: '暂无任何传讯记录',
            emptySub: '点击上方【主动呼叫】挥舞魔杖直连双面镜'
        };
    }

    return {
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
        emptyCurrentTitle: '当前对话暂无通话记录',
        emptyAllTitle: '暂无任何通话历史',
        emptySub: '点击上方【主动呼叫】切换至呼叫面板立即直拨'
    };
}

/**
 * 获取密谈/窃听的沉浸文案与状态
 */
export function getEavesdropStatusTexts() {
    const isHP = isHarryPotterTheme();

    if (isHP) {
        return {
            systemHint: `${STATUS_SVGS.sparkles} 伸缩耳已潜入周围环境，感应多角色设定与秘闻。`,
            step1Prompt: '正在悄悄投掷伸缩耳...',
            step2LLM: (speakers) => `伸缩耳正在探听走廊暗语 (${(speakers || []).join(' & ')})...`,
            step3TTS: '魔法回响清晰化，声音即将传来...',
            btnIdle: `${STATUS_SVGS.wand} 开启伸缩耳探听`,
            btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
            reasonLabel: '探听场景与密谋契机',
            reasonDefault: '深夜在有求必应屋门外的秘密私语',
            tonePlaceholder: '如: 压低嗓音、警惕张望、争执试探、暗中密谋...',
            emptyCurrentTitle: '当前对话暂无探听记录',
            emptyAllTitle: '暂无任何密谈历史',
            emptySub: '点击上方【主动探听】投掷伸缩耳获取回响'
        };
    }

    return {
        systemHint: `${STATUS_SVGS.sparkles} 系统已锁定多角色关联设定与现场环境。`,
        step1Prompt: '正在锁定秘密通讯频段...',
        step2LLM: (speakers) => `正在侦测周围交谈声 (${(speakers || []).join(' & ')})...`,
        step3TTS: '正在降噪并解析声波链路...',
        btnIdle: `${STATUS_SVGS.callOut} 立即开启监听`,
        btnLoading: (text) => `${STATUS_SVGS.spinner} ${text}`,
        reasonLabel: '密谈场景 / 监听主题',
        reasonDefault: '在安静角落探讨近期的秘密计划',
        tonePlaceholder: '如: 压低声音、神色慌张、悄声密谋、冷峻交锋...',
        emptyCurrentTitle: '当前对话暂无监听记录',
        emptyAllTitle: '暂无任何监听历史',
        emptySub: '点击上方【主动监听】即可锁定目标频道直录'
    };
}

/**
 * 获取剧本工坊定向生成时的 3 阶段 Toast 提示
 */
export function getWorkshopStepTexts(type, { caller = '角色', speakers = [] } = {}) {
    const isHP = isHarryPotterTheme();

    if (type === 'phone_call') {
        if (isHP) {
            return {
                step1: '[1/3] 正在挥舞魔杖连接飞路网...',
                step2: '[2/3] 魔力激荡中，等待双面镜应答...',
                step3: `[3/3] 魔法共鸣成型，即将唤出 ${caller} 的声音...`
            };
        }
        return {
            step1: '[1/3] 正在接通通讯链路...',
            step2: '[2/3] 对方正在酝酿通话...',
            step3: `[3/3] 正在建立 ${caller} 的专属语音通道...`
        };
    } else {
        // eavesdrop
        const spkStr = (speakers && speakers.length) ? speakers.join(' & ') : '目标角色';
        if (isHP) {
            return {
                step1: '[1/3] 正在悄悄投掷伸缩耳...',
                step2: `[2/3] 伸缩耳正在探听走廊暗语... (${spkStr})`,
                step3: '[3/3] 魔法回响清晰化，声音即将传来...'
            };
        }
        return {
            step1: '[1/3] 正在锁定秘密通讯频段...',
            step2: `[2/3] 正在侦测现场交谈声... (${spkStr})`,
            step3: '[3/3] 正在解析声波链路并准备接入...'
        };
    }
}
