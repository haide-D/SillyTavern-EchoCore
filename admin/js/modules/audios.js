// ==========================================================================
// ST-Direct-TTS Admin Module: Audio Management
// ==========================================================================

import { API_BASE } from '../core/api.js';
import { state } from '../core/state.js';
import { showNotification, closeDialog } from '../core/ui.js';
import { formatFileSize } from '../core/utils.js';

/**
 * 填充音频管理页面的模型下拉选择框
 */
export function populateModelSelect() {
    const select = document.getElementById('audio-model-select');
    if (!select) return;

    const previousVal = select.value || state.currentSelectedModel;
    select.innerHTML = '<option value="">选择模型...</option>' +
        state.currentModels.map(m => `<option value="${m.name}">${m.name} (${m.audio_stats.total || 0}条)</option>`).join('');

    if (previousVal && state.currentModels.some(m => m.name === previousVal)) {
        select.value = previousVal;
    }
}

/**
 * 从模型管理页快捷跳转到指定模型的音频管理
 */
export function goToAudioManagement(modelName) {
    if (window.switchPage) {
        window.switchPage('audios');
    }
    const select = document.getElementById('audio-model-select');
    if (select) {
        select.value = modelName;
        loadAudios();
    }
}

/**
 * 加载当前选中模型的参考音频列表
 */
export async function loadAudios() {
    const modelSelect = document.getElementById('audio-model-select');
    const modelName = modelSelect ? modelSelect.value : '';
    const uploadBtn = document.getElementById('upload-btn');
    const batchEmotionBtn = document.getElementById('batch-emotion-btn');
    const langFilter = document.getElementById('audio-lang-filter');
    const searchInput = document.getElementById('audio-search-input');
    const selectAllWrap = document.getElementById('audio-select-all-wrap');
    const container = document.getElementById('audios-list');

    state.selectedAudioPaths.clear();
    updateAudioBulkBar();

    if (!modelName) {
        if (container) {
            container.innerHTML = '<p class="placeholder" style="grid-column: 1 / -1;">请先在上方选择一个模型</p>';
        }
        if (uploadBtn) uploadBtn.disabled = true;
        if (batchEmotionBtn) batchEmotionBtn.disabled = true;
        if (langFilter) langFilter.disabled = true;
        if (searchInput) searchInput.disabled = true;
        if (selectAllWrap) selectAllWrap.style.display = 'none';
        const badge = document.getElementById('audio-total-badge');
        if (badge) badge.textContent = '0 个音频';
        return;
    }

    state.currentSelectedModel = modelName;
    if (uploadBtn) uploadBtn.disabled = false;
    if (batchEmotionBtn) batchEmotionBtn.disabled = false;
    if (langFilter) langFilter.disabled = false;
    if (searchInput) searchInput.disabled = false;
    if (selectAllWrap) selectAllWrap.style.display = 'inline-flex';

    try {
        const response = await fetch(`${API_BASE}/models/${encodeURIComponent(modelName)}/audios`);
        const data = await response.json();

        state.currentAudios = data.audios || [];
        filterAudios();
    } catch (error) {
        console.error('加载音频失败:', error);
        if (container) {
            container.innerHTML = '<p class="placeholder" style="grid-column: 1 / -1;">加载音频失败，请检查服务</p>';
        }
    }
}

/**
 * 按语言与搜索词筛选音频列表
 */
export function filterAudios() {
    const langFilter = document.getElementById('audio-lang-filter');
    const searchInput = document.getElementById('audio-search-input');

    const selectedLang = langFilter ? langFilter.value : 'all';
    const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();

    let filtered = state.currentAudios;

    // 语言过滤
    if (selectedLang && selectedLang !== 'all') {
        filtered = filtered.filter(a => a.language === selectedLang);
    }

    // 搜索词过滤 (文件名或情感)
    if (keyword) {
        filtered = filtered.filter(a => 
            a.filename.toLowerCase().includes(keyword) || 
            (a.emotion && a.emotion.toLowerCase().includes(keyword))
        );
    }

    const totalBadge = document.getElementById('audio-total-badge');
    if (totalBadge) {
        totalBadge.textContent = (selectedLang !== 'all' || keyword)
            ? `筛选: ${filtered.length} / 共 ${state.currentAudios.length} 个音频`
            : `共 ${state.currentAudios.length} 个音频`;
    }

    renderAudios(filtered);
    updateAudioBulkBar();
}

/**
 * 渲染音频卡片网格
 */
export function renderAudios(audios) {
    const container = document.getElementById('audios-list');
    if (!container) return;

    if (audios.length === 0) {
        container.innerHTML = '<p class="placeholder" style="grid-column: 1 / -1;">暂无匹配的参考音频</p>';
        return;
    }

    container.innerHTML = audios.map(audio => {
        const isSelected = state.selectedAudioPaths.has(audio.relative_path);
        const encodedModel = encodeURIComponent(state.currentSelectedModel);
        const encodedRelPath = encodeURIComponent(audio.relative_path);
        const escapedRelPath = audio.relative_path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const escapedFilename = audio.filename.replace(/'/g, "\\'");

        return `
        <div class="audio-card ${isSelected ? 'selected' : ''}" data-audio-path="${audio.relative_path}">
            <div class="audio-card-header">
                <input type="checkbox" class="audio-card-checkbox" 
                       ${isSelected ? 'checked' : ''} 
                       onchange="toggleSelectAudio('${escapedRelPath}', this.checked)">
                <div class="filename" title="${audio.filename}">${audio.filename}</div>
            </div>

            <div class="audio-tags">
                <span class="tag-pill tag-lang">🌐 ${audio.language}</span>
                <span class="tag-pill tag-emotion">😊 ${audio.emotion}</span>
                <span class="tag-pill">📦 ${formatFileSize(audio.size)}</span>
            </div>

            <div class="audio-player-wrapper">
                <audio controls preload="none">
                    <source src="${API_BASE}/models/${encodedModel}/audios/stream?relative_path=${encodedRelPath}" type="audio/wav">
                </audio>
            </div>

            <div class="audio-controls">
                <button class="btn btn-secondary btn-sm" onclick="showRenameDialog('${escapedRelPath}', '${escapedFilename}')">
                    ✏️ 重命名
                </button>
                <button class="btn btn-danger-ghost btn-sm" onclick="showDeleteSingleAudioDialog('${escapedRelPath}', '${escapedFilename}')">
                    🗑️ 删除
                </button>
            </div>
        </div>
    `}).join('');
}

/**
 * 切换单个音频选择状态
 */
export function toggleSelectAudio(relPath, checked) {
    if (checked) {
        state.selectedAudioPaths.add(relPath);
    } else {
        state.selectedAudioPaths.delete(relPath);
    }
    updateAudioBulkBar();

    const card = document.querySelector(`.audio-card[data-audio-path="${relPath}"]`);
    if (card) {
        card.classList.toggle('selected', checked);
    }
}

/**
 * 全选/全不选当前可见音频
 */
export function toggleSelectAllAudios(checked) {
    const langFilter = document.getElementById('audio-lang-filter');
    const searchInput = document.getElementById('audio-search-input');
    const selectedLang = langFilter ? langFilter.value : 'all';
    const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();

    let visibleAudios = state.currentAudios;
    if (selectedLang !== 'all') visibleAudios = visibleAudios.filter(a => a.language === selectedLang);
    if (keyword) visibleAudios = visibleAudios.filter(a => a.filename.toLowerCase().includes(keyword) || a.emotion.toLowerCase().includes(keyword));

    visibleAudios.forEach(a => {
        if (checked) {
            state.selectedAudioPaths.add(a.relative_path);
        } else {
            state.selectedAudioPaths.delete(a.relative_path);
        }
    });

    filterAudios();
}

/**
 * 清空音频多选状态
 */
export function clearAudioSelection() {
    state.selectedAudioPaths.clear();
    const selectAllCheckbox = document.getElementById('audio-select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    filterAudios();
}

/**
 * 更新音频批量操作浮动栏
 */
export function updateAudioBulkBar() {
    const bulkBar = document.getElementById('audio-bulk-bar');
    const countEl = document.getElementById('audio-selected-count');
    const selectAllCheckbox = document.getElementById('audio-select-all');

    const count = state.selectedAudioPaths.size;
    if (countEl) countEl.textContent = count;

    if (bulkBar) {
        if (count > 0) {
            bulkBar.classList.add('active');
        } else {
            bulkBar.classList.remove('active');
        }
    }

    if (selectAllCheckbox && state.currentAudios.length > 0) {
        selectAllCheckbox.checked = count > 0 && count === state.currentAudios.length;
    }
}

/**
 * 弹出单个音频删除确认框
 */
export function showDeleteSingleAudioDialog(relPath, filename) {
    state.pendingDeleteAudios = [relPath];
    const countEl = document.getElementById('delete-audio-count');
    if (countEl) countEl.textContent = '1';
    const listEl = document.getElementById('delete-audio-list');
    if (listEl) listEl.innerHTML = `<div>• <strong>${filename}</strong> (${relPath})</div>`;
    const dialog = document.getElementById('delete-audio-dialog');
    if (dialog) dialog.style.display = 'flex';
}

/**
 * 弹出批量音频删除确认框
 */
export function showBatchDeleteAudiosDialog() {
    if (state.selectedAudioPaths.size === 0) {
        showNotification('请先勾选要删除的音频文件', 'warning');
        return;
    }

    state.pendingDeleteAudios = Array.from(state.selectedAudioPaths);
    const countEl = document.getElementById('delete-audio-count');
    if (countEl) countEl.textContent = state.pendingDeleteAudios.length;
    const listEl = document.getElementById('delete-audio-list');
    if (listEl) listEl.innerHTML = state.pendingDeleteAudios.map(p => `<div>• ${p}</div>`).join('');
    const dialog = document.getElementById('delete-audio-dialog');
    if (dialog) dialog.style.display = 'flex';
}

/**
 * 执行音频删除
 */
export async function executeAudioDeletion() {
    if (!state.pendingDeleteAudios || state.pendingDeleteAudios.length === 0) return;

    const confirmBtn = document.getElementById('confirm-delete-audio-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '正在删除...';
    }

    try {
        if (state.pendingDeleteAudios.length === 1) {
            // 单个删除
            const relPath = state.pendingDeleteAudios[0];
            const response = await fetch(
                `${API_BASE}/models/${encodeURIComponent(state.currentSelectedModel)}/audios?relative_path=${encodeURIComponent(relPath)}`,
                { method: 'DELETE' }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || '删除失败');
            showNotification('音频删除成功', 'success');
        } else {
            // 批量删除
            const response = await fetch(
                `${API_BASE}/models/${encodeURIComponent(state.currentSelectedModel)}/audios/batch-delete`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ relative_paths: state.pendingDeleteAudios })
                }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || '批量删除失败');
            showNotification(`已成功删除 ${data.deleted_count || state.pendingDeleteAudios.length} 个音频文件`, 'success');
        }

        closeDialog('delete-audio-dialog');
        state.selectedAudioPaths.clear();
        await loadAudios();
        if (window.loadModels) await window.loadModels(); // 刷新模型总音频数统计
    } catch (error) {
        console.error('删除音频失败:', error);
        showNotification(`删除失败: ${error.message}`, 'error');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '确认删除';
        }
    }
}

/**
 * 弹出批量修改选中音频的情感对话框
 */
export function showBatchSelectedEmotionDialog() {
    if (state.selectedAudioPaths.size === 0) {
        showNotification('请先勾选需要修改情感的音频', 'warning');
        return;
    }

    const countEl = document.getElementById('batch-selected-audio-count');
    if (countEl) countEl.textContent = state.selectedAudioPaths.size;
    const inputEl = document.getElementById('batch-selected-new-emotion');
    if (inputEl) inputEl.value = '';
    const dialog = document.getElementById('batch-selected-emotion-dialog');
    if (dialog) dialog.style.display = 'flex';
}

/**
 * 确认批量修改选中音频的情感
 */
export async function confirmBatchSelectedEmotion() {
    const newEmotionInput = document.getElementById('batch-selected-new-emotion');
    const newEmotion = newEmotionInput ? newEmotionInput.value.trim() : '';
    if (!newEmotion) {
        showNotification('请输入新情感标签', 'warning');
        return;
    }

    const relPaths = Array.from(state.selectedAudioPaths);

    try {
        const response = await fetch(
            `${API_BASE}/models/${encodeURIComponent(state.currentSelectedModel)}/audios/batch-selected-emotion`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    relative_paths: relPaths,
                    new_emotion: newEmotion
                })
            }
        );

        const data = await response.json();
        if (response.ok && data.success) {
            showNotification(`成功修改 ${data.updated_count || relPaths.length} 个音频的情感为 "${newEmotion}"`, 'success');
            closeDialog('batch-selected-emotion-dialog');
            state.selectedAudioPaths.clear();
            await loadAudios();
            if (window.loadModels) await window.loadModels();
        } else {
            showNotification(data.detail || data.error || '批量修改情感失败', 'error');
        }
    } catch (error) {
        console.error('批量修改情感异常:', error);
        showNotification('批量修改情感请求失败', 'error');
    }
}

/**
 * 弹出音频上传对话框
 */
export function showUploadDialog() {
    if (!state.currentSelectedModel) {
        showNotification('请先选择一个模型', 'warning');
        return;
    }
    clearUploadFiles();
    const dialog = document.getElementById('upload-dialog');
    if (dialog) dialog.style.display = 'flex';
}

/**
 * 预览即将上传的音频文件
 */
export function previewUploadFiles() {
    const fileInput = document.getElementById('upload-file');
    const previewBox = document.getElementById('upload-files-preview-box');
    const countEl = document.getElementById('upload-selected-count');
    const sizeEl = document.getElementById('upload-selected-size');
    const listEl = document.getElementById('upload-files-list');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (previewBox) previewBox.style.display = 'none';
        return;
    }

    const files = Array.from(fileInput.files);
    let totalBytes = 0;

    if (listEl) {
        listEl.innerHTML = files.map(f => {
            totalBytes += f.size;
            return `
                <div class="upload-file-item">
                    <span class="file-name" title="${f.name}">🎵 ${f.name}</span>
                    <span class="file-size">${formatFileSize(f.size)}</span>
                </div>
            `;
        }).join('');
    }

    if (countEl) countEl.textContent = files.length;
    if (sizeEl) sizeEl.textContent = formatFileSize(totalBytes);
    if (previewBox) previewBox.style.display = 'block';
}

/**
 * 清空上传文件选择
 */
export function clearUploadFiles() {
    const fileInput = document.getElementById('upload-file');
    if (fileInput) fileInput.value = '';
    const previewBox = document.getElementById('upload-files-preview-box');
    if (previewBox) previewBox.style.display = 'none';
    const progressContainer = document.getElementById('audio-upload-progress-container');
    if (progressContainer) progressContainer.style.display = 'none';
}

/**
 * 执行音频文件上传
 */
export async function uploadAudio() {
    const langEl = document.getElementById('upload-language');
    const emotionEl = document.getElementById('upload-emotion');
    const language = langEl ? langEl.value : 'Chinese';
    const emotion = (emotionEl ? emotionEl.value.trim() : '') || 'default';
    const fileInput = document.getElementById('upload-file');
    const files = fileInput ? fileInput.files : [];
    const confirmBtn = document.getElementById('confirm-upload-btn');
    const progressContainer = document.getElementById('audio-upload-progress-container');
    const progressBar = document.getElementById('audio-upload-progress-bar');
    const progressText = document.getElementById('audio-upload-progress-text');
    const progressPercent = document.getElementById('audio-upload-progress-percent');

    if (!files || files.length === 0) {
        showNotification('请选择至少一个音频文件', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('language', language);
    formData.append('emotion', emotion);

    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
        if (confirmBtn) confirmBtn.disabled = true;
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';
        if (progressText) progressText.textContent = `正在上传 ${files.length} 个音频文件...`;

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                if (progressBar) progressBar.style.width = percentComplete + '%';
                if (progressPercent) progressPercent.textContent = percentComplete + '%';
                if (progressText) progressText.textContent = percentComplete < 100 ? `正在上传 (${percentComplete}%)...` : '音频时长校验与格式处理中...';
            }
        });

        xhr.addEventListener('load', async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                let result = {};
                try {
                    result = JSON.parse(xhr.responseText);
                } catch (e) {}

                if (result.failed_count && result.failed_count > 0) {
                    const failedNames = (result.failed_files || []).map(f => `${f.filename}: ${f.error}`).join('\n');
                    showNotification(`部分上传完成：成功 ${result.uploaded_count} 个，失败 ${result.failed_count} 个。\n${failedNames}`, 'warning', 6000);
                } else {
                    showNotification(result.message || `成功上传 ${result.uploaded_count || files.length} 个音频文件！`, 'success', 4000);
                }

                closeDialog('upload-dialog');
                clearUploadFiles();
                await loadAudios();
                if (window.loadModels) await window.loadModels();
            } else {
                let detail = '上传失败';
                try {
                    const data = JSON.parse(xhr.responseText);
                    detail = data.detail || detail;
                } catch (e) {}
                showNotification(`上传出错: ${detail}`, 'error');
            }
            if (confirmBtn) confirmBtn.disabled = false;
            if (progressContainer) progressContainer.style.display = 'none';
        });

        xhr.addEventListener('error', () => {
            showNotification('上传请求失败，请检查后端网络与服务状态', 'error');
            if (confirmBtn) confirmBtn.disabled = false;
            if (progressContainer) progressContainer.style.display = 'none';
        });

        xhr.open('POST', `${API_BASE}/models/${encodeURIComponent(state.currentSelectedModel)}/audios/batch-upload`);
        xhr.send(formData);
    } catch (error) {
        console.error('音频上传异常:', error);
        showNotification(`上传异常: ${error.message}`, 'error');
        if (confirmBtn) confirmBtn.disabled = false;
        if (progressContainer) progressContainer.style.display = 'none';
    }
}

/**
 * 弹出音频重命名对话框
 */
export function showRenameDialog(relativePath, currentFilename) {
    state.currentRenameContext = { modelName: state.currentSelectedModel, relativePath };
    const nameInput = document.getElementById('rename-new-filename');
    if (nameInput) nameInput.value = currentFilename;
    const dialog = document.getElementById('rename-audio-dialog');
    if (dialog) dialog.style.display = 'flex';
}

/**
 * 确认重命名音频
 */
export async function confirmRename() {
    if (!state.currentRenameContext) return;

    const nameInput = document.getElementById('rename-new-filename');
    const newFilename = nameInput ? nameInput.value.trim() : '';
    if (!newFilename) {
        showNotification('请输入新文件名', 'warning');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/models/${encodeURIComponent(state.currentRenameContext.modelName)}/audios/rename?relative_path=${encodeURIComponent(state.currentRenameContext.relativePath)}&new_filename=${encodeURIComponent(newFilename)}`,
            { method: 'PUT' }
        );

        const data = await response.json();

        if (response.ok) {
            showNotification('音频重命名成功', 'success');
            closeDialog('rename-audio-dialog');
            await loadAudios();
            if (window.loadModels) await window.loadModels();
        } else {
            showNotification(data.detail || data.error || '重命名失败', 'error');
        }
    } catch (error) {
        console.error('重命名音频失败:', error);
        showNotification('重命名失败', 'error');
    }
}

/**
 * 弹出基于旧情感批量替换对话框
 */
export function showBatchEmotionDialog(modelName) {
    state.currentBatchEmotionModel = modelName;
    const oldInput = document.getElementById('batch-old-emotion');
    const newInput = document.getElementById('batch-new-emotion');
    if (oldInput) oldInput.value = '';
    if (newInput) newInput.value = '';
    const dialog = document.getElementById('batch-emotion-dialog');
    if (dialog) dialog.style.display = 'flex';
}

/**
 * 从音频管理页直接触发基于旧情感批量替换
 */
export function showBatchEmotionDialogFromAudios() {
    if (!state.currentSelectedModel) {
        showNotification('请先选择模型', 'warning');
        return;
    }
    showBatchEmotionDialog(state.currentSelectedModel);
}

/**
 * 确认执行按旧情感批量替换
 */
export async function confirmBatchEmotion() {
    if (!state.currentBatchEmotionModel) return;

    const oldInput = document.getElementById('batch-old-emotion');
    const newInput = document.getElementById('batch-new-emotion');
    const oldEmotion = oldInput ? oldInput.value.trim() : '';
    const newEmotion = newInput ? newInput.value.trim() : '';

    if (!oldEmotion || !newEmotion) {
        showNotification('请输入旧情感和新情感标签', 'warning');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/models/${encodeURIComponent(state.currentBatchEmotionModel)}/audios/batch-emotion?old_emotion=${encodeURIComponent(oldEmotion)}&new_emotion=${encodeURIComponent(newEmotion)}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok) {
            showNotification(`成功将 ${data.updated_count || 0} 个文件的 "${oldEmotion}" 替换为 "${newEmotion}"`, 'success');
            closeDialog('batch-emotion-dialog');

            if (state.currentSelectedModel === state.currentBatchEmotionModel) {
                await loadAudios();
            }
            if (window.loadModels) await window.loadModels();
        } else {
            showNotification(data.detail || data.error || '批量替换失败', 'error');
        }
    } catch (error) {
        console.error('批量修改失败:', error);
        showNotification('批量修改失败', 'error');
    }
}
