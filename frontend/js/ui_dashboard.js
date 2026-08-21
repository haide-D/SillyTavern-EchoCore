// 文件: ui_dashboard.js
if (!window.TTS_UI) {
    window.TTS_UI = {};
}

export const TTS_UI = window.TTS_UI;

(function (scope) {


    // 绑定面板内的所有事件
    scope.bindDashboardEvents = function () {
        const CTX = scope.CTX;

        // Iframe 模式切换
        $('#tts-iframe-switch').change(async function () {
            const isChecked = $(this).is(':checked');
            const $label = $(this).parent();
            const originalText = $label.text();
            $label.text("正在保存设置...");

            try {
                await window.TTS_API.updateSettings({ iframe_mode: isChecked });
                CTX.CACHE.settings.iframe_mode = isChecked;
                localStorage.setItem('tts_plugin_iframe_mode', isChecked);
                alert(`${isChecked ? '开启' : '关闭'}美化卡模式。\n页面即将刷新...`);
                location.reload();
            } catch (e) {
                console.error("保存失败", e);
                alert("保存失败");
                $label.text(originalText);
                $(this).prop('checked', !isChecked);
            }
        });

        // 下拉菜单回显逻辑
        const currentStyle = (CTX.CACHE.settings && CTX.CACHE.settings.bubble_style)
            || document.body.getAttribute('data-bubble-style')
            || 'default';
        const $targetOption = $(`.option-item[data-value="${currentStyle}"]`);
        if ($targetOption.length > 0) {
            $('#style-dropdown .select-trigger span').text($targetOption.text());
            $('#style-dropdown .select-trigger').attr('data-value', currentStyle);
            $('#style-selector').val(currentStyle);
        }

        // 远程连接开关
        $('#tts-remote-switch').change(function () {
            const checked = $(this).is(':checked');
            if (checked) $('#tts-remote-input-area').slideDown();
            else {
                $('#tts-remote-input-area').slideUp();
                const ip = $('#tts-remote-ip').val().trim();
                localStorage.setItem('tts_plugin_remote_config', JSON.stringify({ useRemote: false, ip: ip }));
                location.reload();
            }
        });

        $('#tts-save-remote').click(function () {
            const ip = $('#tts-remote-ip').val().trim();
            if (!ip) { alert("请输入 IP 地址"); return; }
            localStorage.setItem('tts_plugin_remote_config', JSON.stringify({ useRemote: true, ip: ip }));
            alert("设置已保存,即将刷新");
            location.reload();
        });

        $('#tts-master-switch').change(function () { CTX.Callbacks.toggleMasterSwitch($(this).is(':checked')); });
        $('#tts-toggle-auto').change(function () { CTX.Callbacks.toggleAutoGenerate($(this).is(':checked')); });

        $('#tts-lang-select').val(CTX.CACHE.settings.default_lang || 'default');
        $('#tts-lang-select').change(async function () {
            const lang = $(this).val();
            CTX.CACHE.settings.default_lang = lang;
            await window.TTS_API.updateSettings({ default_lang: lang });
        });

        $('#tts-btn-save-paths').click(async function () {
            const btn = $(this);
            const oldText = btn.text();
            btn.text('保存中..').prop('disabled', true);
            const base = $('#tts-base-path').val().trim();
            const cache = $('#tts-cache-path').val().trim();

            const success = await CTX.Callbacks.saveSettings(base, cache);
            if (success) {
                alert('设置已保存！');
                CTX.Callbacks.refreshData().then(() => scope.renderModelOptions());
            } else {
                alert('保存失败,请检查控制台');
            }
            btn.text(oldText).prop('disabled', false);
        });

        // 绑定新角色
        $('#tts-btn-bind-new').click(async function () {
            const charName = $('#tts-new-char').val().trim();
            const modelName = $('#tts-new-model').val();
            if (!charName || !modelName) { alert('请填写角色名并选择模型'); return; }

            try {
                await window.TTS_API.bindCharacter(charName, modelName);
                await CTX.Callbacks.refreshData();
                scope.renderDashboardList();
                $('#tts-new-char').val('');
            } catch (e) {
                console.error(e);
                alert("绑定失败,请检查后端日志");
            }
        });

        // 创建新文件夹 (原代码中有逻辑但HTML中好像没这个按钮，保留逻辑以防万一)
        $('#tts-btn-create-folder').click(async function () {
            const fName = $('#tts-create-folder-name').val().trim();
            if (!fName) return;
            try {
                await window.TTS_API.createModelFolder(fName);
                alert('创建成功');
                CTX.Callbacks.refreshData().then(scope.renderModelOptions);
                $('#tts-create-folder-name').val('');
            } catch (e) {
                console.error(e);
                alert('创建失败,可能文件夹已存在');
            }
        });

        // 下拉菜单交互逻辑
        $('#style-dropdown .select-trigger, #theme-dropdown .select-trigger').off('click').on('click', function (e) {
            e.stopPropagation();
            $(this).parent().toggleClass('open');
        });

        // ==================== 气泡风格切换 ====================
        $('.style-option').off('click').on('click', async function (e) {
            e.stopPropagation();
            const val = $(this).attr('data-value');
            const txt = $(this).text();
            const $container = $(this).closest('.tts-custom-select');

            // 1. UI 立即反馈：更新文字显示
            $container.find('.select-trigger span').text(txt);
            $container.find('.select-trigger').attr('data-value', val);
            $('#style-selector').val(val);
            $container.removeClass('open');

            // 2. ⚡️ 核心修复：立即让 Body 变身 (不用刷新页面就能看到效果)
            document.body.setAttribute('data-bubble-style', val);

            // 3. ⚡️ 核心修复：死死记住它 (写入 localStorage)
            localStorage.setItem('tts_bubble_style', val);
            console.log("[UI] 本地缓存已更新为:", val);

            try {
                // 4. 告诉后端保存 (保持之前的逻辑)
                if (CTX.CACHE && CTX.CACHE.settings) {
                    CTX.CACHE.settings.bubble_style = val;
                }

                if (window.TTS_API && window.TTS_API.updateSettings) {
                    await window.TTS_API.updateSettings({ bubble_style: val });
                    console.log("[API] 后端配置已同步", val);
                }
            } catch (err) {
                console.error("样式保存失败", err);
                // 就算后端失败了，至少本地变了，用户体验不会卡顿
            }
        });

        // ==================== 主题切换 ====================
        // 初始化当前主题的下拉显示
        if (window.TTS_ThemeEngine) {
            const curTheme = window.TTS_ThemeEngine.getCurrentThemeId() || 'default';
            const $tOption = $(`.theme-option[data-value="${curTheme}"]`);
            if ($tOption.length > 0) {
                $('#theme-dropdown .select-trigger .theme-current-text').text($tOption.text());
                $('#theme-dropdown .select-trigger').attr('data-value', curTheme);
                $('#theme-selector').val(curTheme);
            }
        }

        $('.theme-option').off('click').on('click', async function (e) {
            e.stopPropagation();
            const val = $(this).attr('data-value');
            const txt = $(this).text();
            const $container = $(this).closest('.tts-custom-select');

            // 1. UI 立即反馈：更新文字显示
            $container.find('.select-trigger .theme-current-text').text(txt);
            $container.find('.select-trigger').attr('data-value', val);
            $('#theme-selector').val(val);
            $container.removeClass('open');

            // 2. 调用主题引擎切换主题
            if (window.TTS_ThemeEngine) {
                await window.TTS_ThemeEngine.switchTheme(val);
                alert(`已切换至: ${txt}`);
            } else {
                alert('主题引擎未就绪');
            }
        });

        // 一键填入当前对话角色
        $('#tts-btn-fill-current-char').off('click').on('click', function () {
            let currentChar = '';
            const ctx = window.SillyTavern ? window.SillyTavern.getContext() : null;
            if (ctx && ctx.characterId !== undefined && ctx.characters && ctx.characters[ctx.characterId]) {
                currentChar = ctx.characters[ctx.characterId].name;
            } else if (ctx && ctx.character) {
                currentChar = ctx.character;
            }
            if (!currentChar && window.TTS_State && window.TTS_State.CURRENT_CHAR) {
                currentChar = window.TTS_State.CURRENT_CHAR;
            }
            if (currentChar) {
                $('#tts-new-char').val(currentChar);
            } else {
                alert('未检测到当前对话角色，请在输入框手动输入');
            }
        });

        // 搜索过滤角色映射
        $('#tts-mapping-search').off('input').on('input', function () {
            const keyword = $(this).val().toLowerCase().trim();
            $('#tts-mapping-list .tts-compact-item').each(function () {
                const text = $(this).text().toLowerCase();
                $(this).toggle(text.includes(keyword));
            });
        });

        // 勾选状态改变
        $(document).off('change.mappingCheck', '.tts-mapping-check').on('change.mappingCheck', '.tts-mapping-check', function () {
            const checkedCount = $('.tts-mapping-check:checked').length;
            if (checkedCount > 0) {
                $('#tts-btn-batch-unbind').show().text(`批量解绑 (${checkedCount})`);
            } else {
                $('#tts-btn-batch-unbind').hide();
            }
        });

        // 全选 / 取消全选
        $('#tts-btn-select-all').off('click').on('click', function () {
            const $visibleChecks = $('#tts-mapping-list .tts-compact-item:visible .tts-mapping-check');
            const allChecked = $visibleChecks.length > 0 && $visibleChecks.length === $visibleChecks.filter(':checked').length;
            $visibleChecks.prop('checked', !allChecked).trigger('change');
            $(this).text(allChecked ? '全选' : '取消');
        });

        // 批量解绑执行
        $('#tts-btn-batch-unbind').off('click').on('click', async function () {
            const selectedChars = [];
            $('.tts-mapping-check:checked').each(function () {
                selectedChars.push($(this).data('char'));
            });
            if (selectedChars.length === 0) return;
            if (!confirm(`确定要批量解绑选中的 ${selectedChars.length} 个角色吗？`)) return;

            const $btn = $(this);
            $btn.text('解绑中...').prop('disabled', true);
            try {
                for (const charName of selectedChars) {
                    await window.TTS_API.unbindCharacter(charName);
                    $(`.voice-bubble[data-voice-name="${charName}"]`).attr('data-status', 'waiting').removeClass('error playing ready');
                }
                await CTX.Callbacks.refreshData();
                scope.renderDashboardList();
            } catch (e) {
                console.error(e);
                alert('批量解绑发生错误');
            } finally {
                $btn.prop('disabled', false).hide();
            }
        });

        $('#tts-dashboard-open-admin').off('click').on('click', function () {
            const apiHost = (window.TTS_API && window.TTS_API.BASE_URL) ? window.TTS_API.BASE_URL : 'http://127.0.0.1:3000';
            window.open(`${apiHost}/admin`, '_blank');
        });

        $(document).off('click.closeDropdown').on('click.closeDropdown', function () {
            $('.tts-custom-select').removeClass('open');
        });
    };
    // ===========================================
    // ⬇️ 渲染模型下拉菜单 (适配与友好提示)
    // ===========================================
    scope.renderModelOptions = function () {
        const CTX = scope.CTX;
        const $select = $('#tts-new-model');
        const currentVal = $select.val();

        $select.empty();

        const models = (CTX && CTX.CACHE && CTX.CACHE.models) ? CTX.CACHE.models : {};
        const modelKeys = Object.keys(models);

        if (modelKeys.length === 0) {
            $select.append('<option disabled selected value="">⚠️ 暂未检测到模型 (请打开管理面板扫描)</option>');
            return;
        }

        $select.append(`<option disabled ${!currentVal ? 'selected' : ''} value="">🎙️ 请选择语音模型 / 音色 (共 ${modelKeys.length} 个)...</option>`);

        modelKeys.forEach(k => {
            $select.append(`<option value="${k}">🎙️ ${k}</option>`);
        });

        if (currentVal && modelKeys.includes(currentVal)) {
            $select.val(currentVal);
        }
    };

    // ===========================================
    // ⬇️ 渲染绑定列表 (紧凑卡片 + 批量管理)
    // ===========================================
    scope.renderDashboardList = function () {
        const CTX = scope.CTX;
        const c = $('#tts-mapping-list').empty();
        const mappings = (CTX && CTX.CACHE && CTX.CACHE.mappings) ? CTX.CACHE.mappings : {};
        const keys = Object.keys(mappings);

        $('#tts-mapping-count').text(`已绑定 (${keys.length})`);
        $('#tts-btn-batch-unbind').hide();
        $('#tts-btn-select-all').text('全选');

        if (keys.length === 0) {
            c.append('<div style="text-align:center; padding:12px; color:rgba(220,200,150,0.5); font-size:12px;">暂无绑定角色</div>');
            return;
        }

        keys.forEach(k => {
            const modelName = mappings[k];
            c.append(`
                <div class="tts-compact-item" style="display:flex; align-items:center; justify-content:space-between; padding:5px 8px; margin-bottom:4px; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(196,155,79,0.25);">
                    <div style="display:flex; align-items:center; gap:6px; min-width:0; flex:1;">
                        <input type="checkbox" class="tts-mapping-check" data-char="${k}" style="cursor:pointer;" />
                        <span style="font-weight:400; color:rgba(220,200,150,0.95); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:90px;" title="${k}">${k}</span>
                        <span style="color:rgba(196,155,79,0.6); font-size:11px;">➔</span>
                        <span style="color:rgba(196,155,79,0.85); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${modelName}">${modelName}</span>
                    </div>
                    <button class="btn-red" style="padding:1px 6px; font-size:11px; margin-left:6px; border-radius:3px; background:rgba(220,53,53,0.2); border:1px solid rgba(220,53,53,0.4); color:#fca5a5; cursor:pointer;" onclick="window.TTS_UI.handleUnbind('${k}')" title="解绑此角色">×</button>
                </div>
            `);
        });
    };

})(window.TTS_UI);
