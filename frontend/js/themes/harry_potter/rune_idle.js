/**
 * 待机态魔法符文组件
 * 
 * 哈利波特主题的核心入口：一个漂浮在屏幕边缘的魔法符文，
 * 带有 SVG 能量流动、3D 漂浮感、银色粒子飘散、环境星尘、偶发微事件。
 * 
 * 职责：
 * - 创建并管理符文 DOM（SVG + 辉光 + 光圈 + 投影）
 * - 驱动粒子系统（飘散银粒 + 环境星尘 + 流星）
 * - 管理偶发微事件定时器
 * - 暴露点击回调和状态切换接口
 */

import { ParticleSystem } from '../../particle_system.js';

// ==================== SVG 符文图案 ====================
// 凯尔特结变体 + 六芒星融合的魔法符文
const RUNE_SVG = `
<svg class="rune-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <!-- 外层旋转环 -->
    <circle class="rune-line" cx="24" cy="24" r="20" />
    
    <!-- 六芒星路径（两个交叉三角） -->
    <path class="rune-line" d="M24 4 L42 34 L6 34 Z" />
    <path class="rune-line" d="M24 44 L6 14 L42 14 Z" />
    
    <!-- 内层凯尔特结 -->
    <path class="rune-line-inner" 
          d="M24 10 Q34 18 30 24 Q38 30 24 38 Q10 30 18 24 Q14 18 24 10" />
    
    <!-- 符文连接弧线 -->
    <path class="rune-line-inner" d="M14 14 Q24 20 34 14" />
    <path class="rune-line-inner" d="M14 34 Q24 28 34 34" />
    <path class="rune-line-inner" d="M10 24 Q18 24 24 18" />
    <path class="rune-line-inner" d="M38 24 Q30 24 24 30" />
    
    <!-- 中心核心 -->
    <circle class="rune-core" cx="24" cy="24" r="2.5" />
    
    <!-- 四个节点 -->
    <circle class="rune-core" cx="24" cy="8" r="1.5" style="animation-delay: 0.5s" />
    <circle class="rune-core" cx="24" cy="40" r="1.5" style="animation-delay: 1s" />
    <circle class="rune-core" cx="8" cy="24" r="1.5" style="animation-delay: 1.5s" />
    <circle class="rune-core" cx="40" cy="24" r="1.5" style="animation-delay: 0.3s" />
</svg>
`;

// ==================== 偶发微事件配置 ====================
const MICRO_EVENTS = [
    {
        name: 'micro-spin',
        weight: 3,
        duration: 600,
        execute(runeInner) {
            runeInner.classList.add('micro-spin');
            setTimeout(() => runeInner.classList.remove('micro-spin'), 600);
        }
    },
    {
        name: 'pattern-flash',
        weight: 2,
        duration: 800,
        execute(runeInner) {
            runeInner.classList.add('pattern-flash');
            setTimeout(() => runeInner.classList.remove('pattern-flash'), 800);
        }
    },
    {
        name: 'shooting-star',
        weight: 3,
        duration: 1500,
        execute(runeInner, system) {
            if (!system) return;
            const rect = runeInner.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            // 随机方向的弧线
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 60;
            system.particleSystem.addParticle({
                x: startX,
                y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                size: 3,
                color: '#E8E8FF',
                glowColor: '#E8E8FF',
                glow: 15,
                life: 1.2,
                sizeDecay: 1.5,
                trail: true,
                trailLength: 8,
                gravity: 20,
            });
        }
    },
    {
        name: 'golden-particle',
        weight: 1, // 极低概率
        duration: 2000,
        execute(runeInner, system) {
            if (!system) return;
            const rect = runeInner.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            // 一颗耀眼的金色粒子
            system.particleSystem.addParticle({
                x: cx + (Math.random() - 0.5) * 10,
                y: cy + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 20,
                vy: -15 - Math.random() * 15,
                size: 4,
                color: '#FFD700',
                glowColor: '#FFD700',
                glow: 20,
                life: 2.5,
                sizeDecay: 0.8,
                wobble: 15,
                wobbleSpeed: 3,
            });
        }
    }
];

// ==================== RuneIdle 组件 ====================
class RuneIdle {
    constructor() {
        this.el = null;           // #hp-rune-idle
        this.runeInner = null;    // .rune-inner
        this.particlesContainer = null;
        this.particleSystem = null;
        this.microEventTimer = null;
        this._onClick = null;
        this._isDragging = false;
        this._hasMoved = false;
    }

    /**
     * 初始化符文
     * @param {Object} options
     * @param {Function} options.onClick - 点击符文时的回调
     */
    init(options = {}) {
        this._onClick = options.onClick || (() => { });

        // --- 粒子容器（全屏） ---
        this.particlesContainer = document.createElement('div');
        this.particlesContainer.id = 'hp-rune-particles';
        document.body.appendChild(this.particlesContainer);

        // --- 符文 DOM ---
        this.el = document.createElement('div');
        this.el.id = 'hp-rune-idle';
        this.el.innerHTML = `
            <div class="rune-aura"></div>
            <div class="rune-glow"></div>
            <div class="rune-inner">
                ${RUNE_SVG}
            </div>
            <div class="rune-shadow"></div>
        `;
        document.body.appendChild(this.el);

        this.runeInner = this.el.querySelector('.rune-inner');

        // --- 粒子系统 ---
        this.particleSystem = new ParticleSystem({
            container: this.particlesContainer,
            maxParticles: 50,
        });

        // --- 事件绑定 ---
        this._bindInteraction();

        // --- 启动 ---
        this.startIdleAnimation();

        console.log('✨ [RuneIdle] 魔法符文已初始化');
    }

    // ==================== 动画控制 ====================

    startIdleAnimation() {
        // 1. 启动粒子系统
        this.particleSystem.start();

        // 2. 注册发射器：银色飘散粒子（从符文飘出）
        this.particleSystem.addEmitter({
            id: 'rune-drift',
            interval: 1.5,  // 每1.5秒一个
            spawn: () => {
                const rect = this.el.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                return {
                    x: cx + (Math.random() - 0.5) * 16,
                    y: cy + (Math.random() - 0.5) * 16,
                    vx: (Math.random() - 0.5) * 15,
                    vy: -8 - Math.random() * 12,
                    size: 1.5 + Math.random() * 1.5,
                    color: '#E8E8FF',
                    glowColor: '#C0C0FF',
                    glow: 8,
                    life: 2.5 + Math.random() * 2,
                    sizeDecay: 0.3,
                    wobble: 8,
                    wobbleSpeed: 2,
                };
            }
        });

        // 3. 注册发射器：环境星尘（极淡，全屏随机位置）
        this.particleSystem.addEmitter({
            id: 'ambient-stardust',
            interval: 4,  // 每4秒一个
            spawn: (sys) => {
                // 主要出现在屏幕右侧（符文附近）
                const x = sys.width * (0.5 + Math.random() * 0.5);
                const y = Math.random() * sys.height;
                return {
                    x,
                    y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3,
                    size: 1 + Math.random(),
                    color: 'rgba(192, 192, 255, 0.4)',
                    glow: 4,
                    glowColor: 'rgba(192, 192, 255, 0.3)',
                    life: 6 + Math.random() * 4,
                    sizeDecay: 0.08,
                    wobble: 3,
                    wobbleSpeed: 0.8,
                };
            }
        });

        // 4. 偶发微事件
        this._scheduleMicroEvent();
    }

    stopIdleAnimation() {
        this.particleSystem.stop();
        this.particleSystem.clear();
        if (this.microEventTimer) {
            clearTimeout(this.microEventTimer);
            this.microEventTimer = null;
        }
    }

    // ==================== 偶发微事件 ====================

    _scheduleMicroEvent() {
        // 30~60秒后触发
        const delay = (30 + Math.random() * 30) * 1000;
        this.microEventTimer = setTimeout(() => {
            this._triggerMicroEvent();
            this._scheduleMicroEvent(); // 循环调度
        }, delay);
    }

    _triggerMicroEvent() {
        // 按权重随机选择
        const totalWeight = MICRO_EVENTS.reduce((sum, e) => sum + e.weight, 0);
        let r = Math.random() * totalWeight;
        for (const event of MICRO_EVENTS) {
            r -= event.weight;
            if (r <= 0) {
                console.log(`✨ [RuneIdle] 偶发事件: ${event.name}`);
                event.execute(this.runeInner, this);
                return;
            }
        }
    }

    // ==================== 交互 ====================

    _bindInteraction() {
        let startX, startY, shiftX, shiftY;
        const DRAG_THRESHOLD = 10;

        const onStart = (e) => {
            if (e.type === 'touchstart' && e.touches.length > 1) return;
            if (e.cancelable) e.preventDefault();

            const point = e.type === 'touchstart' ? e.touches[0] : e;
            const rect = this.el.getBoundingClientRect();

            startX = point.clientX;
            startY = point.clientY;
            shiftX = startX - rect.left;
            shiftY = startY - rect.top;

            this._isDragging = true;
            this._hasMoved = false;

            document.addEventListener('mousemove', onMove, { passive: false });
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchend', onUp);
        };

        const onMove = (e) => {
            if (!this._isDragging) return;
            if (e.cancelable) e.preventDefault();

            const point = e.type === 'touchmove' ? e.touches[0] : e;
            const currentX = point.clientX;
            const currentY = point.clientY;

            if (!this._hasMoved) {
                const dist = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                if (dist < DRAG_THRESHOLD) return;
                this._hasMoved = true;
                // 切换定位模式
                this.el.style.setProperty('right', 'auto', 'important');
                this.el.style.setProperty('transform', 'none', 'important');
            }

            const winW = window.innerWidth;
            const winH = window.innerHeight;
            let newLeft = Math.max(0, Math.min(winW - 60, currentX - shiftX));
            let newTop = Math.max(0, Math.min(winH - 60, currentY - shiftY));

            this.el.style.setProperty('left', newLeft + 'px', 'important');
            this.el.style.setProperty('top', newTop + 'px', 'important');
        };

        const onUp = () => {
            this._isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchend', onUp);

            if (!this._hasMoved) {
                this._onClick();
            } else {
                // 吸附到最近的边缘
                this._snapToEdge();
            }
        };

        this.el.addEventListener('mousedown', onStart, { passive: false });
        this.el.addEventListener('touchstart', onStart, { passive: false });
    }

    _snapToEdge() {
        const rect = this.el.getBoundingClientRect();
        const midX = window.innerWidth / 2;
        const targetLeft = (rect.left + rect.width / 2 < midX) ? 8 : (window.innerWidth - rect.width - 8);

        this.el.style.setProperty('transition', 'left 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 'important');
        this.el.style.setProperty('left', targetLeft + 'px', 'important');

        setTimeout(() => {
            this.el.style.removeProperty('transition');
        }, 250);
    }

    // ==================== 状态切换 ====================

    show() {
        this.el.classList.remove('hidden');
        this.particlesContainer.style.display = '';
        this.startIdleAnimation();
    }

    hide() {
        this.el.classList.add('hidden');
        this.particlesContainer.style.display = 'none';
        this.stopIdleAnimation();
    }

    /**
     * 设置来电震动状态
     */
    setIncomingCall(active) {
        if (active) {
            this.el.classList.add('incoming-call');
        } else {
            this.el.classList.remove('incoming-call');
        }
    }

    /**
     * 设置低语感应状态
     */
    setEavesdropAvailable(active) {
        if (active) {
            this.el.classList.add('eavesdrop-available');
        } else {
            this.el.classList.remove('eavesdrop-available');
        }
    }

    destroy() {
        this.stopIdleAnimation();
        this.particleSystem.destroy();
        this.el.remove();
        this.particlesContainer.remove();
    }
}

// 单例导出
export const runeIdle = new RuneIdle();
