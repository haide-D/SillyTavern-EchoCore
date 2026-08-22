/**
 * 夜之城·边缘行者 - 纯粹赛博黑客终端主页 (Pure Text Terminal Console)
 * 彻底移除 SVG 图标 · 纯文本等宽命令行 · 0模糊极致清晰度 · 真正的终端交互美学
 */

export const homeScene = {
    timerId: null,

    render($container, ctx) {
        $container.empty();

        $container.css({
            'padding': '0',
            'color': '#CBD5E1',
            'width': '100vw',
            'height': '100vh',
            'box-sizing': 'border-box',
            'position': 'relative',
            'overflow': 'hidden',
            'display': 'flex',
            'flex-direction': 'column',
            'background': '#03060B',
            'font-family': 'ui-monospace, "Cascadia Code", "JetBrains Mono", "SF Mono", Consolas, "Fira Code", monospace, "PingFang SC", "Microsoft YaHei"',
            '-webkit-font-smoothing': 'antialiased',
            '-moz-osx-font-smoothing': 'grayscale',
            'text-rendering': 'optimizeLegibility'
        });

        // 1. 顶部终端标题行 (Terminal Top Line)
        const $topBar = $(`
            <div class="cyber-term-header" style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 20px;
                background: #070B12;
                border-bottom: 1px solid #FFE600;
                flex-shrink: 0;
                user-select: none;
            ">
                <!-- 左侧：终端 Host 提示与闪烁光标 -->
                <div style="display: flex; align-items: center; gap: 8px; font-size: 13.5px;">
                    <span style="color: #FFE600; font-weight: 700;">root@EDGERUNNER-V</span>
                    <span style="color: #64748B;">:</span>
                    <span style="color: #00F0FF;">~/cyber-deck</span>
                    <span style="color: #FFE600; font-weight: 700;">#</span>
                    <span class="cyber-terminal-cursor" style="color: #FFE600; font-weight: 700;">_</span>
                </div>

                <!-- 中间：实时指标 -->
                <div class="cyber-term-meta" style="
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    font-size: 11.5px;
                    color: #94A3B8;
                ">
                    <span>[NET: <b style="color: #00F0FF;">ARASAKA_SUBNET</b>]</span>
                    <span>[PING: <b style="color: #10B981;">0.8ms</b>]</span>
                    <span>[ICE: <b style="color: #FFE600;">BYPASSED</b>]</span>
                    <span>[OVERCLOCK: <b style="color: #FF003C;">100%</b>]</span>
                </div>

                <!-- 右侧：退出命令 -->
                <div id="cyberTerminalExitBtn" class="cyber-term-exit-btn" style="
                    padding: 3px 12px;
                    background: transparent;
                    border: 1px solid #FF003C;
                    color: #FF003C;
                    font-size: 11.5px;
                    font-weight: 700;
                    cursor: pointer;
                    letter-spacing: 0.5px;
                    transition: all 0.15s ease;
                ">
                    [ EXIT // DISCONNECT (ESC) ]
                </div>
            </div>
        `);
        $container.append($topBar);

        $topBar.find('#cyberTerminalExitBtn').on('click', () => {
            if (ctx.engine) ctx.engine.close();
        });

        // 2. 终端主体区域 (Main Terminal Body: 左侧可执行指令 + 右侧 ASCII 遥测看板)
        const $mainDeck = $(`
            <div class="cyber-term-body" style="
                flex: 1;
                display: flex;
                gap: 24px;
                padding: 16px 20px;
                overflow: hidden;
                box-sizing: border-box;
            ">
                <!-- 左侧：纯文本协议指令列表 -->
                <div class="cyber-term-cmds-col" style="
                    flex: 1.4;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    overflow-y: auto;
                ">
                    <div style="
                        font-size: 12px;
                        color: #00F0FF;
                        font-weight: 700;
                        letter-spacing: 1px;
                        padding-bottom: 6px;
                        border-bottom: 1px dashed rgba(0, 240, 255, 0.4);
                        margin-bottom: 6px;
                    ">
                        === EXECUTABLE NEURAL PROTOCOLS (6 LOADED) ===
                    </div>
                </div>

                <!-- 右侧：ASCII 实时遥测监视台 -->
                <div class="cyber-term-side-col" style="
                    flex: 0.9;
                    background: #060910;
                    border: 1px solid rgba(0, 240, 255, 0.25);
                    padding: 14px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    font-size: 11.5px;
                    overflow: hidden;
                ">
                    <div style="color: #FFE600; font-weight: 700; border-bottom: 1px solid rgba(255, 230, 0, 0.3); padding-bottom: 4px;">
                        ┌─ SYSTEM TELEMETRY ────────────────────────────┐
                    </div>
                    <div style="color: #94A3B8; line-height: 1.7; font-size: 11.5px;">
                        <div>HOST:         EDGERUNNER-V (NETRUNNER NODE)</div>
                        <div>KERNEL:       CYBER_RT_6.14.0-ARASAKA</div>
                        <div>UPTIME:       428h 16m 32s (ONLINE)</div>
                        <div>NEURAL CPU:   <span style="color:#00F0FF;">[||||||||||||||||||||          ]</span> 58%</div>
                        <div>MEMORY POOL:  <span style="color:#FFE600;">[||||||||||||||||||||||||||    ]</span> 74%</div>
                        <div>TEMPERATURE:  <span style="color:#10B981;">38.4°C (OPTIMAL)</span></div>
                    </div>
                    <div style="color: #FFE600; font-weight: 700; border-top: 1px solid rgba(255, 230, 0, 0.3); padding-top: 4px;">
                        └───────────────────────────────────────────────┘
                    </div>

                    <!-- 动态 ASCII 频谱波形 -->
                    <div style="margin-top: 6px; font-size: 11px;">
                        <div style="color: #00F0FF; font-weight: 700; margin-bottom: 4px;">[ REALTIME NEURAL AUDIO SPECTRUM ]</div>
                        <div id="cyberAsciiAudio" style="color: #38BDF8; line-height: 1.4;">
                        |||||||||||||||||||||||||||| 8.2kHz<br>
                        |||||||||||||||||||| 6.1kHz<br>
                        |||||||||||||||||||||||||||||||||| 12.4kHz<br>
                        |||||||||||||||| 4.0kHz
                        </div>
                    </div>

                    <div style="margin-top: auto; color: #64748B; font-size: 10.5px; border-top: 1px dashed rgba(255, 255, 255, 0.1); padding-top: 8px;">
                        TIP: SELECT PROTOCOL ABOVE OR PRESS KEY [1-6] TO EXECUTE.
                    </div>
                </div>
            </div>
        `);
        $container.append($mainDeck);

        const $cmdCol = $mainDeck.find('.cyber-term-cmds-col');

        // 6 大核心协议定义 (严格对接系统标准 App 注册 ID，0 SVG，纯文本终端语法)
        const protocols = [
            { id: 'incoming_call', idx: '01', bin: 'comms.elf', name: '脑机通讯', desc: '神经直连 · 频段呼叫', status: 'READY' },
            { id: 'eavesdrop', idx: '02', bin: 'deep_sniff.elf', name: '深网潜行', desc: '频段截获 · 破冰监听', status: 'ACTIVE' },
            { id: 'workshop', idx: '03', bin: 'braindance.elf', name: '超梦刻录', desc: '矩阵重构 · 剧本工坊', status: 'STANDBY' },
            { id: 'favorites', idx: '04', bin: 'relic_mem.elf', name: '核心记忆', desc: 'Relic 芯片 · 记忆插槽', status: 'MOUNTED' },
            { id: 'theme_store', idx: '05', bin: 'ripperdoc.elf', name: '义体医生', desc: '涂装改造 · 神经改装', status: 'READY' },
            { id: 'settings', idx: '06', bin: 'kernel_tune.elf', name: '底层内核', desc: '超频协议 · 系统调谐', status: 'ONLINE' }
        ];

        protocols.forEach((proto) => {
            const isYellow = parseInt(proto.idx) % 2 === 1;
            const accentColor = isYellow ? '#FFE600' : '#00F0FF';

            const $row = $(`
                <div class="cyber-term-row" data-app="${proto.id}" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: #080D16;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-left: 3px solid ${accentColor};
                    cursor: pointer;
                    font-size: 13px;
                    user-select: none;
                    transition: background 0.12s ease, color 0.12s ease;
                ">
                    <!-- 左侧：编号 + 脚本名 + 中文名称 + 说明 -->
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <span class="cmd-cursor" style="color: ${accentColor}; font-weight: 700; width: 14px;">&gt;</span>
                        <span style="color: ${accentColor}; font-weight: 700;">[${proto.idx}]</span>
                        <span style="color: #F8FAFC; font-weight: 700; letter-spacing: 0.5px;">${proto.bin}</span>
                        <span style="color: #CBD5E1; font-weight: 600; margin-left: 4px;">${proto.name}</span>
                        <span style="color: #64748B; font-size: 11.5px;">// ${proto.desc}</span>
                    </div>

                    <!-- 右侧：状态与执行指令 -->
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 11.5px;">
                        <span style="color: #94A3B8;">[STATUS: <b style="color: ${accentColor};">${proto.status}</b>]</span>
                        <span class="cmd-exec-tag" style="
                            color: #04070D;
                            background: ${accentColor};
                            padding: 2px 8px;
                            font-weight: 700;
                            border-radius: 1px;
                        ">EXECUTE ↵</span>
                    </div>
                </div>
            `);

            // 纯粹终端高亮反色交互
            $row.hover(
                function() {
                    $(this).css({
                        'background': accentColor,
                        'border-color': accentColor
                    });
                    $(this).find('*').css('color', '#04070D');
                    $(this).find('.cmd-exec-tag').css({
                        'background': '#04070D',
                        'color': accentColor
                    });
                    $(this).find('.cmd-cursor').text('>>');
                },
                function() {
                    $(this).css({
                        'background': '#080D16',
                        'border-color': 'rgba(255, 255, 255, 0.08)',
                        'border-left-color': accentColor
                    });
                    $(this).find('*').removeAttr('style');
                    $(this).find('.cmd-cursor').text('>').css('color', accentColor);
                    $(this).find('.cmd-exec-tag').css({
                        'background': accentColor,
                        'color': '#04070D'
                    });
                }
            );

            $row.on('click', () => {
                if (ctx.engine) {
                    ctx.engine.showScene(proto.id);
                }
            });

            $cmdCol.append($row);
        });

        // 3. 底部终端实时内核日志输出 (Bottom Log Stream)
        const $bottomLog = $(`
            <div class="cyber-term-footer-log" style="
                height: 72px;
                background: #04070E;
                border-top: 1px solid rgba(0, 240, 255, 0.3);
                padding: 8px 20px;
                font-size: 11.5px;
                color: #10B981;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                overflow: hidden;
                flex-shrink: 0;
                user-select: none;
            ">
                <div style="color: #64748B; font-size: 10px; margin-bottom: 2px;">--- KERNEL CONSOLE STREAM (REALTIME) ---</div>
                <div style="color: #94A3B8;">[20:29:10] Kernel: Neural synaptic handshake verified. Sandevistan active.</div>
                <div style="color: #38BDF8;">[20:29:12] Netrunner: Memory snapshot socket open on port 0x7FFF.</div>
                <div style="color: #FFE600;">[20:29:15] Terminal: Console initialized. 6 executable neural protocols ready.</div>
            </div>
        `);
        $container.append($bottomLog);

        // 4. 终端全键盘直达交互 (按数字键 1-6 直接执行，按 ESC 退出)
        this.keyHandler = (e) => {
            if ($('#tts-cyber-modal').is(':hidden')) return;
            if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

            if (e.key >= '1' && e.key <= '6') {
                const targetProto = protocols[parseInt(e.key) - 1];
                if (targetProto && ctx.engine) {
                    ctx.engine.showScene(targetProto.id);
                }
            } else if (e.key === 'Escape') {
                if (ctx.engine) ctx.engine.close();
            }
        };
        $(document).off('keydown.cyber_term').on('keydown.cyber_term', this.keyHandler);

        // 动态模拟 ASCII 频谱变化
        this.timerId = setInterval(() => {
            const bars = [
                '||||||||||||||||||||||||||||',
                '||||||||||||||||||||||||',
                '||||||||||||||||',
                '||||||||||||||||||||||||||||||||||||',
                '||||||||||||'
            ];
            const r1 = bars[Math.floor(Math.random() * bars.length)];
            const r2 = bars[Math.floor(Math.random() * bars.length)];
            const r3 = bars[Math.floor(Math.random() * bars.length)];
            const r4 = bars[Math.floor(Math.random() * bars.length)];
            $('#cyberAsciiAudio').html(`
                ${r1} ${(Math.random() * 8 + 4).toFixed(1)}kHz<br>
                ${r2} ${(Math.random() * 6 + 2).toFixed(1)}kHz<br>
                ${r3} ${(Math.random() * 12 + 6).toFixed(1)}kHz<br>
                ${r4} ${(Math.random() * 4 + 1).toFixed(1)}kHz
            `);
        }, 500);
    },

    cleanup() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        $(document).off('keydown.cyber_term');
    }
};
