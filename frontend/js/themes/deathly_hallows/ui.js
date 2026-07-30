import { ThemeState, DRAG_THRESHOLD } from './state.js';

// ==================== CSS 及 DOM 注入 ====================
export function ensureCSS() {
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
.dh-subtitle .subtitle-line {
    transition: opacity 0.3s ease;
    opacity: 0;
}
.dh-subtitle .subtitle-line.visible {
    opacity: 1;
}
.dh-subtitle .subtitle-char {
    color: rgba(255, 255, 255, 0.3);
    transition: color 0.15s ease, text-shadow 0.15s ease;
}
.dh-subtitle .subtitle-char.passed,
.dh-subtitle .subtitle-char.active {
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 0 10px rgba(var(--dh-accent), 0.8);
}
.dh-subtitle .subtitle-speaker {
    display: block;
    font-size: 12px;
    color: rgba(var(--dh-accent), 0.8);
    margin-bottom: 6px;
    letter-spacing: 0.1em;
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

/* ========================================
   DH MAGIC APP OVERRIDES (For generic apps)
   ======================================== */

#tts-dh-modal .dh-magic-app-container {
    padding-bottom: 20px;
}

/* Settings Override */
#tts-dh-modal .mobile-settings-content {
    background: transparent !important;
    color: rgba(220, 200, 150, 0.9) !important;
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    padding-bottom: 40px;
}
/* 魔法风格滚动条 */
#tts-dh-modal .mobile-settings-content::-webkit-scrollbar,
#tts-dh-modal .call-history-content::-webkit-scrollbar,
#tts-dh-modal .eavesdrop-history-content::-webkit-scrollbar {
    width: 4px;
}
#tts-dh-modal .mobile-settings-content::-webkit-scrollbar-track,
#tts-dh-modal .call-history-content::-webkit-scrollbar-track,
#tts-dh-modal .eavesdrop-history-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
}
#tts-dh-modal .mobile-settings-content::-webkit-scrollbar-thumb,
#tts-dh-modal .call-history-content::-webkit-scrollbar-thumb,
#tts-dh-modal .eavesdrop-history-content::-webkit-scrollbar-thumb {
    background: rgba(196, 155, 79, 0.4);
    border-radius: 4px;
}
#tts-dh-modal .mobile-settings-content::-webkit-scrollbar-thumb:hover,
#tts-dh-modal .call-history-content::-webkit-scrollbar-thumb:hover,
#tts-dh-modal .eavesdrop-history-content::-webkit-scrollbar-thumb:hover {
    background: rgba(196, 155, 79, 0.7);
}
#tts-dh-modal .mobile-settings-content .tts-section-title {
    color: rgba(196, 155, 79, 1) !important;
    border-bottom: 1px solid rgba(196, 155, 79, 0.3) !important;
}
#tts-dh-modal .mobile-settings-content .tts-setting-row {
    border-bottom: 1px dashed rgba(196, 155, 79, 0.15) !important;
}
#tts-dh-modal .mobile-settings-content select, 
#tts-dh-modal .mobile-settings-content input {
    background: rgba(14, 10, 20, 0.8) !important;
    color: rgba(196, 155, 79, 0.9) !important;
    border: 1px solid rgba(196, 155, 79, 0.4) !important;
    border-radius: 4px;
}
#tts-dh-modal .mobile-settings-content .tts-btn-primary {
    background: rgba(196, 155, 79, 0.2) !important;
    border: 1px solid rgba(196, 155, 79, 0.6) !important;
    color: rgba(196, 155, 79, 1) !important;
    transition: all 0.3s ease;
}
#tts-dh-modal .mobile-settings-content .tts-btn-primary:hover {
    background: rgba(196, 155, 79, 0.4) !important;
    box-shadow: 0 0 12px rgba(196, 155, 79, 0.4);
}
#tts-dh-modal .mobile-settings-content .tts-btn-secondary {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: rgba(220, 200, 150, 0.7) !important;
}

/* Custom Select Dropdowns */
#tts-dh-modal .mobile-settings-content .tts-custom-select {
    position: relative;
    z-index: 10;
}
#tts-dh-modal .mobile-settings-content .select-trigger {
    background: rgba(14, 10, 20, 0.8);
    border: 1px solid rgba(196, 155, 79, 0.4);
    color: rgba(196, 155, 79, 0.9);
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
#tts-dh-modal .mobile-settings-content .select-options {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
    background: rgba(14, 10, 20, 0.95);
    border: 1px solid rgba(196, 155, 79, 0.6);
    border-radius: 4px;
    z-index: 999;
    display: none;
}
#tts-dh-modal .mobile-settings-content .tts-custom-select.open .select-options {
    display: block;
}
#tts-dh-modal .mobile-settings-content .option-item {
    padding: 10px 12px;
    cursor: pointer;
    color: rgba(220, 200, 150, 0.9);
    transition: background 0.2s;
}
#tts-dh-modal .mobile-settings-content .option-item:hover {
    background: rgba(196, 155, 79, 0.2);
}

/* Favorites Override */
#tts-dh-modal .fav-tab {
    background: rgba(14, 10, 20, 0.6) !important;
    border: 1px solid rgba(196, 155, 79, 0.2) !important;
    color: rgba(196, 155, 79, 0.5) !important;
    transition: all 0.3s;
}
#tts-dh-modal .fav-tab.active {
    background: rgba(196, 155, 79, 0.15) !important;
    border: 1px solid rgba(196, 155, 79, 0.7) !important;
    color: rgba(196, 155, 79, 1) !important;
    text-shadow: 0 0 8px rgba(196, 155, 79, 0.4);
}
#tts-dh-modal .fav-item {
    background: rgba(14, 10, 20, 0.7) !important;
    border: 1px solid rgba(196, 155, 79, 0.25) !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    margin-bottom: 12px;
}
#tts-dh-modal .fav-item-name {
    color: rgba(196, 155, 79, 1) !important;
    font-weight: normal;
    letter-spacing: 1px;
}
#tts-dh-modal .fav-item-date {
    color: rgba(196, 155, 79, 0.5) !important;
}
#tts-dh-modal .fav-context-box {
    color: rgba(220, 200, 150, 0.6) !important;
    border-left: 2px solid rgba(196, 155, 79, 0.5) !important;
    background: rgba(0, 0, 0, 0.2);
}
#tts-dh-modal .fav-text-content {
    color: rgba(220, 200, 150, 0.95) !important;
    font-size: 15px;
    line-height: 1.5;
}
#tts-dh-modal .voice-bubble {
    background: rgba(196, 155, 79, 0.1) !important;
    border: 1px solid rgba(196, 155, 79, 0.3) !important;
    color: rgba(196, 155, 79, 1) !important;
}

/* Call & Eavesdrop History Override */
#tts-dh-modal .call-history-content,
#tts-dh-modal .eavesdrop-history-content {
    padding: 10px;
    background: transparent !important;
    flex: 1;
    overflow-y: auto;
}
#tts-dh-modal .call-history-empty,
#tts-dh-modal .eavesdrop-history-empty {
    color: rgba(196, 155, 79, 0.6) !important;
    text-shadow: 0 0 5px rgba(196, 155, 79, 0.2);
    font-size: 15px;
    letter-spacing: 1px;
}
#tts-dh-modal .call-history-empty-icon,
#tts-dh-modal .eavesdrop-history-empty-icon {
    font-size: 32px;
    margin-bottom: 15px;
    opacity: 0.5;
    filter: sepia(1) hue-rotate(5deg) saturate(2);
}
#tts-dh-modal .call-history-item {
    background: rgba(14, 10, 20, 0.7) !important;
    border: 1px solid rgba(196, 155, 79, 0.25) !important;
    border-radius: 8px;
    margin-bottom: 12px;
}
#tts-dh-modal .call-history-name {
    color: rgba(196, 155, 79, 1) !important;
    font-weight: normal;
    letter-spacing: 1px;
}
#tts-dh-modal .call-history-date {
    color: rgba(196, 155, 79, 0.5) !important;
}
#tts-dh-modal .call-history-avatar {
    background: rgba(196, 155, 79, 0.1) !important;
    border: 1px solid rgba(196, 155, 79, 0.3) !important;
    color: rgba(196, 155, 79, 0.8) !important;
}
#tts-dh-modal .call-history-play-area {
    background: rgba(196, 155, 79, 0.1) !important;
    border: 1px solid rgba(196, 155, 79, 0.4) !important;
    color: rgba(196, 155, 79, 1) !important;
}
#tts-dh-modal .call-history-play-icon {
    filter: sepia(1) hue-rotate(5deg) saturate(2);
}

/* Eavesdrop history override */
#tts-dh-modal .eavesdrop-history-item {
    background: rgba(14, 10, 20, 0.7) !important;
    border: 1px solid rgba(167, 110, 255, 0.25) !important;
    border-radius: 8px;
    margin-bottom: 12px;
}
#tts-dh-modal .eavesdrop-history-name {
    color: rgba(167, 110, 255, 1) !important;
    font-weight: normal;
    letter-spacing: 1px;
}
#tts-dh-modal .eavesdrop-history-date {
    color: rgba(167, 110, 255, 0.5) !important;
}
#tts-dh-modal .eavesdrop-history-avatar {
    background: rgba(167, 110, 255, 0.1) !important;
    border: 1px solid rgba(167, 110, 255, 0.3) !important;
    color: rgba(167, 110, 255, 0.8) !important;
}
#tts-dh-modal .eavesdrop-history-play-area {
    background: rgba(167, 110, 255, 0.1) !important;
    border: 1px solid rgba(167, 110, 255, 0.4) !important;
    color: rgba(167, 110, 255, 1) !important;
}

        `;
        document.head.appendChild(style);
    }
}

export function renderTriggerDOM() {
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
    <div id="tts-dh-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:360px; max-width:92vw; height:600px; background:transparent; z-index:10000; overflow:visible;">
        <!-- 神秘侧的SVG背景边框 -->
        <svg style="position:absolute; inset: -20px; width: calc(100% + 40px); height: calc(100% + 40px); z-index: -1; pointer-events: none;" viewBox="0 0 400 640" preserveAspectRatio="none">
            <defs>
                <linearGradient id="dhFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="rgba(196,155,79,0.9)" />
                    <stop offset="30%" stop-color="rgba(196,155,79,0.3)" />
                    <stop offset="70%" stop-color="rgba(196,155,79,0.3)" />
                    <stop offset="100%" stop-color="rgba(196,155,79,0.9)" />
                </linearGradient>
                <filter id="dhGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            
            <!-- 半透明神秘背景 -->
            <path d="M40,20 L360,20 L380,40 L380,600 L360,620 L40,620 L20,600 L20,40 Z" fill="rgba(14, 10, 20, 0.92)" stroke="url(#dhFrameGrad)" stroke-width="1.5" filter="url(#dhGlow)"/>
            
            <!-- 边角金线与装饰节点 -->
            <path d="M40,20 L60,20 M20,40 L20,60 M340,20 L360,20 M380,40 L380,60 M360,620 L340,620 M380,600 L380,580 M40,620 L60,620 M20,600 L20,580" stroke="rgba(196,155,79,0.9)" stroke-width="2" fill="none"/>
            <circle cx="30" cy="30" r="3" fill="rgba(196,155,79,0.9)"/>
            <circle cx="370" cy="30" r="3" fill="rgba(196,155,79,0.9)"/>
            <circle cx="30" cy="610" r="3" fill="rgba(196,155,79,0.9)"/>
            <circle cx="370" cy="610" r="3" fill="rgba(196,155,79,0.9)"/>
            
            <!-- 顶部与底部符文几何线 -->
            <path d="M160,30 L200,42 L240,30" fill="none" stroke="rgba(196,155,79,0.6)" stroke-width="1.2"/>
            <path d="M160,610 L200,598 L240,610" fill="none" stroke="rgba(196,155,79,0.6)" stroke-width="1.2"/>
            <circle cx="200" cy="42" r="1.5" fill="rgba(196,155,79,0.8)"/>
            <circle cx="200" cy="598" r="1.5" fill="rgba(196,155,79,0.8)"/>
        </svg>

        <div id="tts-dh-scene-content" style="width:100%; height:100%; position:relative; z-index:1; display:flex; flex-direction:column;"></div>
        
        <!-- 悬浮魔法关闭按钮 -->
        <div class="dh-close-btn" style="position:absolute; top:-12px; right:-12px; width: 34px; height: 34px; cursor:pointer; color:rgba(196,155,79,1); z-index:10001; display:flex; align-items:center; justify-content:center; background: rgba(14, 10, 20, 1); border: 1px solid rgba(196,155,79,0.6); border-radius: 50%; box-shadow: 0 0 12px rgba(196,155,79,0.4);" title="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
    </div>
    `;
    $('body').append(canvasHtml + triggerHtml);
    
    // 设置触发器初始显示位置
    const $trigger = $('#tts-dh-trigger');
    const winW = window.innerWidth || $(window).width();
    const winH = window.innerHeight || $(window).height();
    
    let initialLeft, initialTop;
    if (winW < 768) {
        // 手机端：水平居中靠下
        initialLeft = (winW - 72) / 2;
        initialTop = winH - 72 - 80;
    } else {
        // 桌面端：垂直居中靠右
        initialLeft = winW - 72 - 24;
        initialTop = (winH - 72) / 2;
    }
    
    // 安全边界
    initialLeft = Math.max(0, Math.min(winW - 72, initialLeft));
    initialTop = Math.max(0, Math.min(winH - 72, initialTop));

    $trigger.css({
        left: initialLeft + 'px',
        top: initialTop + 'px',
        display: 'flex'
    });
}

export function destroyDOM() {
    $('#tts-dh-trigger, #dhParticleCanvas, #tts-dh-modal').remove();
}

export function bindDragAndClick() {
    const $trigger = $('#tts-dh-trigger');
    if (!$trigger.length) return;

    $trigger.on('mousedown touchstart', function (e) {
        if (e.type === 'touchstart' && e.touches.length > 1) return;
        if (e.cancelable) e.preventDefault();

        const point = e.type === 'touchstart' ? e.touches[0] : e;
        const rect = $trigger[0].getBoundingClientRect();

        ThemeState.dragState.startX = point.clientX;
        ThemeState.dragState.startY = point.clientY;
        ThemeState.dragState.shiftX = point.clientX - rect.left;
        ThemeState.dragState.shiftY = point.clientY - rect.top;
        ThemeState.dragState.winW = $(window).width();
        ThemeState.dragState.winH = $(window).height();
        ThemeState.dragState.isDragging = true;
        ThemeState.dragState.hasMoved = false;

        document.addEventListener('mousemove', onDragMove, { passive: false });
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('mouseup', onDragUp);
        document.addEventListener('touchend', onDragUp);
    });

    // 模态框关闭按钮
    $('.dh-close-btn').click(() => {
        if (ThemeState.engine) ThemeState.engine.close();
    });
}

function onDragMove(e) {
    if (!ThemeState.dragState.isDragging) return;
    if (e.cancelable) e.preventDefault();

    const point = e.type === 'touchmove' ? e.touches[0] : e;
    const currentX = point.clientX;
    const currentY = point.clientY;
    const el = $('#tts-dh-trigger')[0];
    if (!el) return;

    if (!ThemeState.dragState.hasMoved) {
        const moveDis = Math.sqrt(Math.pow(currentX - ThemeState.dragState.startX, 2) + Math.pow(currentY - ThemeState.dragState.startY, 2));
        if (moveDis < DRAG_THRESHOLD) return;
        ThemeState.dragState.hasMoved = true;
        
        // 拖拽时取消粒子引擎的悬浮计算
        if (ThemeState.particleEngine) {
            ThemeState.particleEngine.config.floatAmplitudeX = 0;
            ThemeState.particleEngine.config.floatAmplitudeY = 0;
            ThemeState.particleEngine.config.floatSecondaryAmpX = 0;
            ThemeState.particleEngine.config.floatSecondaryAmpY = 0;
        }
    }

    let newLeft = currentX - ThemeState.dragState.shiftX;
    let newTop = currentY - ThemeState.dragState.shiftY;
    newLeft = Math.max(0, Math.min(ThemeState.dragState.winW - 72, newLeft));
    newTop = Math.max(0, Math.min(ThemeState.dragState.winH - 72, newTop));

    el.style.left = newLeft + 'px';
    el.style.top = newTop + 'px';
    
    if (ThemeState.particleEngine) {
        // 同步粒子引擎的坐标
        ThemeState.particleEngine.elX = newLeft + 36;
        ThemeState.particleEngine.elY = newTop + 36;
        // 修改 baseUrl 等防止它跳回去
        ThemeState.particleEngine.config.baseX = (newLeft + 36) / ThemeState.dragState.winW;
        ThemeState.particleEngine.config.baseY = (newTop + 36) / ThemeState.dragState.winH;
    }
}

function onDragUp() {
    ThemeState.dragState.isDragging = false;

    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('mouseup', onDragUp);
    document.removeEventListener('touchend', onDragUp);

    if (!ThemeState.dragState.hasMoved) {
        // 点击处理
        if (ThemeState.engine) {
            // 如果有监听就绪状态，优先打开监听界面
            if (window.TTS_EavesdropReady) {
                ThemeState.engine.showScene('eavesdrop');
            } else {
                ThemeState.engine.toggle();
            }
        }
    } else {
        // 恢复悬浮浮动
        if (ThemeState.particleEngine) {
            ThemeState.particleEngine.config.floatAmplitudeX = 6;
            ThemeState.particleEngine.config.floatAmplitudeY = 5;
            ThemeState.particleEngine.config.floatSecondaryAmpX = 2.5;
            ThemeState.particleEngine.config.floatSecondaryAmpY = 2;
        }
    }
}
