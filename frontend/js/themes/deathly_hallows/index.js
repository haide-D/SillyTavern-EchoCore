import { ParticleEngine } from '../particle_engine.js';
import { ThemeState } from './state.js';
import { ensureCSS, renderTriggerDOM, bindDragAndClick, destroyDOM } from './ui.js';
import { homeScene } from './scenes/home.js';
import { incomingCallScene } from './scenes/incoming_call.js';
import { eavesdropScene } from './scenes/eavesdrop.js';

import * as SettingsApp from '../../mobile_apps/settings_app.js';
import * as FavoritesApp from '../../mobile_apps/favorites_app.js';
import * as LlmTestApp from '../../mobile_apps/llm_test_app.js';
import * as PhoneCallApp from '../../mobile_apps/phone_call_app.js';
import { createNavbarForApps } from './scenes/shared.js';

const DeathlyHallowsTheme = {
    id: 'deathly_hallows',
    name: '⚡ 死亡圣器',
    description: '沉浸式魔幻设计，采用金银双色与法阵动画',
    version: '1.0.0',
    cssUrl: '/scripts/extensions/third-party/st-direct-tts/frontend/css/themes/deathly_hallows.css',

    init(engine) {
        ThemeState.engine = engine;
        ensureCSS();
        renderTriggerDOM();
        
        console.log('[DeathlyHallowsTheme] ✅ 初始化完毕');
    },

    destroy() {
        if (ThemeState.particleEngine) {
            ThemeState.particleEngine.stop();
            ThemeState.particleEngine = null;
        }
        destroyDOM();
        ThemeState.engine = null;
        console.log('[DeathlyHallowsTheme] 已销毁');
    },

    renderTrigger() {
        bindDragAndClick();
        
        // 初始化并启动粒子动画
        ThemeState.particleEngine = new ParticleEngine({
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
        ThemeState.particleEngine.config.baseX = $('#tts-dh-trigger').position().left / $(window).width() + (36 / $(window).width());
        ThemeState.particleEngine.config.baseY = $('#tts-dh-trigger').position().top / $(window).height() + (36 / $(window).height());
        
        ThemeState.particleEngine.start();
    },

    destroyTrigger() {
        if (ThemeState.particleEngine) {
            ThemeState.particleEngine.stop();
            ThemeState.particleEngine = null;
        }
        $('#tts-dh-trigger').remove();
        $('#dhParticleCanvas').remove();
    },

    onOpen(engine) {
        const $modal = $('#tts-dh-modal');
        
        // 手机端修正：用真实可见高度计算，避免地址栏占用导致上方截断
        const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const modalW = Math.min(360, vw * 0.92);
        const modalH = Math.min(600, vh - 40);
        const top = (window.visualViewport ? window.visualViewport.pageTop : 0) + Math.max(20, (vh - modalH) / 2);
        const left = (window.visualViewport ? window.visualViewport.pageLeft : 0) + (vw - modalW) / 2;
        
        $modal.css({
            top: top + 'px',
            left: left + 'px',
            width: modalW + 'px',
            height: modalH + 'px',
            transform: 'none',
        });
        $modal.fadeIn(200);
    },

    onClose(engine) {
        $('#tts-dh-modal').fadeOut(200);
    },

    getSceneContainer() {
        return $('#tts-dh-scene-content');
    },

    scenes: {
        home: homeScene,
        incoming_call: incomingCallScene,
        eavesdrop: eavesdropScene,
        favorites: {
            render($container, ctx) {
                const $appContainer = $(`<div class="dh-magic-app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:transparent; color:rgba(220, 200, 150, 0.9);"></div>`);
                FavoritesApp.render($appContainer, createNavbarForApps);
                $container.empty().append($appContainer);
            }
        },
        settings: {
            render($container, ctx) {
                const $appContainer = $(`<div class="dh-magic-app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:transparent; color:rgba(220, 200, 150, 0.9);"></div>`);
                SettingsApp.render($appContainer, createNavbarForApps);
                $container.empty().append($appContainer);
            }
        },
        llm_test: {
            render($container, ctx) {
                const $appContainer = $(`<div class="dh-magic-app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:transparent; color:rgba(220, 200, 150, 0.9);"></div>`);
                LlmTestApp.render($appContainer, createNavbarForApps);
                $container.empty().append($appContainer);
            }
        },
        phone_call: {
            render($container, ctx) {
                const $appContainer = $(`<div class="dh-magic-app-container" style="width:100%; height:100%; display:flex; flex-direction:column; background:transparent; color:rgba(220, 200, 150, 0.9);"></div>`);
                PhoneCallApp.render($appContainer, createNavbarForApps);
                $container.empty().append($appContainer);
            }
        }
    },

    onNotification(type, data, engine) {
        switch (type) {
            case 'incoming_call':
                if (ThemeState.particleEngine) ThemeState.particleEngine.switchState('call');
                if (window.toastr) {
                    window.toastr.info(`📞 ${data.char_name || '未知'} 来电中，点击法阵接听`);
                }
                window.TTS_IncomingCall = data; // 确保引擎能够识别到当前处于来电中
                return true;

            case 'eavesdrop_ready':
                if (ThemeState.particleEngine) ThemeState.particleEngine.switchState('whisper');
                if (window.toastr) {
                    window.toastr.info(`🎧 远方传来低语: ${(data.speakers || []).join(' 和 ')}`);
                }
                window.TTS_EavesdropReady = data;
                return true;

            case 'call_ended':
                if (ThemeState.particleEngine) ThemeState.particleEngine.switchState('idle');
                return true;

            default:
                return false;
        }
    },

    getLabel(key) {
        const labels = {
            'incoming_call': '双面镜通讯',
            'eavesdrop': '伸缩耳探听',
            'favorites': '冥想盆记忆',
            'settings': '有求必应屋',
            'call_history': '双面镜回溯',
            'eavesdrop_history': '探听记录',
        };
        return labels[key] || null;
    }
};

export default DeathlyHallowsTheme;
