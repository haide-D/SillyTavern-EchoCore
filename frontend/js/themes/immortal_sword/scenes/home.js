/**
 * 仙途凌霄 - 专属主页场景 (Home Scene)
 * 仙侠风节 · 天机星罗中轴剑脉 · 左右交错悬浮灵牒
 */

import { THEME_ICONS } from './shared.js';
import * as PhoneCallApp from '../../../mobile_apps/phone_call_app.js';

export const homeScene = {
    render($container, ctx) {
        $container.empty();

        $container.css({
            'padding': '12px 6px 16px 6px',
            'color': '#e2e8f0',
            'height': '100%',
            'box-sizing': 'border-box',
            'position': 'relative',
            'overflow-y': 'auto',
            'overflow-x': 'hidden',
            'display': 'flex',
            'flex-direction': 'column',
            'align-items': 'center'
        });

        // 1. 顶部天机秘卷标题 (古朴修真风骨)
        const $header = $(`
            <div class="immortal-scroll-header" style="
                text-align: center;
                padding: 4px 0 16px 0;
                position: relative;
                z-index: 2;
                flex-shrink: 0;
            ">
                <div style="font-size: 10px; letter-spacing: 4px; color: #8cb5ae; margin-bottom: 2px; text-transform: uppercase;">
                    ✦ 天 机 录 ✦
                </div>
                <div style="font-size: 17px; font-weight: 300; letter-spacing: 4px; color: #f1f5f9; text-shadow: 0 0 10px rgba(196, 155, 79, 0.35);">
                    修 真 秘 卷
                </div>
                <div style="width: 36px; height: 0.8px; background: linear-gradient(90deg, transparent, #c49b4f, transparent); margin: 6px auto 0 auto;"></div>
            </div>
        `);
        $container.append($header);

        // 2. 中央天心剑脉光轨 (Meridian Spine)
        const $meridian = $(`
            <div class="immortal-home-meridian" style="
                position: absolute;
                top: 48px;
                bottom: 24px;
                left: 50%;
                width: 1px;
                background: linear-gradient(to bottom, transparent, rgba(196, 155, 79, 0.3) 15%, rgba(111, 156, 150, 0.25) 85%, transparent);
                transform: translateX(-50%);
                z-index: 0;
                pointer-events: none;
            ">
                <div style="position:absolute; top:35%; left:-3px; width:7px; height:7px; border-radius:50%; border:0.6px solid rgba(196,155,79,0.5); background:#0c1014;"></div>
                <div style="position:absolute; top:65%; left:-3px; width:7px; height:7px; border-radius:50%; border:0.6px solid rgba(111,156,150,0.5); background:#0c1014;"></div>
            </div>
        `);
        $container.append($meridian);

        // 3. 左右交错悬浮灵牒容器 (Staggered Layout)
        const $list = $(`<div class="immortal-staggered-list" style="
            display: flex; 
            flex-direction: column; 
            gap: 16px; 
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
            const finalTag = themeProps.tag || '灵';

            const isLeft = validIndex % 2 === 0;
            const floatDelay = (validIndex * 0.6).toFixed(1);

            const $slip = $(`
                <div class="immortal-slip-island ${isLeft ? 'align-left' : 'align-right'}" data-app="${app.id}" style="
                    display: flex;
                    flex-direction: ${isLeft ? 'row' : 'row-reverse'};
                    align-items: center;
                    justify-content: flex-start;
                    gap: 12px;
                    width: 100%;
                    cursor: pointer;
                    position: relative;
                    animation: immortalSlipFloat 4.6s ease-in-out infinite;
                    animation-delay: ${floatDelay}s;
                    transition: transform 0.25s ease, filter 0.25s ease;
                ">
                    <!-- 八角几何玉印 (Geometric Jade Seal Ring) -->
                    <div class="immortal-seal-wrap" style="
                        width: 44px;
                        height: 44px;
                        border-radius: 8px;
                        background: rgba(14, 19, 24, 0.85);
                        border: 0.8px solid rgba(196, 155, 79, 0.45);
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.6), inset 0 0 8px rgba(111, 156, 150, 0.15);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #c49b4f;
                        flex-shrink: 0;
                        position: relative;
                        transition: all 0.3s ease;
                    ">
                        <!-- 四角微点 -->
                        <div style="position:absolute; top:2px; left:2px; width:2px; height:2px; background:rgba(196,155,79,0.5);"></div>
                        <div style="position:absolute; top:2px; right:2px; width:2px; height:2px; background:rgba(196,155,79,0.5);"></div>
                        <div style="position:absolute; bottom:2px; left:2px; width:2px; height:2px; background:rgba(196,155,79,0.5);"></div>
                        <div style="position:absolute; bottom:2px; right:2px; width:2px; height:2px; background:rgba(196,155,79,0.5);"></div>
                        ${finalIcon}
                    </div>

                    <!-- 灵牒文本区域 (带微透云气底衬) -->
                    <div class="immortal-slip-body" style="
                        display: flex;
                        flex-direction: column;
                        align-items: ${isLeft ? 'flex-start' : 'flex-end'};
                        text-align: ${isLeft ? 'left' : 'right'};
                        background: rgba(17, 23, 28, 0.7);
                        border: 0.8px solid rgba(140, 181, 174, 0.2);
                        ${isLeft ? 'border-left: 2px solid #c49b4f;' : 'border-right: 2px solid #c49b4f;'}
                        padding: 6px 12px;
                        border-radius: 4px;
                        backdrop-filter: blur(8px);
                        transition: all 0.25s ease;
                        flex: 1;
                        max-width: 220px;
                    ">
                        <div style="display: flex; align-items: center; gap: 6px; ${isLeft ? '' : 'flex-direction: row-reverse;'}">
                            <span style="font-size: 14px; font-weight: 400; letter-spacing: 1.5px; color: #f1f5f9;">${finalName}</span>
                            <span style="
                                font-size: 9px;
                                padding: 0 4px;
                                border-radius: 2px;
                                background: rgba(196, 155, 79, 0.15);
                                border: 0.6px solid rgba(196, 155, 79, 0.35);
                                color: #c49b4f;
                                transform: scale(0.9);
                            ">${finalTag}</span>
                        </div>
                        <span style="font-size: 10.5px; color: #8a9ba8; letter-spacing: 0.5px; margin-top: 2px;">${finalDesc}</span>
                    </div>
                </div>
            `);

            // 悬停交互：玉印自转、灵牒微舒、金丝流光
            $slip.hover(
                function() {
                    $(this).css({
                        'filter': 'brightness(1.15)',
                        'transform': `${isLeft ? 'translateX(4px)' : 'translateX(-4px)'} scale(1.02)`
                    });
                    $(this).find('.immortal-seal-wrap').css({
                        'border-color': '#c49b4f',
                        'box-shadow': '0 0 14px rgba(196, 155, 79, 0.5)',
                        'transform': 'rotate(45deg)'
                    });
                    $(this).find('.immortal-seal-wrap svg').css({
                        'transform': 'rotate(-45deg)'
                    });
                    $(this).find('.immortal-slip-body').css({
                        'border-color': 'rgba(196, 155, 79, 0.5)',
                        'background': 'rgba(24, 32, 39, 0.88)'
                    });
                },
                function() {
                    $(this).css({
                        'filter': 'none',
                        'transform': 'none'
                    });
                    $(this).find('.immortal-seal-wrap').css({
                        'border-color': 'rgba(196, 155, 79, 0.45)',
                        'box-shadow': '0 0 10px rgba(0, 0, 0, 0.6), inset 0 0 8px rgba(111, 156, 150, 0.15)',
                        'transform': 'none'
                    });
                    $(this).find('.immortal-seal-wrap svg').css({
                        'transform': 'none'
                    });
                    $(this).find('.immortal-slip-body').css({
                        'border-color': 'rgba(140, 181, 174, 0.2)',
                        'background': 'rgba(17, 23, 28, 0.7)'
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
