/**
 * Canvas 2D 粒子系统引擎
 * 
 * 通用粒子引擎，支持多组粒子在同一 Canvas 上渲染。
 * 用于：待机符文飘散粒子、环境星尘、流星效果、守护神粒子汇聚等。
 * 
 * 设计原则：轻量、GPU 友好、requestAnimationFrame 驱动。
 */

export class Particle {
    constructor(config = {}) {
        this.x = config.x ?? 0;
        this.y = config.y ?? 0;
        this.vx = config.vx ?? 0;
        this.vy = config.vy ?? 0;
        this.size = config.size ?? 2;
        this.alpha = config.alpha ?? 1;
        this.color = config.color ?? '#C0C0C0';          // 默认银色
        this.life = config.life ?? 3;                      // 秒
        this.maxLife = config.life ?? 3;
        this.decay = config.decay ?? (1 / this.maxLife);   // 每秒衰减量
        this.sizeDecay = config.sizeDecay ?? 0;            // 每秒尺寸衰减
        this.gravity = config.gravity ?? 0;
        this.wobble = config.wobble ?? 0;                  // 横向摇摆强度
        this.wobbleSpeed = config.wobbleSpeed ?? 2;
        this.wobbleOffset = Math.random() * Math.PI * 2;
        this.glow = config.glow ?? 0;                      // 辉光半径（0=无辉光）
        this.glowColor = config.glowColor ?? config.color ?? '#C0C0C0';
        this.dead = false;

        // 轨迹类型
        this.trail = config.trail ?? false;                // 是否留拖尾
        this.trailLength = config.trailLength ?? 5;
        this.history = [];
    }

    update(dt) {
        if (this.dead) return;

        // 摇摆
        if (this.wobble > 0) {
            this.x += Math.sin((this.life * this.wobbleSpeed) + this.wobbleOffset) * this.wobble * dt;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.life -= dt;
        this.alpha = Math.max(0, (this.life / this.maxLife));
        this.size = Math.max(0, this.size - this.sizeDecay * dt);

        if (this.trail) {
            this.history.push({ x: this.x, y: this.y, alpha: this.alpha });
            if (this.history.length > this.trailLength) {
                this.history.shift();
            }
        }

        if (this.life <= 0 || this.alpha <= 0) {
            this.dead = true;
        }
    }

    render(ctx) {
        if (this.dead || this.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        // 拖尾
        if (this.trail && this.history.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size * 0.5;
            ctx.lineCap = 'round';
            for (let i = 0; i < this.history.length; i++) {
                const p = this.history[i];
                ctx.globalAlpha = (i / this.history.length) * this.alpha * 0.5;
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.globalAlpha = this.alpha;
        }

        // 辉光
        if (this.glow > 0) {
            ctx.shadowBlur = this.glow;
            ctx.shadowColor = this.glowColor;
        }

        // 粒子本体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}


export class ParticleSystem {
    /**
     * @param {Object} config
     * @param {HTMLElement} config.container - 粒子 Canvas 要挂载的父元素
     * @param {number} [config.width] - Canvas 宽度（默认取容器尺寸）
     * @param {number} [config.height] - Canvas 高度
     * @param {number} [config.maxParticles=200] - 最大粒子数
     * @param {boolean} [config.autoResize=true] - 是否自动跟随容器尺寸
     */
    constructor(config = {}) {
        this.container = config.container || document.body;
        this.maxParticles = config.maxParticles ?? 200;
        this.autoResize = config.autoResize ?? true;

        // 创建 Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // 粒子池
        this.particles = [];

        // 发射器
        this.emitters = [];

        // 动画状态
        this._running = false;
        this._rafId = null;
        this._lastTime = 0;

        // 初始尺寸
        this._resize();

        if (this.autoResize) {
            this._resizeObserver = new ResizeObserver(() => this._resize());
            this._resizeObserver.observe(this.container);
        }
    }

    _resize() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * 直接添加一个粒子
     */
    addParticle(config) {
        if (this.particles.length >= this.maxParticles) return null;
        const p = new Particle(config);
        this.particles.push(p);
        return p;
    }

    /**
     * 注册一个持续发射器
     * @param {Object} emitter
     * @param {Function} emitter.spawn - (system) => ParticleConfig | null，返回粒子配置或 null
     * @param {number} emitter.interval - 发射间隔（秒）
     * @param {string} [emitter.id] - 发射器ID，用于后续移除
     */
    addEmitter(emitter) {
        emitter._timer = 0;
        emitter.id = emitter.id || `emitter_${Date.now()}_${Math.random()}`;
        this.emitters.push(emitter);
        return emitter.id;
    }

    removeEmitter(id) {
        this.emitters = this.emitters.filter(e => e.id !== id);
    }

    start() {
        if (this._running) return;
        this._running = true;
        this._lastTime = performance.now();
        this._tick();
    }

    stop() {
        this._running = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    clear() {
        this.particles = [];
        this.emitters = [];
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    destroy() {
        this.stop();
        this.clear();
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        this.canvas.remove();
    }

    _tick() {
        if (!this._running) return;

        const now = performance.now();
        const dt = Math.min((now - this._lastTime) / 1000, 0.1); // 限制最大 dt 防跳帧
        this._lastTime = now;

        // 发射器
        for (const emitter of this.emitters) {
            emitter._timer += dt;
            while (emitter._timer >= emitter.interval) {
                emitter._timer -= emitter.interval;
                const config = emitter.spawn(this);
                if (config) {
                    this.addParticle(config);
                }
            }
        }

        // 更新
        for (const p of this.particles) {
            p.update(dt);
        }

        // 清理死亡粒子
        this.particles = this.particles.filter(p => !p.dead);

        // 渲染
        this.ctx.clearRect(0, 0, this.width, this.height);
        for (const p of this.particles) {
            p.render(this.ctx);
        }

        this._rafId = requestAnimationFrame(() => this._tick());
    }
}
