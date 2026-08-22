/**
 * 仙途凌霄 - 专属场景共享组件与导航栏
 */

import { ThemeState } from '../state.js';
import { IMMORTAL_WATERMARK_SVG, IMMORTAL_APP_ICONS } from '../assets.js';

export const THEME_ICONS = IMMORTAL_APP_ICONS;

export function createNavbarForApps(title) {
    const immortalTitles = {
        '系统配置': '乾坤法仪 (配置)',
        '我的收藏': '灵宝道藏 (收藏)',
        '来电记录': '飞剑传书 (纪事)',
        '主动电话': '飞剑传书',
        '主动拨号': '飞剑传书',
        '对话追踪': '神识探查',
        '对话追踪历史': '神识残卷 (记录)',
        '对话追踪记录': '神识残卷 (记录)',
        '主动电话测试': '飞剑 (传讯)',
        'LLM连接测试': '天机推演 (LLM)',
        '播放历史通话': '飞剑回溯',
        '播放对话追踪': '神识回响',
        '主题工坊': '万象幻境 (主题)',
        '变幻工坊': '万象幻境 (主题)',
        '剧本工坊': '天机推演 (剧本)',
        '变幻秘典': '天机推演 (剧本)'
    };
    const finalTitle = immortalTitles[title] || title;

    const $nav = $(`
        <div class="immortal-navbar" style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 18px;
            border-bottom: 1px solid rgba(52, 211, 153, 0.25);
            background: linear-gradient(to bottom, rgba(6, 30, 24, 0.9), transparent);
            color: #fef08a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
            letter-spacing: 1px;
            flex-shrink: 0;
            z-index: 10;
        ">
            <div class="nav-left" style="display:flex; align-items:center; cursor:pointer; font-size: 13px; color:rgba(52, 211, 153, 0.85); transition: all 0.25s;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                归返
            </div>
            <div class="nav-title" style="font-size: 15px; font-weight: 400; text-shadow: 0 0 8px rgba(251, 191, 36, 0.4);">${finalTitle}</div>
            <div class="nav-right" style="width:40px;"></div>
        </div>
    `);

    $nav.find('.nav-left').hover(
        function() { $(this).css({ color: '#fef08a', textShadow: '0 0 6px rgba(251, 191, 36, 0.6)' }); },
        function() { $(this).css({ color: 'rgba(52, 211, 153, 0.85)', textShadow: 'none' }); }
    );

    $nav.find('.nav-left').click(() => {
        if (ThemeState.engine) {
            ThemeState.engine.goHome();
        }
    });

    return $nav;
}

// 通用仙侠全屏沉浸式通话/窃听界面构建器
export function buildCallScreen(id, themeClass, avatarHtml, name, bodyHtml) {
    return $(`
        <div id="${id}" class="${themeClass}">
            <div class="immortal-bg-watermark">${IMMORTAL_WATERMARK_SVG}</div>
            <div class="immortal-call-content">
                <div class="immortal-call-avatar-wrap">
                    <div class="immortal-call-avatar-ring outer"></div>
                    <div class="immortal-call-avatar-ring"></div>
                    <div class="immortal-call-avatar-img">${avatarHtml}</div>
                </div>
                <p class="immortal-call-name">${name}</p>
                ${bodyHtml}
            </div>
        </div>
    `);
}
