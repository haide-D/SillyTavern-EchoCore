import { ParticleEngine } from './particle_engine.js';
import * as IncomingCallApp from '../mobile_apps/incoming_call_app.js';
import * as SettingsApp from '../mobile_apps/settings_app.js';
import * as FavoritesApp from '../mobile_apps/favorites_app.js';
import * as LlmTestApp from '../mobile_apps/llm_test_app.js';
import * as PhoneCallApp from '../mobile_apps/phone_call_app.js';
import * as EavesdropApp from '../mobile_apps/eavesdrop_app.js';
import { createNavbar } from './theme_utils.js';

let _engine = null;
let _particleEngine = null;

let _dragState = {
    isDragging: false,
    hasMoved: false,
    startX: 0, startY: 0,
    shiftX: 0, shiftY: 0,
    winW: 0, winH: 0,
};
const DRAG_THRESHOLD = 10;

// 应用配置可复用
const APPS = {
    'incoming_call': { name: '来电', icon: '📞', bg: '#667eea', sceneId: 'incoming_call' },
    'settings': { name: '系统设置', icon: '⚙️', bg: '#333', sceneId: 'settings' },
    'favorites': { name: '收藏夹', icon: '❤️', bg: 'var(--s-ready-bg, #e11d48)', sceneId: 'favorites' },
    'llm_test': { icon: '🤖', bg: '#8b5cf6', sceneId: 'llm_test' },
    'phone_call': { icon: '📞', bg: '#10b981', sceneId: 'phone_call' },
    'eavesdrop': { name: '对话追踪', icon: '🎧', bg: '#22c55e', sceneId: 'eavesdrop' }
};

// ==================== CSS 及 DOM 注入 ====================
function ensureCSS() {
    if ($('link[href*="deathly_hallows.css"]').length === 0) {
        console.log('[DeathlyHallowsTheme] 尝试加载 deathly_hallows.css');
        let cssPath = '';
        if (window.TTS_State && window.TTS_State.CACHE && window.TTS_State.CACHE.API_URL) {
            cssPath = '/scripts/extensions/third-party/st-direct-tts/frontend/css/themes/deathly_hallows.css';
        } else {
            // 回退到默认常见路径 
            cssPath = '/scripts/extensions/third-party/st-direct-tts/frontend/css/themes/deathly_hallows.css';
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssPath;
        document.head.appendChild(link);
    }
}

function _renderTriggerDOM() {
    // 防止重复
    if ($('#tts-dh-trigger').length > 0) return;

    // 渲染法阵和 canvas
    // Canvas 需要置底且充满全屏，但不会遮挡鼠标事件
    const canvasHtml = `<canvas id="dhParticleCanvas" style="position:fixed; top:0; left:0; width:100%; height:100%; z-index:9998; pointer-events:none;"></canvas>`;
    
    // 渲染法阵 Trigger 节点
    const triggerHtml = `
    <div id="tts-dh-trigger" class="dh-container" style="position:fixed; z-index:9999; cursor:pointer;" title="Patronus">
        <div class="dh-inner" id="dhInner">
            <div class="dh-glow"></div>
            <div class="dh-aura"></div>
            <svg class="dh-svg" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle class="dh-orbit-outer" cx="28" cy="28" r="26" />
                <circle class="dh-orbit-mid" cx="28" cy="28" r="23" />
                <g class="dh-rune-ring">
                    <circle cx="28" cy="28" r="27" fill="none" stroke="rgba(var(--dh-gold-rgb), 0.12)" stroke-width="0.3" />
                    <path class="rune-glyph" d="M28,1 L28,5 M26,2.5 L28,1 L30,2.5" />
                    <path class="rune-glyph" d="M46,8 L48,10 L46,12 L44,10 Z" />
                    <path class="rune-glyph" d="M53,27 L55,29 M55,27 L53,29" />
                    <circle class="rune-dot" cx="54" cy="28" r="0.6" />
                    <path class="rune-glyph" d="M46,46 L48,43 L50,46" />
                    <path class="rune-glyph" d="M27,51 L27,55 M29,51 L29,55" />
                    <circle class="rune-dot" cx="28" cy="53" r="0.6" />
                    <path class="rune-glyph" d="M10,46 L8,43 L10,43 M8,46 L8,43" />
                    <path class="rune-glyph" d="M1,27 L4,27 L1,29 L4,29" />
                    <circle class="rune-dot" cx="2.5" cy="28" r="0.6" />
                    <path class="rune-glyph" d="M8,12 L10,9 L12,12" />
                    <circle class="rune-dot" cx="10" cy="10" r="0.6" />
                </g>
                <path class="dh-triangle" d="M28,10 L42,44 L14,44 Z" />
                <path class="dh-triangle-flow" d="M28,10 L42,44 L14,44 Z" />
                <circle class="dh-circle" cx="28" cy="32" r="10.5" />
                <circle class="dh-circle-flow" cx="28" cy="32" r="10.5" />
                <line class="dh-line" x1="28" y1="10" x2="28" y2="44" />
                <line class="dh-line-flow" x1="28" y1="10" x2="28" y2="44" />
                <circle class="dh-core" cx="28" cy="28" r="2" />
                <circle class="dh-node" cx="28" cy="10" r="1.2">
                    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle class="dh-node" cx="42" cy="44" r="1">
                    <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3.5s" repeatCount="indefinite" />
                </circle>
                <circle class="dh-node" cx="14" cy="44" r="1">
                    <animate attributeName="opacity" values="0.3;0.7;0.3" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle class="dh-node" cx="21.5" cy="40" r="0.8" opacity="0.4">
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle class="dh-node" cx="34.5" cy="40" r="0.8" opacity="0.4">
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3.2s" repeatCount="indefinite" />
                </circle>
            </svg>
            <div class="dh-shadow"></div>
        </div>
    </div>
    
    <!-- 内部的场景路由容器，复用 mobile 设计或者悬浮弹窗 -->
    <div id="tts-dh-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:360px; height:600px; background:var(--proto-bg-mid, #0c0c24); box-shadow:0 0 30px rgba(0,0,0,0.8); z-index:10000; border-radius:16px; border:1px solid rgba(var(--dh-gold-rgb), 0.3); overflow:hidden;">
        <div id="tts-dh-scene-content" style="width:100%; height:100%;"></div>
        <div class="dh-close-btn" style="position:absolute; top:10px; right:15px; cursor:pointer; color:var(--dh-gold); font-size:20px; z-index:10001;" title="Close">&times;</div>
    </div>
    `;
    $('body').append(canvasHtml + triggerHtml);
    
    // 设置触发器初始显示位置 (靠右)，并显式设置为 flex 显示
    const $trigger = $('#tts-dh-trigger');
    $trigger.css({
        left: ($(window).width() * 0.78 - 36) + 'px',
        top: ($(window).height() * 0.50 - 36) + 'px',
        display: 'flex'
    });
}

function _destroyDOM() {
    $('#tts-dh-trigger, #dhParticleCanvas, #tts-dh-modal').remove();
}

function _createNavbarForApps(title) {
    return createNavbar(title, () => {
        if (_engine) {
            _engine.goHome();
        }
    });
}

function _bindDragAndClick() {
    const $trigger = $('#tts-dh-trigger');
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

    // 模态框关闭按钮
    $('.dh-close-btn').click(() => {
        if (_engine) _engine.close();
    });
}

function _onDragMove(e) {
    if (!_dragState.isDragging) return;
    if (e.cancelable) e.preventDefault();

    const point = e.type === 'touchmove' ? e.touches[0] : e;
    const currentX = point.clientX;
    const currentY = point.clientY;
    const el = $('#tts-dh-trigger')[0];
    if (!el) return;

    if (!_dragState.hasMoved) {
        const moveDis = Math.sqrt(Math.pow(currentX - _dragState.startX, 2) + Math.pow(currentY - _dragState.startY, 2));
        if (moveDis < DRAG_THRESHOLD) return;
        _dragState.hasMoved = true;
        
        // 拖拽时取消粒子引擎的悬浮计算
        if (_particleEngine) {
            _particleEngine.config.floatAmplitudeX = 0;
            _particleEngine.config.floatAmplitudeY = 0;
            _particleEngine.config.floatSecondaryAmpX = 0;
            _particleEngine.config.floatSecondaryAmpY = 0;
        }
    }

    let newLeft = currentX - _dragState.shiftX;
    let newTop = currentY - _dragState.shiftY;
    newLeft = Math.max(0, Math.min(_dragState.winW - 72, newLeft));
    newTop = Math.max(0, Math.min(_dragState.winH - 72, newTop));

    el.style.left = newLeft + 'px';
    el.style.top = newTop + 'px';
    
    if (_particleEngine) {
        // 同步粒子引擎的坐标
        _particleEngine.elX = newLeft + 36;
        _particleEngine.elY = newTop + 36;
        // 修改 baseUrl 等防止它跳回去
        _particleEngine.config.baseX = (newLeft + 36) / _dragState.winW;
        _particleEngine.config.baseY = (newTop + 36) / _dragState.winH;
    }
}

function _onDragUp() {
    _dragState.isDragging = false;

    document.removeEventListener('mousemove', _onDragMove);
    document.removeEventListener('touchmove', _onDragMove);
    document.removeEventListener('mouseup', _onDragUp);
    document.removeEventListener('touchend', _onDragUp);

    if (!_dragState.hasMoved) {
        // 点击处理
        if (_engine) {
            // 检查是否是来电状态
            if (window.TTS_IncomingCall) {
                _playAwakeningAnimation().then(() => {
                    _engine.toggle();
                });
            } else {
                _engine.toggle();
            }
        }
    } else {
        // 恢复悬浮浮动
        if (_particleEngine) {
            _particleEngine.config.floatAmplitudeX = 6;
            _particleEngine.config.floatAmplitudeY = 5;
            _particleEngine.config.floatSecondaryAmpX = 2.5;
            _particleEngine.config.floatSecondaryAmpY = 2;
        }
    }
}

// 播放原型机风格的接听飞入居中动画
function _playAwakeningAnimation() {
    return new Promise((resolve) => {
        const $trigger = $('#tts-dh-trigger');
        if (!$trigger.length) return resolve();

        // 1. 发射光波与暗化（omen）
        $trigger.addClass('omen');
        const cx = $(window).width() / 2;
        const cy = $(window).height() / 2;
        
        // （省略创建满屏 shockwave 的繁琐操作，直接执行向中心移动并放大的效果）
        const targetSize = Math.min($(window).width(), $(window).height()) * 0.55;

        // 绑定 transition 执行变大和居中
        $trigger.css({
            'transition': 'all 1s cubic-bezier(0.22, 1, 0.36, 1)',
            'left': (cx - targetSize / 2) + 'px',
            'top': (cy - targetSize / 2) + 'px',
            'width': targetSize + 'px',
            'height': targetSize + 'px',
            'z-index': 10002 // 确保盖在所有东西上面
        });
        
        // 调整内部粒子的关联
        if (_particleEngine) {
            _particleEngine.elX = cx;
            _particleEngine.elY = cy;
            _particleEngine.config.baseX = 0.5;
            _particleEngine.config.baseY = 0.5;
        }

        // 2. 等待移动动画后进入分离状态（separated/accepted 表现）
        setTimeout(() => {
            $trigger.removeClass('omen').addClass('separated accepted');
            // 最后完成解析并打开引擎面板
            setTimeout(() => {
                resolve();
            }, 500);
        }, 1000);
    });
}



// ==================== 主题定义 ====================

const DeathlyHallowsTheme = {
    id: 'deathly_hallows',
    name: '⚡ 死亡圣器',
    description: '沉浸式魔幻设计，采用金银双色与法阵动画',
    version: '1.0.0',

    init(engine) {
        _engine = engine;
        ensureCSS();
        _renderTriggerDOM();
        
        console.log('[DeathlyHallowsTheme] ✅ 初始化完毕');
    },

    destroy() {
        if (_particleEngine) {
            _particleEngine.stop();
            _particleEngine = null;
        }
        _destroyDOM();
        _engine = null;
        console.log('[DeathlyHallowsTheme] 已销毁');
    },

    renderTrigger() {
        _bindDragAndClick();
        
        // 初始化并启动粒子动画
        _particleEngine = new ParticleEngine({
            elementId: 'tts-dh-trigger',
            canvasId: 'dhParticleCanvas',
            elementSize: 72,
            colors: {
                dustRGB: '200, 180, 120',
                dustGlowRGB: '212, 168, 83',
                trailHue: [38, 52],
                trailSat: 55,
                trailLight: 70,
                whisperHue: [265, 285],
                whisperSat: 60,
                whisperLight: 55,
                goldHue: [40, 50],
                goldSat: 70,
                goldLight: 68,
            },
            emitters: {
                svgViewBox: 56,
                edges: [
                    { from: [28, 10], to: [42, 44] },
                    { from: [42, 44], to: [14, 44] },
                    { from: [14, 44], to: [28, 10] },
                ],
                arcs: [
                    { cx: 28, cy: 32, r: 10.5 },
                ],
                vertices: [
                    [28, 10], [42, 44], [14, 44],
                    [21.5, 40], [34.5, 40], [28, 28],
                ],
            },
            microEvents: [
                {
                    name: 'micro-spin', weight: 30,
                    fn(done, p) {
                        $('#dhInner').addClass('micro-spin');
                        p.burstParticles(2, 'gold');
                        for (let i = 0; i < 2; i++) p._emitOrbitParticle('gold');
                        setTimeout(() => { $('#dhInner').removeClass('micro-spin'); done(); }, 700);
                    }
                },
                {
                    name: 'surge', weight: 30,
                    fn(done, p) {
                        $('#dhInner').addClass('surge');
                        p.burstParticles(3, 'gold');
                        for (let i = 0; i < 2; i++) p._emitOrbitParticle('gold');
                        setTimeout(() => { $('#dhInner').removeClass('surge'); done(); }, 800);
                    }
                },
                {
                    name: 'flash', weight: 25,
                    fn(done, p) {
                        $('#dhInner').addClass('flash');
                        p.burstParticles(2, 'gold');
                        p._emitOrbitParticle('gold');
                        setTimeout(() => { $('#dhInner').removeClass('flash'); done(); }, 900);
                    }
                },
                {
                    name: 'aura-burst', weight: 15,
                    fn(done, p) {
                        p.burstParticles(4, 'gold');
                        for (let i = 0; i < 3; i++) p._emitOrbitParticle('gold');
                        setTimeout(done, 600);
                    }
                },
            ],
            onEnterState(state) {
                const $dhContainer = $('#tts-dh-trigger');
                if (state === 'whisper') $dhContainer.addClass('whisper-sensing');
                if (state === 'call') $dhContainer.addClass('incoming-call');
            },
            onLeaveState(state) {
                $('#tts-dh-trigger').removeClass('whisper-sensing incoming-call');
                $('#dhInner').removeClass('micro-spin surge flash');
            },
        });
        
        // 初始位置设定
        _particleEngine.config.baseX = $('#tts-dh-trigger').position().left / $(window).width() + (36 / $(window).width());
        _particleEngine.config.baseY = $('#tts-dh-trigger').position().top / $(window).height() + (36 / $(window).height());
        
        _particleEngine.start();
    },

    destroyTrigger() {
        if (_particleEngine) {
            _particleEngine.stop();
            _particleEngine = null;
        }
        $('#tts-dh-trigger').remove();
        $('#dhParticleCanvas').remove();
    },

    onOpen(engine) {
        $('#tts-dh-modal').fadeIn(200);
    },

    onClose(engine) {
        if (IncomingCallApp.cleanup) IncomingCallApp.cleanup();
        $('#tts-dh-modal').fadeOut(200);

        // 如果正处于来电状态分离变大后，需要触发收回动画
        const $trigger = $('#tts-dh-trigger');
        if ($trigger.hasClass('separated') || $trigger.hasClass('accepted') || $trigger.hasClass('omen')) {
            $trigger.removeClass('separated accepted omen').addClass('dispersing');

            // 回复拖拽计算保存的上一次位置，如果没拖过则取默认
            let origX = _dragState.winW * 0.78 - 36;
            let origY = _dragState.winH * 0.50 - 36;
            if (_dragState.startX > 0 || _dragState.startY > 0) {
               // 这里因为 dragup 保存的坐标由 $trigger 的当前 css left 决定
               // _dragState并没有一直存位置, 所以安全起见回到最初配置
            }

            $trigger.css({
                'transition': 'all 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
                'left': origX + 'px',
                'top': origY + 'px',
                'width': '72px',
                'height': '72px'
            });

            // 等待恢复后重置 transition 并调整粒子引擎原点
             setTimeout(() => {
                $trigger.css('transition', 'filter 0.3s ease'); // 将 transition 恢复原状
                $trigger.removeClass('dispersing');
                if (_particleEngine) {
                    _particleEngine.elX = origX + 36;
                    _particleEngine.elY = origY + 36;
                    _particleEngine.config.baseX = (origX + 36) / $(window).width();
                    _particleEngine.config.baseY = (origY + 36) / $(window).height();
                }
            }, 1500);
        }
    },

    getSceneContainer() {
        return $('#tts-dh-scene-content');
    },

    scenes: {
        home: {
            render($container, ctx) {
                $container.empty();
                // 使用符合魔幻主题的暗黑风格应用网格
                $container.css({
                   'padding': '20px',
                   'color': 'var(--proto-text-color)',
                   'height': '100%',
                   'box-sizing': 'border-box'
                });
                const $grid = $(`<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:15px; margin-top:20px;"></div>`);

                Object.keys(APPS).forEach(key => {
                    const app = APPS[key];
                    if (!app.name) return;
                    const item = `
                    <div class="dh-app-icon" data-app="${key}" style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                        <div style="width:50px; height:50px; border-radius:12px; background:rgba(var(--dh-gold-rgb), 0.1); border:1px solid rgba(var(--dh-gold-rgb), 0.4); display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 0 10px rgba(var(--dh-gold-rgb), 0.1);">
                            ${app.icon}
                        </div>
                        <span style="margin-top:8px; font-size:12px; color:var(--dh-gold-bright);">${app.name}</span>
                    </div>
                    `;
                    $grid.append(item);
                });

                $container.append($grid);

                $grid.on('click', '.dh-app-icon', function () {
                    const key = $(this).data('app');
                    const app = APPS[key];
                    if (app && app.sceneId && ctx.engine) {
                        ctx.engine.showScene(app.sceneId);
                    }
                });

                if (IncomingCallApp.cleanup) IncomingCallApp.cleanup();
            }
        },

        incoming_call: {
            render($container, ctx) {
                const $appContainer = $(`<div style="width:100%; height:100%; display:flex; flex-direction:column; background:var(--proto-bg-dark); color:var(--proto-text-color);"></div>`);
                IncomingCallApp.render($appContainer, _createNavbarForApps);
                $container.empty().append($appContainer);
            },
            cleanup() {
                if (IncomingCallApp.cleanup) IncomingCallApp.cleanup();
            }
        },
        eavesdrop: {
            render($container, ctx) {
                const $appContainer = $(`<div style="width:100%; height:100%; display:flex; flex-direction:column; background:var(--proto-bg-dark); color:var(--proto-text-color);"></div>`);
                EavesdropApp.render($appContainer, _createNavbarForApps);
                $container.empty().append($appContainer);
            },
            cleanup() {
                if (EavesdropApp.cleanup) EavesdropApp.cleanup();
            }
        },
        favorites: {
            render($container, ctx) {
                const $appContainer = $(`<div style="width:100%; height:100%; display:flex; flex-direction:column; background:var(--proto-bg-dark); color:var(--proto-text-color);"></div>`);
                FavoritesApp.render($appContainer, _createNavbarForApps);
                $container.empty().append($appContainer);
            }
        },
        settings: {
            render($container, ctx) {
                const $appContainer = $(`<div style="width:100%; height:100%; display:flex; flex-direction:column; background:var(--proto-bg-dark); color:var(--proto-text-color);"></div>`);
                SettingsApp.render($appContainer, _createNavbarForApps);
                $container.empty().append($appContainer);
            }
        },
        llm_test: {
            render($container, ctx) {
                const $appContainer = $(`<div style="width:100%; height:100%; display:flex; flex-direction:column; background:var(--proto-bg-dark); color:var(--proto-text-color);"></div>`);
                LlmTestApp.render($appContainer, _createNavbarForApps);
                $container.empty().append($appContainer);
            }
        },
        phone_call: {
            render($container, ctx) {
                const $appContainer = $(`<div style="width:100%; height:100%; display:flex; flex-direction:column; background:var(--proto-bg-dark); color:var(--proto-text-color);"></div>`);
                PhoneCallApp.render($appContainer, _createNavbarForApps);
                $container.empty().append($appContainer);
            }
        },
    },

    onNotification(type, data, engine) {
        switch (type) {
            case 'incoming_call':
                if (_particleEngine) _particleEngine.switchState('call');
                if (window.toastr) {
                    window.toastr.info(`📞 ${data.char_name || '未知'} 来电中，点击法阵接听`);
                }
                window.TTS_IncomingCall = data; // 确保引擎能够识别到当前处于来电中
                return true;

            case 'eavesdrop_ready':
                if (_particleEngine) _particleEngine.switchState('whisper');
                if (window.toastr) {
                    window.toastr.info(`🎧 远方传来低语: ${(data.speakers || []).join(' 和 ')}`);
                }
                return true;

            case 'call_ended':
                if (_particleEngine) _particleEngine.switchState('idle');
                return true;

            default:
                return false;
        }
    },

    getLabel(key) {
        const labels = {
            'incoming_call': '魔法传讯',
            'eavesdrop': '探知低语',
            'favorites': '复活石铭刻',
            'settings': '法阵修正',
            'call_history': '传讯回溯',
            'eavesdrop_history': '低语记忆',
        };
        return labels[key] || null;
    },
};

export default DeathlyHallowsTheme;
