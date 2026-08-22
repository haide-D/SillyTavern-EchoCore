/**
 * 平安京·落樱雅境 - 专属场景共享组件与导航栏
 * 平安风雅 · 莫兰迪薄樱 · 细线白描
 */

import { ThemeState } from '../state.js';
import { SAKURA_WATERMARK_SVG, SAKURA_ICONS } from '../assets.js';

export const THEME_ICONS = {
    incoming_call: {
        icon: SAKURA_ICONS.incoming_call,
        name: '纸鹤传音',
        desc: '灵鸟衔枝 · 传音入密',
        tag: '信'
    },
    eavesdrop: {
        icon: SAKURA_ICONS.eavesdrop,
        name: '灵视言灵',
        desc: '心念互通 · 落樱无声',
        tag: '境'
    },
    workshop: {
        icon: SAKURA_ICONS.workshop,
        name: '百鬼百绘',
        desc: '绘卷流转 · 笔落惊鸿',
        tag: '卷'
    },
    favorites: {
        icon: SAKURA_ICONS.favorites,
        name: '结缘御守',
        desc: '同心相系 · 祈愿常在',
        tag: '缘'
    },
    theme_store: {
        icon: SAKURA_ICONS.theme_store,
        name: '莳绘花坊',
        desc: '万象幻染 · 点缀风华',
        tag: '坊'
    },
    settings: {
        icon: SAKURA_ICONS.settings,
        name: '阴阳寮律',
        desc: '天平规度 · 执掌万象',
        tag: '律'
    },
    phone_call: {
        icon: SAKURA_ICONS.phone_call,
        name: '纸鹤传信',
        desc: '主动通感 · 呼唤式神',
        tag: '召'
    },
    llm_test: {
        icon: SAKURA_ICONS.llm_test,
        name: '灵识八卦',
        desc: '天机演算 · 测度灵能',
        tag: '卜'
    }
};

export function createNavbarForApps(title) {
    const sakuraTitles = {
        '系统配置': '阴阳寮律 (设置)',
        '我的收藏': '结缘道藏 (收藏)',
        '来电记录': '纸鹤传信 (手记)',
        '主动电话': '纸鹤传音',
        '主动拨号': '纸鹤传音',
        '对话追踪': '灵视言灵',
        '对话追踪历史': '言灵回卷 (记录)',
        '对话追踪记录': '言灵回卷 (记录)',
        '主动电话测试': '纸鹤传信 (测试)',
        'LLM连接测试': '灵识共鸣 (LLM)',
        '播放历史通话': '纸鹤回溯',
        '播放对话追踪': '言灵回响',
        '主题工坊': '莳绘花坊 (主题)',
        '变幻工坊': '莳绘花坊 (主题)',
        '剧本工坊': '百鬼百绘 (剧本)',
        '变幻秘典': '百鬼百绘 (剧本)'
    };
    const finalTitle = sakuraTitles[title] || title;

    const $nav = $(`
        <div class="sakura-navbar" style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            padding: 8px 14px;
            border-bottom: 0.8px solid rgba(147, 197, 253, 0.2);
            background: rgba(13, 21, 36, 0.94);
            color: #F8FAFC;
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
            letter-spacing: 1px;
            flex-shrink: 0;
            z-index: 10;
        ">
            <div class="nav-left" style="
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                align-items: center;
                cursor: pointer;
                font-size: 12px;
                color: #F5D0A9;
                transition: color 0.2s;
            ">
                <span style="display:flex; margin-right:4px;">${SAKURA_ICONS.back}</span>
                归阁
            </div>
            <div class="nav-title" style="
                width: 100%;
                text-align: center;
                font-size: 14px;
                font-weight: 300;
                letter-spacing: 2px;
                color: #F8FAFC;
                padding: 0 60px;
                box-sizing: border-box;
            ">${finalTitle}</div>
        </div>
    `);

    $nav.find('.nav-left').hover(
        function() { $(this).css({ color: '#FFF0F5' }); },
        function() { $(this).css({ color: '#F5D0A9' }); }
    );

    $nav.find('.nav-left').click(() => {
        if (ThemeState.engine) {
            ThemeState.engine.goHome();
        }
    });

    return $nav;
}

// 平安京专属全屏沉浸式通话/窃听界面构建器
export function buildCallScreen(id, themeClass, avatarHtml, name, bodyHtml) {
    return $(`
        <div id="${id}" class="${themeClass}">
            <div class="sakura-bg-watermark">${SAKURA_WATERMARK_SVG}</div>
            <div class="sakura-call-content">
                <div class="sakura-call-avatar-wrap">
                    <div class="sakura-call-avatar-ring outer"></div>
                    <div class="sakura-call-avatar-ring"></div>
                    <div class="sakura-call-avatar-img">${avatarHtml}</div>
                </div>
                <p class="sakura-call-name">${name}</p>
                ${bodyHtml}
            </div>
        </div>
    `);
}
