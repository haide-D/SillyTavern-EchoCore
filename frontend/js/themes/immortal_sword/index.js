/**
 * 仙途凌霄 (immortal_sword) - 核心主题入口
 * 严格对齐《死亡圣器》架构规范
 */

import { ThemeState } from './state.js';
import { ensureCSS, renderTriggerDOM, fixModalPosition, fixTriggerPosition, bindDragAndClick, destroyDOM } from './ui.js';
import { homeScene } from './scenes/home.js';
import { incomingCallScene } from './scenes/incoming_call.js';
import { eavesdropScene } from './scenes/eavesdrop.js';
import { createNavbarForApps } from './scenes/shared.js';
import { ImmortalParticleEngine } from './immortal_particles.js';
import * as PhoneCallApp from '../../mobile_apps/phone_call_app.js';

const THEME_ID = 'immortal_sword';

const handleViewportChange = () => {
    fixModalPosition();
    fixTriggerPosition();
};

const ImmortalSwordTheme = {
    id: THEME_ID,
    name: '仙途凌霄',
    version: '1.2.0',
    description: '仙门天机长卷与修真玉简主题，配备悬浮破空飞剑灵器、水墨灵气粒子与全屏飞剑传书',
    cssUrl: new URL('../../../css/themes/immortal_sword.css', import.meta.url).pathname,
    createNavbar: createNavbarForApps,

    // ==================== 1. 生命周期：初始化 ====================
    async init(engine) {
        ThemeState.engine = engine;
        ensureCSS();
        renderTriggerDOM();

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
        } else {
            window.addEventListener('resize', handleViewportChange);
        }

        console.log('[ImmortalSwordTheme] ✅ 仙门天机卷轴与飞剑灵器初始化完成');
    },

    // ==================== 2. 生命周期：销毁 ====================
    destroy() {
        if (ThemeState.particleEngine) {
            ThemeState.particleEngine.stop();
            ThemeState.particleEngine = null;
        }
        destroyDOM();

        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', handleViewportChange);
            window.visualViewport.removeEventListener('scroll', handleViewportChange);
        } else {
            window.removeEventListener('resize', handleViewportChange);
        }

        ThemeState.engine = null;
        console.log('[ImmortalSwordTheme] 已完全销毁');
    },

    // ==================== 3. 悬浮入口渲染与交互 ====================
    renderTrigger(engine) {
        ThemeState.engine = engine;
        bindDragAndClick();

        if (!ThemeState.particleEngine) {
            ThemeState.particleEngine = new ImmortalParticleEngine({
                elementId: 'tts-immortal-trigger',
                canvasId: 'immortalParticleCanvas',
                elementSize: 40
            });
        }
        ThemeState.particleEngine.start();
    },

    destroyTrigger() {
        if (ThemeState.particleEngine) {
            ThemeState.particleEngine.stop();
            ThemeState.particleEngine = null;
        }
        $('#tts-immortal-trigger').remove();
    },

    // ==================== 4. 面板打开/关闭 ====================
    onOpen(engine) {
        fixModalPosition();
        $('#tts-immortal-modal').fadeIn(250);
        $('#tts-immortal-trigger').fadeOut(200);
    },

    onClose(engine) {
        $('#tts-immortal-modal').fadeOut(200);
        $('#tts-immortal-trigger').fadeIn(200);
        if (PhoneCallApp.cleanup) PhoneCallApp.cleanup();
    },

    // ==================== 5. 场景容器 ====================
    getSceneContainer() {
        return $('#tts-immortal-scene-content');
    },

    // ==================== 6. 场景注册表 ====================
    scenes: {
        home: homeScene,
        incoming_call: incomingCallScene,
        eavesdrop: eavesdropScene
    },

    // ==================== 7. 事件与通知 ====================
    onNotification(type, data, engine) {
        switch (type) {
            case 'incoming_call':
                $('#tts-immortal-trigger').addClass('calling-resonant incoming-call').removeClass('whisper-sensing eavesdrop-ready');
                if (ThemeState.particleEngine) {
                    ThemeState.particleEngine.triggerSwordSurge();
                    ThemeState.particleEngine.burstParticles(10, 'gold');
                }
                if (window.toastr) {
                    window.toastr.info(`✦ 飞剑传书破空而至: ${data.char_name || '修仙道友'}`);
                }
                window.TTS_IncomingCall = data;
                return true;

            case 'eavesdrop_ready':
                $('#tts-immortal-trigger').addClass('whisper-sensing eavesdrop-ready').removeClass('calling-resonant incoming-call');
                if (ThemeState.particleEngine) {
                    ThemeState.particleEngine.triggerResonance();
                    ThemeState.particleEngine.burstParticles(8, 'jade');
                }
                if (window.toastr) {
                    window.toastr.info(`✦ 神识感应到隐秘道音: ${(data.speakers || []).join(' ✦ ')}`);
                }
                window.TTS_EavesdropReady = data;
                return true;

            case 'call_ended':
                $('#tts-immortal-trigger').removeClass('calling-resonant incoming-call whisper-sensing eavesdrop-ready');
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
            'incoming_call': '飞剑传书',
            'eavesdrop': '神识探查',
            'workshop': '天机推演',
            'favorites': '灵宝道藏',
            'theme_store': '万象幻境',
            'settings': '乾坤法仪'
        };
        return labels[key] || fallback;
    }
};

export default ImmortalSwordTheme;
