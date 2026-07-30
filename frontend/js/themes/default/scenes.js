import * as IncomingCallApp from '../../mobile_apps/incoming_call_app.js';
import * as SettingsApp from '../../mobile_apps/settings_app.js';
import * as FavoritesApp from '../../mobile_apps/favorites_app.js';
import * as LlmTestApp from '../../mobile_apps/llm_test_app.js';
import * as PhoneCallApp from '../../mobile_apps/phone_call_app.js';
import * as EavesdropApp from '../../mobile_apps/eavesdrop_app.js';
import { createNavbar } from '../theme_utils.js';
import { state } from './state.js';

export const APPS = {
    'incoming_call': {
        name: '来电',
        icon: '📞',
        bg: '#667eea',
        sceneId: 'incoming_call',
    },
    'settings': {
        name: '系统设置',
        icon: '⚙️',
        bg: '#333',
        sceneId: 'settings',
    },
    'favorites': {
        name: '收藏夹',
        icon: '❤️',
        bg: 'var(--s-ready-bg, #e11d48)',
        sceneId: 'favorites',
    },
    'llm_test': {
        icon: '🤖',
        bg: '#8b5cf6',
        sceneId: 'llm_test',
    },
    'phone_call': {
        icon: '📞',
        bg: '#10b981',
        sceneId: 'phone_call',
    },
    'eavesdrop': {
        name: '对话追踪',
        icon: '🎧',
        bg: '#22c55e',
        sceneId: 'eavesdrop',
    }
};

function createNavbarForApps(title) {
    return createNavbar(title, () => {
        if (state.engine) {
            state.engine.goHome();
        }
    });
}

export const scenes = {
    home: {
        render($container, ctx) {
            $container.empty();
            const $grid = $(`<div class="app-grid"></div>`);

            Object.keys(APPS).forEach(key => {
                const app = APPS[key];
                if (!app.name) return; // 跳过隐藏 App
                const item = `
                <div class="app-icon-wrapper" data-app="${key}">
                    <div class="app-icon" style="background:${app.bg || 'rgba(255,255,255,0.2)'}">
                        ${app.icon}
                    </div>
                    <span class="app-name">${app.name}</span>
                </div>
                `;
                $grid.append(item);
            });

            $container.append($grid);

            // 绑定 App 图标点击
            $grid.on('click', '.app-icon-wrapper', function () {
                const key = $(this).data('app');
                const app = APPS[key];
                if (app && app.sceneId && ctx.engine) {
                    ctx.engine.showScene(app.sceneId);
                }
            });

            // 清理来电 App 资源
            if (IncomingCallApp.cleanup) {
                IncomingCallApp.cleanup();
            }
        }
    },

    incoming_call: {
        render($container, ctx) {
            const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
            IncomingCallApp.render($appContainer, createNavbarForApps);
            $container.append($appContainer);
        },
        cleanup() {
            if (IncomingCallApp.cleanup) IncomingCallApp.cleanup();
        }
    },

    eavesdrop: {
        render($container, ctx) {
            const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
            EavesdropApp.render($appContainer, createNavbarForApps);
            $container.append($appContainer);
        },
        cleanup() {
            if (EavesdropApp.cleanup) EavesdropApp.cleanup();
        }
    },

    favorites: {
        render($container, ctx) {
            const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
            FavoritesApp.render($appContainer, createNavbarForApps);
            $container.append($appContainer);
        }
    },

    settings: {
        render($container, ctx) {
            const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
            SettingsApp.render($appContainer, createNavbarForApps);
            $container.append($appContainer);
        }
    },

    llm_test: {
        render($container, ctx) {
            const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
            LlmTestApp.render($appContainer, createNavbarForApps);
            $container.append($appContainer);
        }
    },

    phone_call: {
        render($container, ctx) {
            const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
            PhoneCallApp.render($appContainer, createNavbarForApps);
            $container.append($appContainer);
        }
    },
};
