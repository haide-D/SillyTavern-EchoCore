import { APPS } from './shared.js';
import * as IncomingCallApp from '../../../mobile_apps/incoming_call_app.js';

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
            'padding': '0',
            'color': 'var(--proto-text-color)',
            'height': '100%',
            'box-sizing': 'border-box',
            'position': 'relative',
            'overflow': 'hidden',
            'display': 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center'
        });
        
        // 中心神秘光束或连线
        const $line = $('<div style="position:absolute; top: 10%; bottom: 10%; left: 50%; width: 1px; background: linear-gradient(to bottom, transparent, rgba(196,155,79,0.3) 20%, rgba(196,155,79,0.3) 80%, transparent); transform: translateX(-50%); z-index: 0;"></div>');
        $container.append($line);

        const $menu = $(`<div style="display:flex; flex-direction:column; gap:40px; width: 100%; max-width: 280px; position:relative; z-index: 1;"></div>`);

        let validIndex = 0;
        Object.keys(APPS).forEach((key) => {
            const app = APPS[key];
            if (!app.name) return; // 隐藏无名称应用 (测试专用)
            
            const isLeft = validIndex % 2 === 0;
            const animDelay = validIndex * 0.4;
            
            const itemHtml = `
            <div class="dh-app-icon dh-magic-item" data-app="${key}" style="
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
                    ${app.icon}
                </div>
                <div style="
                    display: flex; flex-direction: column;
                    align-items: ${isLeft ? 'flex-start' : 'flex-end'};
                    text-align: ${isLeft ? 'left' : 'right'};
                ">
                    <span style="font-size: 16px; font-weight: 300; letter-spacing: 2px; color: rgb(220, 200, 150); text-shadow: 0 0 8px rgba(196, 155, 79, 0.4); margin-bottom: 4px;">${app.name}</span>
                    <span style="font-size: 11px; color: rgba(196, 155, 79, 0.6); letter-spacing: 1px;">${app.desc || ''}</span>
                </div>
            </div>
            `;
            $menu.append(itemHtml);
            validIndex++;
        });

        $container.append($menu);

        $menu.on('click', '.dh-app-icon', function () {
            const key = $(this).data('app');
            const app = APPS[key];
            if (app && app.sceneId && ctx.engine) {
                ctx.engine.showScene(app.sceneId);
            }
        });

        if (IncomingCallApp.cleanup) IncomingCallApp.cleanup();
    }
};
