/**
 * 平安京·落樱雅境 (sakura_elegance) - 核心主题入口
 * 严格对齐《死亡圣器》架构规范
 */

import { ThemeState } from './state.js';
import { ensureCSS, renderTriggerDOM, fixModalPosition, bindDragAndClick, destroyTriggerDOM } from './ui.js';
import { homeScene } from './scenes/home.js';
import { incomingCallScene } from './scenes/incoming_call.js';
import { eavesdropScene } from './scenes/eavesdrop.js';
import { createNavbarForApps } from './scenes/shared.js';
import { SakuraParticleEngine } from './sakura_particles.js';
import * as PhoneCallApp from '../../mobile_apps/phone_call_app.js';

const THEME_ID = 'sakura_elegance';

const SakuraEleganceTheme = {
    id: THEME_ID,
    name: '落樱雅境',
    version: '1.0.0',
    description: '平安京公卿风雅与莫兰迪薄樱美学：和纸莳绘 · 描金折扇 · 纸鹤式神 · 3D 落樱粒子物理系统 · 100% 细线矢量',
    cssUrl: new URL('../../../css/themes/sakura_elegance.css', import.meta.url).pathname,
    createNavbar: createNavbarForApps,

    // ==================== 1. 生命周期：初始化 ====================
    async init(engine) {
        ThemeState.engine = engine;
        ensureCSS();
        renderTriggerDOM();

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', fixModalPosition);
            window.visualViewport.addEventListener('scroll', fixModalPosition);
        }

        console.log('[SakuraEleganceTheme] ✅ 平安京和风莳绘与落樱折扇初始化完成');
    },

    // ==================== 2. 生命周期：销毁 ====================
    destroy() {
        if (ThemeState.particleEngine) {
            ThemeState.particleEngine.stop();
            ThemeState.particleEngine = null;
        }
        destroyTriggerDOM();

        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', fixModalPosition);
            window.visualViewport.removeEventListener('scroll', fixModalPosition);
        }

        ThemeState.engine = null;
        console.log('[SakuraEleganceTheme] 已完全销毁');
    },

    // ==================== 3. 悬浮入口渲染与交互 ====================
    renderTrigger(engine) {
        ThemeState.engine = engine;
        bindDragAndClick();

        if (!ThemeState.particleEngine) {
            ThemeState.particleEngine = new SakuraParticleEngine({
                elementId: 'tts-sakura-trigger',
                canvasId: 'sakuraParticleCanvas'
            });
        }
        ThemeState.particleEngine.start();
    },

    destroyTrigger() {
        if (ThemeState.particleEngine) {
            ThemeState.particleEngine.stop();
            ThemeState.particleEngine = null;
        }
        $('#tts-sakura-trigger').remove();
    },

    // ==================== 4. 面板打开/关闭 ====================
    onOpen(engine) {
        fixModalPosition();
        $('#tts-sakura-modal').fadeIn(250);
        $('#tts-sakura-trigger').fadeOut(200);
    },

    onClose(engine) {
        $('#tts-sakura-modal').fadeOut(200);
        $('#tts-sakura-trigger').fadeIn(200);
        if (PhoneCallApp.cleanup) PhoneCallApp.cleanup();
    },

    // ==================== 5. 场景容器 ====================
    getSceneContainer() {
        return $('#tts-sakura-scene-content');
    },

    // ==================== 6. 场景注册表 ====================
    scenes: {
        home: homeScene,
        incoming_call: incomingCallScene,
        eavesdrop: eavesdropScene
    },

    // ==================== 7. 事件与通知 ====================
    onNotification(type, data, engine) {
        const $statusRing = $('#sakuraStatusRing');
        switch (type) {
            case 'incoming_call':
                $statusRing.removeClass('ready playing').addClass('calling');
                if (ThemeState.particleEngine) {
                    ThemeState.particleEngine.burst();
                }
                if (window.toastr) {
                    window.toastr.info(`✦ 纸鹤传音至: ${data.char_name || '式神'}`);
                }
                window.TTS_IncomingCall = data;
                return true;

            case 'eavesdrop_ready':
                $statusRing.removeClass('calling playing').addClass('ready');
                if (ThemeState.particleEngine) {
                    ThemeState.particleEngine.burst();
                }
                if (window.toastr) {
                    window.toastr.info(`✦ 灵视感应到隐秘言灵: ${(data.speakers || []).join(' ✦ ')}`);
                }
                window.TTS_EavesdropReady = data;
                return true;

            case 'call_ended':
                $statusRing.removeClass('calling ready playing');
                delete window.TTS_IncomingCall;
                delete window.TTS_EavesdropReady;
                return true;

            default:
                return false;
        }
    },

    // ==================== 8. 标签文案覆盖 ====================
    getLabel(key, fallback) {
        const labels = {
            'incoming_call': '纸鹤传音',
            'eavesdrop': '灵视言灵',
            'workshop': '百鬼百绘',
            'favorites': '结缘御守',
            'theme_store': '莳绘花坊',
            'settings': '阴阳寮律'
        };
        return labels[key] || fallback;
    }
};

export default SakuraEleganceTheme;
