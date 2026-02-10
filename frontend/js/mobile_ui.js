/**
 * 模拟手机 UI 核心框架 (非真实移动端)
 * 
 * 注意: 这是在浏览器中渲染的一个"虚拟小手机"界面，
 *       并非针对移动设备的适配代码。该模块模拟手机外壳、
 *       内置 App 路由、来电/通话等功能，用于桌面端的沉浸式交互体验。
 * 
 * 负责: 渲染手机壳、处理拖拽交互、管理 App 路由
 */

// 导入 App 模块
import * as IncomingCallApp from './mobile_apps/incoming_call_app.js';
import * as SettingsApp from './mobile_apps/settings_app.js';
import * as FavoritesApp from './mobile_apps/favorites_app.js';
import * as LlmTestApp from './mobile_apps/llm_test_app.js';
import * as PhoneCallApp from './mobile_apps/phone_call_app.js';
import * as EavesdropApp from './mobile_apps/eavesdrop_app.js';

// 主题系统
import { themeManager } from './theme_manager.js';
import { defaultIdle } from './themes/default/default_idle.js';
import { runeIdle } from './themes/harry_potter/rune_idle.js';

if (!window.TTS_Mobile) {
    window.TTS_Mobile = {};
}

export const TTS_Mobile = window.TTS_Mobile;

(function (scope) {
    // ==================== 状态管理 ====================
    let STATE = {
        isOpen: false,
        currentApp: null
    };

    // ==================== 导航栏组件 ====================
    function createNavbar(title) {
        const $nav = $(`
            <div class="mobile-app-navbar">
                <div class="nav-left" style="display:flex; align-items:center;">
                    <span style="font-size:20px; margin-right:5px;">←</span> 返回
                </div>
                <div class="nav-title">${title}</div>
                <div class="nav-right" style="width:40px;"></div>
            </div>
        `);
        $nav.find('.nav-left').click(() => {
            $('#mobile-home-btn').click();
        });
        return $nav;
    }

    // ==================== App 注册表 ====================
    const APPS = {
        'incoming_call': {
            name: '来电',
            icon: '📞',
            bg: '#667eea',
            render: async (container) => {
                await IncomingCallApp.render(container, createNavbar);
            }
        },
        'settings': {
            name: '系统设置',
            icon: '⚙️',
            bg: '#333',
            render: async (container) => {
                await SettingsApp.render(container, createNavbar);
            }
        },
        'favorites': {
            name: '收藏夹',
            icon: '❤️',
            bg: 'var(--s-ready-bg, #e11d48)',
            render: async (container) => {
                await FavoritesApp.render(container, createNavbar);
            }
        },
        'llm_test': {
            // name: 'LLM测试',  // 注释掉则不在主屏显示
            icon: '🤖',
            bg: '#8b5cf6',
            render: async (container) => {
                await LlmTestApp.render(container, createNavbar);
            }
        },
        'phone_call': {
            // name: '主动电话',  // 注释掉则不在主屏显示
            icon: '📞',
            bg: '#10b981',
            render: async (container) => {
                await PhoneCallApp.render(container, createNavbar);
            }
        },
        'eavesdrop': {
            name: '对话追踪',
            icon: '🎧',
            bg: '#22c55e',
            render: async (container) => {
                await EavesdropApp.render(container, createNavbar);
            }
        }
    };

    // ==================== 初始化 ====================
    scope.init = function () {
        if ($('meta[name="viewport"]').length === 0) {
            $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">');
            console.log("📱 [Mobile] 已注入 Viewport 标签以适配手机屏幕");
        }

        if ($('#tts-mobile-root').length === 0) {
            injectStyles();
            renderShell();
            bindEvents();
            console.log("📱 [Mobile] 手机界面已初始化");
        }
    };

    // ==================== CSS 注入 (占位，实际由 Loader 加载) ====================
    function injectStyles() {
        console.log("📱 [Mobile] CSS 应由 Loader 加载，跳过 JS 注入");
    }

    // ==================== 渲染手机壳 ====================
    function renderShell() {
        // 手机壳（来电/应用界面容器）
        const html = `
        <div id="tts-mobile-root" class="minimized">
            <div id="tts-mobile-power-btn" title="关闭"></div>
            <div class="side-btn volume-up"></div>
            <div class="side-btn volume-down"></div>
            <div class="mobile-notch"></div>
            <div class="status-bar">
                <span>10:24</span>
                <span>📶 5G 🔋 100%</span>
            </div>
            <div class="mobile-screen" id="mobile-screen-content"></div>
            <div class="mobile-home-bar" id="mobile-home-btn"></div>
        </div>
        `;
        $('body').append(html);
        renderHomeScreen();

        // ✨ 注册主题并初始化
        themeManager.register('default', defaultIdle, { label: '经典悬浮球' });
        themeManager.register('harry_potter', runeIdle, {
            label: '哈利波特·魔法符文',
            cssUrl: `${window.TTS_State?.CACHE?.API_URL || 'http://127.0.0.1:3000'}/static/css/themes/harry_potter/hp_rune.css?t=${Date.now()}`
        });
        themeManager.init({ onClick: () => togglePhone() });
        console.log('🎨 [Mobile] 主题系统已初始化, 当前:', themeManager.getCurrentThemeName());

        // 暴露给设置页使用
        scope.themeManager = themeManager;
    }

    // ==================== 渲染主屏幕 ====================
    function renderHomeScreen() {
        const $screen = $('#mobile-screen-content');
        $screen.empty();

        const $grid = $(`<div class="app-grid"></div>`);
        Object.keys(APPS).forEach(key => {
            const app = APPS[key];
            if (!app.name) return; // 跳过没有 name 的应用
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

        $screen.append($grid);
        STATE.currentApp = null;

        // 🎯 返回主屏时清理来电记录 App 资源(停止音频播放)
        if (IncomingCallApp.cleanup) {
            IncomingCallApp.cleanup();
        }
    }

    // ==================== 打开 App ====================
    scope.openApp = function (appKey) {
        const app = APPS[appKey];
        if (!app) return;

        if (app.action) {
            app.action();
            return;
        }

        const $screen = $('#mobile-screen-content');
        $screen.empty();
        const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);

        if (app.render) {
            app.render($appContainer);
        }
        $screen.append($appContainer);
        STATE.currentApp = appKey;
    };

    // ==================== 事件绑定 ====================
    // 注意：符文的拖拽交互已由 rune_idle.js 内部处理
    function bindEvents() {
        const $phone = $('#tts-mobile-root');

        // 电源键关闭
        $('#tts-mobile-power-btn').click(function (e) {
            e.stopPropagation();
            closePhone();
        });

        // 点击外部关闭
        $(document).on('click', function (e) {
            if (STATE.isOpen) {
                if ($(e.target).closest('#tts-mobile-root, #hp-rune-idle').length === 0) {
                    closePhone();
                }
            }
        });

        // 阻止手机内部点击冒泡
        $phone.on('click', function (e) {
            e.stopPropagation();
        });

        // App 图标点击
        $phone.on('click', '.app-icon-wrapper', function () {
            const key = $(this).data('app');
            scope.openApp(key);
        });

        // Home 键
        $('#mobile-home-btn').click(function () {
            renderHomeScreen();
        });
    }

    // ==================== 手机状态切换 ====================
    function togglePhone() {
        // 优先检查来电
        if (window.TTS_IncomingCall) {
            console.log('[Mobile] 检测到来电,打开界面并显示来电');
            themeManager.setIncomingCall(false);
            $('#tts-manager-btn').removeClass('incoming-call');

            if (!STATE.isOpen) {
                openPhone();
            }
            scope.openApp('incoming_call');
            return;
        }

        // 检查对话追踪通知
        if (window.TTS_EavesdropData) {
            console.log('[Mobile] 检测到对话追踪,打开界面并显示监听');
            themeManager.setEavesdropAvailable(false);
            $('#tts-manager-btn').removeClass('eavesdrop-available');

            if (!STATE.isOpen) {
                openPhone();
            }
            scope.openApp('eavesdrop');
            return;
        }

        if (STATE.isOpen) closePhone();
        else openPhone();
    }

    function openPhone() {
        $('#tts-mobile-root').removeClass('minimized');
        themeManager.hide();  // 隐藏待机元素
        STATE.isOpen = true;
        renderHomeScreen();
    }

    function closePhone() {
        // 🎯 关闭时清理来电记录 App 资源(停止音频播放)
        if (IncomingCallApp.cleanup) {
            IncomingCallApp.cleanup();
        }

        $('#tts-mobile-root').addClass('minimized');
        themeManager.show();  // 重新显示待机元素
        STATE.isOpen = false;
    }

})(window.TTS_Mobile);
