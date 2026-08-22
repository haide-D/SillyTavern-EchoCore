/**
 * 夜之城·边缘行者 - 专属场景共享组件与导航栏
 * 极高对比度赛博霓虹 · 战术 HUD · 细线高精矢量
 */

import { ThemeState } from '../state.js';
import { CYBER_WATERMARK_SVG, CYBER_ICONS } from '../assets.js';

export const THEME_ICONS = {
    incoming_call: {
        icon: CYBER_ICONS.incoming_call,
        name: '脑机通讯',
        desc: '神经直连 · 频段呼叫',
        tag: '网',
        hex: '0x01_LINK'
    },
    eavesdrop: {
        icon: CYBER_ICONS.eavesdrop,
        name: '深网潜行',
        desc: '频段截获 · 破冰监听',
        tag: '冰',
        hex: '0x02_SNIFF'
    },
    workshop: {
        icon: CYBER_ICONS.workshop,
        name: '超梦刻录',
        desc: '矩阵重构 · 神经叙事',
        tag: '超',
        hex: '0x03_WEAVE'
    },
    favorites: {
        icon: CYBER_ICONS.favorites,
        name: '核心记忆',
        desc: 'Relic 芯片 · 记忆插槽',
        tag: '芯',
        hex: '0x04_CHIP'
    },
    theme_store: {
        icon: CYBER_ICONS.theme_store,
        name: '义体医生',
        desc: '涂装改造 · 神经改装',
        tag: '改',
        hex: '0x05_MOD'
    },
    settings: {
        icon: CYBER_ICONS.settings,
        name: '底层内核',
        desc: '超频协议 · 系统调谐',
        tag: '核',
        hex: '0x06_KERNEL'
    },
    phone_call: {
        icon: CYBER_ICONS.phone_call,
        name: '神经直拨',
        desc: '主动射频 · 直连角色',
        tag: '讯',
        hex: '0x07_DIAL'
    },
    llm_test: {
        icon: CYBER_ICONS.llm_test,
        name: '神经测试',
        desc: '算力推演 · 连通测试',
        tag: '测',
        hex: '0x08_TEST'
    }
};

export function createNavbarForApps(title) {
    const cyberTitles = {
        '系统配置': 'SYS_KERNEL // 系统内核',
        '我的收藏': 'RELIC_MEMORY // 核心记忆',
        '来电记录': 'COMMS_LOG // 通讯记录',
        '主动电话': 'NEURO_COMMS // 脑机通讯',
        '主动拨号': 'NEURO_COMMS // 脑机通讯',
        '对话追踪': 'DEEP_SNIFF // 深网潜行',
        '对话追踪历史': 'SNIFF_LOG // 破冰日志',
        '对话追踪记录': 'SNIFF_LOG // 破冰日志',
        '主动电话测试': 'LINK_TEST // 链路测试',
        'LLM连接测试': 'NEURAL_EVAL // 算力推演',
        '播放历史通话': 'AUDIO_REPLAY // 通讯回放',
        '播放对话追踪': 'SNIFF_REPLAY // 深网回响',
        '主题工坊': 'RIPPERDOC // 义体医生',
        '变幻工坊': 'RIPPERDOC // 义体医生',
        '剧本工坊': 'BRAINDANCE // 超梦刻录',
        '变幻秘典': 'BRAINDANCE // 超梦刻录'
    };
    const finalTitle = cyberTitles[title] || title;

    const $nav = $(`
        <div class="cyber-terminal-navbar" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 42px;
            padding: 8px 20px;
            background: #080D16;
            border-bottom: 1px solid #00F0FF;
            color: #CBD5E1;
            font-family: ui-monospace, 'Cascadia Code', 'JetBrains Mono', Consolas, monospace;
            font-size: 12.5px;
            box-sizing: border-box;
            user-select: none;
            flex-shrink: 0;
        ">
            <!-- 左侧：返回命令行 -->
            <div class="cyber-nav-back-btn" style="
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                color: #FFE600;
                font-weight: 700;
                transition: color 0.15s ease;
            ">
                <span>&lt;</span>
                <span>[ RETURN // /bin/back ]</span>
            </div>

            <!-- 中间：当前协议标题 -->
            <div style="
                color: #00F0FF;
                font-weight: 700;
                letter-spacing: 1px;
            ">
                === ${finalTitle} ===
            </div>

            <!-- 右侧：断开退出 -->
            <div class="cyber-nav-exit-btn" style="
                color: #FF003C;
                font-weight: 700;
                cursor: pointer;
                transition: color 0.15s ease;
            ">
                [ ✕ DISCONNECT ]
            </div>
        </div>
    `);

    $nav.find('.cyber-nav-back-btn').hover(
        function() { $(this).css({ 'color': '#00F0FF', 'text-decoration': 'underline' }); },
        function() { $(this).css({ 'color': '#FFE600', 'text-decoration': 'none' }); }
    ).on('click', () => {
        if (ThemeState.engine) {
            ThemeState.engine.goHome();
        }
    });

    $nav.find('.cyber-nav-exit-btn').hover(
        function() { $(this).css({ 'color': '#FFFFFF', 'text-decoration': 'underline' }); },
        function() { $(this).css({ 'color': '#FF003C', 'text-decoration': 'none' }); }
    ).on('click', () => {
        if (ThemeState.engine) {
            ThemeState.engine.close();
        }
    });

    return $nav;
}

// 赛博朋克专属全屏沉浸式通话/窃听界面构建器
export function buildCallScreen(id, themeClass, avatarHtml, name, bodyHtml) {
    return $(`
        <div id="${id}" class="${themeClass}">
            <div class="cyber-bg-watermark">${CYBER_WATERMARK_SVG}</div>
            <div class="cyber-call-content">
                <div class="cyber-call-avatar-wrap">
                    <div class="cyber-call-avatar-ring outer"></div>
                    <div class="cyber-call-avatar-ring"></div>
                    <div class="cyber-call-avatar-img">${avatarHtml}</div>
                </div>
                <p class="cyber-call-name">${name}</p>
                ${bodyHtml}
            </div>
        </div>
    `);
}
