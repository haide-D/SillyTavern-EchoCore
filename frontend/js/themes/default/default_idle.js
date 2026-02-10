/**
 * 默认待机主题 - 悬浮球
 * 
 * 恢复原始的 #tts-mobile-trigger 悬浮触发球，
 * 包含拖拽、边缘吸附、呼吸动画、来电/低语感应状态。
 * 样式定义在 mobile.css 中。
 * 
 * 实现 ThemeManager 统一接口:
 *   init(options), show(), hide(),
 *   setIncomingCall(active), setEavesdropAvailable(active), destroy()
 */

class DefaultIdle {
    constructor() {
        this.$el = null;
        this._onClick = null;
        this._isDragging = false;
        this._hasMoved = false;
    }

    /**
     * 初始化悬浮球
     * @param {object} options
     * @param {Function} options.onClick - 点击回调
     */
    init(options = {}) {
        this._onClick = options.onClick || (() => { });

        // 如果已经存在则跳过
        if ($('#tts-mobile-trigger').length > 0) {
            this.$el = $('#tts-mobile-trigger');
            return;
        }

        // 创建 DOM
        const html = `
        <div id="tts-mobile-trigger" title="📱 点击打开">
            <div class="trigger-bubble-inner">📱</div>
        </div>
        `;
        $('body').append(html);
        this.$el = $('#tts-mobile-trigger');

        this._bindInteraction();

        console.log('📱 [DefaultIdle] 悬浮球已初始化');
    }

    /** 绑定拖拽 + 点击 */
    _bindInteraction() {
        const el = this.$el[0];
        let startX, startY, origX, origY;

        const onPointerDown = (e) => {
            this._isDragging = true;
            this._hasMoved = false;

            const rect = el.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;

            const point = e.touches ? e.touches[0] : e;
            startX = point.clientX;
            startY = point.clientY;

            // 拖拽时停止呼吸动画，避免抖动
            el.style.animation = 'none';
            el.style.transition = 'none';

            e.preventDefault();
        };

        const onPointerMove = (e) => {
            if (!this._isDragging) return;
            const point = e.touches ? e.touches[0] : e;
            const dx = point.clientX - startX;
            const dy = point.clientY - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                this._hasMoved = true;
            }

            const newX = origX + dx;
            const newY = origY + dy;

            // 限制边界
            const maxX = window.innerWidth - el.offsetWidth;
            const maxY = window.innerHeight - el.offsetHeight;

            el.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
            el.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.transform = 'none';
        };

        const onPointerUp = () => {
            if (!this._isDragging) return;
            this._isDragging = false;

            if (this._hasMoved) {
                this._snapToEdge();
            } else {
                // 恢复动画
                el.style.animation = '';
                el.style.transition = '';

                if (this._onClick) this._onClick();
            }
        };

        // 鼠标事件
        el.addEventListener('mousedown', onPointerDown);
        document.addEventListener('mousemove', onPointerMove);
        document.addEventListener('mouseup', onPointerUp);

        // 触摸事件
        el.addEventListener('touchstart', onPointerDown, { passive: false });
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('touchend', onPointerUp);
    }

    /** 吸附到最近边缘 */
    _snapToEdge() {
        const el = this.$el[0];
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;

        const snapLeft = centerX < window.innerWidth / 2;

        el.style.transition = 'left 0.3s ease, right 0.3s ease';

        if (snapLeft) {
            el.style.left = '0px';
            el.style.right = 'auto';
        } else {
            el.style.left = (window.innerWidth - el.offsetWidth) + 'px';
            el.style.right = 'auto';
        }

        // 恢复动画
        setTimeout(() => {
            el.style.animation = '';
            el.style.transition = '';
        }, 350);
    }

    // ==================== 统一接口 ====================

    show() {
        if (this.$el) this.$el.fadeIn(300);
    }

    hide() {
        if (this.$el) this.$el.fadeOut(200);
    }

    setIncomingCall(active) {
        if (!this.$el) return;
        if (active) {
            // 移除拖动残留样式
            this.$el[0].style.removeProperty('animation');
            this.$el[0].style.removeProperty('transform');
            this.$el.addClass('incoming-call');
        } else {
            this.$el.removeClass('incoming-call');
        }
    }

    setEavesdropAvailable(active) {
        if (!this.$el) return;
        if (active) {
            this.$el[0].style.removeProperty('animation');
            this.$el[0].style.removeProperty('transform');
            this.$el.addClass('eavesdrop-available');
        } else {
            this.$el.removeClass('eavesdrop-available');
        }
    }

    destroy() {
        if (this.$el) {
            this.$el.remove();
            this.$el = null;
        }
        console.log('📱 [DefaultIdle] 悬浮球已销毁');
    }
}

export const defaultIdle = new DefaultIdle();
