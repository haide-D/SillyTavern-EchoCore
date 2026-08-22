/**
 * 仙途凌霄 - 专属灵气水墨与剑意粒子引擎 (ImmortalParticleEngine)
 * 仙侠风节：清冷孤高 · 水墨微尘 · 霜华剑意 · 克制内敛
 */

export class ImmortalParticleEngine {
    constructor(options = {}) {
        this.elementId = options.elementId || 'tts-immortal-trigger';
        this.canvasId = options.canvasId || 'immortalParticleCanvas';

        this.canvas = null;
        this.ctx = null;
        this.canvasW = 0;
        this.canvasH = 0;
        this.animationFrameId = null;
        this.lastTime = 0;

        // 粒子池
        this.qiMoteParticles = [];      // 水墨霜华光尘
        this.inkVaporParticles = [];    // 淡墨轻雾
        this.swordWisps = [];           // 极细月白剑意
        this.zenRipples = [];           // 道韵水波微澜

        // 状态与定时器
        this.nextMicroEventTime = 0;
        this.running = false;

        // 素雅仙侠色彩 (剔除高饱和艳色与多段渐变)
        this.colors = {
            moonlightWhite: '241, 245, 249', // 月魄白 #f1f5f9
            frostJade: '140, 181, 174',      // 冷翡素玉 #8cb5ae
            mutedGold: '194, 166, 117',      // 哑光素金 #c2a675
            deepInk: '14, 19, 23'            // 玄墨 #0e1317
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
        this.qiMoteParticles = [];
        this.inkVaporParticles = [];
        this.swordWisps = [];
        this.zenRipples = [];
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
        
        // 尺寸适度扩展，保持清爽
        const padX = 40;
        const padY = 40;
        this.canvasW = 54 + padX * 2; // 134
        this.canvasH = 54 + padY * 2; // 134

        this.canvas.width = this.canvasW * dpr;
        this.canvas.height = this.canvasH * dpr;
        this.canvas.style.width = `${this.canvasW}px`;
        this.canvas.style.height = `${this.canvasH}px`;
        this.canvas.style.left = `${-padX}px`;
        this.canvas.style.top = `${-padY}px`;

        this.ctx.scale(dpr, dpr);
    }

    _scheduleNextMicroEvent() {
        // 低频触发仙侠微事件 (16~28 秒)
        const delay = 16000 + Math.random() * 12000;
        this.nextMicroEventTime = performance.now() + delay;
    }

    // 触发孤峰剑意破空
    triggerSwordSurge() {
        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;
        const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
        
        angles.forEach((angle) => {
            this.swordWisps.push({
                x: cx + Math.cos(angle) * 12,
                y: cy + Math.sin(angle) * 12,
                vx: Math.cos(angle) * (1.8 + Math.random() * 0.8),
                vy: Math.sin(angle) * (1.8 + Math.random() * 0.8),
                length: 12 + Math.random() * 8,
                angle: angle,
                color: this.colors.moonlightWhite,
                life: 0.9,
                decay: 0.02
            });
        });

        // 伴随极淡水波涟漪
        this.zenRipples.push({
            cx: cx,
            cy: cy,
            r: 8,
            maxR: 38,
            color: this.colors.frostJade,
            alpha: 0.5,
            decay: 0.015
        });
    }

    // 触发道韵清波
    triggerResonance() {
        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;
        this.zenRipples.push(
            { cx, cy, r: 10, maxR: 44, color: this.colors.mutedGold, alpha: 0.6, decay: 0.014 }
        );
        this.burstParticles(6, 'jade');
    }

    // 点击交互微迸发 (数量极其克制)
    burstParticles(count = 8, type = 'jade') {
        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 1.6;
            const isGold = type === 'gold';
            const color = isGold ? this.colors.mutedGold : this.colors.frostJade;
            
            this.qiMoteParticles.push({
                x: cx + Math.cos(angle) * 14,
                y: cy + Math.sin(angle) * 14,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.4, // 向上轻盈漂浮
                r: 0.8 + Math.random() * 1.2,
                color: color,
                alpha: 0.8,
                decay: 0.015 + Math.random() * 0.015
            });
        }
    }

    _spawnAmbientParticles() {
        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;

        // 霜华水墨微尘 (严格控制在 8-12 个以内，空灵雅致)
        if (this.qiMoteParticles.length < 10 && Math.random() < 0.2) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 14 + Math.random() * 12;
            const isMoonlight = Math.random() > 0.4;
            this.qiMoteParticles.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.3 - Math.random() * 0.4, // 孤烟直上
                r: 0.8 + Math.random() * 1.2,
                color: isMoonlight ? this.colors.moonlightWhite : this.colors.frostJade,
                alpha: 0.6,
                decay: 0.006 + Math.random() * 0.008,
                spiralRadius: dist,
                spiralAngle: angle,
                spiralSpeed: 0.015 + Math.random() * 0.015
            });
        }

        // 淡墨轻雾 (极低频，最多 2 个)
        if (this.inkVaporParticles.length < 2 && Math.random() < 0.02) {
            const angle = Math.random() * Math.PI * 2;
            this.inkVaporParticles.push({
                x: cx + Math.cos(angle) * 8,
                y: cy + Math.sin(angle) * 8,
                vx: (Math.random() - 0.5) * 0.15,
                vy: -0.15 - Math.random() * 0.2,
                r: 10 + Math.random() * 8,
                maxR: 20 + Math.random() * 6,
                alpha: 0.12,
                decay: 0.003,
                color: this.colors.deepInk
            });
        }
    }

    _animate(time) {
        if (!this.running) return;

        this.lastTime = time;

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

        // 1. 淡墨轻雾 (底层微弱水墨晕染)
        for (let i = this.inkVaporParticles.length - 1; i >= 0; i--) {
            const p = this.inkVaporParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.r += (p.maxR - p.r) * 0.015;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.inkVaporParticles.splice(i, 1);
                continue;
            }

            ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. 道韵水波微澜
        for (let i = this.zenRipples.length - 1; i >= 0; i--) {
            const r = this.zenRipples[i];
            r.r += (r.maxR - r.r) * 0.04;
            r.alpha -= r.decay;

            if (r.alpha <= 0 || r.r >= r.maxR - 1) {
                this.zenRipples.splice(i, 1);
                continue;
            }

            ctx.strokeStyle = `rgba(${r.color}, ${r.alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(r.cx, r.cy, r.r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3. 霜华水墨微尘 (纯粹微粒，无过度光晕滤镜)
        for (let i = this.qiMoteParticles.length - 1; i >= 0; i--) {
            const p = this.qiMoteParticles[i];
            if (p.spiralAngle !== undefined) {
                p.spiralAngle += p.spiralSpeed;
                p.x = cx + Math.cos(p.spiralAngle) * p.spiralRadius;
                p.y += p.vy;
                p.spiralRadius += 0.03;
            } else {
                p.x += p.vx;
                p.y += p.vy;
            }
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.qiMoteParticles.splice(i, 1);
                continue;
            }

            ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. 孤峰剑意 (极细工笔单线)
        for (let i = this.swordWisps.length - 1; i >= 0; i--) {
            const b = this.swordWisps[i];
            b.x += b.vx;
            b.y += b.vy;
            b.life -= b.decay;

            if (b.life <= 0) {
                this.swordWisps.splice(i, 1);
                continue;
            }

            const tailX = b.x - Math.cos(b.angle) * b.length;
            const tailY = b.y - Math.sin(b.angle) * b.length;

            ctx.strokeStyle = `rgba(${b.color}, ${b.life * 0.8})`;
            ctx.lineWidth = 0.9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    }
}
