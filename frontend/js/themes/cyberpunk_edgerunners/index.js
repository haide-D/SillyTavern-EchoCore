/**
 * 夜之城·边缘行者 (cyberpunk_edgerunners) - 核心主题入口
 * 严格对齐《死亡圣器》与《落樱雅境》架构规范
 */

import { ThemeState } from './state.js';
import { ensureCSS, renderTriggerDOM, fixModalPosition, bindDragAndClick, destroyTriggerDOM } from './ui.js';
import { homeScene } from './scenes/home.js';
import { incomingCallScene } from './scenes/incoming_call.js';
import { eavesdropScene } from './scenes/eavesdrop.js';
import { createNavbarForApps } from './scenes/shared.js';
import { CyberParticleEngine } from './cyber_particles.js';
import * as PhoneCallApp from '../../mobile_apps/phone_call_app.js';

const THEME_ID = 'cyberpunk_edgerunners';

const CyberpunkEdgerunnersTheme = {
    id: THEME_ID,
    name: '夜之城·边缘行者',
    version: '1.0.0',
    description: '夜之城霓虹故障与斯安威逊极速美学：战术 HUD · 脑机直连 · 深网破冰 · 3D 赛博光子火花物理系统 · 100% 细线矢量',
    cssUrl: new URL('../../../css/themes/cyberpunk_edgerunners.css', import.meta.url).pathname,
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

        console.log('[CyberpunkEdgerunnersTheme] ✅ 夜之城战术 HUD 与赛博准星初始化完成');
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
        console.log('[CyberpunkEdgerunnersTheme] 已完全销毁');
    },

    // ==================== 3. 悬浮入口渲染与交互 ====================
    renderTrigger(engine) {
        ThemeState.engine = engine;
        bindDragAndClick();

        if (!ThemeState.particleEngine) {
            ThemeState.particleEngine = new CyberParticleEngine({
                elementId: 'tts-cyber-trigger',
                canvasId: 'cyberParticleCanvas'
            });
        }
        ThemeState.particleEngine.start();
    },

    destroyTrigger() {
        if (ThemeState.particleEngine) {
            ThemeState.particleEngine.stop();
            ThemeState.particleEngine = null;
        }
        $('#tts-cyber-trigger').remove();
    },

    // ==================== 4. 面板打开/关闭 ====================
    onOpen(engine) {
        fixModalPosition();
        $('#tts-cyber-modal').fadeIn(220);
        $('#tts-cyber-trigger').fadeOut(180);
    },

    onClose(engine) {
        $('#tts-cyber-modal').fadeOut(180);
        $('#tts-cyber-trigger').fadeIn(200);
        if (PhoneCallApp.cleanup) PhoneCallApp.cleanup();
    },

    // ==================== 5. 场景容器 ====================
    getSceneContainer() {
        return $('#tts-cyber-scene-content');
    },

    // ==================== 6. 场景注册表 ====================
    scenes: {
        home: homeScene,
        incoming_call: incomingCallScene,
        eavesdrop: eavesdropScene
    },

    // ==================== 7. 事件与通知 ====================
    onNotification(type, data, engine) {
        const $trigger = $('#tts-cyber-trigger');
        const $statusRing = $('#cyberStatusRing');
        switch (type) {
            case 'incoming_call':
                $trigger.removeClass('is-ready is-playing').addClass('is-calling');
                $statusRing.removeClass('ready playing').addClass('calling');
                if (ThemeState.particleEngine) {
                    ThemeState.particleEngine.burst();
                }
                if (window.toastr) {
                    window.toastr.info(`✦ 神经直连来电: ${data.char_name || '目标义体'}`);
                }
                window.TTS_IncomingCall = data;
                return true;

            case 'eavesdrop_ready':
                $trigger.removeClass('is-calling is-playing').addClass('is-ready');
                $statusRing.removeClass('calling playing').addClass('ready');
                if (ThemeState.particleEngine) {
                    ThemeState.particleEngine.burst();
                }
                if (window.toastr) {
                    window.toastr.info(`✦ 截获深网暗语频段: ${(data.speakers || []).join(' // ')}`);
                }
                window.TTS_EavesdropReady = data;
                return true;

            case 'call_ended':
                $trigger.removeClass('is-calling is-ready is-playing');
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
            'incoming_call': '脑机通讯',
            'eavesdrop': '深网潜行',
            'workshop': '超梦刻录',
            'favorites': '核心记忆',
            'theme_store': '义体医生',
            'settings': '底层内核'
        };
        return labels[key] || fallback;
    }
};

export default CyberpunkEdgerunnersTheme;
