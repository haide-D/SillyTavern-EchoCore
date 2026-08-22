/**
 * 平安京·落樱雅境 (sakura_elegance) - UI 与 DOM 管理器
 */

import { ThemeState, DRAG_THRESHOLD } from './state.js';
import { SAKURA_ELEGANCE_TRIGGER_SVG, SAKURA_SCROLL_FRAME_SVG, SAKURA_ICONS } from './assets.js';

const THEME_ID = 'sakura_elegance';
const CSS_ID = 'tts-theme-css-sakura_elegance';

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
    if ($('#tts-sakura-trigger').length > 0) return;

    // 1. 注入落樱折扇 3D 悬浮球
    const triggerHtml = `
        <div id="tts-sakura-trigger" class="sakura-elegance-trigger" style="position:fixed; z-index:9999; cursor:pointer;" title="落樱折扇 · 晴明结界">
            <div class="sakura-inner" id="sakuraInner">
                <div class="sakura-status-ring" id="sakuraStatusRing"></div>
                ${SAKURA_ELEGANCE_TRIGGER_SVG}
            </div>
        </div>
    `;
    $('body').append(triggerHtml);

    // 2. 注入和纸莳绘屏风模态框
    if ($('#tts-sakura-modal').length === 0) {
        const modalHtml = `
            <div id="tts-sakura-modal" style="display:none;">
                ${SAKURA_SCROLL_FRAME_SVG}
                <div id="tts-sakura-scene-content"></div>
                <div class="sakura-close-btn" id="tts-sakura-close-btn" title="合拢折扇">
                    ${SAKURA_ICONS.close}
                </div>
            </div>
        `;
        $('body').append(modalHtml);

        $('#tts-sakura-close-btn').on('click', () => {
            if (ThemeState.engine) ThemeState.engine.close();
        });
    }

    // 初始位置设置与视口安全校准
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const rawLeft = localStorage.getItem('tts_sakura_trigger_left') || localStorage.getItem('tts_common_trigger_left') || localStorage.getItem('tts_immortal_trigger_left') || localStorage.getItem('tts_cyber_trigger_left');
    const rawTop = localStorage.getItem('tts_sakura_trigger_top') || localStorage.getItem('tts_common_trigger_top') || localStorage.getItem('tts_immortal_trigger_top') || localStorage.getItem('tts_cyber_trigger_top');

    let left = parseFloat(rawLeft);
    let top = parseFloat(rawTop);
    if (isNaN(left) || left < 5 || left > vw - 70) left = Math.max(5, vw - 75);
    if (isNaN(top) || top < 5 || top > vh - 70) top = Math.max(5, vh - 140);

    $('#tts-sakura-trigger').css({ top: `${top}px`, left: `${left}px` });
}

export function fixModalPosition() {
    const $modal = $('#tts-sakura-modal');
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
    const $trigger = $('#tts-sakura-trigger');
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

        newLeft = Math.max(5, Math.min(window.innerWidth - 48, newLeft));
        newTop = Math.max(5, Math.min(window.innerHeight - 105, newTop));

        $trigger.css({ left: newLeft + 'px', top: newTop + 'px' });
    });

    $trigger.on('pointerup pointercancel', function (e) {
        if (!ThemeState.drag.isDragging) return;
        ThemeState.drag.isDragging = false;

        if ($trigger[0].releasePointerCapture) {
            try { $trigger[0].releasePointerCapture(e.pointerId); } catch (_) {}
        }

        if (ThemeState.drag.hasMoved) {
            // 自由停放：持久化保存当前拖拽停止的坐标（不再强制吸附单侧）
            const currentLeft = $trigger.css('left');
            const currentTop = $trigger.css('top');
            localStorage.setItem('tts_sakura_trigger_top', currentTop);
            localStorage.setItem('tts_sakura_trigger_left', currentLeft);
            localStorage.setItem('tts_common_trigger_top', currentTop);
            localStorage.setItem('tts_common_trigger_left', currentLeft);
        } else {
            // 点击交互：触发樱花爆发并打开/关闭
            if (ThemeState.particleEngine) {
                ThemeState.particleEngine.burst();
            }
            if (ThemeState.engine) {
                ThemeState.engine.toggle();
            }
        }
    });
}

export function destroyTriggerDOM() {
    $('#tts-sakura-trigger').remove();
    $('#tts-sakura-modal').remove();
    $(`#${CSS_ID}`).remove();
}
