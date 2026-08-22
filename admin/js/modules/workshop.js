// ==========================================================================
// ST-Direct-TTS Admin Module: Creative Workshop (创作者工坊)
// ==========================================================================

import { state } from '../core/state.js';
import { showNotification, showDialog, closeDialog } from '../core/ui.js';
import { escapeHtml } from '../core/utils.js';

/**
 * 加载所有工坊预设列表
 */
export async function loadWorkshopPresets() {
    const container = document.getElementById('presets-list');
    const badge = document.getElementById('workshop-total-badge');
    if (!container) return;

    container.innerHTML = '<p class="loading">正在加载场景预设...</p>';

    try {
        const response = await fetch('/api/workshop/presets');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.success && Array.isArray(data.presets)) {
            state.allWorkshopPresets = data.presets;
            if (badge) badge.textContent = `${state.allWorkshopPresets.length} 个预设`;
            filterWorkshopPresets();
        } else {
            container.innerHTML = '<p class="placeholder">暂无可用场景预设，点击右上角新建</p>';
        }
    } catch (error) {
        console.error('加载预设失败:', error);
        container.innerHTML = `<p class="placeholder" style="color: var(--accent-danger);">加载预设失败: ${error.message}</p>`;
        showNotification('加载预设失败', 'error');
    }
}

/**
 * 切换工坊分类过滤器
 */
export function switchWorkshopFilter(category, buttonEl) {
    state.currentWorkshopFilter = category;
    document.querySelectorAll('.filter-tabs-pills .pill-btn').forEach(btn => btn.classList.remove('active'));
    if (buttonEl) buttonEl.classList.add('active');
    filterWorkshopPresets();
}

/**
 * 根据分类和搜索词过滤预设并渲染
 */
export function filterWorkshopPresets() {
    const searchInput = document.getElementById('workshop-search-input');
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

    let filtered = state.allWorkshopPresets.filter(p => {
        // 分类过滤
        if (state.currentWorkshopFilter !== 'all' && p.category !== state.currentWorkshopFilter) {
            return false;
        }
        // 搜索关键词过滤 (名称、作者、标签、描述)
        if (query) {
            const name = (p.name || '').toLowerCase();
            const author = (p.author || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
            if (!name.includes(query) && !author.includes(query) && !desc.includes(query) && !tags.includes(query)) {
                return false;
            }
        }
        return true;
    });

    renderWorkshopPresets(filtered);
}

/**
 * 渲染预设卡片列表
 */
export function renderWorkshopPresets(presets) {
    const container = document.getElementById('presets-list');
    if (!container) return;

    if (presets.length === 0) {
        container.innerHTML = '<p class="placeholder">没有找到匹配的场景预设</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'presets-grid';

    presets.forEach(p => {
        const card = document.createElement('div');
        card.className = 'preset-card';

        const isBuiltin = !!p.is_builtin;
        const categoryDisplay = p.category === 'phone_call' ? '📞 电话呼叫' : '👂 私下窃听';
        const tags = Array.isArray(p.tags) ? p.tags : [];

        const tagsHtml = tags.map(t => `<span class="preset-tag">#${escapeHtml(t)}</span>`).join('');

        card.innerHTML = `
            <div class="preset-card-top">
                <div class="preset-card-header">
                    <div class="preset-title-wrap">
                        <h4 class="preset-title">${escapeHtml(p.name || '未命名预设')}</h4>
                        <span class="preset-id-badge">${escapeHtml(p.id || '')}</span>
                    </div>
                    <div class="preset-badges-row">
                        <span class="badge-cat">${categoryDisplay}</span>
                        ${isBuiltin ? '<span class="badge-builtin">官方出厂</span>' : '<span class="badge-custom">自制预设</span>'}
                    </div>
                </div>
                <p class="preset-desc">${escapeHtml(p.description || '暂无描述信息')}</p>
                <div class="preset-tags-row">
                    ${tagsHtml}
                </div>
            </div>
            <div class="preset-card-footer">
                <div class="preset-author-info">
                    <span>👤 ${escapeHtml(p.author || 'User')}</span>
                    <span style="margin-left: 6px; color: var(--text-muted); font-size: 0.75rem;">v${escapeHtml(p.version || '1.0')}</span>
                </div>
                <div class="preset-actions-btns">
                    <button class="btn btn-secondary btn-sm" onclick="exportPreset('${escapeHtml(p.category)}', '${escapeHtml(p.id)}')">📤 导出</button>
                    <button class="btn btn-primary btn-sm" onclick="openEditPresetModal('${escapeHtml(p.category)}', '${escapeHtml(p.id)}')">✏️ 编辑</button>
                    ${!isBuiltin ? `<button class="btn btn-danger btn-sm" onclick="showDeletePresetDialog('${escapeHtml(p.category)}', '${escapeHtml(p.id)}', '${escapeHtml(p.name)}')">🗑️</button>` : ''}
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

/**
 * 打开新建预设弹窗
 */
export function openCreatePresetModal() {
    const titleEl = document.getElementById('preset-modal-title');
    const nameEl = document.getElementById('preset-name');
    const catEl = document.getElementById('preset-category');
    const idEl = document.getElementById('preset-id');
    const authorEl = document.getElementById('preset-author');
    const descEl = document.getElementById('preset-description');
    const tagsEl = document.getElementById('preset-tags');
    const promptEl = document.getElementById('preset-prompt-template');
    const tempEl = document.getElementById('preset-temp');
    const speedEl = document.getElementById('preset-speed');
    const isBuiltinEl = document.getElementById('preset-is-builtin');

    if (titleEl) titleEl.textContent = '✨ 新建场景预设';
    if (nameEl) nameEl.value = '';
    if (catEl) {
        catEl.value = state.currentWorkshopFilter === 'eavesdrop' ? 'eavesdrop' : 'phone_call';
        catEl.disabled = false;
    }
    if (idEl) {
        idEl.value = '';
        idEl.disabled = false;
    }
    if (authorEl) authorEl.value = 'User';
    if (descEl) descEl.value = '';
    if (tagsEl) tagsEl.value = '';
    if (promptEl) promptEl.value = '';
    if (tempEl) tempEl.value = '0.7';
    if (speedEl) speedEl.value = '1.0';
    if (isBuiltinEl) isBuiltinEl.value = 'false';

    showDialog('preset-editor-modal');
}

/**
 * 打开编辑预设弹窗
 */
export async function openEditPresetModal(category, presetId) {
    try {
        const response = await fetch(`/api/workshop/presets/${category}/${presetId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const p = data.preset;

        const titleEl = document.getElementById('preset-modal-title');
        const nameEl = document.getElementById('preset-name');
        const catEl = document.getElementById('preset-category');
        const idEl = document.getElementById('preset-id');
        const authorEl = document.getElementById('preset-author');
        const descEl = document.getElementById('preset-description');
        const tagsEl = document.getElementById('preset-tags');
        const promptEl = document.getElementById('preset-prompt-template');
        const tempEl = document.getElementById('preset-temp');
        const speedEl = document.getElementById('preset-speed');
        const isBuiltinEl = document.getElementById('preset-is-builtin');

        if (titleEl) titleEl.textContent = p.is_builtin ? `👁️ 查看/基于官方预设另存 (${p.name})` : `✏️ 编辑预设 (${p.name})`;
        if (nameEl) nameEl.value = p.name || '';
        if (catEl) {
            catEl.value = p.category || category;
            catEl.disabled = true; // 编辑时锁定分类
        }
        if (idEl) {
            idEl.value = p.id || presetId;
            idEl.disabled = !!p.is_builtin;
        }
        if (authorEl) authorEl.value = p.author || 'User';
        if (descEl) descEl.value = p.description || '';
        if (tagsEl) tagsEl.value = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '');
        if (promptEl) promptEl.value = p.prompt_template || '';

        const params = p.recommended_params || {};
        if (tempEl) tempEl.value = params.temperature !== undefined ? params.temperature : 0.7;
        if (speedEl) speedEl.value = params.speed !== undefined ? params.speed : 1.0;
        if (isBuiltinEl) isBuiltinEl.value = p.is_builtin ? 'true' : 'false';

        showDialog('preset-editor-modal');
    } catch (error) {
        console.error('获取预设详情失败:', error);
        showNotification('获取预设详情失败: ' + error.message, 'error');
    }
}

/**
 * 在 Prompt 模板光标位置插入占位符
 */
export function insertSlot(slotText) {
    const textarea = document.getElementById('preset-prompt-template');
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, startPos) + slotText + text.substring(endPos);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = startPos + slotText.length;
}

/**
 * 保存预设表单
 */
export async function savePresetForm() {
    const nameEl = document.getElementById('preset-name');
    const catEl = document.getElementById('preset-category');
    const idEl = document.getElementById('preset-id');
    const authorEl = document.getElementById('preset-author');
    const descEl = document.getElementById('preset-description');
    const tagsEl = document.getElementById('preset-tags');
    const promptEl = document.getElementById('preset-prompt-template');
    const isBuiltinEl = document.getElementById('preset-is-builtin');
    const tempEl = document.getElementById('preset-temp');
    const speedEl = document.getElementById('preset-speed');

    const name = nameEl ? nameEl.value.trim() : '';
    const category = catEl ? catEl.value : 'phone_call';
    const id = idEl ? idEl.value.trim() : '';
    const author = authorEl ? authorEl.value.trim() : 'User';
    const description = descEl ? descEl.value.trim() : '';
    const rawTags = tagsEl ? tagsEl.value.trim() : '';
    const promptTemplate = promptEl ? promptEl.value.trim() : '';
    const isBuiltin = isBuiltinEl ? isBuiltinEl.value === 'true' : false;

    const temp = parseFloat(tempEl ? tempEl.value : '') || 0.7;
    const speed = parseFloat(speedEl ? speedEl.value : '') || 1.0;

    if (!name) {
        showNotification('请输入预设名称', 'warning');
        return;
    }
    if (!promptTemplate) {
        showNotification('请输入提示词模板 (Prompt Template)', 'warning');
        return;
    }

    const tags = rawTags ? rawTags.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];

    const payload = {
        id: id || undefined,
        name: name,
        category: category,
        author: author || 'User',
        description: description,
        tags: tags,
        prompt_template: promptTemplate,
        recommended_params: {
            temperature: temp,
            speed: speed
        },
        is_builtin: isBuiltin
    };

    const saveBtn = document.getElementById('save-preset-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';
    }

    try {
        const response = await fetch(`/api/workshop/presets/${category}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok && data.success) {
            showNotification(`预设 "${name}" 保存成功！`, 'success');
            closeDialog('preset-editor-modal');
            loadWorkshopPresets();
        } else {
            showNotification(data.detail || '保存预设失败', 'error');
        }
    } catch (error) {
        console.error('保存预设失败:', error);
        showNotification('保存失败: ' + error.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 保存预设';
        }
    }
}

/**
 * 弹出删除预设确认框
 */
export function showDeletePresetDialog(category, presetId, name) {
    state.pendingDeletePreset = { category, presetId, name };
    const displayEl = document.getElementById('delete-preset-name-display');
    if (displayEl) displayEl.textContent = `${name} (${presetId})`;
    showDialog('delete-preset-dialog');
}

/**
 * 执行删除预设
 */
export async function executePresetDeletion() {
    if (!state.pendingDeletePreset) return;
    const { category, presetId, name } = state.pendingDeletePreset;

    const btn = document.getElementById('confirm-delete-preset-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '删除中...';
    }

    try {
        const response = await fetch(`/api/workshop/presets/${category}/${presetId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (response.ok && data.success) {
            showNotification(`已成功删除预设 "${name}"`, 'success');
            closeDialog('delete-preset-dialog');
            loadWorkshopPresets();
        } else {
            showNotification(data.detail || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除预设失败:', error);
        showNotification('删除失败: ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '确认删除';
        }
        state.pendingDeletePreset = null;
    }
}

/**
 * 导出预设为 JSON 文件
 */
export function exportPreset(category, presetId) {
    const exportUrl = `/api/workshop/presets/${category}/${presetId}/export`;
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = `${presetId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification(`正在导出预设 ${presetId}.json`, 'info', 2000);
}

/**
 * 触发文件选择框导入预设
 */
export function triggerImportPresetFile() {
    const fileInput = document.getElementById('workshop-file-input');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
}

/**
 * 处理选择的预设 JSON 文件上传
 */
export async function handlePresetFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
        showNotification('请选择 .json 格式的预设文件', 'warning');
        return;
    }

    showNotification(`正在导入预设文件 ${file.name}...`, 'info');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/workshop/presets/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (response.ok && data.success) {
            showNotification(`🎉 预设 "${data.preset.name}" 导入成功！`, 'success');
            loadWorkshopPresets();
        } else {
            showNotification(data.detail || '导入预设失败', 'error');
        }
    } catch (error) {
        console.error('导入预设文件失败:', error);
        showNotification('导入失败: ' + error.message, 'error');
    }
}
