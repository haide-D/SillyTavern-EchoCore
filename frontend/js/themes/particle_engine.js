/**
 * ParticleEngine — 基于 PrototypeBase 的通用粒子渲染器
 */
export class ParticleEngine {
    constructor(options = {}) {
        // --- 合并配置 ---
        this.elementId = options.elementId || 'protoElement';
        this.canvasId = options.canvasId || 'particleCanvas';
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

        // ★ 几何发射器
        this.emitters = options.emitters || null;

        // 微事件
        this.microEvents = options.microEvents || [];

        // 回调
        this.onEnterState = options.onEnterState || (() => { });
        this.onLeaveState = options.onLeaveState || (() => { });

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
        this.orbitParticles = [];
        this.spiralParticles = [];
        this.radiantLines = [];
        this.ambientDust = [];
        this.canvas = null;
        this.ctx = null;
        this.canvasW = 0;
        this.canvasH = 0;
        this.animationFrameId = null;

        // DOM refs
        this.element = null;
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
    
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
    }

    switchState(state) {
        // 离开旧状态
        this.onLeaveState(this.currentState);

        if (state === 'reset') state = 'idle';
        this.currentState = state;

        // 通用状态处理
        switch (state) {
            case 'idle':
                // 清理低语/来电专属粒子
                this.spiralParticles.length = 0;
                this.radiantLines.length = 0;
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

        let spawnX = this.elX;
        let spawnY = this.elY;
        let vx = this._randomRange(-0.3, 0.3);
        let vy = this._randomRange(-0.3, 0.3);

        if (this.emitters && this.emitters.vertices && this.emitters.vertices.length > 0) {
            const vtx = this.emitters.vertices[
                Math.floor(Math.random() * this.emitters.vertices.length)
            ];
            const mapped = this._mapSvgToScreen(vtx[0], vtx[1]);
            spawnX = mapped.x;
            spawnY = mapped.y;

            // 从顶点向外发射，方向远离中心
            const dx = spawnX - this.elX;
            const dy = spawnY - this.elY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = burst ? this._randomRange(1.0, 2.5) : this._randomRange(0.3, 0.8);
            vx = (dx / dist) * speed + this._randomRange(-0.3, 0.3);
            vy = (dy / dist) * speed + this._randomRange(-0.3, 0.3);
        } else if (burst) {
            vx += this._randomRange(-1.2, 1.2);
            vy += this._randomRange(-1.2, 1.2);
        }

        this.trailParticles.push({
            x: spawnX + this._randomRange(-2, 2),
            y: spawnY + this._randomRange(-2, 2),
            vx, vy,
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

    // ========== 新粒子类型 ==========

    /** 发射轨道粒子 — 沿几何边缘/圆弧滑行 */
    _emitOrbitParticle(colorHint = 'default') {
        if (!this.emitters) return;
        if (this.orbitParticles.length >= 8) return;

        const isWhisper = this.currentState === 'whisper' || colorHint === 'whisper';
        const isGold = colorHint === 'gold';
        const isCall = this.currentState === 'call';

        let hue, sat, light;
        if (isWhisper) {
            hue = this._randomRange(...this.colors.whisperHue);
            sat = this.colors.whisperSat + 10;
            light = this.colors.whisperLight + 10;
        } else if (isGold || isCall) {
            hue = this._randomRange(...this.colors.goldHue);
            sat = this.colors.goldSat + 10;
            light = isCall ? 85 : this.colors.goldLight;
        } else {
            hue = this._randomRange(...this.colors.trailHue);
            sat = this.colors.trailSat;
            light = this.colors.trailLight;
        }

        const edges = this.emitters.edges || [];
        const arcs = this.emitters.arcs || [];
        const totalPaths = edges.length + arcs.length;
        if (totalPaths === 0) return;

        const pick = Math.floor(Math.random() * totalPaths);
        const lifespan = this._randomRange(2000, 4000);
        const speed = isCall ? this._randomRange(0.012, 0.025)
            : isWhisper ? this._randomRange(0.008, 0.016)
                : this._randomRange(0.004, 0.01);

        if (pick < edges.length) {
            const edge = edges[pick];
            const t0 = Math.random();
            const dir = Math.random() < 0.5 ? 1 : -1;

            this.orbitParticles.push({
                kind: 'edge',
                edge,
                t: t0,
                speed: speed * dir,
                size: this._randomRange(1.2, 2.2),
                life: lifespan,
                maxLife: lifespan,
                hue, sat, light,
                tailLength: this._randomRange(3, 6),
            });
        } else {
            const arc = arcs[pick - edges.length];
            const angle0 = Math.random() * Math.PI * 2;
            const dir = Math.random() < 0.5 ? 1 : -1;

            this.orbitParticles.push({
                kind: 'arc',
                arc,
                angle: angle0,
                speed: speed * dir * 3,
                size: this._randomRange(1.2, 2.2),
                life: lifespan,
                maxLife: lifespan,
                hue, sat, light,
                tailLength: this._randomRange(3, 6),
            });
        }
    }

    /** 发射螺旋粒子 — 低语态专用 */
    _emitSpiralParticle() {
        if (this.spiralParticles.length >= 5) return;

        const lifespan = this._randomRange(2500, 4000);
        this.spiralParticles.push({
            angle: Math.random() * Math.PI * 2,
            radius: this._randomRange(5, 15),
            radiusGrowth: this._randomRange(0.3, 0.8),
            angularSpeed: this._randomRange(0.02, 0.04) * (Math.random() < 0.5 ? 1 : -1),
            yOffset: 0,
            ySpeed: this._randomRange(-0.4, -0.8),
            size: this._randomRange(1, 2),
            life: lifespan,
            maxLife: lifespan,
            hue: this._randomRange(...this.colors.whisperHue),
            sat: this.colors.whisperSat + 15,
            light: this.colors.whisperLight + 15,
        });
    }

    /** 发射辐射线 — 来电态专用 */
    _emitRadiantLine() {
        if (this.radiantLines.length >= 4) return;

        const angle = Math.random() * Math.PI * 2;
        const lifespan = this._randomRange(400, 800);
        this.radiantLines.push({
            angle,
            innerR: 8,
            outerR: 8,
            growSpeed: this._randomRange(2.5, 5),
            maxOuterR: this._randomRange(50, 100),
            life: lifespan,
            maxLife: lifespan,
            hue: this._randomRange(...this.colors.goldHue),
            sat: 30,
            light: 90,
            width: this._randomRange(0.5, 1.5),
        });
    }

    // ========== 内部方法 ==========

    _initDOM() {
        this.element = document.getElementById(this.elementId);
    }

    _initCanvas() {
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this._resizeCanvas();
        this._resizeHandler = () => this._resizeCanvas();
        window.addEventListener('resize', this._resizeHandler);

        this.elX = this.canvasW * this.config.baseX;
        this.elY = this.canvasH * this.config.baseY;
    }

    _resizeCanvas() {
        if (!this.canvas) return;
        this.canvasW = window.innerWidth;
        this.canvasH = window.innerHeight;
        this.canvas.width = this.canvasW * window.devicePixelRatio;
        this.canvas.height = this.canvasH * window.devicePixelRatio;
        this.canvas.style.width = this.canvasW + 'px';
        this.canvas.style.height = this.canvasH + 'px';
        this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    _initAmbientDust() {
        const shapes = ['circle', 'diamond', 'cross'];
        for (let i = 0; i < this.config.ambientParticles; i++) {
            this.ambientDust.push({
                x: this._randomRange(0, this.canvasW || window.innerWidth),
                y: this._randomRange(0, this.canvasH || window.innerHeight),
                size: this._randomRange(0.5, 2),
                phase: Math.random() * Math.PI * 2,
                speed: this._randomRange(0.0003, 0.0008),
                baseAlpha: this._randomRange(0.04, 0.12),
                twinkleSpeed: this._randomRange(0.001, 0.003),
                shape: this.emitters ? shapes[i % shapes.length] : 'circle',
                rotation: Math.random() * Math.PI,
                rotationSpeed: this._randomRange(-0.0005, 0.0005),
            });
        }
    }

    _scheduleNextMicro(minMs, maxMs) {
        this.nextMicroEvent = performance.now() + this._randomRange(
            minMs || this.config.microEventMinInterval,
            maxMs || this.config.microEventMaxInterval
        );
    }

    _mapSvgToScreen(svgX, svgY) {
        if (!this.emitters) return { x: this.elX, y: this.elY };
        const viewBox = this.emitters.svgViewBox || 56;
        const domSize = this.elementSize;
        const scale = domSize / viewBox;
        const centerSvg = viewBox / 2;
        return {
            x: this.elX + (svgX - centerSvg) * scale,
            y: this.elY + (svgY - centerSvg) * scale,
        };
    }

    _animate(timestamp) {
        this.animationFrameId = requestAnimationFrame(t => this._animate(t));

        if (!this.ctx || !this.canvas) return;

        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.frameCount++;
        if (timestamp - this.fpsTime >= 1000) {
            this.frameCount = 0;
            this.fpsTime = timestamp;
        }

        this.ctx.clearRect(0, 0, this.canvasW, this.canvasH);

        this._updateFloat(timestamp);

        if (this.currentState === 'idle') {
            this._updateMicroEvents(timestamp);
        }

        this._emitParticlesForState(timestamp);

        this._updateTrailParticles(dt);
        this._updateOrbitParticles(dt);
        this._updateSpiralParticles(dt);
        this._updateRadiantLines(dt);
        this._updateAmbientDust(timestamp);

        this._drawParticles(timestamp);

        if (this.element) {
            const offset = this.elementSize / 2;
            this.element.style.left = (this.elX - offset) + 'px';
            this.element.style.top = (this.elY - offset) + 'px';
        }
    }

    _emitParticlesForState(timestamp) {
        const hasEmitters = !!this.emitters;

        if (Math.random() < this.config.trailEmitChance * 0.4) {
            this.emitTrailParticle();
        }

        if (hasEmitters) {
            const orbitChance = this.currentState === 'call' ? 0.04
                : this.currentState === 'whisper' ? 0.03
                    : 0.015;
            if (Math.random() < orbitChance) {
                this._emitOrbitParticle(
                    this.currentState === 'whisper' ? 'whisper'
                        : this.currentState === 'call' ? 'gold' : 'default'
                );
            }
        }

        if (this.currentState === 'whisper' && hasEmitters) {
            if (Math.random() < 0.025) {
                this._emitSpiralParticle();
            }
        }

        if (this.currentState === 'call' && hasEmitters) {
            if (Math.random() < 0.04) {
                this._emitRadiantLine();
            }
        }

        if (this.currentState === 'whisper' && Math.random() < 0.15) {
            this.emitTrailParticle(false, 'whisper');
        }
        if (this.currentState === 'call' && Math.random() < 0.2) {
            this.emitTrailParticle(false, 'gold');
        }
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

    _updateTrailParticles(dt) {
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

    _updateOrbitParticles(dt) {
        for (let i = this.orbitParticles.length - 1; i >= 0; i--) {
            const p = this.orbitParticles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.orbitParticles.splice(i, 1);
                continue;
            }

            if (p.kind === 'edge') {
                p.t += p.speed;
                if (p.t > 1) p.t -= 1;
                if (p.t < 0) p.t += 1;
            } else if (p.kind === 'arc') {
                p.angle += p.speed;
            }
        }
    }

    _updateSpiralParticles(dt) {
        for (let i = this.spiralParticles.length - 1; i >= 0; i--) {
            const p = this.spiralParticles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.spiralParticles.splice(i, 1);
                continue;
            }
            p.angle += p.angularSpeed;
            p.radius += p.radiusGrowth * (dt / 16);
            p.yOffset += p.ySpeed * (dt / 16);
        }
    }

    _updateRadiantLines(dt) {
        for (let i = this.radiantLines.length - 1; i >= 0; i--) {
            const p = this.radiantLines[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.radiantLines.splice(i, 1);
                continue;
            }
            p.outerR += p.growSpeed * (dt / 16);
            if (p.outerR > p.maxOuterR) p.outerR = p.maxOuterR;
            const lifeRatio = p.life / p.maxLife;
            if (lifeRatio < 0.4) {
                p.innerR += p.growSpeed * 0.8 * (dt / 16);
            }
        }
    }

    _updateAmbientDust(time) {
        this.ambientDust.forEach(d => {
            d.x += Math.sin(time * d.speed + d.phase) * 0.12;
            d.y += Math.cos(time * d.speed * 0.7 + d.phase) * 0.08;
            d.rotation += d.rotationSpeed;
            // Wrap around
            if (this.canvasW && d.x % this.canvasW !== d.x) {
               d.x = (d.x + this.canvasW) % this.canvasW;
            }
            if (this.canvasH && d.y % this.canvasH !== d.y) {
               d.y = (d.y + this.canvasH) % this.canvasH;
            }
        });
    }

    _drawParticles(timestamp) {
        const ctx = this.ctx;
        if (!ctx) return;

        this._drawAmbientDust(ctx, timestamp);
        this._drawOrbitParticles(ctx);
        this._drawSpiralParticles(ctx);
        this._drawRadiantLines(ctx);
        this._drawTrailParticles(ctx);
    }

    _drawAmbientDust(ctx, timestamp) {
        this.ambientDust.forEach(d => {
            const twinkle = 0.5 + 0.5 * Math.sin(timestamp * d.twinkleSpeed + d.phase);
            const alpha = d.baseAlpha * twinkle;

            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);

            if (d.shape === 'diamond') {
                const s = d.size * 1.5;
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.6, 0);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.6, 0);
                ctx.closePath();
                ctx.fillStyle = `rgba(${this.colors.dustRGB}, ${alpha})`;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, d.size * 3.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.colors.dustGlowRGB}, ${alpha * 0.12})`;
                ctx.fill();
            } else if (d.shape === 'cross') {
                const s = d.size * 1.2;
                const w = d.size * 0.3;
                ctx.fillStyle = `rgba(${this.colors.dustRGB}, ${alpha})`;
                ctx.fillRect(-w, -s, w * 2, s * 2);
                ctx.fillRect(-s, -w, s * 2, w * 2);

                ctx.beginPath();
                ctx.arc(0, 0, d.size * 3.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.colors.dustGlowRGB}, ${alpha * 0.12})`;
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, d.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.colors.dustRGB}, ${alpha})`;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, d.size * 3.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.colors.dustGlowRGB}, ${alpha * 0.15})`;
                ctx.fill();
            }

            ctx.restore();
        });
    }

    _drawOrbitParticles(ctx) {
        this.orbitParticles.forEach(p => {
            const lifeRatio = p.life / p.maxLife;
            const alpha = lifeRatio * 0.85;
            const size = p.size * (0.4 + lifeRatio * 0.6);

            let x, y;
            if (p.kind === 'edge') {
                const from = this._mapSvgToScreen(p.edge.from[0], p.edge.from[1]);
                const to = this._mapSvgToScreen(p.edge.to[0], p.edge.to[1]);
                x = from.x + (to.x - from.x) * p.t;
                y = from.y + (to.y - from.y) * p.t;
            } else {
                const center = this._mapSvgToScreen(p.arc.cx, p.arc.cy);
                const scale = this.elementSize / (this.emitters.svgViewBox || 56);
                const r = p.arc.r * scale;
                x = center.x + Math.cos(p.angle) * r;
                y = center.y + Math.sin(p.angle) * r;
            }

            const tailSteps = Math.floor(p.tailLength);
            for (let t = tailSteps; t >= 1; t--) {
                const tailAlpha = alpha * (1 - t / (tailSteps + 1)) * 0.4;
                const tailSize = size * (1 - t / (tailSteps + 1)) * 0.7;
                let tx, ty;
                if (p.kind === 'edge') {
                    const backT = p.t - p.speed * t * 3;
                    const clampT = ((backT % 1) + 1) % 1;
                    const from = this._mapSvgToScreen(p.edge.from[0], p.edge.from[1]);
                    const to = this._mapSvgToScreen(p.edge.to[0], p.edge.to[1]);
                    tx = from.x + (to.x - from.x) * clampT;
                    ty = from.y + (to.y - from.y) * clampT;
                } else {
                    const backAngle = p.angle - p.speed * t * 3;
                    const center = this._mapSvgToScreen(p.arc.cx, p.arc.cy);
                    const scale = this.elementSize / (this.emitters.svgViewBox || 56);
                    const r = p.arc.r * scale;
                    tx = center.x + Math.cos(backAngle) * r;
                    ty = center.y + Math.sin(backAngle) * r;
                }
                ctx.beginPath();
                ctx.arc(tx, ty, tailSize, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${tailAlpha})`;
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.12})`;
            ctx.fill();
        });
    }

    _drawSpiralParticles(ctx) {
        this.spiralParticles.forEach(p => {
            const lifeRatio = p.life / p.maxLife;
            const alpha = lifeRatio * 0.7;
            const size = p.size * (0.3 + lifeRatio * 0.7);

            const x = this.elX + Math.cos(p.angle) * p.radius;
            const y = this.elY + Math.sin(p.angle) * p.radius + p.yOffset;

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, size * 4, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.15})`;
            ctx.fill();
        });
    }

    _drawRadiantLines(ctx) {
        this.radiantLines.forEach(p => {
            const lifeRatio = p.life / p.maxLife;
            const alpha = lifeRatio * 0.8;

            const cos = Math.cos(p.angle);
            const sin = Math.sin(p.angle);

            const x1 = this.elX + cos * p.innerR;
            const y1 = this.elY + sin * p.innerR;
            const x2 = this.elX + cos * p.outerR;
            const y2 = this.elY + sin * p.outerR;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            ctx.lineWidth = p.width * lifeRatio;
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x2, y2, p.width * 1.5 * lifeRatio, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.6})`;
            ctx.fill();
        });
    }

    _drawTrailParticles(ctx) {
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

    _triggerWhisper() {
        // 如果外部监听了此事件，可以在 onEnterState 中处理 UI 逻辑
    }

    _triggerCall() {
        for (let i = 0; i < 12; i++) {
            setTimeout(() => this.emitTrailParticle(true, 'gold'), i * 80);
        }
        if (this.emitters) {
            for (let i = 0; i < 4; i++) {
                setTimeout(() => this._emitRadiantLine(), i * 150);
            }
        }
    }

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
