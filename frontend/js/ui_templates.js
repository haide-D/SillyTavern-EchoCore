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
                            style="background:transparent; border:none; color:inherit; font-size:24px; padding:0 10px; cursor:pointer;" title="关闭面板">×</button>
                </div>

                <div class="tts-content">
                    <!-- 1. 核心开关卡片 -->
                    <div class="tts-card tts-card-compact">
                        <div class="tts-card-title">⚡ 基础与生成</div>
                        <div class="tts-switch-group">
                            <label class="tts-switch-row">
                                <span class="tts-switch-label">自动生成语音 (建议开启)</span>
                                <input type="checkbox" id="tts-toggle-auto" class="tts-toggle" ${settings.auto_generate ? 'checked' : ''}>
                            </label>
                            <label class="tts-switch-row" style="border-top: 1px dashed rgba(128,128,128,0.15); padding-top: 8px; margin-top: 6px;">
                                <span class="tts-switch-label">美化卡专用模式 (非前端美化卡请勿勾选)</span>
                                <input type="checkbox" id="tts-iframe-switch" class="tts-toggle" ${settings.iframe_mode ? 'checked' : ''}>
                            </label>
                        </div>
                    </div>

                    <!-- 2. 视觉与主题外观 -->
                    <div class="tts-card">
                        <div class="tts-card-title">🎨 视觉体验</div>

                        <div class="tts-grid-2col">
                            <div class="tts-input-group">
                                <span class="tts-input-label">系统主题</span>
                                <div class="tts-custom-select" id="theme-dropdown" style="margin-top:4px; z-index: 20;">
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

                            <div class="tts-input-group">
                                <span class="tts-input-label">气泡风格</span>
                                <div class="tts-custom-select" id="style-dropdown" style="margin-top:4px;">
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
                        </div>
                    </div>

                    <!-- 3. 角色音色库 (模块化折叠抽屉 + 双行呼吸感列表) -->
                    <div class="tts-card tts-card-bindings">
                        <div class="tts-card-header-flex">
                            <div class="tts-card-title" style="margin-bottom:0;">
                                <span>👥 角色音色库</span>
                                <span id="tts-mapping-count" class="tts-count-badge">已绑定 (0)</span>
                            </div>
                            <button type="button" id="tts-btn-toggle-new-binding" class="tts-btn-subtle" title="展开/收起新增角色绑定表单">
                                <span class="toggle-icon">➕</span>
                                <span class="toggle-text">新增绑定</span>
                            </button>
                        </div>
                        
                        <!-- 可折叠新增绑定抽屉 -->
                        <div id="tts-new-binding-drawer" class="tts-drawer" style="display:none;">
                            <div class="tts-drawer-inner">
                                <!-- 第1行: 角色输入与探测 -->
                                <div class="tts-form-row">
                                    <input type="text" id="tts-new-char" class="tts-modern-input" style="flex: 1; min-width: 0;" placeholder="输入角色名 (如: 哈利·波特)">
                                    <button type="button" id="tts-btn-fill-current-char" class="btn-secondary" title="一键填入当前对话的角色名">✨ 填入当前</button>
                                </div>

                                <!-- 第2行: 自定义头像绑定 -->
                                <div class="tts-form-row tts-avatar-row">
                                    <div id="tts-new-avatar-preview" class="tts-avatar-preview-box" title="点击上传本地图片裁剪头像">
                                        <span class="preview-placeholder">👤</span>
                                    </div>
                                    <input type="text" id="tts-new-char-avatar" class="tts-modern-input" style="flex: 1; min-width: 0; font-size: 11.5px;" placeholder="头像URL/本地路径 (可点右侧选图/选卡)">
                                    <div class="tts-btn-group-tight">
                                        <button type="button" id="tts-btn-upload-avatar" class="btn-secondary" title="从电脑本地上传图片并裁剪">📁 选图</button>
                                        <button type="button" id="tts-btn-pick-char-avatar" class="btn-secondary" title="从当前酒馆角色列表中选取">🖼️ 选卡</button>
                                    </div>
                                    <input type="file" id="tts-avatar-file-input" accept="image/*" style="display:none !important;">
                                </div>

                                <!-- 第3行: 音色模型选择 -->
                                <div class="tts-form-row" style="margin-bottom:6px;">
                                    <select id="tts-new-model" class="tts-modern-input" style="width:100%;">
                                        <option disabled selected value="">🎙️ 请选择语音模型 / 音色...</option>
                                    </select>
                                </div>

                                <!-- MiniMax 自定义音色区 -->
                                <div id="tts-custom-voice-wrap" class="tts-custom-voice-box" style="display:none;">
                                    <div style="margin-bottom:6px;">
                                        <small class="tts-highlight-label">音色自定义备注名称:</small>
                                        <input type="text" id="tts-custom-voice-name" class="tts-modern-input" style="width:100%; font-size:12px;" placeholder="例如: 傲娇大小姐 / 赛博警探">
                                    </div>
                                    <div>
                                        <small class="tts-highlight-label">MiniMax Voice ID (官方/克隆音色 ID):</small>
                                        <input type="text" id="tts-custom-voice-input" class="tts-modern-input" style="width:100%; font-size:12px;" placeholder="例如: female-shaonv 或 custom_123">
                                    </div>
                                    <small class="tts-hint-text">💡 绑定后将自动保存至自定义音色库，后续直接下拉选取。</small>
                                </div>

                                <!-- 确认绑定主按钮 -->
                                <button type="button" id="tts-btn-bind-new" class="btn-primary tts-btn-bind-submit">+ 确认绑定角色音色</button>
                            </div>
                        </div>

                        <!-- 已绑定列表管理工具栏 -->
                        <div class="tts-mapping-toolbar">
                            <div class="toolbar-left">
                                <input type="text" id="tts-mapping-search" class="tts-modern-input" placeholder="🔍 快速过滤角色或音色..." />
                            </div>
                            <div class="toolbar-right">
                                <button type="button" id="tts-btn-select-all" class="btn-secondary">全选</button>
                                <button type="button" id="tts-btn-batch-unbind" class="btn-red" style="display:none;">批量解绑</button>
                            </div>
                        </div>

                        <!-- 呼吸感卡片滚动池 -->
                        <div class="tts-list-zone">
                            <div id="tts-mapping-list" class="tts-mapping-card-list"></div>
                        </div>
                    </div>

                    <!-- 4. 底部快捷导航与提示 -->
                    <div class="tts-dashboard-footer">
                        <span class="footer-hint">🧩 IP/端口与供应商可在<b>酒馆扩展设置</b>中调整</span>
                        <a id="tts-dashboard-open-admin" class="footer-link">打开管理面板 ⚙️</a>
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
