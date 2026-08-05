export const ThemeTesterUI = {
    init: function (settings) {
        const existingPanel = document.getElementById('tts-theme-tester-panel');
        
        if (!settings.developer_mode) {
            if (existingPanel) {
                existingPanel.remove();
                console.log("🛠️ [TTS Theme Tester] Developer mode is disabled. Removed tester UI.");
            }
            return;
        }

        if (existingPanel) return;

        console.log("🛠️ [TTS Theme Tester] Developer mode is enabled. Injecting tester UI...");
        this.injectUI();
        this.bindEvents();
    },

    injectUI: function () {

        const uiHtml = `
            <div id="tts-theme-tester-panel" style="position: fixed; bottom: 20px; left: 20px; z-index: 9999999; background: rgba(20, 20, 25, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 15px; width: 280px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); font-family: sans-serif; color: #fff; transition: all 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">🛠️ 主题测试台</h3>
                    <button id="tts-tester-toggle-btn" style="background: none; border: none; color: #aaa; cursor: pointer; font-size: 12px; padding: 0;">收起</button>
                </div>
                
                <div id="tts-tester-content" style="display: flex; flex-direction: column; gap: 10px;">
                    <div>
                        <label style="font-size: 12px; color: #aaa; margin-bottom: 4px; display: block;">选择主题:</label>
                        <select id="tts-tester-theme-select" style="width: 100%; padding: 6px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; color: #fff; font-size: 13px; outline: none;">
                        </select>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="tts-tester-btn" data-action="incoming_call" style="background: #4CAF50; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: opacity 0.2s;">📞 触发来电</button>
                        <button class="tts-tester-btn" data-action="eavesdrop_ready" style="background: #2196F3; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: opacity 0.2s;">🎧 触发窃听</button>
                        <button class="tts-tester-btn" data-action="call_ended" style="background: #F44336; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: opacity 0.2s; grid-column: span 2;">挂断电话</button>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 5px;">
                        <button class="tts-tester-btn" data-action="open_panel" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: background 0.2s;">📱 打开主面板 (App Store)</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', uiHtml);

        // 加载下拉框主题
        setTimeout(() => {
            const themes = window.TTS_ThemeEngine?.getAvailableThemes() || [];
            const select = document.getElementById('tts-tester-theme-select');
            
            if (themes.length === 0) {
                select.innerHTML = '<option value="">暂无主题</option>';
            } else {
                select.innerHTML = themes.map(t => `<option value="${t.id}">${t.name} (v${t.version})</option>`).join('');
                
                // 设置当前主题
                const currentTheme = window.TTS_ThemeEngine?.getCurrentTheme();
                if (currentTheme) {
                    select.value = currentTheme.id;
                }
            }
        }, 1000); // 延迟一点等主题引擎加载完毕
    },

    bindEvents: function () {
        // 面板收起/展开
        const panel = document.getElementById('tts-theme-tester-panel');
        const content = document.getElementById('tts-tester-content');
        const toggleBtn = document.getElementById('tts-tester-toggle-btn');
        let isCollapsed = false;

        toggleBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            if (isCollapsed) {
                content.style.display = 'none';
                panel.style.width = '120px';
                toggleBtn.textContent = '展开';
            } else {
                content.style.display = 'flex';
                panel.style.width = '280px';
                toggleBtn.textContent = '收起';
            }
        });

        // 切换主题
        document.getElementById('tts-tester-theme-select')?.addEventListener('change', (e) => {
            if (window.TTS_ThemeEngine) {
                const themeId = e.target.value;
                window.TTS_ThemeEngine.switchTheme(themeId).then(() => {
                    console.log(`[TTS Theme Tester] 切换到主题: ${themeId}`);
                });
            }
        });

        // 绑定按钮事件模拟通知
        document.querySelectorAll('.tts-tester-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (!window.TTS_ThemeEngine) {
                    console.error("[TTS Theme Tester] ThemeEngine未初始化!");
                    return;
                }

                if (action === 'open_panel') {
                    if (!window.TTS_ThemeEngine.getCurrentThemeId()) {
                        console.warn("[TTS Theme Tester] 请先加载一个主题！");
                        return;
                    }
                    window.TTS_ThemeEngine.toggle();
                    return;
                }

                if (action === 'incoming_call') {
                    const mockData = { 
                        char_name: '测试角色 (Test Character)',
                        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                        segments: [
                            { text: "喂，能听得到吗？这里是测试文本的开头。", speaker: "测试角色", start_time: 0, audio_duration: 3 },
                            { text: "这是一段用于测试开发者模式的模拟消息，支持长文本的换行显示。", speaker: "测试角色", start_time: 3, audio_duration: 4 },
                            { text: "如果能看到字幕随着音乐滚动，说明一切正常。", speaker: "测试角色", start_time: 7, audio_duration: 5 }
                        ]
                    };
                    window.TTS_IncomingCall = mockData;
                    window.TTS_ThemeEngine.notify('incoming_call', mockData);
                    console.log(`[TTS Theme Tester] 触发事件: incoming_call`, mockData);
                } else if (action === 'eavesdrop_ready') {
                    const mockData = { 
                        speakers: ['神秘人'], 
                        notification_text: '在走廊深处听到了秘密的对话...',
                        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                        segments: [
                            { text: "小声点，这里是测试文本的第一句。", speaker: "神秘人", start_time: 0, audio_duration: 3 },
                            { text: "这是一段用于测试开发者模式的模拟消息，支持长文本的换行显示。", speaker: "神秘人", start_time: 3, audio_duration: 4 },
                            { text: "如果能看到字幕随着音乐滚动，说明一切正常。", speaker: "神秘人", start_time: 7, audio_duration: 5 }
                        ]
                    };
                    window.TTS_EavesdropReady = mockData;
                    window.TTS_EavesdropData = mockData;
                    window.TTS_ThemeEngine.notify('eavesdrop_ready', mockData);
                    console.log(`[TTS Theme Tester] 触发事件: eavesdrop_ready`, mockData);
                } else if (action === 'call_ended') {
                    window.TTS_ThemeEngine.notify('call_ended', {});
                    window.TTS_IncomingCall = null;
                    window.TTS_EavesdropReady = null;
                    window.TTS_EavesdropData = null;
                    if (window.TTS_ThemeEngine.isOpen()) {
                        window.TTS_ThemeEngine.close();
                    }
                    console.log(`[TTS Theme Tester] 触发事件: call_ended`);
                }
            });
            
            // 按钮 hover 效果
            btn.addEventListener('mouseenter', (e) => { e.target.style.opacity = '0.8'; });
            btn.addEventListener('mouseleave', (e) => { e.target.style.opacity = '1'; });
        });
    }
};
