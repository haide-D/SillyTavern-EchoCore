/**
 * RuneAwakeningAnimation — 符文觉醒来电动画
 *
 * 阶段:
 *   idle → omen(冲击波+暗幕) → centering(飞向中心) 
 *   → separated(三圣器分离) → accepted(通话中) → dispersing(结束) → idle
 */

class RuneAwakeningAnimation {
    constructor() {
        // DOM
        this.container = document.getElementById('dhContainer');
        this.darkOverlay = document.getElementById('darkOverlay');
        this.callInfo = document.getElementById('callInfo');
        this.callButtons = document.getElementById('callButtons');
        this.subtitleArea = document.getElementById('subtitleArea');
        this.subtitleText = document.getElementById('subtitleText');

        // 状态
        this.phase = 'idle';
        this.timers = [];
        this.subtitleTimer = null;

        // 原始位置（base.js 漂浮位置，用于回位）
        this.originalPosition = null;

        // 字幕演示
        this.demoSubs = [
            '你不必害怕黑暗……',
            '因为光明从未真正离开。',
            '它只是在等待你的召唤。',
        ];
        this.subIdx = 0;
    }

    // ==========================================
    // 公共 API
    // ==========================================

    enterPhase(phase) {
        this._clearTimers();
        this.phase = phase;
        console.log(`[Phase] → ${phase}`);

        switch (phase) {
            case 'idle': this._idle(); break;
            case 'omen': this._omen(); break;
            case 'centering': this._centering(); break;
            case 'separated': this._separated(); break;
            case 'accepted': this._accepted(); break;
            case 'dispersing': this._dispersing(); break;
        }
        this._updateDebugButtons(phase);
    }

    // ==========================================
    // 阶段实现
    // ==========================================

    _idle() {
        this.container.className = 'proto-element dh-container';

        // 恢复到 base.js 控制的漂浮定位
        this.container.style.width = '';
        this.container.style.height = '';
        this.container.style.position = '';
        this.container.style.left = '';
        this.container.style.top = '';
        this.container.style.transform = '';
        this.container.style.transition = '';

        this.darkOverlay.classList.remove('visible');
        this.callInfo.classList.remove('visible');
        this.callButtons.classList.remove('visible');
        this.subtitleArea.classList.remove('visible');

        // 移除冲击波
        document.querySelectorAll('.shockwave').forEach(el => el.remove());

        this.subIdx = 0;
    }

    _omen() {
        // 保存当前位置
        const rect = this.container.getBoundingClientRect();
        this.originalPosition = {
            left: rect.left + rect.width / 2,
            top: rect.top + rect.height / 2,
        };

        // 1) 符文激活
        this.container.classList.add('omen');

        // 2) 冲击波
        this._fireShockwave(this.originalPosition.left, this.originalPosition.top);

        // 3) 暗幕降临
        this._delay(300, () => {
            this.darkOverlay.classList.add('visible');
        });

        // 4) 自动进入 centering
        this._delay(600, () => {
            this.enterPhase('centering');
        });
    }

    _centering() {
        // 将符文从 base.js 的 absolute 定位改为 fixed 居中
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const targetSize = Math.min(window.innerWidth, window.innerHeight) * 0.55;

        // 先锁定到当前位置（阻止 base.js 漂浮）
        this.container.style.position = 'fixed';
        this.container.style.left = this.originalPosition.left + 'px';
        this.container.style.top = this.originalPosition.top + 'px';
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.zIndex = '55';

        // 强制回流，然后触发过渡
        void this.container.offsetWidth;

        this.container.style.transition = 'all 1s cubic-bezier(0.22, 1, 0.36, 1)';
        this.container.style.left = cx + 'px';
        this.container.style.top = cy + 'px';
        this.container.style.width = targetSize + 'px';
        this.container.style.height = targetSize + 'px';

        // 过渡完成后进入分离
        this._delay(1200, () => {
            this.enterPhase('separated');
        });
    }

    _separated() {
        this.container.classList.remove('omen');
        this.container.classList.add('separated');

        // 显示来电信息
        this._delay(600, () => {
            this._showCallerName('✦ 赫敏·格兰杰 ✦');
            this.callInfo.classList.add('visible');
        });

        // 副标题
        this._delay(1200, () => {
            this._typeText(document.getElementById('callerSub'),
                '正在通过魔法通讯联络你…');
        });

        // 按钮
        this._delay(1800, () => {
            this.callButtons.classList.add('visible');
        });
    }

    _accepted() {
        // 隐藏来电 UI
        this.callInfo.classList.remove('visible');
        this.callButtons.classList.remove('visible');

        // 切换到 accepted 态（三角/线隐去，圆变冥想盆）
        this.container.classList.remove('separated');
        this.container.classList.add('accepted');

        // 字幕
        this._delay(800, () => {
            this.subtitleArea.classList.add('visible');
            this._nextSubtitle();
        });
    }

    _dispersing() {
        // 隐藏所有 UI
        this.callInfo.classList.remove('visible');
        this.callButtons.classList.remove('visible');
        this.subtitleArea.classList.remove('visible');

        // 回到小尺寸 + 原始位置
        this.container.classList.remove('separated', 'accepted');
        this.container.classList.add('dispersing');

        const origX = window.innerWidth * 0.78;
        const origY = window.innerHeight * 0.50;

        this.container.style.transition = 'all 1.5s cubic-bezier(0.22, 1, 0.36, 1)';
        this.container.style.left = origX + 'px';
        this.container.style.top = origY + 'px';
        this.container.style.width = '72px';
        this.container.style.height = '72px';

        // 暗幕退场
        this._delay(500, () => {
            this.darkOverlay.classList.remove('visible');
        });

        // 回到 idle
        this._delay(2000, () => {
            this.enterPhase('idle');
        });
    }

    // ==========================================
    // 工具方法
    // ==========================================

    _fireShockwave(x, y) {
        const wave = document.createElement('div');
        wave.className = 'shockwave';
        wave.style.left = x + 'px';
        wave.style.top = y + 'px';
        wave.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(wave);

        void wave.offsetWidth;
        wave.classList.add('fire');

        setTimeout(() => wave.remove(), 1000);
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

    _typeText(el, text) {
        el.innerHTML = '';
        [...text].forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'char-reveal';
            span.textContent = char === ' ' ? '\u00a0' : char;
            span.style.animationDelay = `${i * 0.05}s`;
            el.appendChild(span);
        });
    }

    _nextSubtitle() {
        if (this.phase !== 'accepted') return;
        if (this.subIdx >= this.demoSubs.length) this.subIdx = 0;

        const text = this.demoSubs[this.subIdx++];
        this.subtitleText.innerHTML = '';

        [...text].forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'sub-char';
            span.textContent = char === ' ' ? '\u00a0' : char;
            span.style.animationDelay = `${i * 0.06}s`;
            this.subtitleText.appendChild(span);
        });

        const wait = text.length * 60 + 2000;
        this.subtitleTimer = setTimeout(() => {
            this.subtitleText.style.opacity = '0';
            setTimeout(() => {
                this.subtitleText.style.opacity = '1';
                this._nextSubtitle();
            }, 500);
        }, wait);
    }

    _delay(ms, fn) {
        this.timers.push(setTimeout(fn, ms));
    }

    _clearTimers() {
        this.timers.forEach(t => clearTimeout(t));
        this.timers = [];
        if (this.subtitleTimer) { clearTimeout(this.subtitleTimer); this.subtitleTimer = null; }
    }

    _updateDebugButtons(phase) {
        document.querySelectorAll('.debug-btn').forEach(b => b.classList.remove('active'));
        const map = {
            idle: 'btnIdle', omen: 'btnCall', centering: 'btnCall',
            separated: 'btnCall', accepted: 'btnActive', dispersing: 'btnEnd',
        };
        const btn = document.getElementById(map[phase]);
        if (btn) btn.classList.add('active');
    }
}

// ==========================================
// 全局控制
// ==========================================
let anim;

document.addEventListener('DOMContentLoaded', () => {
    anim = new RuneAwakeningAnimation();
});

function triggerIncomingCall() { anim.enterPhase('omen'); }
function jumpToActive() {
    // 快速跳到通话中
    anim.container.style.position = 'fixed';
    anim.container.style.left = (window.innerWidth / 2) + 'px';
    anim.container.style.top = (window.innerHeight / 2) + 'px';
    anim.container.style.transform = 'translate(-50%, -50%)';
    anim.container.style.zIndex = '55';
    const s = Math.min(window.innerWidth, window.innerHeight) * 0.55;
    anim.container.style.width = s + 'px';
    anim.container.style.height = s + 'px';
    anim.darkOverlay.classList.add('visible');
    anim.enterPhase('accepted');
}
function acceptCall() { anim.enterPhase('accepted'); }
function declineCall() { anim.enterPhase('dispersing'); }
function endCall() { anim.enterPhase('dispersing'); }
function resetAll() { anim.enterPhase('idle'); }
