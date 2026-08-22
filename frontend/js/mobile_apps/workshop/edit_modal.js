/**
 * 剧本新建与编辑 Modal 模块 (上下分栏解耦体系)
 */
import { SVG } from './svgs.js';
import { DEFAULT_WORKSHOP_TEMPLATES, WORKSHOP_SLOTS } from './templates.js';
import { savePreset } from './api.js';
import { showToast } from './executor.js';

export function openEditModal(category, preset, onSaved) {
    const isNew = !preset;
    const isBuiltin = preset && !!preset.is_builtin;

    $('#ws-edit-modal-overlay').remove();

    const categoryDef = DEFAULT_WORKSHOP_TEMPLATES[category] || DEFAULT_WORKSHOP_TEMPLATES.phone_call;

    const initialData = preset || {
        id: `custom_${Date.now().toString(36)}`,
        name: '',
        category: category,
        author: '用户',
        version: '2.0.0',
        description: '',
        plot_template: categoryDef.plot,
        system_template: categoryDef.system,
        recommended_params: { temperature: 0.8, speed: 1.0 }
    };

    const initialPlot = initialData.plot_template || initialData.prompt_template || categoryDef.plot;
    const initialSystem = initialData.system_template || categoryDef.system;

    const slots = WORKSHOP_SLOTS[category] || WORKSHOP_SLOTS.phone_call;
    const plotSlotHtml = slots.plot.map(s => `<button type="button" class="ws-slot-btn" data-target="#ws-input-plot" data-slot="${s}">${s}</button>`).join('');
    const systemSlotHtml = slots.system.map(s => `<button type="button" class="ws-slot-btn" data-target="#ws-input-system" data-slot="${s}">${s}</button>`).join('');

    const modalHtml = `
        <div class="ws-modal-overlay show" id="ws-edit-modal-overlay">
            <div class="ws-modal ws-modal-lg">
                <div class="ws-modal-header">
                    <h3 class="ws-modal-title">
                        ${SVG.edit} ${isNew ? '新建剧本预设' : (isBuiltin ? '查看出厂剧本 (另存为自定义)' : '编辑剧本预设')}
                    </h3>
                    <button class="ws-modal-close" id="ws-modal-close-btn">✕</button>
                </div>
                <div class="ws-modal-body">
                    <!-- 基础信息行 -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="ws-form-group">
                            <label class="ws-form-label">剧本标识 (ID):</label>
                            <input type="text" class="ws-form-input" id="ws-input-id" value="${initialData.id}" ${(!isNew && !isBuiltin) ? 'readonly' : ''}>
                        </div>
                        <div class="ws-form-group">
                            <label class="ws-form-label">剧本名称:</label>
                            <input type="text" class="ws-form-input" id="ws-input-name" placeholder="如: 午夜私语、紧急求援..." value="${initialData.name}">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 10px;">
                        <div class="ws-form-group">
                            <label class="ws-form-label">作者 ID / 署名:</label>
                            <input type="text" class="ws-form-input" id="ws-input-author" placeholder="作者名" value="${initialData.author || '用户'}">
                        </div>
                        <div class="ws-form-group">
                            <label class="ws-form-label">场景描述:</label>
                            <input type="text" class="ws-form-input" id="ws-input-desc" placeholder="简要描述触发场景与互动风格..." value="${initialData.description}">
                        </div>
                    </div>

                    <!-- 上栏：主题与剧情细节设定 -->
                    <div class="ws-section-box">
                        <div class="ws-section-header">
                            <span class="ws-section-title">📝 上栏：主题与剧情细节设定 (核心创作区)</span>
                            <span style="font-size:11px; color:#fde047;">✨ 剧情插槽</span>
                        </div>
                        <p class="ws-section-subtitle">编写剧情主题、通话动机、语气张力与角色行为要求：</p>
                        <textarea class="ws-textarea" id="ws-input-plot" style="height: 130px;" placeholder="编写主题、剧情起因与创作细节...">${initialPlot}</textarea>
                        <div class="ws-slot-section" style="padding: 5px 8px;">
                            <div class="ws-slot-category">
                                <span class="ws-slot-cat-title">剧情插槽:</span>
                                ${plotSlotHtml}
                            </div>
                        </div>
                    </div>

                    <!-- 下栏：系统上下文注入与输出规范 -->
                    <div class="ws-section-box">
                        <div class="ws-section-header">
                            <span class="ws-section-title">⚙️ 下栏：系统上下文注入与输出规范</span>
                            <button type="button" class="ws-btn-mini" id="ws-reset-system-btn">↺ 恢复官方默认模板</button>
                        </div>
                        <p class="ws-section-subtitle">包含聊天历史、角色卡/世界书设定、情绪列表、TTS纯台词铁律及严格 JSON 格式。新建时固定预填官方模板，支持直接自由微调：</p>
                        <textarea class="ws-textarea" id="ws-input-system" style="height: 140px;" placeholder="系统注入与输出规范...">${initialSystem}</textarea>
                        <div class="ws-slot-section" style="padding: 5px 8px;">
                            <div class="ws-slot-category">
                                <span class="ws-slot-cat-title">系统插槽:</span>
                                ${systemSlotHtml}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ws-modal-footer">
                    <button class="ws-tool-btn ws-tool-btn-secondary" id="ws-modal-cancel-btn">取消</button>
                    <button class="ws-tool-btn ws-tool-btn-primary" id="ws-modal-save-btn">保存剧本</button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    // 插槽点击插入至对应文本框
    $('#ws-edit-modal-overlay .ws-slot-btn').on('click', function () {
        const slot = $(this).data('slot');
        const targetSelector = $(this).data('target') || '#ws-input-plot';
        const $textarea = $(targetSelector);
        if (!$textarea.length) return;
        
        const dom = $textarea[0];
        const start = dom.selectionStart || 0;
        const end = dom.selectionEnd || 0;
        const text = $textarea.val();
        $textarea.val(text.substring(0, start) + slot + text.substring(end));
        dom.selectionStart = dom.selectionEnd = start + slot.length;
        $textarea.focus();
    });

    // 恢复官方默认系统注入模板
    $('#ws-reset-system-btn').on('click', function () {
        $('#ws-input-system').val(categoryDef.system);
        showToast('已恢复为官方标准系统注入模板');
    });

    const closeModal = () => $('#ws-edit-modal-overlay').remove();
    $('#ws-modal-close-btn, #ws-modal-cancel-btn').on('click', closeModal);

    // 保存
    $('#ws-modal-save-btn').on('click', async () => {
        let idVal = $('#ws-input-id').val().trim();
        const nameVal = $('#ws-input-name').val().trim();
        const authorVal = $('#ws-input-author').val().trim() || '用户';
        const descVal = $('#ws-input-desc').val().trim();
        const plotVal = $('#ws-input-plot').val().trim();
        const sysVal = $('#ws-input-system').val().trim();

        if (!nameVal) {
            alert('请输入剧本名称');
            return;
        }
        if (!plotVal) {
            alert('上栏「主题与剧情细节设定」不能为空');
            return;
        }

        if (isBuiltin && idVal === preset.id) {
            idVal = `${idVal}_copy_${Date.now().toString(36)}`;
        }

        const combinedPrompt = sysVal ? `${plotVal}\n\n${sysVal}` : plotVal;

        const payload = {
            id: idVal,
            name: nameVal,
            category: category,
            author: authorVal,
            version: initialData.version || '2.0.0',
            description: descVal,
            plot_template: plotVal,
            system_template: sysVal,
            prompt_template: combinedPrompt,
            recommended_params: initialData.recommended_params || { temperature: 0.8 }
        };

        try {
            await savePreset(category, payload);
            showToast(`剧本「${nameVal}」保存成功`);
            closeModal();
            if (typeof onSaved === 'function') onSaved();
        } catch (e) {
            alert(`保存失败: ${e.message}`);
        }
    });
}
