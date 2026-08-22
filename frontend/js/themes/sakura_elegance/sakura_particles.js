/**
 * 平安京·落樱雅境 - 专属和风落樱与金粉光尘粒子物理系统 (SakuraParticleEngine)
 * 平安风雅：落英缤纷 · 莫兰迪烟粉 · 3D 翻转浮动 · 晨曦金屑 · 灵动自然
 */

export class SakuraParticleEngine {
    constructor(options = {}) {
        this.elementId = options.elementId || 'tts-sakura-trigger';
        this.canvasId = options.canvasId || 'sakuraParticleCanvas';

        this.canvas = null;
        this.ctx = null;
        this.canvasW = 0;
        this.canvasH = 0;
        this.animationFrameId = null;
        this.lastTime = 0;

        // 粒子池
        this.petals = [];          // 3D 翻转樱花花瓣
        this.goldMotes = [];       // 晨曦金屑微尘
        this.ripples = [];         // 结界落樱微澜

        // 状态与风力模拟
        this.windForce = 0.3;
        this.windAngle = 0;
        this.nextMicroBurstTime = 0;
        this.running = false;

        // 莫兰迪薄樱与淡金色彩
        this.colors = {
            petalBase: '244, 166, 184',    // 莫兰迪烟粉 #F4A6B8
            petalLight: '255, 240, 245',   // 薄樱白 #FFF0F5
            petalDeep: '212, 140, 158',    // 暮夜幽粉 #D48C9E
            goldDust: '245, 208, 169',     // 哑光赤金 #F5D0A9
            warmMizuhiki: '229, 166, 150'  // 水引暖红 #E5A696
        };
    }

    start() {
        this._initDOM();
        this._initCanvas();
        this.running = true;
        this.lastTime = performance.now();
        this._scheduleNextBurst();
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
        this.petals = [];
        this.goldMotes = [];
        this.ripples = [];
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

        const padX = 45;
        const padY = 45;
        this.canvasW = 54 + padX * 2; // 144
        this.canvasH = 54 + padY * 2; // 144

        this.canvas.width = this.canvasW * dpr;
        this.canvas.height = this.canvasH * dpr;
        this.canvas.style.width = `${this.canvasW}px`;
        this.canvas.style.height = `${this.canvasH}px`;
        this.canvas.style.left = `-${padX}px`;
        this.canvas.style.top = `-${padY}px`;

        if (this.ctx) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(dpr, dpr);
        }
    }

    _scheduleNextBurst() {
        // 每 10~16 秒产生一次轻柔落樱微风 (极简留白)
        this.nextMicroBurstTime = performance.now() + 10000 + Math.random() * 6000;
    }

    _animate(currentTime) {
        if (!this.running) return;

        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        // 微风扰动周期
        this.windAngle += dt * 0.6;
        this.windForce = 0.15 + Math.sin(this.windAngle) * 0.18;

        this._update(dt, currentTime);
        this._render();

        this.animationFrameId = requestAnimationFrame((t) => this._animate(t));
    }

    _update(dt, currentTime) {
        const cx = this.canvasW / 2;
        const cy = this.canvasH / 2;

        // 定期微风轻拂 (偶尔 1~2 片)
        if (currentTime > this.nextMicroBurstTime) {
            this._spawnBreezePetals(cx, cy);
            this._scheduleNextBurst();
        }

        // 常态补充花瓣 (保持 3~5 片，极简清雅)
        if (this.petals.length < 4 && Math.random() < 0.03) {
            this._spawnSinglePetal(cx, cy);
        }

        // 常态补充金粉微尘 (保持 4~6 颗微粒)
        if (this.goldMotes.length < 5 && Math.random() < 0.05) {
            this._spawnGoldMote(cx, cy);
        }

        // 1. 更新樱花花瓣
        for (let i = this.petals.length - 1; i >= 0; i--) {
            const p = this.petals[i];
            p.age += dt;
            if (p.age >= p.life) {
                this.petals.splice(i, 1);
                continue;
            }

            // 3D 翻转与摆动
            p.flipAngle += p.flipSpeed * dt;
            p.swingAngle += p.swingSpeed * dt;

            // 受微风与重力驱动
            p.vx += (this.windForce * 10 + Math.sin(p.swingAngle) * 6 - p.vx) * dt * 1.8;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // 渐入渐出透明度
            const progress = p.age / p.life;
            if (progress < 0.2) {
                p.alpha = (progress / 0.2) * p.maxAlpha;
            } else if (progress > 0.7) {
                p.alpha = ((1 - progress) / 0.3) * p.maxAlpha;
            } else {
                p.alpha = p.maxAlpha;
            }
        }

        // 2. 更新金粉微尘
        for (let i = this.goldMotes.length - 1; i >= 0; i--) {
            const m = this.goldMotes[i];
            m.age += dt;
            if (m.age >= m.life) {
                this.goldMotes.splice(i, 1);
                continue;
            }

            m.x += m.vx * dt;
            m.y += m.vy * dt;

            const progress = m.age / m.life;
            m.alpha = Math.sin(progress * Math.PI) * m.maxAlpha;
        }

        // 3. 更新落樱微澜
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.age += dt;
            if (r.age >= r.life) {
                this.ripples.splice(i, 1);
                continue;
            }
            const prog = r.age / r.life;
            r.radius = r.maxRadius * (0.3 + 0.7 * prog);
            r.alpha = (1 - prog) * r.maxAlpha;
        }
    }

    _spawnSinglePetal(cx, cy) {
        // 生成在悬浮球上方或周围
        const offsetX = (Math.random() - 0.5) * 48;
        const offsetY = -20 - Math.random() * 15;

        this.petals.push({
            x: cx + offsetX,
            y: cy + offsetY,
            vx: (Math.random() - 0.3) * 12,
            vy: 14 + Math.random() * 18,
            size: 3.8 + Math.random() * 2.8,
            flipAngle: Math.random() * Math.PI * 2,
            flipSpeed: 1.2 + Math.random() * 1.8,
            swingAngle: Math.random() * Math.PI * 2,
            swingSpeed: 1.5 + Math.random() * 1.5,
            rotation: Math.random() * Math.PI * 2,
            age: 0,
            life: 3.8 + Math.random() * 2.2,
            alpha: 0,
            maxAlpha: 0.5 + Math.random() * 0.25,
            colorType: Math.random() > 0.4 ? 'petalBase' : 'petalLight'
        });
    }

    _spawnBreezePetals(cx, cy) {
        const count = 1 + (Math.random() > 0.6 ? 1 : 0);
        for (let i = 0; i < count; i++) {
            this._spawnSinglePetal(cx, cy);
        }
    }

    _spawnGoldMote(cx, cy) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 24;

        this.goldMotes.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 6,
            vy: -4 - Math.random() * 8,
            radius: 0.6 + Math.random() * 0.8,
            age: 0,
            life: 2.0 + Math.random() * 1.5,
            alpha: 0,
            maxAlpha: 0.5 + Math.random() * 0.4
        });
    }

    // 交互爆发：点击或展开时激起漫天落樱
    burst(x, y) {
        const cx = x !== undefined ? x : this.canvasW / 2;
        const cy = y !== undefined ? y : this.canvasH / 2;

        // 激起一圈水引微澜
        this.ripples.push({
            x: cx,
            y: cy,
            radius: 5,
            maxRadius: 36,
            age: 0,
            life: 0.8,
            alpha: 0.7,
            maxAlpha: 0.7
        });

        // 绽放 8~12 片花瓣
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.4;
            const speed = 25 + Math.random() * 35;
            this.petals.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.7 + 10,
                size: 5 + Math.random() * 3,
                flipAngle: Math.random() * Math.PI * 2,
                flipSpeed: 3 + Math.random() * 3,
                swingAngle: Math.random() * Math.PI * 2,
                swingSpeed: 2.5,
                rotation: angle,
                age: 0,
                life: 2.5 + Math.random() * 1.5,
                alpha: 0,
                maxAlpha: 0.9,
                colorType: i % 2 === 0 ? 'petalBase' : 'petalLight'
            });
        }
    }

    _render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvasW, this.canvasH);

        // 1. 绘制落樱微澜
        for (const r of this.ripples) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(${this.colors.warmMizuhiki}, ${r.alpha})`;
            this.ctx.lineWidth = 0.8;
            this.ctx.stroke();
            this.ctx.restore();
        }

        // 2. 绘制金粉微尘
        for (const m of this.goldMotes) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${this.colors.goldDust}, ${m.alpha})`;
            this.ctx.fill();
            this.ctx.restore();
        }

        // 3. 绘制 3D 翻转樱花花瓣
        for (const p of this.petals) {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);

            // 3D 翻转缩放 (scaleX 模拟绕 Y 轴翻转，scaleY 模拟微弯)
            const scaleX = Math.cos(p.flipAngle);
            const scaleY = 0.8 + Math.sin(p.swingAngle) * 0.2;
            this.ctx.scale(scaleX, scaleY);

            // 绘制精细落樱花瓣 (Heart-shaped Sakura Petal with notch)
            this.ctx.beginPath();
            this.ctx.moveTo(0, -p.size);
            // 右瓣
            this.ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.9, p.size * 1.1, p.size * 0.2, 0, p.size);
            // 左瓣
            this.ctx.bezierCurveTo(-p.size * 1.1, p.size * 0.2, -p.size * 0.8, -p.size * 0.9, 0, -p.size);

            const rgb = this.colors[p.colorType];
            this.ctx.fillStyle = `rgba(${rgb}, ${p.alpha})`;
            this.ctx.fill();

            // 细微花脉金线
            this.ctx.beginPath();
            this.ctx.moveTo(0, -p.size * 0.5);
            this.ctx.lineTo(0, p.size * 0.6);
            this.ctx.strokeStyle = `rgba(${this.colors.goldDust}, ${p.alpha * 0.4})`;
            this.ctx.lineWidth = 0.4;
            this.ctx.stroke();

            this.ctx.restore();
        }
    }
}
