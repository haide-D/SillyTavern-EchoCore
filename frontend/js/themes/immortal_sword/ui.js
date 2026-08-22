/**
 * 仙途凌霄 (immortal_sword) - UI 与 DOM 管理器
 */

import { ThemeState, DRAG_THRESHOLD } from './state.js';
import { IMMORTAL_SWORD_TRIGGER_SVG, IMMORTAL_SCROLL_FRAME_SVG } from './assets.js';

const THEME_ID = 'immortal_sword';
const CSS_ID = 'tts-theme-css-immortal_sword';

export function ensureCSS() {
    if ($(`#${CSS_ID}`).length === 0) {
        const link = document.createElement('link');
        link.id = CSS_ID;
        link.rel = 'stylesheet';
        link.href = `/scripts/extensions/third-party/st-direct-tts/frontend/css/themes/${THEME_ID}.css`;
        document.head.appendChild(link);
    }
}

export function renderTriggerDOM() {
    if ($('#tts-immortal-trigger').length > 0) return;

    // 1. 注入混元太极剑印3D悬浮球
    const triggerHtml = `
        <div id="tts-immortal-trigger" class="immortal-sword-trigger" style="position:fixed; z-index:9999; cursor:pointer;" title="混元道印 · 太极剑阵">
            <div class="immortal-inner" id="immortalInner">
                <div class="immortal-glow"></div>
                <div class="immortal-aura"></div>
                ${IMMORTAL_SWORD_TRIGGER_SVG}
                <div class="immortal-shadow"></div>
            </div>
        </div>
    `;
    $('body').append(triggerHtml);

    // 3. 注入古风天机卷轴长卷模态框
    if ($('#tts-immortal-modal').length === 0) {
        const modalHtml = `
            <div id="tts-immortal-modal" style="display:none;">
                ${IMMORTAL_SCROLL_FRAME_SVG}
                <div id="tts-immortal-scene-content"></div>
                <div class="immortal-close-btn" id="tts-immortal-close-btn" title="收起秘卷">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </div>
            </div>
        `;
        $('body').append(modalHtml);

        $('#tts-immortal-close-btn').on('click', () => {
            if (ThemeState.engine) ThemeState.engine.close();
        });
    }

    // 初始位置设置
    const savedTop = localStorage.getItem('tts_immortal_trigger_top') || (window.innerHeight - 140) + 'px';
    const savedLeft = localStorage.getItem('tts_immortal_trigger_left') || (window.innerWidth - 65) + 'px';
    $('#tts-immortal-trigger').css({ top: savedTop, left: savedLeft });
}

export function fixModalPosition() {
    const $modal = $('#tts-immortal-modal');
    if (!$modal.length) return;

    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    const modalW = Math.min(380, vw * 0.94);
    const modalH = Math.min(640, vh - 24);
    const top = (window.visualViewport ? window.visualViewport.pageTop : 0) + Math.max(12, (vh - modalH) / 2);
    const left = (window.visualViewport ? window.visualViewport.pageLeft : 0) + (vw - modalW) / 2;

    $modal.css({
        top: `${top}px`,
        left: `${left}px`,
        width: `${modalW}px`,
        height: `${modalH}px`,
        transform: 'none'
    });
}

export function bindDragAndClick() {
    const $trigger = $('#tts-immortal-trigger');
    if (!$trigger.length) return;

    $trigger.off('pointerdown pointermove pointerup pointercancel');

    $trigger.on('pointerdown', function (e) {
        ThemeState.drag.isDragging = true;
        ThemeState.drag.hasMoved = false;
        ThemeState.drag.startX = e.clientX;
        ThemeState.drag.startY = e.clientY;

        const offset = $trigger.offset();
        ThemeState.drag.initialLeft = offset.left;
        ThemeState.drag.initialTop = offset.top;

        if ($trigger[0].setPointerCapture) {
            try { $trigger[0].setPointerCapture(e.pointerId); } catch (_) {}
        }
    });

    $trigger.on('pointermove', function (e) {
        if (!ThemeState.drag.isDragging) return;
        const dx = e.clientX - ThemeState.drag.startX;
        const dy = e.clientY - ThemeState.drag.startY;

        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            ThemeState.drag.hasMoved = true;
        }

        let newLeft = ThemeState.drag.initialLeft + dx;
        let newTop = ThemeState.drag.initialTop + dy;

        newLeft = Math.max(5, Math.min(window.innerWidth - 45, newLeft));
        newTop = Math.max(5, Math.min(window.innerHeight - 105, newTop));

        $trigger.css({ left: `${newLeft}px`, top: `${newTop}px` });
    });

    const endDrag = function (e) {
        if (!ThemeState.drag.isDragging) return;
        ThemeState.drag.isDragging = false;

        if ($trigger[0].releasePointerCapture && e.pointerId) {
            try { $trigger[0].releasePointerCapture(e.pointerId); } catch (_) {}
        }

        localStorage.setItem('tts_immortal_trigger_left', $trigger.css('left'));
        localStorage.setItem('tts_immortal_trigger_top', $trigger.css('top'));

        if (!ThemeState.drag.hasMoved) {
            if (ThemeState.particleEngine) {
                ThemeState.particleEngine.burstParticles(8, 'jade');
            }
            if (ThemeState.engine) {
                ThemeState.engine.toggle();
            }
        }
    };

    $trigger.on('pointerup pointercancel', endDrag);
}

export function destroyDOM() {
    $('#tts-immortal-trigger, #immortalParticleCanvas, #tts-immortal-modal, #immortal-fullscreen-call, #immortal-fullscreen-eavesdrop').remove();
    $(`#${CSS_ID}`).remove();
}
