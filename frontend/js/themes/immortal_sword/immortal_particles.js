/**
 * 仙途凌霄 - 专属灵气剑意与水墨流云粒子引擎 (ImmortalParticleEngine)
 */

export class ImmortalParticleEngine {
    constructor(options = {}) {
        this.elementId = options.elementId || 'tts-immortal-trigger';
        this.canvasId = options.canvasId || 'immortalParticleCanvas';
        this.elementSize = options.elementSize || 68;

        this.canvas = null;
        this.ctx = null;
        this.canvasW = 0;
        this.canvasH = 0;
        this.animationFrameId = null;
        this.lastTime = 0;

        // 粒子池
        this.qiDustParticles = [];
        this.inkCloudParticles = [];
        this.swordBeams = [];
        this.resonanceRings = [];

        // 状态与定时器
        this.nextMicroEventTime = 0;
        this.isMicroActive = false;
        this.running = false;

        // 颜色配置
        this.colors = {
            jadePrimary: '16, 185, 129',   // #10b981
            jadeLight: '52, 211, 153',     // #34d399
            goldPrimary: '251, 191, 36',   // #fbbf24
            goldLight: '253, 230, 138',    // #fde68a
            inkDark: '6, 78, 59',          // #064e3b
        };
    }

    start() {
        this._initDOM();
        this._initCanvas();
        this.running = true;
        this.lastTime = performance.now();
        this._scheduleNextMicroEvent();
        this._animate(this.lastTime);
    }

    stop() {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.canvas = null;
        this.ctx = null;
        this.qiDustParticles = [];
        this.inkCloudParticles = [];
        this.swordBeams = [];
        this.resonanceRings = [];
    }

    _initDOM() {
        this.element = document.getElementById(this.elementId);
    }

    _initCanvas() {
        if (!this.element) return;
        
        let canvas = this.element.querySelector(`#${this.canvasId}`);
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = this.canvasId;
            canvas.style.position = 'absolute';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '0';
            this.element.appendChild(canvas);
        }
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this._resizeCanvas();

        this._resizeHandler = () => this._resizeCanvas();
        window.addEventListener('resize', this._resizeHandler);
    }

    _resizeCanvas() {
        if (!this.canvas || !this.element) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        
        // 飞剑尺寸约为 40x100，左右扩展 50px，上下扩展 40px
        const padX = 50;
        const padY = 40;
        this.canvasW = 40 + padX * 2; // 140
        this.canvasH = 100 + padY * 2; // 180

        this.canvas.width = this.canvasW * dpr;
        this.canvas.height = this.canvasH * dpr;
        this.canvas.style.width = `${this.canvasW}px`;
        this.canvas.style.height = `${this.canvasH}px`;
        this.canvas.style.left = `${-padX}px`;
        this.canvas.style.top = `${-padY}px`;

        this.ctx.scale(dpr, dpr);
    }

    _scheduleNextMicroEvent() {
        // 每 14~24 秒随机触发修仙微事件
        const delay = 14000 + Math.random() * 10000;
        this.nextMicroEventTime = performance.now() + delay;
    }

    // 触发万剑破空微事件
    triggerSwordSurge() {
        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;
        const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI / 4, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
        
        angles.forEach((angle, idx) => {
            const isGold = idx % 2 === 0;
            this.swordBeams.push({
                x: cx + Math.cos(angle) * 15,
                y: cy + Math.sin(angle) * 15,
                vx: Math.cos(angle) * (2.8 + Math.random() * 1.5),
                vy: Math.sin(angle) * (2.8 + Math.random() * 1.5),
                length: 18 + Math.random() * 10,
                angle: angle,
                color: isGold ? this.colors.goldPrimary : this.colors.jadePrimary,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.01
            });
        });

        // 伴随阴阳共鸣圈
        this.resonanceRings.push({
            cx: cx,
            cy: cy,
            r: 10,
            maxR: 50,
            color: this.colors.jadeLight,
            alpha: 0.8,
            decay: 0.025
        });
    }

    // 触发阴阳共鸣微事件
    triggerResonance() {
        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;
        this.resonanceRings.push(
            { cx, cy, r: 12, maxR: 55, color: this.colors.goldLight, alpha: 0.9, decay: 0.02 },
            { cx, cy, r: 18, maxR: 62, color: this.colors.jadeLight, alpha: 0.7, decay: 0.018 }
        );
        this.burstParticles(8, 'mixed');
    }

    // 交互迸发
    burstParticles(count = 12, type = 'jade') {
        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.2 + Math.random() * 2.8;
            const isGold = type === 'gold' || (type === 'mixed' && Math.random() > 0.5);
            this.qiDustParticles.push({
                x: cx + Math.cos(angle) * 20,
                y: cy + Math.sin(angle) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5, // 向上浮动
                r: 1.2 + Math.random() * 2.0,
                color: isGold ? this.colors.goldPrimary : this.colors.jadePrimary,
                alpha: 1.0,
                decay: 0.015 + Math.random() * 0.02,
                spin: (Math.random() - 0.5) * 0.1
            });
        }
    }

    _spawnAmbientParticles() {
        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;

        // 灵气微粒生成 (维持约 15 个活跃)
        if (this.qiDustParticles.length < 18 && Math.random() < 0.35) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 18 + Math.random() * 16;
            const isGold = Math.random() > 0.65;
            this.qiDustParticles.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 0.6,
                vy: -0.4 - Math.random() * 0.6, // 凌霄灵气自然向上盘旋
                r: 1.0 + Math.random() * 1.8,
                color: isGold ? this.colors.goldLight : this.colors.jadeLight,
                alpha: 0.8,
                decay: 0.008 + Math.random() * 0.012,
                spiralRadius: dist,
                spiralAngle: angle,
                spiralSpeed: 0.02 + Math.random() * 0.02
            });
        }

        // 水墨流云微粒 (低频生成，维持 3-5 个)
        if (this.inkCloudParticles.length < 4 && Math.random() < 0.05) {
            const angle = Math.random() * Math.PI * 2;
            this.inkCloudParticles.push({
                x: cx + Math.cos(angle) * 12,
                y: cy + Math.sin(angle) * 12,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.2 - Math.random() * 0.3,
                r: 14 + Math.random() * 12,
                maxR: 26 + Math.random() * 10,
                alpha: 0.25,
                decay: 0.005 + Math.random() * 0.005,
                color: this.colors.inkDark
            });
        }
    }

    _animate(time) {
        if (!this.running) return;

        const dt = Math.min(time - this.lastTime, 100);
        this.lastTime = time;

        // 检查微事件调度
        if (time >= this.nextMicroEventTime) {
            if (Math.random() > 0.5) {
                this.triggerSwordSurge();
            } else {
                this.triggerResonance();
            }
            this._scheduleNextMicroEvent();
        }

        this._spawnAmbientParticles();
        this._render();

        this.animationFrameId = requestAnimationFrame((t) => this._animate(t));
    }

    _render() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvasW, this.canvasH);

        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;

        // 1. 渲染水墨流云 (底层)
        for (let i = this.inkCloudParticles.length - 1; i >= 0; i--) {
            const p = this.inkCloudParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.r += (p.maxR - p.r) * 0.02;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.inkCloudParticles.splice(i, 1);
                continue;
            }

            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
            grad.addColorStop(0, `rgba(${p.color}, ${p.alpha * 0.8})`);
            grad.addColorStop(0.7, `rgba(${p.color}, ${p.alpha * 0.3})`);
            grad.addColorStop(1, `rgba(${p.color}, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. 渲染共鸣波纹
        for (let i = this.resonanceRings.length - 1; i >= 0; i--) {
            const r = this.resonanceRings[i];
            r.r += (r.maxR - r.r) * 0.06;
            r.alpha -= r.decay;

            if (r.alpha <= 0 || r.r >= r.maxR - 1) {
                this.resonanceRings.splice(i, 1);
                continue;
            }

            ctx.strokeStyle = `rgba(${r.color}, ${r.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(r.cx, r.cy, r.r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3. 渲染青玉灵气光尘
        for (let i = this.qiDustParticles.length - 1; i >= 0; i--) {
            const p = this.qiDustParticles[i];
            if (p.spiralAngle !== undefined) {
                p.spiralAngle += p.spiralSpeed;
                p.x = cx + Math.cos(p.spiralAngle) * p.spiralRadius;
                p.y += p.vy;
                p.spiralRadius += 0.05;
            } else {
                p.x += p.vx;
                p.y += p.vy;
            }
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.qiDustParticles.splice(i, 1);
                continue;
            }

            // 发光微粒
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(${p.color}, ${p.alpha})`;
            ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // 重置
        }

        // 4. 渲染万剑破空飞剑流光
        for (let i = this.swordBeams.length - 1; i >= 0; i--) {
            const b = this.swordBeams[i];
            b.x += b.vx;
            b.y += b.vy;
            b.life -= b.decay;

            if (b.life <= 0) {
                this.swordBeams.splice(i, 1);
                continue;
            }

            const tailX = b.x - Math.cos(b.angle) * b.length;
            const tailY = b.y - Math.sin(b.angle) * b.length;

            const grad = ctx.createLinearGradient(tailX, tailY, b.x, b.y);
            grad.addColorStop(0, `rgba(${b.color}, 0)`);
            grad.addColorStop(0.7, `rgba(${b.color}, ${b.life * 0.7})`);
            grad.addColorStop(1, `rgba(255, 255, 255, ${b.life})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.0;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // 剑尖高光灵点
            ctx.fillStyle = `rgba(255, 255, 255, ${b.life})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
