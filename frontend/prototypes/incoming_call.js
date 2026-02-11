/**
 * IncomingCallAnimation — 来电守护神全屏动画
 *
 * 依赖: base.js (PrototypeBase)
 * 
 * 阶段状态机:
 *   idle → omen → gathering → patronus → transition → active_call → dispersing → idle
 */

// ========================================
// 1. 牡鹿轮廓坐标（归一化 0~1）
//    运行时映射到屏幕中心区域
// ========================================
const STAG_POINTS = (() => {
    // 抽象牡鹿轮廓 — 约50个采样点
    // 坐标系: x=0~1 (左→右), y=0~1 (上→下)
    // 中心约 (0.5, 0.5)

    const raw = [
        // --- 鹿角（左） ---
        [0.38, 0.12], [0.34, 0.08], [0.30, 0.05],  // 左外枝
        [0.36, 0.15], [0.32, 0.13],                  // 左内枝
        [0.40, 0.18],                                 // 角根左

        // --- 鹿角（右） ---
        [0.62, 0.12], [0.66, 0.08], [0.70, 0.05],  // 右外枝
        [0.64, 0.15], [0.68, 0.13],                  // 右内枝
        [0.60, 0.18],                                 // 角根右

        // --- 头部 ---
        [0.50, 0.20],  // 头顶
        [0.46, 0.24], [0.54, 0.24],  // 耳
        [0.50, 0.28],  // 鼻

        // --- 颈部 ---
        [0.47, 0.30], [0.53, 0.30],
        [0.44, 0.35], [0.52, 0.34],

        // --- 身体弧线（背部） ---
        [0.42, 0.38], [0.44, 0.40], [0.48, 0.42],
        [0.52, 0.43], [0.56, 0.44], [0.60, 0.45],
        [0.63, 0.46],

        // --- 身体弧线（腹部） ---
        [0.45, 0.52], [0.48, 0.54], [0.52, 0.55],
        [0.56, 0.54], [0.60, 0.52],

        // --- 前腿（左前） ---
        [0.42, 0.48], [0.40, 0.56], [0.39, 0.64],
        [0.40, 0.70],

        // --- 前腿（右前） ---
        [0.47, 0.48], [0.46, 0.56], [0.45, 0.64],
        [0.46, 0.70],

        // --- 后腿（左后） ---
        [0.58, 0.50], [0.57, 0.58], [0.56, 0.65],
        [0.57, 0.72],

        // --- 后腿（右后） ---
        [0.63, 0.48], [0.64, 0.56], [0.65, 0.64],
        [0.64, 0.72],

        // --- 尾巴 ---
        [0.66, 0.44], [0.70, 0.42], [0.72, 0.40],
    ];

    return raw;
})();

// ========================================
// 2. 全屏粒子系统
// ========================================
class PatronusParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.phase = 'idle'; // idle | gathering | formed | dispersing
        this.centerX = 0;
        this.centerY = 0;
        this.stagTargets = [];  // 屏幕坐标的牡鹿目标点
        this.pensieveRadius = 110;
        this._resize();
        window.addEventListener('resize', () => this._resize());
    }

    _resize() {
        const dpr = window.devicePixelRatio;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this._computeStagTargets();
    }

    _computeStagTargets() {
        // 将归一化坐标映射到屏幕中心区域
        const size = Math.min(this.width, this.height) * 0.55;
        const ox = this.centerX - size / 2;
        const oy = this.centerY - size / 2 - this.height * 0.05;  // 偏上一点
        this.stagTargets = STAG_POINTS.map(([nx, ny]) => ({
            x: ox + nx * size,
            y: oy + ny * size,
        }));
    }

    // --- 生成粒子 ---
    spawnGatheringParticles(count = 250) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            // 随机生成位置（从屏幕边缘）
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            switch (edge) {
                case 0: x = Math.random() * this.width; y = -20; break;
                case 1: x = this.width + 20; y = Math.random() * this.height; break;
                case 2: x = Math.random() * this.width; y = this.height + 20; break;
                case 3: x = -20; y = Math.random() * this.height; break;
            }

            // 分配目标点（多个粒子可共享同一个目标点）
            const targetIdx = i % this.stagTargets.length;
            const target = this.stagTargets[targetIdx];

            this.particles.push({
                x, y,
                targetX: target.x,
                targetY: target.y,
                vx: 0, vy: 0,
                size: 1 + Math.random() * 2,
                baseSize: 1 + Math.random() * 2,
                alpha: 0.3 + Math.random() * 0.5,
                hue: 220 + Math.random() * 30,  // 银蓝色
                sat: 15 + Math.random() * 20,
                light: 75 + Math.random() * 20,
                noisePhase: Math.random() * Math.PI * 2,
                noiseSpeed: 0.002 + Math.random() * 0.003,
                noiseAmp: 1.5 + Math.random() * 3,
                arrived: false,
                delay: Math.random() * 1500,  // 延迟开始汇聚
                age: 0,
            });
        }
    }

    // --- 更新 ---
    update(dt, timestamp) {
        const strength = 0.03;  // 吸引力强度

        for (const p of this.particles) {
            p.age += dt;

            if (this.phase === 'gathering' || this.phase === 'formed') {
                if (p.age < p.delay) continue;  // 还在延迟中

                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 2) {
                    // 向目标吸引
                    const s = this.phase === 'gathering' ? strength : strength * 0.5;
                    p.vx += (dx / dist) * s * (dt / 16);
                    p.vy += (dy / dist) * s * (dt / 16);
                    p.arrived = false;
                } else {
                    p.arrived = true;
                }

                // 到达后微弱振荡
                if (p.arrived) {
                    const noise = Math.sin(timestamp * p.noiseSpeed + p.noisePhase) * p.noiseAmp;
                    const noise2 = Math.cos(timestamp * p.noiseSpeed * 1.3 + p.noisePhase) * p.noiseAmp;
                    p.x = p.targetX + noise;
                    p.y = p.targetY + noise2;
                    p.vx = 0;
                    p.vy = 0;
                } else {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vx *= 0.95;
                    p.vy *= 0.95;
                }
            } else if (this.phase === 'transition') {
                // 向中心坍缩
                const dx = this.centerX - p.x;
                const dy = this.centerY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > this.pensieveRadius * 0.8) {
                    p.vx += (dx / dist) * 0.08 * (dt / 16);
                    p.vy += (dy / dist) * 0.08 * (dt / 16);
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vx *= 0.92;
                    p.vy *= 0.92;
                } else {
                    // 到达冥想盆范围，围绕旋转
                    const angle = Math.atan2(p.y - this.centerY, p.x - this.centerX);
                    const r = dist;
                    const newAngle = angle + 0.02;
                    p.x = this.centerX + Math.cos(newAngle) * r * 0.98;
                    p.y = this.centerY + Math.sin(newAngle) * r * 0.98;
                    p.alpha *= 0.995;
                }
            } else if (this.phase === 'dispersing') {
                // 向外扩散
                const dx = p.x - this.centerX;
                const dy = p.y - this.centerY;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                p.vx += (dx / dist) * 0.05 * (dt / 16);
                p.vy += (dy / dist) * 0.05 * (dt / 16);
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.003 * (dt / 16);
                if (p.alpha < 0) p.alpha = 0;
            }

            // 大小脉冲
            p.size = p.baseSize * (0.8 + 0.4 * Math.sin(timestamp * 0.003 + p.noisePhase));
        }

        // 移除完全透明的粒子
        if (this.phase === 'dispersing') {
            this.particles = this.particles.filter(p => p.alpha > 0.01);
        }
    }

    // --- 绘制 ---
    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        for (const p of this.particles) {
            if (p.age < p.delay && this.phase === 'gathering') continue;
            if (p.alpha <= 0) continue;

            const alpha = Math.min(p.alpha, 0.85);

            // 主体
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            this.ctx.fill();

            // 辉光
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.1})`;
            this.ctx.fill();
        }
    }

    clear() {
        this.particles = [];
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
}

// ========================================
// 3. 动画阶段管理器
// ========================================
class IncomingCallAnimation {
    constructor() {
        // DOM 引用
        this.dhContainer = document.getElementById('dhContainer');
        this.overlay = document.getElementById('fullscreenOverlay');
        this.silverMist = document.getElementById('silverMist');
        this.callInfo = document.getElementById('callInfo');
        this.callButtons = document.getElementById('callButtons');
        this.pensieveContainer = document.getElementById('pensieveContainer');
        this.subtitleArea = document.getElementById('subtitleArea');
        this.subtitleText = document.getElementById('subtitleText');
        this.debugInfo = document.getElementById('debugInfo');

        // 粒子系统
        const canvas = document.getElementById('patronusCanvas');
        this.patronus = new PatronusParticleSystem(canvas);

        // 状态
        this.currentPhase = 'idle';
        this.phaseTimers = [];
        this.animating = false;
        this.lastTime = 0;
        this.frameCount = 0;
        this.fpsTime = 0;

        // 字幕演示数据
        this.demoSubtitles = [
            '你不必害怕黑暗……',
            '因为光明从未真正离开。',
            '它只是在等待你的召唤。',
        ];
        this.currentSubIdx = 0;
        this.subtitleTimer = null;

        // 启动动画循环
        this._startLoop();
    }

    // --- 动画循环 ---
    _startLoop() {
        this.lastTime = performance.now();
        this.fpsTime = this.lastTime;
        const loop = (timestamp) => {
            requestAnimationFrame(loop);
            const dt = timestamp - this.lastTime;
            this.lastTime = timestamp;

            // FPS
            this.frameCount++;
            if (timestamp - this.fpsTime >= 1000) {
                if (this.debugInfo) {
                    this.debugInfo.textContent = `FPS: ${this.frameCount} | Particles: ${this.patronus.particles.length} | Phase: ${this.currentPhase}`;
                }
                this.frameCount = 0;
                this.fpsTime = timestamp;
            }

            // 粒子更新与绘制
            if (this.patronus.phase !== 'idle') {
                this.patronus.update(dt, timestamp);
                this.patronus.draw();
            }
        };
        requestAnimationFrame(loop);
    }

    // --- 阶段切换 ---
    enterPhase(phase) {
        // 清理所有待执行的定时器
        this.phaseTimers.forEach(t => clearTimeout(t));
        this.phaseTimers = [];
        if (this.subtitleTimer) { clearInterval(this.subtitleTimer); this.subtitleTimer = null; }

        this.currentPhase = phase;
        console.log(`[Phase] → ${phase}`);

        switch (phase) {
            case 'idle': this._phaseIdle(); break;
            case 'omen': this._phaseOmen(); break;
            case 'gathering': this._phaseGathering(); break;
            case 'patronus': this._phasePatronus(); break;
            case 'transition': this._phaseTransition(); break;
            case 'active_call': this._phaseActiveCall(); break;
            case 'dispersing': this._phaseDispersing(); break;
        }

        // 更新 debug 按钮
        document.querySelectorAll('.debug-btn').forEach(b => b.classList.remove('active'));
        const btnMap = {
            idle: 'btnIdle', omen: 'btnCall', gathering: 'btnCall',
            patronus: 'btnCall', active_call: 'btnActive', dispersing: 'btnEnd',
        };
        const btn = document.getElementById(btnMap[phase]);
        if (btn) btn.classList.add('active');
    }

    // --- 各阶段实现 ---

    _phaseIdle() {
        this.dhContainer.className = 'proto-element dh-container';
        this.overlay.classList.remove('visible');
        this.silverMist.classList.remove('active');
        this.callInfo.classList.remove('visible');
        this.callButtons.classList.remove('visible');
        this.pensieveContainer.classList.remove('visible');
        this.subtitleArea.classList.remove('visible');
        this.patronus.phase = 'idle';
        this.patronus.clear();
        this.currentSubIdx = 0;
    }

    _phaseOmen() {
        // 符文剧烈发光
        this.dhContainer.className = 'proto-element dh-container omen';

        // 0.3s 后显示 overlay + 银雾
        this._delay(300, () => {
            this.overlay.classList.add('visible');
            this.silverMist.classList.add('active');
        });

        // 1s 后自动进入 gathering
        this._delay(1000, () => {
            this.enterPhase('gathering');
        });
    }

    _phaseGathering() {
        // 符文淡出
        this.dhContainer.classList.add('fade-out');

        // 生成粒子并启动汇聚
        this.patronus.spawnGatheringParticles(250);
        this.patronus.phase = 'gathering';

        // 2.5s 后粒子应大部分到达 → 进入 patronus
        this._delay(3000, () => {
            this.enterPhase('patronus');
        });
    }

    _phasePatronus() {
        this.patronus.phase = 'formed';

        // 显示来电信息
        this._delay(500, () => {
            this._showCallerName('✦ 赫敏·格兰杰 ✦');
            document.getElementById('callerSub').textContent = '';
            this.callInfo.classList.add('visible');
        });

        // 显示副标题
        this._delay(1500, () => {
            this._typeText(document.getElementById('callerSub'),
                '正在通过魔法通讯联络你…', 'caller-sub-char');
        });

        // 显示按钮
        this._delay(2200, () => {
            this.callButtons.classList.add('visible');
        });
    }

    _phaseTransition() {
        // 隐藏来电 UI
        this.callInfo.classList.remove('visible');
        this.callButtons.classList.remove('visible');

        // 粒子向中心坍缩
        this.patronus.phase = 'transition';

        // 1.5s 后显示冥想盆
        this._delay(1500, () => {
            this.enterPhase('active_call');
        });
    }

    _phaseActiveCall() {
        // 清除残余粒子
        this.patronus.phase = 'idle';
        this.patronus.clear();

        // 显示冥想盆
        this.pensieveContainer.classList.add('visible');

        // 显示字幕
        this._delay(800, () => {
            this.subtitleArea.classList.add('visible');
            this._startSubtitleDemo();
        });
    }

    _phaseDispersing() {
        // 隐藏 UI
        this.pensieveContainer.classList.remove('visible');
        this.subtitleArea.classList.remove('visible');

        // 生成少量粒子从中心向外扩散
        this.patronus.spawnGatheringParticles(80);
        // 将所有粒子放在中心
        for (const p of this.patronus.particles) {
            p.x = this.patronus.centerX + (Math.random() - 0.5) * 60;
            p.y = this.patronus.centerY + (Math.random() - 0.5) * 60;
            p.delay = 0;
            p.age = 1000;
        }
        this.patronus.phase = 'dispersing';

        // 2s 后回到 idle
        this._delay(2500, () => {
            this.enterPhase('idle');
        });
    }

    // --- 工具方法 ---

    _delay(ms, fn) {
        this.phaseTimers.push(setTimeout(fn, ms));
    }

    _showCallerName(text) {
        const el = document.getElementById('callerNameText');
        el.innerHTML = '';
        [...text].forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'char-reveal';
            span.textContent = char === ' ' ? '\u00a0' : char;
            span.style.animationDelay = `${i * 0.06}s`;
            el.appendChild(span);
        });
    }

    _typeText(el, text, className) {
        el.innerHTML = '';
        [...text].forEach((char, i) => {
            const span = document.createElement('span');
            span.className = className || 'char-reveal';
            span.textContent = char === ' ' ? '\u00a0' : char;
            span.style.animationDelay = `${i * 0.05}s`;
            el.appendChild(span);
        });
    }

    _startSubtitleDemo() {
        this.currentSubIdx = 0;
        this._showNextSubtitle();
    }

    _showNextSubtitle() {
        if (this.currentPhase !== 'active_call') return;
        if (this.currentSubIdx >= this.demoSubtitles.length) {
            this.currentSubIdx = 0;  // 循环
        }

        const text = this.demoSubtitles[this.currentSubIdx];
        this.subtitleText.innerHTML = '';

        [...text].forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'sub-char';
            span.textContent = char === ' ' ? '\u00a0' : char;
            span.style.animationDelay = `${i * 0.06}s`;
            this.subtitleText.appendChild(span);
        });

        this.currentSubIdx++;
        const displayTime = text.length * 60 + 2000;

        this.subtitleTimer = setTimeout(() => {
            // 淡出当前字幕，显示下一条
            this.subtitleText.style.opacity = '0';
            setTimeout(() => {
                this.subtitleText.style.opacity = '1';
                this._showNextSubtitle();
            }, 500);
        }, displayTime);
    }
}

// ========================================
// 4. 初始化 + 全局控制函数
// ========================================
let anim;

function initAnimation() {
    anim = new IncomingCallAnimation();
}

// Debug 控制
function triggerIncomingCall() {
    anim.enterPhase('omen');
}

function jumpToActive() {
    // 跳过过渡动画，直接进入通话
    anim.dhContainer.className = 'proto-element dh-container fade-out';
    anim.overlay.classList.add('visible');
    anim.silverMist.classList.add('active');
    anim.enterPhase('active_call');
}

function endCall() {
    anim.enterPhase('dispersing');
}

function acceptCall() {
    anim.enterPhase('transition');
}

function declineCall() {
    anim.enterPhase('idle');
}

function resetAll() {
    anim.enterPhase('idle');
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', initAnimation);
