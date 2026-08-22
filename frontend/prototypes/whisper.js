/**
 * WhisperAnimation — 低语/灵犀感应全屏动画
 *
 * 对齐来电的「符文觉醒」模式：
 *   idle → trigger(变色+墨色涟漪) → centering(飞向中心+放大)
 *   → separated(三圣器分离) → listening(聆听中) → ending → idle
 */

class WhisperAnimation {
    constructor() {
        this.container = document.getElementById('dhContainer');
        this.darkOverlay = document.getElementById('darkOverlay');
        this.whisperInfo = document.getElementById('whisperInfo');
        this.whisperButtons = document.getElementById('whisperButtons');
        this.subtitleArea = document.getElementById('subtitleArea');
        this.subtitleText = document.getElementById('subtitleText');

        this.phase = 'idle';
        this.timers = [];
        this.subtitleTimer = null;
        this.originalPosition = null;

        this.demoSubs = [
            '你能听到吗……那是来自远方的回响……',
            '她们的声音穿越了时间与空间，',
            '像星光般缓缓降临……',
        ];
        this.subIdx = 0;
    }

    // ==========================================
    // 公共 API
    // ==========================================
    enterPhase(phase) {
        this._clearTimers();
        this.phase = phase;
        console.log(`[Whisper] → ${phase}`);

        switch (phase) {
            case 'idle': this._idle(); break;
            case 'trigger': this._trigger(); break;
            case 'centering': this._centering(); break;
            case 'separated': this._separated(); break;
            case 'listening': this._listening(); break;
            case 'ending': this._ending(); break;
        }
        this._updateDebugButtons(phase);
    }

    // ==========================================
    // 各阶段
    // ==========================================
    _idle() {
        this.container.className = 'proto-element dh-container';
        this.container.style.cssText = '';
        this.darkOverlay.classList.remove('visible');
        this.whisperInfo.classList.remove('visible');
        this.whisperButtons.classList.remove('visible');
        this.subtitleArea.classList.remove('visible');
        document.querySelectorAll('.ink-ripple, .ink-ripple-inner').forEach(el => el.remove());
        this.subIdx = 0;
    }

    _trigger() {
        const rect = this.container.getBoundingClientRect();
        this.originalPosition = {
            left: rect.left + rect.width / 2,
            top: rect.top + rect.height / 2,
        };

        // 1) 符文变色（金 → 蓝紫）
        this.container.classList.add('whisper-active');

        // 2) 墨色涟漪（多层，更华丽）
        for (let i = 0; i < 3; i++) {
            this._delay(i * 250, () => {
                this._fireInkRipple(this.originalPosition.left, this.originalPosition.top);
            });
        }
        // 内层明亮涟漪
        for (let i = 0; i < 2; i++) {
            this._delay(i * 350 + 100, () => {
                this._fireInkRippleInner(this.originalPosition.left, this.originalPosition.top);
            });
        }

        // 3) 暗幕
        this._delay(400, () => {
            this.darkOverlay.classList.add('visible');
        });

        // 4) 进入 centering
        this._delay(800, () => {
            this.enterPhase('centering');
        });
    }

    _centering() {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const targetSize = Math.min(window.innerWidth, window.innerHeight) * 0.55;

        // 锁定当前位置
        this.container.style.position = 'fixed';
        this.container.style.left = this.originalPosition.left + 'px';
        this.container.style.top = this.originalPosition.top + 'px';
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.zIndex = '55';

        void this.container.offsetWidth;

        // 过渡到中心
        this.container.style.transition = 'all 1s cubic-bezier(0.22, 1, 0.36, 1)';
        this.container.style.left = cx + 'px';
        this.container.style.top = cy + 'px';
        this.container.style.width = targetSize + 'px';
        this.container.style.height = targetSize + 'px';

        this._delay(1200, () => {
            this.enterPhase('separated');
        });
    }

    _separated() {
        this.container.classList.remove('whisper-active');
        this.container.classList.add('separated');

        // 提示文字
        this._delay(600, () => {
            this._typeText(document.getElementById('whisperHintText'),
                '远方传来一阵低语……');
            this.whisperInfo.classList.add('visible');
        });

        // 按钮
        this._delay(1800, () => {
            this.whisperButtons.classList.add('visible');
        });
    }

    _listening() {
        this.whisperInfo.classList.remove('visible');
        this.whisperButtons.classList.remove('visible');

        // 切换到 listening 态
        this.container.classList.remove('separated');
        this.container.classList.add('listening');

        // 字幕
        this._delay(800, () => {
            this.subtitleArea.classList.add('visible');
            this._nextSubtitle();
        });
    }

    _ending() {
        this.whisperInfo.classList.remove('visible');
        this.whisperButtons.classList.remove('visible');
        this.subtitleArea.classList.remove('visible');

        // 回到小尺寸 + 原始位置
        this.container.classList.remove('separated', 'listening');
        this.container.classList.add('ending');

        const origX = window.innerWidth * 0.78;
        const origY = window.innerHeight * 0.50;

        this.container.style.transition = 'all 1.5s cubic-bezier(0.22, 1, 0.36, 1)';
        this.container.style.left = origX + 'px';
        this.container.style.top = origY + 'px';
        this.container.style.width = '72px';
        this.container.style.height = '72px';

        this._delay(500, () => {
            this.darkOverlay.classList.remove('visible');
        });

        this._delay(2000, () => {
            this.enterPhase('idle');
        });
    }

    // ==========================================
    // 工具
    // ==========================================
    _fireInkRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'ink-ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        document.body.appendChild(ripple);
        void ripple.offsetWidth;
        ripple.classList.add('fire');
        setTimeout(() => ripple.remove(), 2000);
    }

    _fireInkRippleInner(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'ink-ripple-inner';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        document.body.appendChild(ripple);
        void ripple.offsetWidth;
        ripple.classList.add('fire');
        setTimeout(() => ripple.remove(), 1500);
    }

    _typeText(el, text) {
        el.innerHTML = '';
        [...text].forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'char-reveal';
            span.textContent = char === ' ' ? '\u00a0' : char;
            span.style.animationDelay = `${i * 0.07}s`;
            el.appendChild(span);
        });
    }

    _nextSubtitle() {
        if (this.phase !== 'listening') return;
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

        const wait = text.length * 60 + 2500;
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
            idle: 'btnIdle', trigger: 'btnWhisper', centering: 'btnWhisper',
            separated: 'btnWhisper', listening: 'btnListen', ending: 'btnEnd',
        };
        const btn = document.getElementById(map[phase]);
        if (btn) btn.classList.add('active');
    }
}

// ==========================================
// 全局控制
// ==========================================
let whisperAnim;

document.addEventListener('DOMContentLoaded', () => {
    whisperAnim = new WhisperAnimation();
});

function triggerWhisper() { whisperAnim.enterPhase('trigger'); }
function jumpToListening() {
    whisperAnim.container.style.position = 'fixed';
    whisperAnim.container.style.left = (window.innerWidth / 2) + 'px';
    whisperAnim.container.style.top = (window.innerHeight / 2) + 'px';
    whisperAnim.container.style.transform = 'translate(-50%, -50%)';
    whisperAnim.container.style.zIndex = '55';
    const s = Math.min(window.innerWidth, window.innerHeight) * 0.55;
    whisperAnim.container.style.width = s + 'px';
    whisperAnim.container.style.height = s + 'px';
    whisperAnim.container.classList.add('whisper-active');
    whisperAnim.darkOverlay.classList.add('visible');
    whisperAnim.enterPhase('listening');
}
function acceptListen() { whisperAnim.enterPhase('listening'); }
function ignoreListen() { whisperAnim.enterPhase('ending'); }
function endWhisper() { whisperAnim.enterPhase('ending'); }
function resetAll() { whisperAnim.enterPhase('idle'); }
