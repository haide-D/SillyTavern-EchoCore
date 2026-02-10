/**
 * 默认主题 (Default Theme)
 *
 * 将现有的「模拟手机 UI」包装为主题引擎兼容的主题。
 * 这是一个过渡性主题，直接代理到现有 mobile_apps/ 模块。
 *
 * 职责:
 * - 渲染手机壳（悬浮球 + 手机框体）
 * - 将场景路由代理到对应的 mobile_apps 模块
 * - 处理通知（悬浮球震动/闪烁）
 */

import * as IncomingCallApp from '../../mobile_apps/incoming_call_app.js';
import * as SettingsApp from '../../mobile_apps/settings_app.js';
import * as FavoritesApp from '../../mobile_apps/favorites_app.js';
import * as LlmTestApp from '../../mobile_apps/llm_test_app.js';
import * as PhoneCallApp from '../../mobile_apps/phone_call_app.js';
import * as EavesdropApp from '../../mobile_apps/eavesdrop_app.js';
import { createNavbar } from '../theme_utils.js';

// ==================== 内部状态 ====================
let _engine = null;
let _dragState = {
    isDragging: false,
    hasMoved: false,
    startX: 0, startY: 0,
    shiftX: 0, shiftY: 0,
    winW: 0, winH: 0,
};
const DRAG_THRESHOLD = 10;

// ==================== App 注册表（保持兼容） ====================
const APPS = {
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
        // name: 'LLM测试',  // 注释掉则不在主屏显示
        icon: '🤖',
        bg: '#8b5cf6',
        sceneId: 'llm_test',
    },
    'phone_call': {
        // name: '主动电话',  // 注释掉则不在主屏显示
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

// ==================== 手机壳 DOM ====================

function _renderShell() {
    if ($('#tts-mobile-root').length > 0) return;

    const html = `
    <div id="tts-mobile-trigger">
        <div class="trigger-bubble-inner">
            <div class="trigger-waves">
                <span class="trigger-bar"></span>
                <span class="trigger-bar"></span>
                <span class="trigger-bar"></span>
            </div>
        </div>
    </div>
    <div id="tts-mobile-root" class="minimized">
        <div id="tts-mobile-power-btn" title="关闭手机"></div>
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
}

function _destroyShell() {
    $('#tts-mobile-root, #tts-mobile-trigger').remove();
}

// ==================== 导航栏代理 ====================

function _createNavbarForApps(title) {
    return createNavbar(title, () => {
        if (_engine) {
            _engine.goHome();
        }
    });
}

// ==================== 拖拽逻辑 ====================

function _bindDragEvents() {
    const $trigger = $('#tts-mobile-trigger');
    if (!$trigger.length) return;

    $trigger.on('mousedown touchstart', function (e) {
        if (e.type === 'touchstart' && e.touches.length > 1) return;
        if (e.cancelable) e.preventDefault();

        const point = e.type === 'touchstart' ? e.touches[0] : e;
        const rect = $trigger[0].getBoundingClientRect();

        _dragState.startX = point.clientX;
        _dragState.startY = point.clientY;
        _dragState.shiftX = point.clientX - rect.left;
        _dragState.shiftY = point.clientY - rect.top;
        _dragState.winW = $(window).width();
        _dragState.winH = $(window).height();
        _dragState.isDragging = true;
        _dragState.hasMoved = false;

        document.addEventListener('mousemove', _onDragMove, { passive: false });
        document.addEventListener('touchmove', _onDragMove, { passive: false });
        document.addEventListener('mouseup', _onDragUp);
        document.addEventListener('touchend', _onDragUp);
    });
}

function _onDragMove(e) {
    if (!_dragState.isDragging) return;
    if (e.cancelable) e.preventDefault();

    const point = e.type === 'touchmove' ? e.touches[0] : e;
    const currentX = point.clientX;
    const currentY = point.clientY;
    const el = $('#tts-mobile-trigger')[0];
    if (!el) return;

    if (!_dragState.hasMoved) {
        const moveDis = Math.sqrt(Math.pow(currentX - _dragState.startX, 2) + Math.pow(currentY - _dragState.startY, 2));
        if (moveDis < DRAG_THRESHOLD) return;
        _dragState.hasMoved = true;
        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('right', 'auto', 'important');
        el.style.setProperty('bottom', 'auto', 'important');
        el.style.setProperty('transform', 'none', 'important');
        el.style.setProperty('animation', 'none', 'important');
    }

    let newLeft = currentX - _dragState.shiftX;
    let newTop = currentY - _dragState.shiftY;
    newLeft = Math.max(0, Math.min(_dragState.winW - 60, newLeft));
    newTop = Math.max(0, Math.min(_dragState.winH - 60, newTop));

    el.style.setProperty('left', newLeft + 'px', 'important');
    el.style.setProperty('top', newTop + 'px', 'important');
}

function _onDragUp() {
    _dragState.isDragging = false;

    document.removeEventListener('mousemove', _onDragMove);
    document.removeEventListener('touchmove', _onDragMove);
    document.removeEventListener('mouseup', _onDragUp);
    document.removeEventListener('touchend', _onDragUp);

    if (!_dragState.hasMoved) {
        // 点击 → 切换面板
        if (_engine) {
            _engine.toggle();
        }
    } else {
        _snapToEdge();
    }
}

function _snapToEdge() {
    const el = $('#tts-mobile-trigger')[0];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const midX = _dragState.winW / 2;
    const targetLeft = (rect.left + 30 < midX) ? 10 : (_dragState.winW - 50);

    el.style.setProperty('transition', 'left 0.2s ease', 'important');
    el.style.setProperty('left', targetLeft + 'px', 'important');

    setTimeout(() => {
        el.style.removeProperty('transition');
        el.style.removeProperty('animation');
        el.style.removeProperty('transform');
    }, 200);
}

// ==================== 事件绑定 ====================

function _bindShellEvents() {
    const $phone = $('#tts-mobile-root');

    // 电源键
    $('#tts-mobile-power-btn').click(function (e) {
        e.stopPropagation();
        if (_engine) _engine.close();
    });

    // 点击外部关闭
    $(document).on('click.defaultTheme', function (e) {
        if (_engine && _engine.isOpen()) {
            if ($(e.target).closest('#tts-mobile-root, #tts-mobile-trigger').length === 0) {
                _engine.close();
            }
        }
    });

    // 阻止手机内部点击冒泡
    $phone.on('click', function (e) {
        e.stopPropagation();
    });

    // Home 键
    $('#mobile-home-btn').click(function () {
        if (_engine) _engine.goHome();
    });
}

// ==================== 主屏移动端位置修复 ====================

function _fixMobilePosition() {
    setTimeout(() => {
        const $trigger = $('#tts-mobile-trigger');
        const el = $trigger[0];
        if (!el) return;

        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile) {
            const rect = el.getBoundingClientRect();
            const expectedCenter = window.innerHeight / 2;
            const actualCenter = rect.top + rect.height / 2;

            if (Math.abs(actualCenter - expectedCenter) > 50) {
                const expectedTop = (window.innerHeight - 40) / 2;
                el.style.setProperty('top', expectedTop + 'px', 'important');
                el.style.setProperty('transform', 'none', 'important');
                el.style.setProperty('animation', 'none', 'important');
            }
        }
    }, 500);
}

// ==================== DefaultTheme 主题配置 ====================

const DefaultTheme = {
    id: 'default',
    name: '📱 经典手机',
    description: '模拟手机界面，经典体验',
    version: '1.0.0',

    // ===== 生命周期 =====
    init(engine) {
        _engine = engine;
        _renderShell();
        _bindShellEvents();
        _fixMobilePosition();

        // 添加 viewport meta（兼容）
        if ($('meta[name="viewport"]').length === 0) {
            $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">');
        }

        console.log('[DefaultTheme] ✅ 初始化完成');
    },

    destroy() {
        // 解绑事件
        $(document).off('.defaultTheme');
        _destroyShell();
        _engine = null;
        console.log('[DefaultTheme] 已销毁');
    },

    // ===== 触发器 =====
    renderTrigger() {
        _bindDragEvents();
    },

    destroyTrigger() {
        $('#tts-mobile-trigger').remove();
    },

    // ===== 面板开关 =====
    onOpen(engine) {
        $('#tts-mobile-root').removeClass('minimized');
        $('#tts-mobile-trigger').fadeOut();
    },

    onClose(engine) {
        // 清理来电 App 资源
        if (IncomingCallApp.cleanup) {
            IncomingCallApp.cleanup();
        }
        $('#tts-mobile-root').addClass('minimized');
        $('#tts-mobile-trigger').fadeIn();
    },

    // ===== 场景容器 =====
    getSceneContainer() {
        return $('#mobile-screen-content');
    },

    // ===== 场景注册表 =====
    scenes: {
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
                IncomingCallApp.render($appContainer, _createNavbarForApps);
                $container.append($appContainer);
            },
            cleanup() {
                if (IncomingCallApp.cleanup) IncomingCallApp.cleanup();
            }
        },

        eavesdrop: {
            render($container, ctx) {
                const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
                EavesdropApp.render($appContainer, _createNavbarForApps);
                $container.append($appContainer);
            },
            cleanup() {
                if (EavesdropApp.cleanup) EavesdropApp.cleanup();
            }
        },

        favorites: {
            render($container, ctx) {
                const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
                FavoritesApp.render($appContainer, _createNavbarForApps);
                $container.append($appContainer);
            }
        },

        settings: {
            render($container, ctx) {
                const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
                SettingsApp.render($appContainer, _createNavbarForApps);
                $container.append($appContainer);
            }
        },

        llm_test: {
            render($container, ctx) {
                const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
                LlmTestApp.render($appContainer, _createNavbarForApps);
                $container.append($appContainer);
            }
        },

        phone_call: {
            render($container, ctx) {
                const $appContainer = $(`<div class="app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:#f2f2f7; color:#000;"></div>`);
                PhoneCallApp.render($appContainer, _createNavbarForApps);
                $container.append($appContainer);
            }
        },
    },

    // ===== 通知处理 =====
    onNotification(type, data, engine) {
        switch (type) {
            case 'incoming_call':
                _triggerFloatingBallAnimation('incoming-call', `${data.char_name || '未知'} 来电中...`);
                return true;

            case 'eavesdrop_ready':
                _triggerFloatingBallAnimation('eavesdrop-available',
                    data.notification_text || `${(data.speakers || []).join(' 和 ')} 正在私聊...`);
                return true;

            case 'call_ended':
                // 移除动画类
                $('#tts-mobile-trigger').removeClass('incoming-call eavesdrop-available');
                $('#tts-manager-btn').removeClass('incoming-call eavesdrop-available');
                return true;

            default:
                return false; // 未处理，让引擎执行默认行为
        }
    },

    // ===== 标签文案 =====
    getLabel(key) {
        const labels = {
            'incoming_call': '来电',
            'eavesdrop': '对话追踪',
            'favorites': '收藏夹',
            'settings': '系统设置',
            'call_history': '通话记录',
            'eavesdrop_history': '追踪记录',
        };
        return labels[key] || null;
    },
};

// ==================== 悬浮球动画 ====================

function _triggerFloatingBallAnimation(animationClass, tooltipText) {
    const $managerBtn = $('#tts-manager-btn');
    const $mobileTrigger = $('#tts-mobile-trigger');

    if ($managerBtn.length) {
        $managerBtn.addClass(animationClass);
        $managerBtn.attr('title', tooltipText);
    }

    if ($mobileTrigger.length) {
        $mobileTrigger[0].style.removeProperty('animation');
        $mobileTrigger[0].style.removeProperty('transform');
        $mobileTrigger.addClass(animationClass);
        $mobileTrigger.attr('title', tooltipText);
    }
}

export default DefaultTheme;
