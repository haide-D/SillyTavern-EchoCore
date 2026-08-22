// ==========================================================================
// ST-Direct-TTS Admin Module: Model Management
// ==========================================================================

import { API_BASE } from '../core/api.js';
import { state } from '../core/state.js';
import { showNotification, closeDialog } from '../core/ui.js';
import { populateModelSelect } from './audios.js';

/**
 * 加载模型列表
 */
export async function loadModels() {
    try {
        const response = await fetch(`${API_BASE}/models`);
        const data = await response.json();

        state.currentModels = data.models || [];
        // 清理已勾选但不存在的模型
        const existingNames = new Set(state.currentModels.map(m => m.name));
        state.selectedModelNames = new Set([...state.selectedModelNames].filter(name => existingNames.has(name)));
        
        filterModels();
    } catch (error) {
        console.error('加载模型失败:', error);
        const container = document.getElementById('models-list');
        if (container) {
            container.innerHTML = '<p class="placeholder">加载模型失败，请检查后端服务是否正常运行</p>';
        }
    }
}

/**
 * 根据关键词筛选模型并刷新视图
 */
export function filterModels() {
    const searchInput = document.getElementById('model-search-input');
    const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();

    let filtered = state.currentModels;
    if (keyword) {
        filtered = state.currentModels.filter(m => m.name.toLowerCase().includes(keyword));
    }

    const totalBadge = document.getElementById('model-total-badge');
    if (totalBadge) {
        totalBadge.textContent = keyword 
            ? `筛选: ${filtered.length} / 共 ${state.currentModels.length} 个模型`
            : `共 ${state.currentModels.length} 个模型`;
    }

    renderModels(filtered);
    updateModelBulkBar();
}

/**
 * 渲染模型卡片列表
 */
export function renderModels(models) {
    const container = document.getElementById('models-list');
    if (!container) return;

    if (models.length === 0) {
        container.innerHTML = '<p class="placeholder" style="grid-column: 1 / -1;">未找到符合条件的模型</p>';
        return;
    }

    container.innerHTML = models.map(model => {
        const isSelected = state.selectedModelNames.has(model.name);
        return `
        <div class="model-card ${model.valid ? '' : 'invalid'} ${isSelected ? 'selected' : ''}" data-model-name="${model.name}">
            <div class="model-card-header">
                <div class="model-card-title-wrap">
                    <input type="checkbox" class="model-card-checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           onchange="toggleSelectModel('${model.name}', this.checked)">
                    <span class="model-card-title" title="${model.name}">${model.name}</span>
                </div>
                <span class="status-badge ${model.valid ? 'status-success' : 'status-error'}">
                    ${model.valid ? '● 完整可用' : '● 权重缺失'}
                </span>
            </div>

            <div class="model-files">
                <div class="file-status ${model.files.gpt_weights ? 'valid' : 'invalid'}">
                    <span>GPT 权重 (.ckpt)</span>
                    <span class="file-status-pill">${model.files.gpt_weights ? '已具备' : '缺失'}</span>
                </div>
                <div class="file-status ${model.files.sovits_weights ? 'valid' : 'invalid'}">
                    <span>SoVITS 权重 (.pth)</span>
                    <span class="file-status-pill">${model.files.sovits_weights ? '已具备' : '缺失'}</span>
                </div>
                <div class="file-status ${model.files.reference_audios ? 'valid' : 'invalid'}">
                    <span>参考音频目录</span>
                    <span class="file-status-pill">${model.files.reference_audios ? '已具备' : '缺失'}</span>
                </div>
            </div>

            <div class="model-stats">
                <div class="stat-item">
                    <div class="stat-value">${model.audio_stats.total || 0}</div>
                    <div class="stat-label">参考音频数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Object.keys(model.audio_stats.by_emotion || {}).length}</div>
                    <div class="stat-label">情感标签数</div>
                </div>
            </div>

            <div class="model-actions">
                <button class="btn btn-secondary btn-sm" onclick="goToAudioManagement('${model.name}')" title="进入音频管理">
                    🎵 音频 (${model.audio_stats.total || 0})
                </button>
                <button class="btn btn-secondary btn-sm" onclick="showBatchEmotionDialog('${model.name}')" title="批量替换情感前缀">
                    🏷️ 情感
                </button>
                <button class="btn btn-danger-ghost btn-sm" onclick="showDeleteSingleModelDialog('${model.name}')" title="删除该模型">
                    🗑️ 删除
                </button>
            </div>
        </div>
    `}).join('');
}

/**
 * 切换单个模型勾选状态
 */
export function toggleSelectModel(modelName, checked) {
    if (checked) {
        state.selectedModelNames.add(modelName);
    } else {
        state.selectedModelNames.delete(modelName);
    }
    updateModelBulkBar();
    
    // 更新卡片高亮类
    const card = document.querySelector(`.model-card[data-model-name="${modelName}"]`);
    if (card) {
        card.classList.toggle('selected', checked);
    }
}

/**
 * 全选/全不选当前可见模型
 */
export function toggleSelectAllModels(checked) {
    const searchInput = document.getElementById('model-search-input');
    const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const visibleModels = keyword 
        ? state.currentModels.filter(m => m.name.toLowerCase().includes(keyword))
        : state.currentModels;

    visibleModels.forEach(m => {
        if (checked) {
            state.selectedModelNames.add(m.name);
        } else {
            state.selectedModelNames.delete(m.name);
        }
    });

    filterModels();
}

/**
 * 清空模型多选状态
 */
export function clearModelSelection() {
    state.selectedModelNames.clear();
    const selectAllCheckbox = document.getElementById('model-select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    filterModels();
}

/**
 * 更新模型批量操作浮动栏
 */
export function updateModelBulkBar() {
    const bulkBar = document.getElementById('model-bulk-bar');
    const countEl = document.getElementById('model-selected-count');
    const selectAllCheckbox = document.getElementById('model-select-all');

    const count = state.selectedModelNames.size;
    if (countEl) countEl.textContent = count;

    if (bulkBar) {
        if (count > 0) {
            bulkBar.classList.add('active');
        } else {
            bulkBar.classList.remove('active');
        }
    }

    if (selectAllCheckbox && state.currentModels.length > 0) {
        selectAllCheckbox.checked = count > 0 && count === state.currentModels.length;
    }
}

/**
 * 弹出单个模型删除确认框
 */
export function showDeleteSingleModelDialog(modelName) {
    state.pendingDeleteModels = [modelName];
    const listEl = document.getElementById('delete-model-list');
    if (listEl) {
        listEl.innerHTML = `<div>• <strong>${modelName}</strong> (包含权重与参考音频)</div>`;
    }
    const dialog = document.getElementById('delete-model-dialog');
    if (dialog) dialog.style.display = 'flex';
}

/**
 * 弹出批量模型删除确认框
 */
export function showBatchDeleteModelsDialog() {
    if (state.selectedModelNames.size === 0) {
        showNotification('请先勾选要删除的模型', 'warning');
        return;
    }

    state.pendingDeleteModels = Array.from(state.selectedModelNames);
    const listEl = document.getElementById('delete-model-list');
    if (listEl) {
        listEl.innerHTML = state.pendingDeleteModels.map(name => `<div>• <strong>${name}</strong></div>`).join('');
    }
    const dialog = document.getElementById('delete-model-dialog');
    if (dialog) dialog.style.display = 'flex';
}

/**
 * 执行模型删除 (单选或批量)
 */
export async function executeModelDeletion() {
    if (!state.pendingDeleteModels || state.pendingDeleteModels.length === 0) return;

    const confirmBtn = document.getElementById('confirm-delete-model-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '正在安全删除...';
    }

    try {
        let result;
        if (state.pendingDeleteModels.length === 1) {
            // 单个删除
            const modelName = state.pendingDeleteModels[0];
            const response = await fetch(`${API_BASE}/models/${encodeURIComponent(modelName)}`, {
                method: 'DELETE'
            });
            result = await response.json();
            if (!response.ok) throw new Error(result.detail || result.error || '删除失败');
            
            let msg = `模型 "${modelName}" 已安全删除`;
            if (result.unbound_characters && result.unbound_characters.length > 0) {
                msg += ` (已同步解除角色 [${result.unbound_characters.join(', ')}] 的音色绑定)`;
            }
            showNotification(msg, 'success', 5000);
        } else {
            // 批量删除
            const response = await fetch(`${API_BASE}/models/batch-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ models: state.pendingDeleteModels })
            });
            result = await response.json();
            if (!response.ok) throw new Error(result.detail || result.error || '批量删除失败');

            let msg = `已成功删除 ${result.total_deleted || result.deleted_models?.length || 0} 个模型`;
            if (result.unbound_characters && result.unbound_characters.length > 0) {
                msg += ` (已解除绑定: ${result.unbound_characters.join(', ')})`;
            }
            showNotification(msg, 'success', 5000);
        }

        closeDialog('delete-model-dialog');
        state.selectedModelNames.clear();
        await loadModels();
        populateModelSelect();
    } catch (error) {
        console.error('删除模型失败:', error);
        showNotification(`删除失败: ${error.message}`, 'error');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '确认永久删除';
        }
    }
}

/**
 * 弹出新建模型对话框
 */
export function showCreateModelDialog() {
    const dialog = document.getElementById('create-model-dialog');
    if (dialog) dialog.style.display = 'flex';
    const nameInput = document.getElementById('new-model-name');
    if (nameInput) nameInput.value = '';
    clearModelFile('gpt');
    clearModelFile('sovits');
    const progressContainer = document.getElementById('upload-progress-container');
    if (progressContainer) progressContainer.style.display = 'none';
}

/**
 * 预览新建模型上传文件
 */
export function previewModelFile(type) {
    const fileInput = document.getElementById(`${type}-model-file`);
    const preview = document.getElementById(`${type}-file-preview`);
    if (!fileInput || !preview) return;

    const fileInfo = preview.querySelector('.file-info');

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

        if (file.size > 2 * 1024 * 1024 * 1024) {
            showNotification('文件大小超过 2GB 限制', 'error');
            fileInput.value = '';
            return;
        }

        const expectedExt = type === 'gpt' ? '.ckpt' : '.pth';
        if (!file.name.toLowerCase().endsWith(expectedExt)) {
            showNotification(`请选择 ${expectedExt} 格式的文件`, 'error');
            fileInput.value = '';
            return;
        }

        if (fileInfo) fileInfo.textContent = `📁 ${file.name} (${sizeMB} MB)`;
        preview.style.display = 'flex';
    } else {
        preview.style.display = 'none';
    }
}

/**
 * 清除已选择的新建模型文件
 */
export function clearModelFile(type) {
    const fileInput = document.getElementById(`${type}-model-file`);
    const preview = document.getElementById(`${type}-file-preview`);
    if (fileInput) fileInput.value = '';
    if (preview) preview.style.display = 'none';
}

/**
 * 执行创建模型与权重上传
 */
export async function createModel() {
    const nameInput = document.getElementById('new-model-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const gptFileInput = document.getElementById('gpt-model-file');
    const sovitsFileInput = document.getElementById('sovits-model-file');
    const createBtn = document.getElementById('create-model-btn');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');
    const progressPercent = document.getElementById('upload-progress-percent');

    if (!name) {
        showNotification('请输入模型名称', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('model_name', name);

    if (gptFileInput && gptFileInput.files.length > 0) {
        formData.append('gpt_file', gptFileInput.files[0]);
    }
    if (sovitsFileInput && sovitsFileInput.files.length > 0) {
        formData.append('sovits_file', sovitsFileInput.files[0]);
    }

    try {
        if (createBtn) createBtn.disabled = true;
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';
        if (progressText) progressText.textContent = '正在创建模型...';

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                if (progressBar) progressBar.style.width = percentComplete + '%';
                if (progressPercent) progressPercent.textContent = percentComplete + '%';
                if (progressText) progressText.textContent = percentComplete < 100 ? '正在上传文件...' : '后端处理中...';
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                showNotification(`模型 "${name}" 创建成功！`, 'success');
                closeDialog('create-model-dialog');
                loadModels();
                populateModelSelect();
            } else {
                let detail = '创建失败';
                try {
                    const data = JSON.parse(xhr.responseText);
                    detail = data.detail || detail;
                } catch (e) {}
                showNotification(detail, 'error');
            }
            if (createBtn) createBtn.disabled = false;
            if (progressContainer) progressContainer.style.display = 'none';
        });

        xhr.addEventListener('error', () => {
            showNotification('创建请求出错，请检查后端服务', 'error');
            if (createBtn) createBtn.disabled = false;
            if (progressContainer) progressContainer.style.display = 'none';
        });

        xhr.open('POST', `${API_BASE}/models/create`);
        xhr.send(formData);
    } catch (error) {
        console.error('创建模型失败:', error);
        showNotification('创建模型失败', 'error');
        if (createBtn) createBtn.disabled = false;
        if (progressContainer) progressContainer.style.display = 'none';
    }
}
