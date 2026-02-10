/**
 * PrototypeBase — 原型共享引擎 v2
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
 *       // ★ v2新增：几何发射器（可选，不提供则回退到中心喷射）
 *       emitters: {
 *           svgViewBox: 56,     // SVG viewBox 尺寸，用于坐标映射
 *           edges: [            // 边轨道
 *               { from: [28,10], to: [42,44] },
 *           ],
 *           arcs: [             // 圆弧轨道
 *               { cx: 28, cy: 32, r: 10.5 },
 *           ],
 *           vertices: [         // 顶点/交点发射器
 *               [28,10], [42,44], [14,44],
 *           ],
 *       },
 *
 *       // 微事件列表
 *       microEvents: [
 *           { name: 'spin', weight: 40, fn(done, proto) { ... } },
 *       ],
 *
 *       // 状态变化回调
 *       onEnterState(state) { },
 *       onLeaveState(state) { },
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

        // ★ 几何发射器（v2新增）
        this.emitters = options.emitters || null;

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
        this.orbitParticles = [];    // v2: 轨道粒子
        this.spiralParticles = [];   // v2: 螺旋粒子
        this.radiantLines = [];      // v2: 辐射线
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

        // ★ v2: 若配置了顶点发射器，从顶点发射而非中心
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

    // ========== v2: 新粒子类型 ==========

    /** 发射轨道粒子 — 沿几何边缘/圆弧滑行 */
    _emitOrbitParticle(colorHint = 'default') {
        if (!this.emitters) return;
        if (this.orbitParticles.length >= 15) return;

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

        // 随机选一条边或一段弧
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
            // 边轨道粒子
            const edge = edges[pick];
            const t0 = Math.random(); // 起始位置 0~1
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
            // 弧轨道粒子
            const arc = arcs[pick - edges.length];
            const angle0 = Math.random() * Math.PI * 2;
            const dir = Math.random() < 0.5 ? 1 : -1;

            this.orbitParticles.push({
                kind: 'arc',
                arc,
                angle: angle0,
                speed: speed * dir * 3, // 角速度
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
        if (this.spiralParticles.length >= 8) return;

        const lifespan = this._randomRange(2500, 4000);
        this.spiralParticles.push({
            angle: Math.random() * Math.PI * 2,
            radius: this._randomRange(5, 15),
            radiusGrowth: this._randomRange(0.3, 0.8),
            angularSpeed: this._randomRange(0.02, 0.04) * (Math.random() < 0.5 ? 1 : -1),
            yOffset: 0,
            ySpeed: this._randomRange(-0.4, -0.8), // 向上漂升
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
        if (this.radiantLines.length >= 6) return;

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
        const shapes = ['circle', 'diamond', 'cross'];
        for (let i = 0; i < this.config.ambientParticles; i++) {
            this.ambientDust.push({
                x: this._randomRange(0, this.canvasW),
                y: this._randomRange(0, this.canvasH),
                size: this._randomRange(0.5, 2),
                phase: Math.random() * Math.PI * 2,
                speed: this._randomRange(0.0003, 0.0008),
                baseAlpha: this._randomRange(0.04, 0.12),
                twinkleSpeed: this._randomRange(0.001, 0.003),
                // v2: 形状多样化
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

    // ---- SVG 坐标 → 屏幕坐标 映射 ----

    _mapSvgToScreen(svgX, svgY) {
        if (!this.emitters) return { x: this.elX, y: this.elY };
        const viewBox = this.emitters.svgViewBox || 56;
        const domSize = this.elementSize;
        const scale = domSize / viewBox;
        // SVG中心 → 元素中心
        const centerSvg = viewBox / 2;
        return {
            x: this.elX + (svgX - centerSvg) * scale,
            y: this.elY + (svgY - centerSvg) * scale,
        };
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
                const totalP = this.trailParticles.length + this.orbitParticles.length
                    + this.spiralParticles.length + this.radiantLines.length
                    + this.ambientDust.length;
                this.debugInfo.textContent = `FPS: ${this.frameCount} | Particles: ${totalP} | State: ${this.currentState}`;
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

        // ★ v2: 发射各类粒子
        this._emitParticlesForState(timestamp);

        // Update all particle types
        this._updateTrailParticles(dt);
        this._updateOrbitParticles(dt);
        this._updateSpiralParticles(dt);
        this._updateRadiantLines(dt);
        this._updateAmbientDust(timestamp);

        // Draw all
        this._drawParticles(timestamp);

        // Position DOM
        const offset = this.elementSize / 2;
        this.element.style.left = (this.elX - offset) + 'px';
        this.element.style.top = (this.elY - offset) + 'px';
    }

    /** ★ v2: 根据状态控制粒子发射频率 */
    _emitParticlesForState(timestamp) {
        const hasEmitters = !!this.emitters;

        // 拖尾粒子（所有状态）
        if (Math.random() < this.config.trailEmitChance * 0.6) {
            this.emitTrailParticle();
        }

        // 轨道粒子（有发射器时）
        if (hasEmitters) {
            const orbitChance = this.currentState === 'call' ? 0.08
                : this.currentState === 'whisper' ? 0.05
                    : 0.025;
            if (Math.random() < orbitChance) {
                this._emitOrbitParticle(
                    this.currentState === 'whisper' ? 'whisper'
                        : this.currentState === 'call' ? 'gold' : 'default'
                );
            }
        }

        // 螺旋粒子（低语态专用）
        if (this.currentState === 'whisper' && hasEmitters) {
            if (Math.random() < 0.04) {
                this._emitSpiralParticle();
            }
        }

        // 辐射线（来电态专用）
        if (this.currentState === 'call' && hasEmitters) {
            if (Math.random() < 0.06) {
                this._emitRadiantLine();
            }
        }

        // 低语态额外拖尾
        if (this.currentState === 'whisper' && Math.random() < 0.3) {
            this.emitTrailParticle(false, 'whisper');
        }
        // 来电态额外拖尾
        if (this.currentState === 'call' && Math.random() < 0.4) {
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

    // ---- Particle Updates ----

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
                // 边上循环
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
            // 内径缓慢追赶外径
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
            if (d.x < 0) d.x = this.canvasW;
            if (d.x > this.canvasW) d.x = 0;
            if (d.y < 0) d.y = this.canvasH;
            if (d.y > this.canvasH) d.y = 0;
        });
    }

    // ---- Drawing ----

    _drawParticles(timestamp) {
        const ctx = this.ctx;

        // 1. 环境星尘
        this._drawAmbientDust(ctx, timestamp);

        // 2. 轨道粒子（含拖尾）
        this._drawOrbitParticles(ctx);

        // 3. 螺旋粒子
        this._drawSpiralParticles(ctx);

        // 4. 辐射线
        this._drawRadiantLines(ctx);

        // 5. 拖尾粒子
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
                // 菱形
                const s = d.size * 1.5;
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.6, 0);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.6, 0);
                ctx.closePath();
                ctx.fillStyle = `rgba(${this.colors.dustRGB}, ${alpha})`;
                ctx.fill();

                // 辉光
                ctx.beginPath();
                ctx.arc(0, 0, d.size * 3.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.colors.dustGlowRGB}, ${alpha * 0.12})`;
                ctx.fill();
            } else if (d.shape === 'cross') {
                // 十字
                const s = d.size * 1.2;
                const w = d.size * 0.3;
                ctx.fillStyle = `rgba(${this.colors.dustRGB}, ${alpha})`;
                ctx.fillRect(-w, -s, w * 2, s * 2);
                ctx.fillRect(-s, -w, s * 2, w * 2);

                // 辉光
                ctx.beginPath();
                ctx.arc(0, 0, d.size * 3.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.colors.dustGlowRGB}, ${alpha * 0.12})`;
                ctx.fill();
            } else {
                // 默认圆形
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
            // 计算当前屏幕坐标
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

            // 拖尾（短历史轨迹模拟）
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

            // 主体
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            ctx.fill();

            // 辉光
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

            // 主体
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            ctx.fill();

            // 辉光
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

            // 线头光点
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

    // ---- State triggers ----

    _triggerWhisper() {
        this.ripples.forEach(r => r.classList.add('active'));
        setTimeout(() => {
            this.whisperUI?.classList.add('visible');
        }, 1500);
    }

    _triggerCall() {
        // 顶点全爆发
        for (let i = 0; i < 12; i++) {
            setTimeout(() => this.emitTrailParticle(true, 'gold'), i * 80);
        }
        // 初始辐射线一波
        if (this.emitters) {
            for (let i = 0; i < 4; i++) {
                setTimeout(() => this._emitRadiantLine(), i * 150);
            }
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
