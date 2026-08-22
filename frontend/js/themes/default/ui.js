import { state, DRAG_THRESHOLD } from './state.js';

export function renderShell() {
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

export function destroyShell() {
    $('#tts-mobile-root, #tts-mobile-trigger').remove();
}

export function bindDragEvents() {
    const $trigger = $('#tts-mobile-trigger');
    if (!$trigger.length) return;

    $trigger.on('mousedown touchstart', function (e) {
        if (e.type === 'touchstart' && e.touches.length > 1) return;
        if (e.cancelable) e.preventDefault();

        const point = e.type === 'touchstart' ? e.touches[0] : e;
        const rect = $trigger[0].getBoundingClientRect();

        state.dragState.startX = point.clientX;
        state.dragState.startY = point.clientY;
        state.dragState.shiftX = point.clientX - rect.left;
        state.dragState.shiftY = point.clientY - rect.top;
        state.dragState.winW = $(window).width();
        state.dragState.winH = $(window).height();
        state.dragState.isDragging = true;
        state.dragState.hasMoved = false;

        document.addEventListener('mousemove', onDragMove, { passive: false });
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('mouseup', onDragUp);
        document.addEventListener('touchend', onDragUp);
    });
}

function onDragMove(e) {
    if (!state.dragState.isDragging) return;
    if (e.cancelable) e.preventDefault();

    const point = e.type === 'touchmove' ? e.touches[0] : e;
    const currentX = point.clientX;
    const currentY = point.clientY;
    const el = $('#tts-mobile-trigger')[0];
    if (!el) return;

    if (!state.dragState.hasMoved) {
        const moveDis = Math.sqrt(Math.pow(currentX - state.dragState.startX, 2) + Math.pow(currentY - state.dragState.startY, 2));
        if (moveDis < DRAG_THRESHOLD) return;
        state.dragState.hasMoved = true;
        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('right', 'auto', 'important');
        el.style.setProperty('bottom', 'auto', 'important');
        el.style.setProperty('transform', 'none', 'important');
        el.style.setProperty('animation', 'none', 'important');
    }

    let newLeft = currentX - state.dragState.shiftX;
    let newTop = currentY - state.dragState.shiftY;
    newLeft = Math.max(0, Math.min(state.dragState.winW - 60, newLeft));
    newTop = Math.max(0, Math.min(state.dragState.winH - 60, newTop));

    el.style.setProperty('left', newLeft + 'px', 'important');
    el.style.setProperty('top', newTop + 'px', 'important');
}

function onDragUp() {
    state.dragState.isDragging = false;

    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('mouseup', onDragUp);
    document.removeEventListener('touchend', onDragUp);

    if (!state.dragState.hasMoved) {
        // 点击 → 切换面板
        if (state.engine) {
            state.engine.toggle();
        }
    } else {
        snapToEdge();
    }
}

function snapToEdge() {
    const el = $('#tts-mobile-trigger')[0];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const midX = state.dragState.winW / 2;
    const targetLeft = (rect.left + 30 < midX) ? 10 : (state.dragState.winW - 50);

    el.style.setProperty('transition', 'left 0.2s ease', 'important');
    el.style.setProperty('left', targetLeft + 'px', 'important');

    setTimeout(() => {
        el.style.removeProperty('transition');
        el.style.removeProperty('animation');
        el.style.removeProperty('transform');
    }, 200);
}

export function bindShellEvents() {
    const $phone = $('#tts-mobile-root');

    // 电源键
    $('#tts-mobile-power-btn').click(function (e) {
        e.stopPropagation();
        if (state.engine) state.engine.close();
    });

    // 点击外部关闭
    $(document).on('click.defaultTheme', function (e) {
        if (state.engine && state.engine.isOpen()) {
            if ($(e.target).closest('#tts-mobile-root, #tts-mobile-trigger').length === 0) {
                state.engine.close();
            }
        }
    });

    // 阻止手机内部点击冒泡
    $phone.on('click', function (e) {
        e.stopPropagation();
    });

    // Home 键
    $('#mobile-home-btn').click(function () {
        if (state.engine) state.engine.goHome();
    });
}

export function fixMobilePosition() {
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

export function triggerFloatingBallAnimation(animationClass, tooltipText) {
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
