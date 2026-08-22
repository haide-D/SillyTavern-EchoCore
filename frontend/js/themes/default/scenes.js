import * as IncomingCallApp from '../../mobile_apps/incoming_call_app.js';
import * as SettingsApp from '../../mobile_apps/settings_app.js';
import * as FavoritesApp from '../../mobile_apps/favorites_app.js';
import * as LlmTestApp from '../../mobile_apps/llm_test_app.js';
import * as PhoneCallApp from '../../mobile_apps/phone_call_app.js';
import * as EavesdropApp from '../../mobile_apps/eavesdrop_app.js';
import * as WorkshopApp from '../../mobile_apps/workshop_app.js';
import * as ThemeStoreApp from '../../mobile_apps/theme_store_app.js';
import { createNavbar } from '../theme_utils.js';
import { state } from './state.js';

// Removed APPS dictionary because it's now managed by ThemeEngine.

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

            const apps = ctx.engine ? ctx.engine.getRegisteredApps() : [];
            
            apps.forEach(app => {
                if (app.hidden) return; // 跳过隐藏 App
                
                // 默认主题特定的背景色映射 (如果不写死在这里，也可以直接用半透明背景)
                const bgColors = {
                    'incoming_call': '#667eea',
                    'settings': '#333',
                    'favorites': 'var(--s-ready-bg, #e11d48)',
                    'eavesdrop': '#22c55e',
                    'workshop': '#d97706',
                    'theme_store': '#8b5cf6'
                };
                
                const item = `
                <div class="app-icon-wrapper" data-app="${app.id}">
                    <div class="app-icon" style="background:${bgColors[app.id] || 'rgba(255,255,255,0.2)'}">
                        ${app.defaultIcon}
                    </div>
                    <span class="app-name">${app.defaultName}</span>
                </div>
                `;
                $grid.append(item);
            });

            $container.append($grid);

            // 绑定 App 图标点击
            $grid.on('click', '.app-icon-wrapper', function () {
                const key = $(this).data('app');
                if (key && ctx.engine) {
                    ctx.engine.showScene(key);
                }
            });

            // 清理主动电话 App 资源
            if (PhoneCallApp.cleanup) {
                PhoneCallApp.cleanup();
            }
        }
    },

    incoming_call: {
        render($container, ctx) {
            const callData = (ctx && ctx.data && ctx.data.audio_url) ? ctx.data : window.TTS_IncomingCall;
            if (callData) {
                if (ctx && ctx.data && ctx.data.isReplay) {
                    IncomingCallApp.showHistoryPlaybackUI($container, callData, createNavbarForApps, ctx.data.onReturn);
                } else {
                    IncomingCallApp.render($container, createNavbarForApps);
                }
            } else {
                const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
                PhoneCallApp.render($appContainer, createNavbarForApps);
                $container.append($appContainer);
            }
        },
        cleanup() {
            if (PhoneCallApp.cleanup) PhoneCallApp.cleanup();
            if (IncomingCallApp.cleanup) IncomingCallApp.cleanup();
        }
    },

    eavesdrop: {
        render($container, ctx) {
            const callData = (ctx && ctx.data && ctx.data.audio_url) ? ctx.data : (window.TTS_EavesdropReady || window.TTS_EavesdropData);
            if (callData && ctx && ctx.data && ctx.data.isReplay) {
                IncomingCallApp.showHistoryPlaybackUI($container, callData, createNavbarForApps, ctx.data.onReturn);
            } else {
                const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
                EavesdropApp.render($appContainer, createNavbarForApps);
                $container.append($appContainer);
            }
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

    workshop: {
        render($container, ctx) {
            const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
            WorkshopApp.render($appContainer, createNavbarForApps);
            $container.append($appContainer);
        },
        cleanup() {
            if (WorkshopApp.cleanup) WorkshopApp.cleanup();
        }
    },

    theme_store: {
        render($container, ctx) {
            const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
            ThemeStoreApp.render($appContainer, createNavbarForApps, ctx);
            $container.append($appContainer);
        },
        cleanup() {
            if (ThemeStoreApp.cleanup) ThemeStoreApp.cleanup();
        }
    },
};

