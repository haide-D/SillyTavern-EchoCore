import { createNavbar } from '../../theme_utils.js';
import { ThemeState } from '../state.js';
import { HALLOWS_SVG, ICON_INCOMING_CALL, ICON_SETTINGS, ICON_FAVORITES, ICON_EAVESDROP, ICON_LLM, ICON_PHONE, ICON_THEME_STORE, ICON_WORKSHOP } from '../assets.js';

// 本地主题专属图标与专属名称映射
export const THEME_ICONS = {
    'incoming_call': { name: '双面镜通讯', desc: '跨越空间的呼唤', icon: ICON_INCOMING_CALL },
    'eavesdrop': { name: '伸缩耳探听', desc: '倾听暗处的低语', icon: ICON_EAVESDROP },
    'favorites': { name: '冥想盆记忆', desc: '沉淀过往的思绪', icon: ICON_FAVORITES },
    'settings': { name: '有求必应屋', desc: '满足一切的需求', icon: ICON_SETTINGS },
    'theme_store': { name: '变幻工坊', desc: '编织梦幻的画卷', icon: ICON_THEME_STORE },
    'workshop': { name: '变幻秘典', desc: '编织过往与未知的对话', icon: ICON_WORKSHOP },
    'llm_test': { name: '占卜预言', desc: '探询未知的启示', icon: ICON_LLM },
    'phone_call': { name: '魔法传讯', desc: '跨越空间的呼唤', icon: ICON_PHONE }
};

export function createNavbarForApps(title) {
    const magicTitles = {
        '系统配置': '法阵修正 (配置)',
        '我的收藏': '复活石铭刻 (收藏)',
        '来电记录': '魔法传讯 (记录)',
        '主动电话': '魔法传讯',
        '主动拨号': '魔法传讯',
        '双面镜通讯': '双面镜通讯',
        '对话追踪': '伸缩耳探听',
        '对话追踪历史': '探知低语 (记录)',
        '对话追踪记录': '探知低语 (记录)',
        '主动电话测试': '双面镜 (拨号)',
        'LLM连接测试': '占卜预言 (LLM)',
        '播放历史通话': '魔法传讯 (回溯)',
        '播放对话追踪': '探知低语 (回溯)',
        '主题工坊': '变幻工坊 (主题)',
        '变幻工坊': '变幻工坊 (主题)',
        '剧本工坊': '变幻秘典 (剧本)',
        '变幻秘典': '变幻秘典 (剧本)'
    };
    const finalTitle = magicTitles[title] || title;
    
    const $nav = $(`
        <div class="dh-magic-navbar" style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid rgba(196,155,79,0.3);
            background: linear-gradient(to bottom, rgba(14,10,20,0.8), transparent);
            color: rgba(220, 200, 150, 0.9);
            font-family: 'Inter', sans-serif;
            letter-spacing: 1px;
            flex-shrink: 0;
        ">
            <div class="nav-left" style="display:flex; align-items:center; cursor:pointer; font-size: 14px; color:rgba(196,155,79,0.8); transition: all 0.3s;">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                归返
            </div>
            <div class="nav-title" style="font-size: 16px; font-weight: 300; text-shadow: 0 0 8px rgba(196,155,79,0.5);">${finalTitle}</div>
            <div class="nav-right" style="width:50px;"></div>
        </div>
    `);

    $nav.find('.nav-left').hover(
        function() { $(this).css({ color: 'rgba(196,155,79,1)', textShadow: '0 0 5px rgba(196,155,79,0.5)' }); },
        function() { $(this).css({ color: 'rgba(196,155,79,0.8)', textShadow: 'none' }); }
    );

    $nav.find('.nav-left').click(() => {
        if (ThemeState.engine) {
            ThemeState.engine.goHome();
        }
    });

    return $nav;
}

// 通用的全屏呼叫/窃听界面构建器，复用 HALLOWS_SVG 
export function buildCallScreen(id, themeClass, avatarHtml, name, bodyHtml) {
    return $(`
        <div id="${id}" class="${themeClass}">
            <div class="dh-bg-hallows">${HALLOWS_SVG}</div>
            <div class="dh-call-content">
                <div class="dh-call-avatar-wrap">
                    <div class="dh-call-avatar-ring outer"></div>
                    <div class="dh-call-avatar-ring"></div>
                    <div class="dh-call-avatar-img">${avatarHtml}</div>
                </div>
                <p class="dh-call-name">${name}</p>
                ${bodyHtml}
            </div>
        </div>
    `);
}
