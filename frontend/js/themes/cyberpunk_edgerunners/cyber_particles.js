/**
 * 夜之城·边缘行者 (cyberpunk_edgerunners) - Canvas 赛博光子火花与数据流物理系统
 * 模拟高能等离子火星、垂直数据光流与超频爆发冲击波
 */

export class CyberParticleEngine {
    constructor(options = {}) {
        this.elementId = options.elementId || 'tts-cyber-trigger';
        this.canvasId = options.canvasId || 'cyberParticleCanvas';
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.shockwaves = [];
        this.animId = null;
        this.isRunning = false;
        this.width = 120;
        this.height = 120;
        this.lastSpawn = 0;
        
        // 赛博主色调粒子调色盘
        this.colors = [
            '#FFE600', // 边缘行者明黄
            '#FFF000', // 高光电黄
            '#00F0FF', // 深网赛博青
            '#00FFE0', // 极速青光
            '#FF003C', // 荒坂警报绯红
            '#9D00FF'  // 超梦霓虹紫
        ];
    }

    init() {
        const $parent = $(`#${this.elementId}`);
        if (!$parent.length) return false;

        // 如果已存在 Canvas 则复用或重建
        $(`#${this.canvasId}`).remove();

        const canvasElem = document.createElement('canvas');
        canvasElem.id = this.canvasId;
        canvasElem.style.position = 'absolute';
        canvasElem.style.top = '-28px';
        canvasElem.style.left = '-28px';
        canvasElem.style.width = '120px';
        canvasElem.style.height = '120px';
        canvasElem.style.pointerEvents = 'none';
        canvasElem.style.zIndex = '1';

        $parent.append(canvasElem);

        this.canvas = canvasElem;
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        return true;
    }

    start() {
        if (this.isRunning) return;
        if (!this.canvas && !this.init()) return;

        this.isRunning = true;
        this.loop = this.loop.bind(this);
        this.animId = requestAnimationFrame(this.loop);
    }

    stop() {
        this.isRunning = false;
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
        this.particles = [];
        this.shockwaves = [];
    }

    // 触发超频爆发等离子冲击波 (点击或通知触发)
    burst(count = 20) {
        if (!this.isRunning) this.start();

        const cx = this.width / 2;
        const cy = this.height / 2;

        // 注入扩散光环
        this.shockwaves.push({
            x: cx,
            y: cy,
            radius: 12,
            maxRadius: 48,
            color: '#00F0FF',
            alpha: 0.9,
            width: 2.2
        });

        this.shockwaves.push({
            x: cx,
            y: cy,
            radius: 8,
            maxRadius: 40,
            color: '#FFE600',
            alpha: 0.8,
            width: 1.6
        });

        // 喷射高速火花粒子
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.2 + Math.random() * 2.8;
            this.particles.push({
                x: cx + Math.cos(angle) * 16,
                y: cy + Math.sin(angle) * 16,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1 + Math.random() * 2,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                alpha: 0.95,
                decay: 0.02 + Math.random() * 0.03,
                isSpark: true
            });
        }
    }

    spawnParticle() {
        const cx = this.width / 2;
        const cy = this.height / 2;
        
        // 随机生成围绕中心轨道升腾的微光数据流
        const angle = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * 12;
        
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];
        const isDataStream = Math.random() > 0.4;

        if (isDataStream) {
            // 垂直升腾数据流
            this.particles.push({
                x: cx + (Math.random() - 0.5) * 36,
                y: cy + 18 + Math.random() * 10,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -(0.5 + Math.random() * 0.9),
                size: 1 + Math.random() * 1.5,
                color: color,
                alpha: 0.7,
                decay: 0.015 + Math.random() * 0.02,
                length: 4 + Math.random() * 6,
                isDataStream: true
            });
        } else {
            // 轨道绕行微粒
            this.particles.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                vx: -Math.sin(angle) * 0.6,
                vy: Math.cos(angle) * 0.6,
                size: 0.8 + Math.random() * 1.2,
                color: color,
                alpha: 0.65,
                decay: 0.018 + Math.random() * 0.02,
                isSpark: false
            });
        }
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        this.ctx.clearRect(0, 0, this.width, this.height);

        // 持续微量生成粒子 (每 80ms 生成一颗)
        if (timestamp - this.lastSpawn > 80) {
            if (this.particles.length < 32) {
                this.spawnParticle();
            }
            this.lastSpawn = timestamp;
        }

        // 1. 渲染并更新等离子冲击波
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const wave = this.shockwaves[i];
            wave.radius += 1.8;
            wave.alpha -= 0.035;

            if (wave.alpha <= 0 || wave.radius >= wave.maxRadius) {
                this.shockwaves.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = wave.color;
            this.ctx.lineWidth = wave.width;
            this.ctx.globalAlpha = Math.max(0, wave.alpha);
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = wave.color;
            this.ctx.stroke();
            this.ctx.restore();
        }

        // 2. 渲染并更新粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0 || p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.alpha);

            if (p.isDataStream) {
                // 绘制细短流线
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x - p.vx * 2, p.y + p.length);
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = p.size;
                this.ctx.lineCap = 'round';
                this.ctx.shadowBlur = 4;
                this.ctx.shadowColor = p.color;
                this.ctx.stroke();
            } else {
                // 绘制微光圆点
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.shadowBlur = 6;
                this.ctx.shadowColor = p.color;
                this.ctx.fill();
            }

            this.ctx.restore();
        }

        this.animId = requestAnimationFrame(this.loop);
    }
}
