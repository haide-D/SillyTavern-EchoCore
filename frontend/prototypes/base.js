/**
 * PrototypeBase — 原型共享引擎
 *
 * 用法：
 *   const proto = new PrototypeBase({
 *       elementId: 'runeContainer',
 *       elementSize: 56,                  // px，主元素尺寸（用于定位偏移）
 *       whisperText: '「符文感应到……」',
 *       titleText: 'Patronus UI — Rune',
 *
 *       // 颜色配置（用于粒子渲染）
 *       colors: {
 *           dustRGB: '200, 200, 240',       // 星尘颜色
 *           dustGlowRGB: '192, 192, 255',   // 星尘晕色
 *           trailHue: [230, 250],            // 拖尾粒子色相范围
 *           trailSat: 30,
 *           trailLight: 75,
 *           whisperHue: [270, 290],          // 低语态粒子色相
 *           whisperSat: 60,
 *           whisperLight: 55,
 *       },
 *
 *       // 可选覆盖默认配置
 *       float: { amplitudeX: 6, ... },
 *       particles: { trailMax: 20, ... },
 *
 *       // 微事件列表
 *       microEvents: [
 *           { name: 'spin', weight: 40, fn(done, proto) { ... } },
 *       ],
 *
 *       // 状态变化回调
 *       onEnterState(state) { },
 *       onLeaveState(state) { },
 *
 *       // 自定义调试按钮（追加到默认按钮后面）
 *       extraButtons: [
 *           { id: 'btnCustom', label: '🎯 自定义', state: 'custom' },
 *       ],
 *   });
 *   proto.start();
 */

class PrototypeBase {
    constructor(options = {}) {
        // --- 合并配置 ---
        this.elementId = options.elementId || 'protoElement';
        this.elementSize = options.elementSize || 56;

        this.config = {
            // Float
            baseX: 0.78,
            baseY: 0.50,
            floatAmplitudeX: 6,
            floatAmplitudeY: 5,
            floatFreqX: 0.0008,
            floatFreqY: 0.001,
            floatSecondaryX: 0.002,
            floatSecondaryY: 0.0017,
            floatSecondaryAmpX: 2.5,
            floatSecondaryAmpY: 2,
            ...options.float,

            // Particles
            trailMaxParticles: 20,
            trailEmitChance: 0.25,
            trailLifespan: 3000,
            ambientParticles: 8,
            ...options.particles,

            // Micro events timing
            microEventMinInterval: 12000,
            microEventMaxInterval: 28000,
            ...options.timing,
        };

        // 颜色
        this.colors = {
            dustRGB: '200, 200, 240',
            dustGlowRGB: '192, 192, 255',
            trailHue: [230, 250],
            trailSat: 30,
            trailLight: 75,
            whisperHue: [270, 290],
            whisperSat: 60,
            whisperLight: 55,
            goldHue: [38, 48],
            goldSat: 70,
            goldLight: 65,
            ...options.colors,
        };

        // 微事件
        this.microEvents = options.microEvents || [];

        // 回调
        this.onEnterState = options.onEnterState || (() => { });
        this.onLeaveState = options.onLeaveState || (() => { });

        // 额外按钮
        this.extraButtons = options.extraButtons || [];

        // --- 内部状态 ---
        this.currentState = 'idle';
        this.elX = 0;
        this.elY = 0;
        this.lastTime = 0;
        this.frameCount = 0;
        this.fpsTime = 0;
        this.nextMicroEvent = 0;
        this.microEventActive = false;
        this.trailParticles = [];
        this.ambientDust = [];
        this.canvas = null;
        this.ctx = null;
        this.canvasW = 0;
        this.canvasH = 0;

        // DOM refs (lazy init)
        this.element = null;
        this.whisperUI = null;
        this.debugInfo = null;
        this.ripples = [];
    }

    // ========== 公共 API ==========

    start() {
        this._initDOM();
        this._initCanvas();
        this._initAmbientDust();
        this._scheduleNextMicro();

        this.lastTime = performance.now();
        this.fpsTime = this.lastTime;
        this._animate(this.lastTime);
    }

    switchState(state) {
        // 离开旧状态
        this.onLeaveState(this.currentState);

        // 清理通用状态
        this.whisperUI?.classList.remove('visible');
        this.ripples.forEach(r => r.classList.remove('active'));

        // 更新按钮
        document.querySelectorAll('.debug-btn').forEach(b => b.classList.remove('active'));

        if (state === 'reset') state = 'idle';
        this.currentState = state;

        // 高亮对应按钮
        const btnMap = { idle: 'btnIdle', whisper: 'btnWhisper', call: 'btnCall' };
        const btnId = btnMap[state];
        if (btnId) document.getElementById(btnId)?.classList.add('active');
        // 检查额外按钮
        this.extraButtons.forEach(eb => {
            if (eb.state === state) {
                document.getElementById(eb.id)?.classList.add('active');
            }
        });

        // 通用状态处理
        switch (state) {
            case 'idle':
                this._scheduleNextMicro(4000, 8000);
                break;
            case 'whisper':
                this._triggerWhisper();
                break;
            case 'call':
                this._triggerCall();
                break;
        }

        // 自定义进入状态
        this.onEnterState(state);
    }

    /** 发射拖尾粒子（供微事件等外部调用） */
    emitTrailParticle(burst = false, colorHint = 'default') {
        if (this.trailParticles.length >= this.config.trailMaxParticles && !burst) return;

        const isWhisper = this.currentState === 'whisper' || colorHint === 'whisper';
        const isGold = colorHint === 'gold';

        let hue, sat, light;
        if (isWhisper) {
            hue = this._randomRange(...this.colors.whisperHue);
            sat = this.colors.whisperSat;
            light = this.colors.whisperLight;
        } else if (isGold) {
            hue = this._randomRange(...this.colors.goldHue);
            sat = this.colors.goldSat;
            light = this.colors.goldLight;
        } else {
            hue = this._randomRange(...this.colors.trailHue);
            sat = this.colors.trailSat;
            light = this.colors.trailLight;
        }

        this.trailParticles.push({
            x: this.elX + this._randomRange(-5, 5),
            y: this.elY + this._randomRange(-5, 5),
            vx: this._randomRange(-0.3, 0.3) + (burst ? this._randomRange(-1.2, 1.2) : 0),
            vy: this._randomRange(-0.3, 0.3) + (burst ? this._randomRange(-1.2, 1.2) : 0),
            size: this._randomRange(1, 2.5),
            life: this.config.trailLifespan,
            maxLife: this.config.trailLifespan,
            hue, sat, light,
        });
    }

    /** 批量发射粒子 */
    burstParticles(count = 5, colorHint = 'default') {
        for (let i = 0; i < count; i++) {
            this.emitTrailParticle(true, colorHint);
        }
    }

    // ========== 内部方法 ==========

    _initDOM() {
        this.element = document.getElementById(this.elementId);
        this.whisperUI = document.getElementById('whisperUI');
        this.debugInfo = document.getElementById('debugInfo');
        this.ripples = ['ripple1', 'ripple2', 'ripple3']
            .map(id => document.getElementById(id))
            .filter(Boolean);

        // 绑定按钮事件
        window._proto = this; // for inline onclick
    }

    _initCanvas() {
        this.canvas = document.getElementById('particleCanvas');
        this.ctx = this.canvas.getContext('2d');
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());

        this.elX = this.canvasW * this.config.baseX;
        this.elY = this.canvasH * this.config.baseY;
    }

    _resizeCanvas() {
        this.canvasW = window.innerWidth;
        this.canvasH = window.innerHeight;
        this.canvas.width = this.canvasW * window.devicePixelRatio;
        this.canvas.height = this.canvasH * window.devicePixelRatio;
        this.canvas.style.width = this.canvasW + 'px';
        this.canvas.style.height = this.canvasH + 'px';
        this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    _initAmbientDust() {
        for (let i = 0; i < this.config.ambientParticles; i++) {
            this.ambientDust.push({
                x: this._randomRange(0, this.canvasW),
                y: this._randomRange(0, this.canvasH),
                size: this._randomRange(0.5, 2),
                phase: Math.random() * Math.PI * 2,
                speed: this._randomRange(0.0003, 0.0008),
                baseAlpha: this._randomRange(0.04, 0.12),
                twinkleSpeed: this._randomRange(0.001, 0.003),
            });
        }
    }

    _scheduleNextMicro(minMs, maxMs) {
        this.nextMicroEvent = performance.now() + this._randomRange(
            minMs || this.config.microEventMinInterval,
            maxMs || this.config.microEventMaxInterval
        );
    }

    // ---- Animation loop ----

    _animate(timestamp) {
        requestAnimationFrame(t => this._animate(t));

        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // FPS
        this.frameCount++;
        if (timestamp - this.fpsTime >= 1000) {
            if (this.debugInfo) {
                this.debugInfo.textContent = `FPS: ${this.frameCount} | Particles: ${this.trailParticles.length + this.ambientDust.length} | State: ${this.currentState}`;
            }
            this.frameCount = 0;
            this.fpsTime = timestamp;
        }

        // Clear
        this.ctx.clearRect(0, 0, this.canvasW, this.canvasH);

        // Float
        this._updateFloat(timestamp);

        // Micro events (idle only)
        if (this.currentState === 'idle') {
            this._updateMicroEvents(timestamp);
        }

        // Particles
        this._updateTrailParticles(dt);
        this._updateAmbientDust(timestamp);
        this._drawParticles(timestamp);

        // Position DOM
        const offset = this.elementSize / 2;
        this.element.style.left = (this.elX - offset) + 'px';
        this.element.style.top = (this.elY - offset) + 'px';
    }

    _updateFloat(time) {
        const c = this.config;
        const baseX = this.canvasW * c.baseX;
        const baseY = this.canvasH * c.baseY;

        const dx = Math.sin(time * c.floatFreqX) * c.floatAmplitudeX
            + Math.sin(time * c.floatSecondaryX) * c.floatSecondaryAmpX;
        const dy = Math.sin(time * c.floatFreqY) * c.floatAmplitudeY
            + Math.cos(time * c.floatSecondaryY) * c.floatSecondaryAmpY;

        this.elX = baseX + dx;
        this.elY = baseY + dy;
    }

    _updateMicroEvents(timestamp) {
        if (this.microEvents.length === 0) return;
        if (timestamp >= this.nextMicroEvent && !this.microEventActive) {
            const event = this._weightedRandom(this.microEvents);
            this.microEventActive = true;
            event.fn(() => {
                this.microEventActive = false;
                this._scheduleNextMicro();
            }, this);
        }
    }

    // ---- Particles ----

    _updateTrailParticles(dt) {
        if (Math.random() < this.config.trailEmitChance) {
            this.emitTrailParticle();
        }
        if (this.currentState === 'whisper' && Math.random() < 0.5) {
            this.emitTrailParticle(false, 'whisper');
        }
        if (this.currentState === 'call' && Math.random() < 0.6) {
            this.emitTrailParticle();
        }

        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.trailParticles.splice(i, 1);
                continue;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.003;
            p.vx *= 0.995;
            p.vy *= 0.995;
        }
    }

    _updateAmbientDust(time) {
        this.ambientDust.forEach(d => {
            d.x += Math.sin(time * d.speed + d.phase) * 0.12;
            d.y += Math.cos(time * d.speed * 0.7 + d.phase) * 0.08;
            if (d.x < 0) d.x = this.canvasW;
            if (d.x > this.canvasW) d.x = 0;
            if (d.y < 0) d.y = this.canvasH;
            if (d.y > this.canvasH) d.y = 0;
        });
    }

    _drawParticles(timestamp) {
        const ctx = this.ctx;

        // Ambient dust
        this.ambientDust.forEach(d => {
            const twinkle = 0.5 + 0.5 * Math.sin(timestamp * d.twinkleSpeed + d.phase);
            const alpha = d.baseAlpha * twinkle;

            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.colors.dustRGB}, ${alpha})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size * 3.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.colors.dustGlowRGB}, ${alpha * 0.15})`;
            ctx.fill();
        });

        // Trail particles
        this.trailParticles.forEach(p => {
            const lifeRatio = p.life / p.maxLife;
            const alpha = lifeRatio * 0.7;
            const size = p.size * (0.3 + lifeRatio * 0.7);

            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.15})`;
            ctx.fill();
        });
    }

    // ---- State triggers ----

    _triggerWhisper() {
        this.ripples.forEach(r => r.classList.add('active'));
        setTimeout(() => {
            this.whisperUI?.classList.add('visible');
        }, 1500);
    }

    _triggerCall() {
        for (let i = 0; i < 10; i++) {
            setTimeout(() => this.emitTrailParticle(true), i * 100);
        }
    }

    // ---- Utilities ----

    _randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    _weightedRandom(items) {
        const total = items.reduce((s, i) => s + i.weight, 0);
        let r = Math.random() * total;
        for (const item of items) {
            r -= item.weight;
            if (r <= 0) return item;
        }
        return items[items.length - 1];
    }
}

// ========== 全局便捷函数（供 HTML onclick 调用） ==========

function switchState(state) {
    window._proto?.switchState(state);
}

function dismissWhisper() {
    window._proto?.switchState('idle');
}

function enterListening() {
    document.getElementById('whisperUI')?.classList.remove('visible');
    setTimeout(() => window._proto?.switchState('idle'), 2000);
}
