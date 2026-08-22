/**
 * 平安京·落樱雅境 - 专属主页场景 (Home Scene)
 * 平安风雅 · 流光短册御牒 · 左右交错悬浮花笺
 */

import { THEME_ICONS } from './shared.js';
import * as PhoneCallApp from '../../../mobile_apps/phone_call_app.js';

export const homeScene = {
    render($container, ctx) {
        $container.empty();

        $container.css({
            'padding': '12px 6px 16px 6px',
            'color': '#FFF0F5',
            'height': '100%',
            'box-sizing': 'border-box',
            'position': 'relative',
            'overflow-y': 'auto',
            'overflow-x': 'hidden',
            'display': 'flex',
            'flex-direction': 'column',
            'align-items': 'center'
        });

        // 1. 顶部平安风雅标题
        const $header = $(`
            <div class="sakura-scroll-header" style="
                text-align: center;
                padding: 4px 0 14px 0;
                position: relative;
                z-index: 2;
                flex-shrink: 0;
            ">
                <div style="font-size: 10px; letter-spacing: 4px; color: #E8A598; margin-bottom: 2px; text-transform: uppercase;">
                    ✦ 平 安 雅 道 ✦
                </div>
                <div style="font-size: 17px; font-weight: 300; letter-spacing: 4px; color: #FFF0F5; text-shadow: 0 0 10px rgba(244, 166, 184, 0.4);">
                    落 樱 锦 瑟
                </div>
                <div style="width: 42px; height: 0.8px; background: linear-gradient(90deg, transparent, #F5D0A9, transparent); margin: 6px auto 0 auto;"></div>
            </div>
        `);
        $container.append($header);

        // 2. 中央落樱结界引线 (Meridian Spine - 纯净纤细光带)
        const $meridian = $(`
            <div class="sakura-home-meridian" style="
                position: absolute;
                top: 48px;
                bottom: 24px;
                left: 50%;
                width: 1px;
                background: linear-gradient(to bottom, transparent, rgba(245, 208, 169, 0.22) 20%, rgba(147, 197, 253, 0.22) 80%, transparent);
                transform: translateX(-50%);
                z-index: 0;
                pointer-events: none;
                opacity: 0.75;
            "></div>
        `);
        $container.append($meridian);

        // 3. 左右交错悬浮短册容器 (Staggered Layout)
        const $list = $(`<div class="sakura-staggered-list" style="
            display: flex; 
            flex-direction: column; 
            gap: 15px; 
            width: 100%; 
            max-width: 320px; 
            position: relative; 
            z-index: 1; 
            margin: auto 0;
            padding: 6px 0;
        "></div>`);

        const apps = ctx.engine ? ctx.engine.getRegisteredApps() : [];
        let validIndex = 0;

        apps.forEach((app) => {
            if (app.hidden) return;

            const themeProps = THEME_ICONS[app.id] || {};
            const finalIcon = themeProps.icon || `<span style="font-size:20px;">${app.defaultIcon}</span>`;
            const finalName = themeProps.name || (ctx.engine && typeof ctx.engine.getLabel === 'function' ? ctx.engine.getLabel(app.id, app.defaultName) : app.defaultName);
            const finalDesc = themeProps.desc || '';
            const finalTag = themeProps.tag || '雅';

            const isLeft = validIndex % 2 === 0;
            const floatDelay = (validIndex * 0.55).toFixed(1);

            const $slip = $(`
                <div class="sakura-tanzaku-island ${isLeft ? 'align-left' : 'align-right'}" data-app="${app.id}" style="
                    display: flex;
                    flex-direction: ${isLeft ? 'row' : 'row-reverse'};
                    align-items: center;
                    justify-content: flex-start;
                    gap: 12px;
                    width: 100%;
                    cursor: pointer;
                    position: relative;
                    animation: sakuraTanzakuFloat 4.8s ease-in-out infinite;
                    animation-delay: ${floatDelay}s;
                    transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), filter 0.25s ease;
                ">
                    <!-- 琉璃樱纹方牌 (Prism Sakura Badge - 绀青深蓝琉璃) -->
                    <div class="sakura-seal-wrap" style="
                        width: 44px;
                        height: 44px;
                        border-radius: 8px;
                        background: rgba(15, 23, 42, 0.88);
                        border: 0.8px solid rgba(245, 208, 169, 0.5);
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.6), inset 0 0 8px rgba(147, 197, 253, 0.2);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #F5D0A9;
                        flex-shrink: 0;
                        position: relative;
                        transition: all 0.3s ease;
                    ">
                        <!-- 四角金丝微点 -->
                        <div style="position:absolute; top:2px; left:2px; width:2px; height:2px; background:rgba(245,208,169,0.6);"></div>
                        <div style="position:absolute; top:2px; right:2px; width:2px; height:2px; background:rgba(245,208,169,0.6);"></div>
                        <div style="position:absolute; bottom:2px; left:2px; width:2px; height:2px; background:rgba(245,208,169,0.6);"></div>
                        <div style="position:absolute; bottom:2px; right:2px; width:2px; height:2px; background:rgba(245,208,169,0.6);"></div>
                        ${finalIcon}
                    </div>

                    <!-- 短册文本区域 (夜樱绀青透光底衬) -->
                    <div class="sakura-tanzaku-body" style="
                        display: flex;
                        flex-direction: column;
                        align-items: ${isLeft ? 'flex-start' : 'flex-end'};
                        text-align: ${isLeft ? 'left' : 'right'};
                        background: rgba(14, 23, 38, 0.78);
                        border: 0.8px solid rgba(147, 197, 253, 0.2);
                        ${isLeft ? 'border-left: 2.5px solid #F4A6B8;' : 'border-right: 2.5px solid #F4A6B8;'}
                        padding: 6px 12px;
                        border-radius: 4px;
                        backdrop-filter: blur(12px);
                        transition: all 0.25s ease;
                        flex: 1;
                        max-width: 220px;
                    ">
                        <div style="display: flex; align-items: center; gap: 6px; ${isLeft ? '' : 'flex-direction: row-reverse;'}">
                            <span style="font-size: 14px; font-weight: 300; letter-spacing: 1.5px; color: #F8FAFC;">${finalName}</span>
                            <span style="
                                font-size: 9px;
                                padding: 1px 4px;
                                border-radius: 2px;
                                background: rgba(244, 166, 184, 0.15);
                                border: 0.5px solid rgba(245, 208, 169, 0.45);
                                color: #F5D0A9;
                                font-family: serif;
                            ">${finalTag}</span>
                        </div>
                        <div style="font-size: 10.5px; color: #94A3B8; margin-top: 2px; letter-spacing: 0.5px; opacity: 0.95;">
                            ${finalDesc}
                        </div>
                    </div>
                </div>
            `);

            // 悬停动效
            $slip.hover(
                function() {
                    $(this).css('transform', isLeft ? 'translateX(5px) scale(1.02)' : 'translateX(-5px) scale(1.02)');
                    $(this).find('.sakura-seal-wrap').css({
                        'border-color': '#F4A6B8',
                        'color': '#FFF0F5',
                        'box-shadow': '0 0 14px rgba(244, 166, 184, 0.45)'
                    });
                    $(this).find('.sakura-tanzaku-body').css({
                        'background': 'rgba(20, 34, 58, 0.92)',
                        'border-color': 'rgba(244, 166, 184, 0.5)'
                    });
                },
                function() {
                    $(this).css('transform', 'none');
                    $(this).find('.sakura-seal-wrap').css({
                        'border-color': 'rgba(245, 208, 169, 0.5)',
                        'color': '#F5D0A9',
                        'box-shadow': '0 0 10px rgba(0, 0, 0, 0.6), inset 0 0 8px rgba(147, 197, 253, 0.2)'
                    });
                    $(this).find('.sakura-tanzaku-body').css({
                        'background': 'rgba(14, 23, 38, 0.78)',
                        'border-color': 'rgba(147, 197, 253, 0.2)'
                    });
                }
            );

            // 点击事件
            $slip.on('click', () => {
                if (ctx.engine) {
                    ctx.engine.showScene(app.id);
                }
            });

            $list.append($slip);
            validIndex++;
        });

        $container.append($list);
    },

    cleanup() {
        // 清理定时器或监听
    }
};
