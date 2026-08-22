// 文件: ui_templates.js

export function getFloatingButtonHTML() {
    return `<div id="tts-manager-btn">🔊 TTS配置</div>`;
}

export function getDashboardHTML(data) {
    const { isEnabled, settings, isRemote, remoteIP, currentBase, currentCache, currentLang } = data;

    return `
        <div id="tts-dashboard-overlay" class="tts-overlay">
            <div id="tts-dashboard" class="tts-panel">
                <div class="tts-header">
                    <h3 class="tts-header-title">🎧 语音配置中心</h3>
                    <button class="tts-close" onclick="$('#tts-dashboard-overlay').remove()"
                            style="background:transparent; border:none; color:inherit; font-size:24px; padding:0 10px;">×</button>
                </div>

                <div class="tts-content">
                    <!-- 1. 快捷生成设置 -->
                    <div class="tts-card">
                        <div class="tts-card-title">⚡ 语音生成</div>
                        <label class="tts-switch-row">
                            <span class="tts-switch-label">自动生成语音 (建议开启)</span>
                            <input type="checkbox" id="tts-toggle-auto" class="tts-toggle" ${settings.auto_generate ? 'checked' : ''}>
                        </label>
                    </div>

                    <!-- 2. 视觉与主题体验 -->
                    <div class="tts-card">
                        <div class="tts-card-title">🎨 视觉体验</div>

                        <div class="tts-input-row" style="margin-bottom: 5px; padding-bottom: 10px;">
                            <span class="tts-input-label">系统主题</span>
                            <div class="tts-custom-select" id="theme-dropdown" style="margin-top:5px; z-index: 20;">
                                <div class="select-trigger" data-value="default">
                                    <span class="theme-current-text">默认主题</span>
                                    <i class="arrow-icon">▼</i>
                                </div>
                                <div class="select-options" id="theme-select-options">
                                    <div class="option-item theme-option" data-value="default">默认主题 (Default)</div>
                                    <div class="option-item theme-option" data-value="deathly_hallows">死亡圣器 (Deathly Hallows)</div>
                                    <div class="option-item theme-option" data-value="immortal_sword">⚔️ 仙途凌霄 (Immortal Sword)</div>
                                    <div class="option-item theme-option" data-value="sakura_elegance">🌸 落樱雅境 (Sakura Elegance)</div>
                                    <div class="option-item theme-option" data-value="cyberpunk_edgerunners">⚡ 夜之城·边缘行者 (Cyberpunk)</div>
                                </div>
                            </div>
                            <input type="hidden" id="theme-selector" value="default">
                        </div>

                        <div class="tts-input-row">
                            <span class="tts-input-label">气泡风格</span>
                            <div class="tts-custom-select" id="style-dropdown" style="margin-top:5px;">
                                <div class="select-trigger" data-value="default">
                                    <span>🌿 森野·极简</span>
                                    <i class="arrow-icon">▼</i>
                                </div>
                                <div class="select-options">
                                    <div class="option-item style-option" data-value="default">🌿 森野·极简</div>
                                    <div class="option-item style-option" data-value="cyberpunk">⚡赛博·霓虹</div>
                                    <div class="option-item style-option" data-value="ink">✒️ 水墨·烟雨</div>
                                    <div class="option-item style-option" data-value="kawaii">💎 幻彩·琉璃</div>
                                    <div class="option-item style-option" data-value="bloom">🌸 花信·初绽</div>
                                    <div class="option-item style-option" data-value="rouge">💋 魅影·微醺</div>
                                    <div class="option-item style-option" data-value="holo">🛸 星舰·光环</div>
                                    <div class="option-item style-option" data-value="scroll">📜 羊皮·史诗</div>
                                    <div class="option-item style-option" data-value="steampunk">⚙️ 蒸汽·机械</div>
                                    <div class="option-item style-option" data-value="tactical">🎯 战术·指令</div>
                                    <div class="option-item style-option" data-value="obsidian">🌑 黑曜石·极夜</div>
                                    <div class="option-item style-option" data-value="classic">📼 旧日·回溯</div>
                                </div>
                            </div>
                            <input type="hidden" id="style-selector" value="default">
                        </div>

                        <label class="tts-switch-row" style="border-top: 1px dashed rgba(128,128,128,0.2); padding-top: 10px; margin-top: 10px;">
                            <span class="tts-switch-label">美化卡专用模式 (非前端美化卡请勿勾选)</span>
                            <input type="checkbox" id="tts-iframe-switch" class="tts-toggle" ${settings.iframe_mode ? 'checked' : ''}>
                        </label>
                    </div>

                    <!-- 3. 角色音色绑定 (分层清晰排版) -->
                    <div class="tts-card">
                        <div class="tts-card-title">🔗 角色音色绑定</div>
                        
                        <!-- 第1行: 角色输入与探测 -->
                        <div style="display:flex; gap:8px; margin-bottom:8px; align-items:center;">
                            <input type="text" id="tts-new-char" class="tts-modern-input" style="flex: 1; min-width: 0;" placeholder="输入角色名 (如: 哈利·波特)">
                            <button id="tts-btn-fill-current-char" class="btn-secondary" style="padding:7px 12px; font-size:12px; white-space:nowrap;" title="一键填入当前对话的角色名">✨ 填入当前</button>
                        </div>

                        <!-- 第2行: 自定义头像绑定 (支持本地选图落盘 / 选卡 / 输入URL) -->
                        <div style="display:flex; gap:6px; margin-bottom:8px; align-items:center;">
                            <div id="tts-new-avatar-preview" style="width:36px; height:36px; border-radius:50%; overflow:hidden; background:rgba(255,255,255,0.08); border:1px solid rgba(196,155,79,0.4); display:flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer;" title="点击上传本地头像图片">
                                <span style="font-size:16px;">👤</span>
                            </div>
                            <input type="text" id="tts-new-char-avatar" class="tts-modern-input" style="flex: 1; min-width: 0; font-size: 11.5px;" placeholder="头像URL/本地路径 (可点右侧选图/选卡)">
                            <button id="tts-btn-upload-avatar" class="btn-secondary" style="padding:7px 8px; font-size:11.5px; white-space:nowrap; display:inline-flex; align-items:center; gap:2px;" title="从电脑本地上传图片并永久落盘">📁 选图</button>
                            <button id="tts-btn-pick-char-avatar" class="btn-secondary" style="padding:7px 8px; font-size:11.5px; white-space:nowrap; display:inline-flex; align-items:center; gap:2px;" title="从当前酒馆角色列表中选取">🖼️ 选卡</button>
                            <input type="file" id="tts-avatar-file-input" accept="image/*" style="display:none !important;">
                        </div>

                        <!-- 第3行: 音色模型选择 (独占整行，文字不被截断) -->
                        <div style="margin-bottom:10px;">
                            <select id="tts-new-model" class="tts-modern-input" style="width:100%;">
                                <option disabled selected value="">🎙️ 请选择 GPT-SoVITS 语音模型...</option>
                            </select>
                        </div>

                        <button id="tts-btn-bind-new" class="btn-primary" style="width:100%; margin-bottom:12px;">+ 绑定角色音色与头像</button>

                        <!-- 已绑定列表管理工具栏 -->
                        <div class="tts-mapping-toolbar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px dashed rgba(196,155,79,0.25);">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span style="font-size:12px; color:rgba(196,155,79,0.9);" id="tts-mapping-count">已绑定 (0)</span>
                                <input type="text" id="tts-mapping-search" placeholder="🔍 快速过滤..." style="width:100px; padding:2px 6px; font-size:11px; border-radius:4px;" />
                            </div>
                            <div style="display:flex; gap:6px;">
                                <button id="tts-btn-select-all" class="btn-secondary" style="padding:2px 6px; font-size:11px;">全选</button>
                                <button id="tts-btn-batch-unbind" class="btn-red" style="padding:2px 8px; font-size:11px; display:none;">批量解绑</button>
                            </div>
                        </div>

                        <!-- 紧凑徽章/卡片滚动池 -->
                        <div class="tts-list-zone">
                            <div id="tts-mapping-list" class="tts-compact-mapping-list" style="max-height:160px; overflow-y:auto; padding-right:2px;"></div>
                        </div>
                    </div>

                    <!-- 4. 底部快捷导航与提示 -->
                    <div style="display:flex; justify-content:space-between; align-items:center; padding: 4px 6px; font-size:12px; color:#888;">
                        <span>🧩 IP/端口与供应商可在<b>酒馆扩展设置</b>中调整</span>
                        <a id="tts-dashboard-open-admin" style="color: #60a5fa; text-decoration: underline; cursor: pointer;">打开管理面板 ⚙️</a>
                    </div>
                </div>
            </div>
        </div>`;
}
export function getBubbleMenuHTML() {
    return `
    <div id="tts-bubble-menu" class="tts-context-menu" style="display:none;">
        <div class="menu-item" id="tts-action-download">
            <span class="icon">⬇️</span> 下载语音 (Download)
        </div>
        <div class="divider"></div>
        <div class="menu-item" id="tts-action-reroll">
            <span class="icon">🔄</span> 重绘 (Re-Roll)
        </div>
        <div class="menu-item" id="tts-action-fav">
            <span class="icon">❤️</span> 收藏 (Favorite)
        </div>
        <div class="divider"></div>
        <div class="menu-item close-item" style="color:#999; justify-content:center; font-size:12px;">
            点击外部关闭
        </div>
    </div>
    `;
}
