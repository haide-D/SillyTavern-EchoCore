import { THEME_ICONS } from './shared.js';
import * as PhoneCallApp from '../../../mobile_apps/phone_call_app.js';

export const homeScene = {
    render($container, ctx) {
        $container.empty();
        
        // 注入悬浮动画样式
        if ($('#dh-home-style').length === 0) {
            $('<style id="dh-home-style">').text(`
                @keyframes dh-float-anim {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                    100% { transform: translateY(0px); }
                }
                .dh-magic-item {
                    transition: transform 0.3s, filter 0.3s;
                }
                .dh-magic-item:hover {
                    filter: brightness(1.2);
                    transform: scale(1.05);
                }
            `).appendTo('head');
        }

        $container.css({
            'padding': '16px 0',
            'color': 'var(--proto-text-color)',
            'height': '100%',
            'box-sizing': 'border-box',
            'position': 'relative',
            'overflow-y': 'auto',
            'overflow-x': 'hidden',
            'display': 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justifyContent': 'center'
        });
        
        // 中心神秘光束或连线
        const $line = $('<div style="position:absolute; top: 10%; bottom: 10%; left: 50%; width: 1px; background: linear-gradient(to bottom, transparent, rgba(196,155,79,0.3) 20%, rgba(196,155,79,0.3) 80%, transparent); transform: translateX(-50%); z-index: 0; pointer-events:none;"></div>');
        $container.append($line);

        const $menu = $(`<div style="display:flex; flex-direction:column; gap:32px; width: 100%; max-width: 280px; position:relative; z-index: 1; margin: auto 0; padding: 10px 0;"></div>`);

        const apps = ctx.engine ? ctx.engine.getRegisteredApps() : [];
        let validIndex = 0;
        
        apps.forEach((app) => {
            if (app.hidden) return; // 隐藏无名称应用 (测试专用)
            
            // 合并主题自带的自定义属性与专属魔幻名称
            const themeProps = THEME_ICONS[app.id] || {};
            const finalIcon = themeProps.icon || `<span style="font-size:32px;">${app.defaultIcon}</span>`;
            const finalName = themeProps.name || (ctx.engine && typeof ctx.engine.getLabel === 'function' ? ctx.engine.getLabel(app.id, app.defaultName) : app.defaultName);
            const finalDesc = themeProps.desc || '';
            
            const isLeft = validIndex % 2 === 0;
            const animDelay = validIndex * 0.4;
            
            const itemHtml = `
            <div class="dh-app-icon dh-magic-item" data-app="${app.id}" style="
                display: flex; 
                flex-direction: ${isLeft ? 'row' : 'row-reverse'}; 
                align-items: center; 
                gap: 18px;
                cursor: pointer;
                animation: dh-float-anim 4s ease-in-out infinite;
                animation-delay: ${animDelay}s;
                width: 100%;
            ">
                <div style="
                    width: 56px; height: 56px; 
                    border-radius: 50%; 
                    background: radial-gradient(circle at center, rgba(196, 155, 79, 0.15) 0%, transparent 70%);
                    display: flex; align-items: center; justify-content: center; 
                    color: rgb(196, 155, 79);
                    filter: drop-shadow(0 0 8px rgba(196, 155, 79, 0.4));
                    flex-shrink: 0;
                ">
                    ${finalIcon}
                </div>
                <div style="
                    display: flex; flex-direction: column;
                    align-items: ${isLeft ? 'flex-start' : 'flex-end'};
                    text-align: ${isLeft ? 'left' : 'right'};
                ">
                    <span style="font-size: 16px; font-weight: 300; letter-spacing: 2px; color: rgb(220, 200, 150); text-shadow: 0 0 8px rgba(196, 155, 79, 0.4); margin-bottom: 4px;">${finalName}</span>
                    <span style="font-size: 11px; color: rgba(196, 155, 79, 0.6); letter-spacing: 1px;">${finalDesc}</span>
                </div>
            </div>
            `;
            $menu.append(itemHtml);
            validIndex++;
        });

        $container.append($menu);

        $menu.on('click', '.dh-app-icon', function () {
            const key = $(this).data('app');
            if (key && ctx.engine) {
                ctx.engine.showScene(key);
            }
        });

        if (PhoneCallApp.cleanup) PhoneCallApp.cleanup();
    }
};
