// 文件: ui_dashboard.js
import { getCharacterAvatar, setCustomSpeakerAvatar, getCustomSpeakerAvatars, renderAvatarHtml, getDefaultAvatarDataUrl } from './mobile_apps/shared/utils.js';
import { openAvatarCropper } from './mobile_apps/shared/avatar_cropper.js';

if (!window.TTS_UI) {
    window.TTS_UI = {};
}

export const TTS_UI = window.TTS_UI;

(function (scope) {

    // 辅助函数: 刷新输入区的头像预览
    function updateNewAvatarPreview() {
        const charName = $('#tts-new-char').val().trim();
        const customUrl = $('#tts-new-char-avatar').val().trim();
        const effectiveUrl = customUrl || (charName ? getCharacterAvatar(charName) : null);
        const $preview = $('#tts-new-avatar-preview');
        if (effectiveUrl) {
            $preview.html(`<img src="${effectiveUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.onerror=null; this.src='${getDefaultAvatarDataUrl(charName)}';" />`);
        } else {
            $preview.html(`<span style="font-size:16px; opacity:0.6;">👤</span>`);
        }
    }

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

        // 监听角色名或自定义头像输入变化，动态刷新预览
        $('#tts-new-char, #tts-new-char-avatar').off('input').on('input', function () {
            updateNewAvatarPreview();
        });

        // 辅助上传图片函数
        async function doUploadAvatarFile(file, speakerName) {
            const apiHost = (window.TTS_API && window.TTS_API.baseUrl) ? window.TTS_API.baseUrl : 'http://127.0.0.1:3000';
            const formData = new FormData();
            formData.append('file', file);
            if (speakerName) formData.append('speaker_name', speakerName);

            const res = await fetch(`${apiHost}/api/speakers/avatar/upload`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: '上传接口错误' }));
                throw new Error(err.detail || '上传失败');
            }
            return await res.json();
        }

        // 点击上传本地头像 (按钮与预览圈均可触发)
        $('#tts-btn-upload-avatar, #tts-new-avatar-preview').off('click').on('click', function () {
            $('#tts-avatar-file-input').val('').click();
        });

        $('#tts-avatar-file-input').off('change').on('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const charName = $('#tts-new-char').val().trim() || '新角色';
            openAvatarCropper({
                image: file,
                charName: charName,
                onSuccess: (res) => {
                    if (res && res.avatar_url) {
                        $('#tts-new-char-avatar').val(res.avatar_url);
                        updateNewAvatarPreview();
                    }
                }
            });
        });

        // 选卡弹窗/快捷填充 (支持一键微调对焦头部)
        $('#tts-btn-pick-char-avatar').off('click').on('click', function () {
            const context = window.SillyTavern?.getContext?.();
            const characters = context?.characters || [];
            if (!characters.length) {
                alert('未检测到酒馆角色卡，请先加载或创建角色卡');
                return;
            }

            const modalHtml = `
                <div id="tts-char-picker-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
                    <div style="width:340px; max-height:80vh; background:#1e1b2e; border:1px solid rgba(196,155,79,0.5); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 8px 32px rgba(0,0,0,0.6); color:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(196,155,79,0.2); padding-bottom:8px;">
                            <span style="font-weight:600; color:#fde047; font-size:14px;">🖼️ 快速选取酒馆角色卡</span>
                            <button id="tts-picker-close" style="background:transparent; border:none; color:#999; font-size:20px; cursor:pointer;">×</button>
                        </div>
                        <div style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px; padding-right:4px;">
                            ${characters.map(c => {
                                const avUrl = c.avatar && context.getThumbnailUrl ? context.getThumbnailUrl('avatar', c.avatar) : `/characters/${c.avatar || ''}`;
                                return `
                                    <div class="tts-picker-item" data-name="${c.name || ''}" data-avatar="${avUrl}" style="display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.05); cursor:pointer; transition:background 0.2s; border:1px solid transparent;">
                                        <img src="${avUrl}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid rgba(196,155,79,0.3);" onerror="this.src='${getDefaultAvatarDataUrl(c.name)}';" />
                                        <span style="font-size:13px; font-weight:500; color:#e5e7eb;">${c.name || '未命名'}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
            $('body').append(modalHtml);

            $('#tts-picker-close').on('click', () => $('#tts-char-picker-modal').remove());
            $('.tts-picker-item').on('click', function () {
                const name = $(this).data('name');
                const avatar = $(this).data('avatar');
                $('#tts-char-picker-modal').remove();

                if (name && !$('#tts-new-char').val().trim()) $('#tts-new-char').val(name);

                if (avatar) {
                    // 呼出裁剪器对焦头部特写
                    openAvatarCropper({
                        image: avatar,
                        charName: name || $('#tts-new-char').val().trim() || '角色',
                        onSuccess: (res) => {
                            if (res && res.avatar_url) {
                                $('#tts-new-char-avatar').val(res.avatar_url);
                                updateNewAvatarPreview();
                            }
                        }
                    });
                }
            });
        });

        // 监听模型选择切换，支持展开自定义 MiniMax Voice ID
        $('#tts-new-model').off('change').on('change', function () {
            if ($(this).val() === '__custom_minimax__') {
                $('#tts-custom-voice-wrap').slideDown(150);
                $('#tts-custom-voice-name').focus();
            } else {
                $('#tts-custom-voice-wrap').slideUp(150);
            }
        });

        // 绑定新角色
        $('#tts-btn-bind-new').off('click').on('click', async function () {
            const charName = $('#tts-new-char').val().trim();
            const customAvatar = $('#tts-new-char-avatar').val().trim();
            let modelName = $('#tts-new-model').val();

            if (!charName) {
                alert('请填写角色名');
                return;
            }
            if (!modelName) {
                alert('请选择语音模型或音色');
                return;
            }

            if (modelName === '__custom_minimax__') {
                let customId = $('#tts-custom-voice-input').val().trim();
                let customName = $('#tts-custom-voice-name').val().trim();
                if (!customId) {
                    alert('请输入 MiniMax Voice ID');
                    $('#tts-custom-voice-input').focus();
                    return;
                }
                const rawId = customId.startsWith('minimax:') ? customId.slice(8) : (customId.startsWith('minimax_') ? customId.slice(8) : customId);
                modelName = `minimax:${rawId}`;

                if (window.TTS_Utils && typeof window.TTS_Utils.saveCustomMiniMaxVoice === 'function') {
                    window.TTS_Utils.saveCustomMiniMaxVoice(rawId, customName || rawId);
                }
            }

            try {
                await window.TTS_API.bindCharacter(charName, modelName);
                if (customAvatar) {
                    setCustomSpeakerAvatar(charName, customAvatar);
                }
                await CTX.Callbacks.refreshData();
                scope.renderDashboardList();
                scope.renderModelOptions();
                $('#tts-new-char').val('');
                $('#tts-new-char-avatar').val('');
                $('#tts-custom-voice-name').val('');
                $('#tts-custom-voice-input').val('');
                $('#tts-custom-voice-wrap').hide();
                $('#tts-new-model').val('');
                updateNewAvatarPreview();
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
            let currentAvatar = '';
            const ctx = window.SillyTavern ? window.SillyTavern.getContext() : null;
            if (ctx && ctx.characterId !== undefined && ctx.characters && ctx.characters[ctx.characterId]) {
                const charObj = ctx.characters[ctx.characterId];
                currentChar = charObj.name || '';
                if (charObj.avatar && ctx.getThumbnailUrl) {
                    currentAvatar = ctx.getThumbnailUrl('avatar', charObj.avatar);
                }
            } else if (ctx && ctx.character) {
                currentChar = ctx.character;
            }
            if (!currentChar && window.TTS_State && window.TTS_State.CURRENT_CHAR) {
                currentChar = window.TTS_State.CURRENT_CHAR;
            }
            if (currentChar) {
                $('#tts-new-char').val(currentChar);
                if (currentAvatar) {
                    $('#tts-new-char-avatar').val(currentAvatar);
                }
                updateNewAvatarPreview();
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
                    setCustomSpeakerAvatar(charName, null);
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
            const apiHost = (window.TTS_API && typeof window.TTS_API.getBaseUrl === 'function')
                ? window.TTS_API.getBaseUrl()
                : (window.TTS_API?.baseUrl || 'http://127.0.0.1:3000');
            window.open(`${apiHost}/admin`, '_blank');
        });

        $(document).off('click.closeDropdown').on('click.closeDropdown', function () {
            $('.tts-custom-select').removeClass('open');
        });
    };
    // ===========================================
    // ⬇️ 渲染模型下拉菜单 (适配本地模型与 MiniMax 云端预设声线)
    // ===========================================
    scope.renderModelOptions = function () {
        const CTX = scope.CTX;
        const $select = $('#tts-new-model');
        const currentVal = $select.val();

        $select.empty();

        const models = (CTX && CTX.CACHE && CTX.CACHE.models) ? CTX.CACHE.models : {};
        const modelKeys = Object.keys(models);
        const { presetVoices, customVoices } = (window.TTS_Utils && typeof window.TTS_Utils.getAllMiniMaxVoices === 'function')
            ? window.TTS_Utils.getAllMiniMaxVoices()
            : { presetVoices: [], customVoices: [] };

        $select.append(`<option disabled ${!currentVal ? 'selected' : ''} value="">🎙️ 请选择语音模型 / 音色...</option>`);

        if (modelKeys.length > 0) {
            const $localGroup = $('<optgroup label="📁 本地 GPT-SoVITS 模型"></optgroup>');
            modelKeys.forEach(k => {
                $localGroup.append(`<option value="${k}">🎙️ ${k}</option>`);
            });
            $select.append($localGroup);
        }

        if (customVoices.length > 0) {
            const $customGroup = $('<optgroup label="✨ 我的自定义克隆音色"></optgroup>');
            customVoices.forEach(v => {
                $customGroup.append(`<option value="minimax:${v.id}">✨ ${v.name} (${v.id})</option>`);
            });
            $select.append($customGroup);
        }

        const $mmGroup = $('<optgroup label="☁️ MiniMax 官方预设声线"></optgroup>');
        presetVoices.forEach(v => {
            $mmGroup.append(`<option value="minimax:${v.id}">☁️ ${v.name} (${v.id})</option>`);
        });
        $mmGroup.append('<option value="__custom_minimax__">✏️ 新增自定义 MiniMax 音色 (输入名称与 ID)...</option>');
        $select.append($mmGroup);

        if (currentVal) {
            $select.val(currentVal);
        }
    };

    // ===========================================
    // ⬇️ 渲染绑定列表 (紧凑卡片 + 头像显示与快捷编辑)
    // ===========================================
    scope.renderDashboardList = function () {
        const CTX = scope.CTX;
        const c = $('#tts-mapping-list').empty();
        const mappings = (CTX && CTX.CACHE && CTX.CACHE.mappings) ? CTX.CACHE.mappings : {};
        const keys = Object.keys(mappings);
        const customAvatars = getCustomSpeakerAvatars();

        $('#tts-mapping-count').text(`已绑定 (${keys.length})`);
        $('#tts-btn-batch-unbind').hide();
        $('#tts-btn-select-all').text('全选');

        if (keys.length === 0) {
            c.append('<div style="text-align:center; padding:12px; color:rgba(220,200,150,0.5); font-size:12px;">暂无绑定角色</div>');
            return;
        }

        keys.forEach(k => {
            const modelName = mappings[k];
            const hasCustom = !!customAvatars[k];
            const avHtml = renderAvatarHtml(k, 'tts-item-avatar', 'width:24px; height:24px; border-radius:50%; object-fit:cover; flex-shrink:0; cursor:pointer; border:1px solid ' + (hasCustom ? '#f59e0b' : 'rgba(196,155,79,0.3)'));
            const displayName = (window.TTS_Utils && typeof window.TTS_Utils.getVoiceDisplayName === 'function')
                ? window.TTS_Utils.getVoiceDisplayName(modelName)
                : modelName;

            const $item = $(`
                <div class="tts-compact-item" style="display:flex; align-items:center; justify-content:space-between; padding:5px 8px; margin-bottom:4px; border-radius:6px; background:rgba(255,255,255,0.04); border:1px solid rgba(196,155,79,0.25);">
                    <div style="display:flex; align-items:center; gap:6px; min-width:0; flex:1;">
                        <input type="checkbox" class="tts-mapping-check" data-char="${k}" style="cursor:pointer;" />
                        <div class="tts-avatar-trigger" title="${hasCustom ? '已自定义专属头像 (点击修改)' : '点击为该角色绑定/修改头像'}" data-char="${k}">
                            ${avHtml}
                        </div>
                        <span style="font-weight:500; color:rgba(220,200,150,0.95); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;" title="${k}">${k}</span>
                        <span style="color:rgba(196,155,79,0.6); font-size:11px;">➔</span>
                        <span style="color:rgba(196,155,79,0.85); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${modelName}">${displayName}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                        <button class="btn-secondary tts-btn-edit-avatar" style="padding:1px 5px; font-size:10.5px; border-radius:3px; background:rgba(255,255,255,0.06); color:#cbd5e1;" title="修改该 Speaker 头像" data-char="${k}">🖼️</button>
                        <button class="btn-red" style="padding:1px 6px; font-size:11px; margin-left:2px; border-radius:3px; background:rgba(220,53,53,0.2); border:1px solid rgba(220,53,53,0.4); color:#fca5a5; cursor:pointer;" onclick="window.TTS_UI.handleUnbind('${k}')" title="解绑此角色">×</button>
                    </div>
                </div>
            `);
            c.append($item);
        });

        // 绑定头像快捷编辑事件 (多功能弹窗: 本地上传 / 选卡 / URL / 还原)
        c.find('.tts-avatar-trigger, .tts-btn-edit-avatar').off('click').on('click', function (e) {
            e.stopPropagation();
            const charName = $(this).data('char');
            if (!charName) return;

            openSpeakerAvatarModal(charName);
        });
    };

    /**
     * 打开单个角色的多功能头像设置弹窗
     */
    function openSpeakerAvatarModal(charName) {
        $('#tts-speaker-avatar-modal').remove();

        const curAvatars = getCustomSpeakerAvatars();
        const currentCustomUrl = curAvatars[charName] || '';
        const currentAvatarHtml = renderAvatarHtml(charName, '', 'width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid rgba(196,155,79,0.6); box-shadow:0 4px 12px rgba(0,0,0,0.5);');

        const modalHtml = `
            <div id="tts-speaker-avatar-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
                <div style="width:360px; max-height:85vh; background:#1b172a; border:1px solid rgba(196,155,79,0.4); border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:14px; box-shadow:0 12px 40px rgba(0,0,0,0.7); color:#fff;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(196,155,79,0.2); padding-bottom:8px;">
                        <span style="font-weight:600; color:#fde047; font-size:14px;">🖼️ 设置【${charName}】头像</span>
                        <button id="tts-av-modal-close" style="background:transparent; border:none; color:#9ca3af; font-size:20px; cursor:pointer;">×</button>
                    </div>

                    <!-- 当前头像展示 -->
                    <div style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:10px 0; background:rgba(0,0,0,0.25); border-radius:8px;">
                        ${currentAvatarHtml}
                        <span style="font-size:11.5px; color:${currentCustomUrl ? '#fde047' : 'rgba(220,200,150,0.7)'};">
                            ${currentCustomUrl ? '已设置专属自定义头像' : '当前使用酒馆角色卡 / 默认头像'}
                        </span>
                    </div>

                    <!-- 操作区域 -->
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <!-- 方式1: 本地电脑选图上传并聚焦头部 -->
                        <div>
                            <button id="tts-av-btn-upload-local" class="btn-primary" style="width:100%; padding:8px 12px; font-size:12px; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
                                📁 从电脑本地选图并对焦面部
                            </button>
                            <input type="file" id="tts-av-file-input" accept="image/*" style="display:none !important;">
                        </div>

                        <!-- 方式2: 从酒馆已有角色卡挑选并聚焦头部 -->
                        <div>
                            <button id="tts-av-btn-pick-card" class="btn-secondary" style="width:100%; padding:8px 12px; font-size:12px; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
                                🖼️ 从酒馆角色卡挑选并对焦特写
                            </button>
                        </div>

                        <!-- 方式3: 手动输入 URL / 相对路径 -->
                        <div style="display:flex; gap:6px; margin-top:2px;">
                            <input type="text" id="tts-av-custom-url-input" value="${currentCustomUrl}" placeholder="输入网络 URL 或 /avatars/ 相对路径" class="tts-modern-input" style="flex:1; min-width:0; font-size:11.5px;">
                            <button id="tts-av-btn-save-url" class="btn-secondary" style="padding:6px 10px; font-size:11.5px; white-space:nowrap;">保存</button>
                        </div>

                        <!-- 方式4: 清除自定义还原默认 -->
                        ${currentCustomUrl ? `
                            <button id="tts-av-btn-clear-custom" class="btn-red" style="width:100%; padding:6px 12px; font-size:11.5px; margin-top:4px; cursor:pointer;">
                                🔄 清除自定义头像 (还原酒馆默认)
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        $('body').append(modalHtml);

        const closeModal = () => $('#tts-speaker-avatar-modal').remove();
        $('#tts-av-modal-close').on('click', closeModal);

        // 1. 本地上传 -> 唤起裁剪对焦
        $('#tts-av-btn-upload-local').on('click', () => {
            $('#tts-av-file-input').val('').click();
        });

        $('#tts-av-file-input').on('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            closeModal();
            openAvatarCropper({
                image: file,
                charName: charName,
                onSuccess: (res) => {
                    if (res && res.avatar_url) {
                        setCustomSpeakerAvatar(charName, res.avatar_url);
                        scope.renderDashboardList();
                    }
                }
            });
        });

        // 2. 从酒馆卡片选取 -> 唤起裁剪对焦
        $('#tts-av-btn-pick-card').on('click', () => {
            closeModal();
            const context = window.SillyTavern?.getContext?.();
            const characters = context?.characters || [];
            if (!characters.length) {
                alert('未检测到酒馆角色卡，请先加载或创建角色卡');
                return;
            }

            const pickerHtml = `
                <div id="tts-char-picker-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
                    <div style="width:340px; max-height:80vh; background:#1e1b2e; border:1px solid rgba(196,155,79,0.5); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 8px 32px rgba(0,0,0,0.6); color:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(196,155,79,0.2); padding-bottom:8px;">
                            <span style="font-weight:600; color:#fde047; font-size:14px;">🖼️ 选取角色卡以对焦特写</span>
                            <button id="tts-picker-close-inner" style="background:transparent; border:none; color:#999; font-size:20px; cursor:pointer;">×</button>
                        </div>
                        <div style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px; padding-right:4px;">
                            ${characters.map(c => {
                                const avUrl = c.avatar && context.getThumbnailUrl ? context.getThumbnailUrl('avatar', c.avatar) : `/characters/${c.avatar || ''}`;
                                return `
                                    <div class="tts-picker-item-for-char" data-name="${c.name || ''}" data-avatar="${avUrl}" style="display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.05); cursor:pointer; transition:background 0.2s; border:1px solid transparent;">
                                        <img src="${avUrl}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid rgba(196,155,79,0.3);" onerror="this.src='${getDefaultAvatarDataUrl(c.name)}';" />
                                        <span style="font-size:13px; font-weight:500; color:#e5e7eb;">${c.name || '未命名'}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
            $('body').append(pickerHtml);

            $('#tts-picker-close-inner').on('click', () => $('#tts-char-picker-modal').remove());
            $('.tts-picker-item-for-char').on('click', function () {
                const avatar = $(this).data('avatar');
                $('#tts-char-picker-modal').remove();
                if (avatar) {
                    openAvatarCropper({
                        image: avatar,
                        charName: charName,
                        onSuccess: (res) => {
                            if (res && res.avatar_url) {
                                setCustomSpeakerAvatar(charName, res.avatar_url);
                                scope.renderDashboardList();
                            }
                        }
                    });
                }
            });
        });

        // 3. 保存 URL
        $('#tts-av-btn-save-url').on('click', () => {
            const url = $('#tts-av-custom-url-input').val().trim();
            setCustomSpeakerAvatar(charName, url || null);
            scope.renderDashboardList();
            closeModal();
        });

        // 4. 清除自定义
        $('#tts-av-btn-clear-custom').on('click', () => {
            setCustomSpeakerAvatar(charName, null);
            scope.renderDashboardList();
            closeModal();
        });
    }

})(window.TTS_UI);

