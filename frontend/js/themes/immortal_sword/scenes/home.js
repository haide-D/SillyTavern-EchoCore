/**
 * 仙途凌霄 - 专属主页场景 (Home Scene)
 * 仙门天机长卷 · 修真玉简目录
 */

import { THEME_ICONS } from './shared.js';
import * as PhoneCallApp from '../../../mobile_apps/phone_call_app.js';

export const homeScene = {
    render($container, ctx) {
        $container.empty();

        $container.css({
            'padding': '10px 4px 16px 4px',
            'color': '#e6f4f1',
            'height': '100%',
            'box-sizing': 'border-box',
            'position': 'relative',
            'overflow-y': 'auto',
            'overflow-x': 'hidden',
            'display': 'flex',
            'flex-direction': 'column'
        });

        // 顶部天机长卷标题
        const $header = $(`
            <div class="immortal-scroll-header" style="
                text-align: center;
                padding: 12px 0 16px 0;
                position: relative;
                flex-shrink: 0;
            ">
                <div style="font-size: 11px; letter-spacing: 4px; color: rgba(52, 211, 153, 0.8); text-transform: uppercase; margin-bottom: 2px;">
                    ✦ 仙门天机录 ✦
                </div>
                <div style="font-size: 18px; font-weight: 300; letter-spacing: 3px; color: #fef08a; text-shadow: 0 0 10px rgba(251, 191, 36, 0.45);">
                    修 真 秘 卷
                </div>
                <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #fbbf24, transparent); margin: 6px auto 0 auto;"></div>
            </div>
        `);
        $container.append($header);

        // 玉简列表容器
        const $list = $(`<div class="immortal-jadeslip-list" style="display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box; padding: 0 4px;"></div>`);

        const apps = ctx.engine ? ctx.engine.getRegisteredApps() : [];
        let validIndex = 0;

        apps.forEach((app) => {
            if (app.hidden) return;

            const themeProps = THEME_ICONS[app.id] || {};
            const finalIcon = themeProps.icon || `<span style="font-size:24px;">${app.defaultIcon}</span>`;
            const finalName = themeProps.name || (ctx.engine && typeof ctx.engine.getLabel === 'function' ? ctx.engine.getLabel(app.id, app.defaultName) : app.defaultName);
            const finalDesc = themeProps.desc || '';
            const finalTag = themeProps.tag || '灵';

            const animDelay = (validIndex * 0.08).toFixed(2);

            const $slip = $(`
                <div class="immortal-jadeslip-card" data-app="${app.id}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 14px;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 30, 24, 0.75) 100%);
                    border: 1px solid rgba(52, 211, 153, 0.28);
                    border-left: 3px solid #fbbf24;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
                    position: relative;
                    animation: immortalSlipFadeIn 0.4s ease-out both;
                    animation-delay: ${animDelay}s;
                    backdrop-filter: blur(8px);
                ">
                    <!-- 左侧：青玉印记与图标 -->
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div class="immortal-slip-icon-wrap" style="
                            width: 44px; height: 44px;
                            border-radius: 8px;
                            background: radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, rgba(4, 20, 16, 0.8) 100%);
                            border: 1px solid rgba(52, 211, 153, 0.4);
                            display: flex; align-items: center; justify-content: center;
                            color: #fef08a;
                            flex-shrink: 0;
                            transition: all 0.25s ease;
                        ">
                            ${finalIcon}
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 15px; font-weight: 400; letter-spacing: 1.5px; color: #fef08a; margin-bottom: 2px;">${finalName}</span>
                            <span style="font-size: 11px; color: rgba(167, 243, 208, 0.75); letter-spacing: 0.5px;">${finalDesc}</span>
                        </div>
                    </div>

                    <!-- 右侧：修仙小印签与箭头 -->
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="
                            font-size: 10px;
                            padding: 2px 6px;
                            border-radius: 4px;
                            background: rgba(251, 191, 36, 0.15);
                            border: 0.8px solid rgba(251, 191, 36, 0.4);
                            color: #fde68a;
                            letter-spacing: 1px;
                        ">${finalTag}</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(52, 211, 153, 0.6)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>
            `);

            $slip.hover(
                function() {
                    $(this).css({
                        'transform': 'translateX(4px)',
                        'border-color': 'rgba(251, 191, 36, 0.6)',
                        'background': 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 30, 24, 0.9) 100%)',
                        'box-shadow': '0 4px 16px rgba(0,0,0,0.4), 0 0 12px rgba(16, 185, 129, 0.25)'
                    });
                    $(this).find('.immortal-slip-icon-wrap').css({
                        'transform': 'scale(1.08)',
                        'border-color': '#fbbf24',
                        'box-shadow': '0 0 10px rgba(251, 191, 36, 0.5)'
                    });
                },
                function() {
                    $(this).css({
                        'transform': 'translateX(0)',
                        'border-color': 'rgba(52, 211, 153, 0.28)',
                        'background': 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 30, 24, 0.75) 100%)',
                        'box-shadow': 'none'
                    });
                    $(this).find('.immortal-slip-icon-wrap').css({
                        'transform': 'scale(1)',
                        'border-color': 'rgba(52, 211, 153, 0.4)',
                        'box-shadow': 'none'
                    });
                }
            );

            $slip.on('click', () => {
                if (ctx.engine) ctx.engine.showScene(app.id);
            });

            $list.append($slip);
            validIndex++;
        });

        $container.append($list);
        if (PhoneCallApp.cleanup) PhoneCallApp.cleanup();
    }
};
