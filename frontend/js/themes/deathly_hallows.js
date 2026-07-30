import { ParticleEngine } from './particle_engine.js';
import * as IncomingCallApp from '../mobile_apps/incoming_call_app.js';
import * as SettingsApp from '../mobile_apps/settings_app.js';
import * as FavoritesApp from '../mobile_apps/favorites_app.js';
import * as LlmTestApp from '../mobile_apps/llm_test_app.js';
import * as PhoneCallApp from '../mobile_apps/phone_call_app.js';
import * as EavesdropApp from '../mobile_apps/eavesdrop_app.js';
import { createNavbar } from './theme_utils.js';
import { ChatInjector } from '../chat_injector.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../mobile_apps/shared/audio_player.js';
import { getCharacterAvatar } from '../mobile_apps/shared/utils.js';

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

    if ($('#dh-custom-call-css').length === 0) {
        const style = document.createElement('style');
        style.id = 'dh-custom-call-css';
        style.innerHTML = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400&display=swap');

/* ========================================
   DH FULLSCREEN UI - THEMES
   ======================================== */
:root {
    --dh-gold-accent: 196, 155, 79;
    --dh-gold-bg: rgba(22, 16, 4, 0.88);
    
    --dh-purple-accent: 167, 110, 255;
    --dh-purple-bg: rgba(14, 8, 22, 0.88);
}

.dh-theme-gold {
    --dh-accent: var(--dh-gold-accent);
    --dh-bg-center: var(--dh-gold-bg);
}

.dh-theme-purple {
    --dh-accent: var(--dh-purple-accent);
    --dh-bg-center: var(--dh-purple-bg);
}

/* ========================================
   DH FULLSCREEN CALL UI - PREMIUM REDESIGN
   ======================================== */

#dh-true-fullscreen-call {
    position: fixed;
    inset: 0;
    z-index: 100000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    overflow: hidden;
    /* Semi-transparent overlay based on theme */
    background: radial-gradient(ellipse 60% 50% at 50% 50%, var(--dh-bg-center) 0%, rgba(0, 0, 0, 0.94) 100%);
    backdrop-filter: blur(24px) saturate(1.2);
    -webkit-backdrop-filter: blur(24px) saturate(1.2);
    animation: dh-screen-fadein 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes dh-screen-fadein {
    from { opacity: 0; }
    to   { opacity: 1; }
}

/* ---- Background Hallows Watermark ---- */
.dh-bg-hallows {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    color: rgba(var(--dh-accent), 0.9);
}
.dh-bg-hallows svg {
    width: min(70vw, 70vh);
    height: min(70vw, 70vh);
    opacity: 0.06;
    animation: dh-hallows-breathe 8s ease-in-out infinite;
}
@keyframes dh-hallows-breathe {
    0%, 100% { opacity: 0.05; transform: scale(1) rotate(0deg); }
    50%       { opacity: 0.09; transform: scale(1.03) rotate(1.5deg); }
}

/* ---- Content Stack ---- */
.dh-call-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding: 0 24px;
    text-align: center;
}

/* ---- Avatar ---- */
.dh-call-avatar-wrap {
    position: relative;
    width: 120px;
    height: 120px;
    margin-bottom: 32px;
}
.dh-call-avatar-ring {
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    border: 1px solid rgba(var(--dh-accent), 0.55);
    animation: dh-ring-pulse 2.8s ease-in-out infinite;
}
@keyframes dh-ring-pulse {
    0%, 100% { transform: scale(1);    opacity: 0.55; }
    50%       { transform: scale(1.08); opacity: 0.9; }
}
.dh-call-avatar-ring.outer {
    inset: -12px;
    border-color: rgba(var(--dh-accent), 0.2);
    animation-delay: 0.6s;
}
.dh-call-avatar-img {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(var(--dh-accent), 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
}
.dh-call-avatar-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.dh-call-avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(var(--dh-accent), 0.6);
}
.dh-call-avatar-placeholder svg {
    width: 52px;
    height: 52px;
    opacity: 0.5;
}

/* ---- Typography ---- */
.dh-call-name {
    font-size: clamp(26px, 5vw, 36px);
    font-weight: 200;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.92);
    margin: 0 0 10px 0;
    line-height: 1.1;
}
.dh-call-status {
    font-size: 13px;
    font-weight: 300;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(var(--dh-accent), 0.75);
    animation: dh-status-pulse 2.5s ease-in-out infinite;
    margin-bottom: 64px;
}
@keyframes dh-status-pulse {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
}

/* ---- Action Buttons ---- */
.dh-call-actions {
    display: flex;
    align-items: center;
    gap: 52px;
    z-index: 2;
}
.dh-action-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}
.dh-action-label {
    font-size: 11px;
    font-weight: 300;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.35);
}
.dh-action-btn {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                filter 0.25s ease,
                opacity 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    outline: none;
}
.dh-action-btn:active {
    transform: scale(0.9);
    opacity: 0.8;
}
.dh-action-btn.reject, .dh-action-btn.hangup {
    background: rgba(220, 53, 53, 0.18);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(220, 53, 53, 0.3);
}
.dh-action-btn.reject:hover, .dh-action-btn.hangup:hover {
    background: rgba(220, 53, 53, 0.32);
    transform: scale(1.06);
    filter: brightness(1.15);
}
.dh-action-btn.answer {
    background: rgba(34, 197, 94, 0.22);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(34, 197, 94, 0.35);
}
.dh-action-btn.answer:hover {
    background: rgba(34, 197, 94, 0.36);
    transform: scale(1.06);
    filter: brightness(1.15);
}

/* ---- Eavesdrop Play/Stop Buttons ---- */
.dh-action-btn.play {
    background: rgba(var(--dh-accent), 0.18);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(var(--dh-accent), 0.3);
}
.dh-action-btn.play:hover {
    background: rgba(var(--dh-accent), 0.32);
    transform: scale(1.06);
    filter: brightness(1.15);
}

/* ---- In-call Waveform ---- */
.dh-waveform {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 44px;
    margin: 0 0 44px 0;
}
.dh-waveform-bar {
    width: 3px;
    border-radius: 2px;
    background: rgba(var(--dh-accent), 0.7);
    animation: dh-wave 1.2s ease-in-out infinite alternate;
}
.dh-waveform-bar:nth-child(1)  { height: 8px;  animation-delay: 0.00s; }
.dh-waveform-bar:nth-child(2)  { height: 16px; animation-delay: 0.10s; }
.dh-waveform-bar:nth-child(3)  { height: 28px; animation-delay: 0.05s; }
.dh-waveform-bar:nth-child(4)  { height: 38px; animation-delay: 0.15s; }
.dh-waveform-bar:nth-child(5)  { height: 44px; animation-delay: 0.08s; }
.dh-waveform-bar:nth-child(6)  { height: 38px; animation-delay: 0.20s; }
.dh-waveform-bar:nth-child(7)  { height: 28px; animation-delay: 0.04s; }
.dh-waveform-bar:nth-child(8)  { height: 16px; animation-delay: 0.12s; }
.dh-waveform-bar:nth-child(9)  { height: 8px;  animation-delay: 0.02s; }
@keyframes dh-wave {
    0%   { transform: scaleY(0.3); opacity: 0.4; }
    100% { transform: scaleY(1.1); opacity: 0.9; }
}

/* ---- Subtitle ---- */
.dh-subtitle {
    font-size: 15px;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.55);
    letter-spacing: 0.04em;
    min-height: 24px;
    margin-bottom: 40px;
    padding: 0 32px;
    max-width: 480px;
    line-height: 1.5;
}

/* Mobile tweaks */
@media (max-height: 600px) {
    .dh-call-avatar-wrap { width: 88px; height: 88px; margin-bottom: 20px; }
    .dh-call-avatar-img  { width: 88px; height: 88px; }
    .dh-call-status { margin-bottom: 32px; }
    .dh-waveform    { margin-bottom: 24px; height: 32px; }
    .dh-action-btn  { width: 60px; height: 60px; }
    .dh-call-actions { gap: 36px; }
}
        `;
        document.head.appendChild(style);
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
            // 如果有监听就绪状态，优先打开监听界面
            if (window.TTS_EavesdropReady) {
                _engine.showScene('eavesdrop');
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

// ==================== 专属死亡圣器来电 UI ====================

// 死亡圣器 SVG 水印
 const _HALLOWS_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,10 92,82 8,82" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="50" cy="57" r="25" stroke="currentColor" stroke-width="1.5"/>
    <line x1="50" y1="10" x2="50" y2="82" stroke="currentColor" stroke-width="1.5"/>
</svg>`;

// 等待分隔符
 const _DOT_SVG = `<svg viewBox="0 0 4 4"><circle cx="2" cy="2" r="2" fill="currentColor" opacity="0.6"/></svg>`;

// 挂断/停止按鈕 SVG
const _HANGUP_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 012 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.07 8.18 2 2 0 015 6h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 13.9"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
</svg>`;

// 接听/播放按鈕 SVG
const _ANSWER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.18 2 2 0 015 6h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 13.9a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
</svg>`;
const _PLAY_SVG = `<svg viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
    <polygon points="5 3 19 12 5 21 5 3"/>
</svg>`;

// 用户头像占位符 SVG
const _USER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="52" height="52">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
</svg>`;

function _buildCallScreen(id, themeClass, avatarHtml, name, bodyHtml) {
    return $(`
        <div id="${id}" class="${themeClass}">
            <div class="dh-bg-hallows">${_HALLOWS_SVG}</div>
            <div class="dh-call-content">
                <div class="dh-call-avatar-wrap">
                    <div class="dh-call-avatar-ring outer"></div>
                    <div class="dh-call-avatar-ring"></div>
                    <div class="dh-call-avatar-img">${avatarHtml}</div>
                </div>
                <p class="dh-call-name">${name}</p>
                ${bodyHtml}
            </div>
        </div>
    `);
}

function _renderCustomDeathlyHallowsCall(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const avatarHtml = callData.avatar_url 
        ? `<img src="${callData.avatar_url}" alt="${callData.char_name}">` 
        : `<div class="dh-call-avatar-placeholder">${_USER_SVG}</div>`;

    const bodyHtml = `
        <p class="dh-call-status">Incoming Transmission</p>
        <div class="dh-call-actions">
            <div class="dh-action-group">
                <button class="dh-action-btn reject" id="dh-btn-reject">${_HANGUP_SVG}</button>
                <span class="dh-action-label">拒绝</span>
            </div>
            <div class="dh-action-group">
                <button class="dh-action-btn answer" id="dh-btn-answer">${_ANSWER_SVG}</button>
                <span class="dh-action-label">接听</span>
            </div>
        </div>
    `;

    const $content = _buildCallScreen('dh-true-fullscreen-call', 'dh-theme-gold', avatarHtml, callData.char_name || '未知', bodyHtml);
    $('body').append($content);

    $content.find('#dh-btn-reject').click(function () {
        $content.remove();
        delete window.TTS_IncomingCall;
        $('#tts-dh-modal').show();
        if (ctx.engine) ctx.engine.showScene('home');
    });

    $content.find('#dh-btn-answer').click(async function () {
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'phone_call',
                segments: callData.segments || [],
                callerName: callData.char_name,
                callId: callData.call_id,
                audioUrl: callData.audio_url
            });
        } catch (error) {
            console.error('[DeathlyHallows] 注入聊天失败:', error);
        }
        $content.remove();
        _showCustomInCallUI(container, callData, ctx);
    });
}

// ==================== 专属窃听等待 UI (Mysterious Purple) ====================
function _renderCustomDeathlyHallowsEavesdrop(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const avatarHtml = callData.avatar_url 
        ? `<img src="${callData.avatar_url}" alt="${callData.speakers.join(', ')}">` 
        : `<div class="dh-call-avatar-placeholder">${_USER_SVG}</div>`;

    const bodyHtml = `
        <p class="dh-call-status">Whispers Detected</p>
        <div class="dh-call-actions">
            <div class="dh-action-group">
                <button class="dh-action-btn reject" id="dh-btn-reject">${_HANGUP_SVG}</button>
                <span class="dh-action-label">无视</span>
            </div>
            <div class="dh-action-group">
                <button class="dh-action-btn answer" id="dh-btn-answer">${_ANSWER_SVG}</button>
                <span class="dh-action-label">探知</span>
            </div>
        </div>
    `;

    const $content = _buildCallScreen('dh-true-fullscreen-call', 'dh-theme-purple', avatarHtml, callData.speakers ? callData.speakers.join(' & ') : '未知目标', bodyHtml);
    $('body').append($content);

    $content.find('#dh-btn-reject').click(function () {
        $content.remove();
        delete window.TTS_EavesdropReady;
        $('#tts-mobile-trigger').removeClass('whisper-sensing');
        $('#tts-dh-modal').show();
        if (ctx.engine) ctx.engine.showScene('home');
    });

    $content.find('#dh-btn-answer').click(function () {
        $content.remove();
        _showCustomEavesdropUI(container, callData, ctx);
    });
}

// ==================== 专属窃听播放 UI (Mysterious Purple) ====================
function _showCustomEavesdropUI(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const avatarHtml = callData.avatar_url 
        ? `<img src="${callData.avatar_url}" alt="${callData.speakers.join(', ')}">` 
        : `<div class="dh-call-avatar-placeholder">${_USER_SVG}</div>`;

    const bodyHtml = `
        <div class="dh-waveform">
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div>
        </div>
        <div class="dh-subtitle"><span class="subtitle-text">聆听中...</span></div>
        <div class="dh-call-actions">
            <div class="dh-action-group">
                <button class="dh-action-btn hangup" id="dh-btn-hangup">${_HANGUP_SVG}</button>
                <span class="dh-action-label">挂断</span>
            </div>
        </div>
    `;
    const $content = _buildCallScreen('dh-true-fullscreen-call', 'dh-theme-purple', avatarHtml, callData.speakers ? callData.speakers.join(' & ') : '未知目标', bodyHtml);
    $('body').append($content);

    const player = new AudioPlayer({
        $container: $content,
        segments: callData.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[DeathlyHallows] 窃听结束');
            endCall();
        },
        onError: (err) => {
            console.error('[DeathlyHallows] 播放错误:', err);
            endCall();
        }
    });

    setGlobalPlayer(player);

    $content.find('#dh-btn-hangup').click(function () {
        player.stop();
        endCall();
    });

    if (callData.audio_url) {
        player.play(callData.audio_url);
    } else {
        endCall();
    }

    function endCall() {
        $content.remove();
        delete window.TTS_EavesdropReady;
        cleanupGlobalPlayer();
        $('#tts-dh-modal').show();
        if (ctx.engine) ctx.engine.showScene('home');
    }
}

function _showCustomInCallUI(container, callData, ctx) {
    container.empty();
    $('#tts-dh-modal').hide();
    $('#dh-true-fullscreen-call').remove();

    const avatarHtml = callData.avatar_url 
        ? `<img src="${callData.avatar_url}" alt="${callData.char_name}">` 
        : `<div class="dh-call-avatar-placeholder">${_USER_SVG}</div>`;

    const bodyHtml = `
        <div class="dh-waveform">
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div><div class="dh-waveform-bar"></div>
            <div class="dh-waveform-bar"></div>
        </div>
        <div class="dh-subtitle"><span class="subtitle-text">聆听中...</span></div>
        <div class="dh-call-actions">
            <div class="dh-action-group">
                <button class="dh-action-btn hangup" id="dh-btn-hangup">${_HANGUP_SVG}</button>
                <span class="dh-action-label">挂断</span>
            </div>
        </div>
    `;
    const $content = _buildCallScreen('dh-true-fullscreen-call', 'dh-theme-gold', avatarHtml, callData.char_name || '未知', bodyHtml);
    $('body').append($content);

    const player = new AudioPlayer({
        $container: $content,
        segments: callData.segments || [],
        showSpeaker: false,
        onEnd: () => {
            console.log('[DeathlyHallows] 通话结束');
            endCall();
        },
        onError: (err) => {
            console.error('[DeathlyHallows] 播放错误:', err);
            endCall();
        }
    });

    setGlobalPlayer(player);

    $content.find('#dh-btn-hangup').click(function () {
        player.stop();
        endCall();
    });

    if (callData.audio_url) {
        player.play(callData.audio_url);
    } else {
        endCall();
    }

    function endCall() {
        $content.remove();
        delete window.TTS_IncomingCall;
        cleanupGlobalPlayer();
        $('#tts-dh-modal').show();
        if (ctx.engine) ctx.engine.showScene('home');
    }
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
                const callData = window.TTS_IncomingCall;
                if (!callData) {
                    // 如果没有来电，回退调用默认来电历史记录 UI
                    const $appContainer = $(`<div style="width:100%; height:100%; display:flex; flex-direction:column; background:var(--proto-bg-dark); color:var(--proto-text-color);"></div>`);
                    IncomingCallApp.render($appContainer, _createNavbarForApps);
                    $container.empty().append($appContainer);
                    return;
                }
                
                // 有来电时，渲染自定义死亡圣器主题界面
                _renderCustomDeathlyHallowsCall($container, callData, ctx);
            },
            cleanup() {
                if (IncomingCallApp.cleanup) IncomingCallApp.cleanup();
                cleanupGlobalPlayer();
            }
        },
        eavesdrop: {
            render($container, ctx) {
                const data = window.TTS_EavesdropReady;
                if (!data) {
                    const $appContainer = $(`<div style="width:100%; height:100%; display:flex; flex-direction:column; background:var(--proto-bg-dark); color:var(--proto-text-color);"></div>`);
                    EavesdropApp.render($appContainer, _createNavbarForApps);
                    $container.empty().append($appContainer);
                    return;
                }
                
                // 有窃听就绪状态时，渲染紫色的窃听等待界面
                _renderCustomDeathlyHallowsEavesdrop($container, data, ctx);
            },
            cleanup() {
                if (EavesdropApp.cleanup) EavesdropApp.cleanup();
                cleanupGlobalPlayer();
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
                window.TTS_EavesdropReady = data;
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
