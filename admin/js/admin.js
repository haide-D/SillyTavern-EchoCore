// ==========================================================================
// ST-Direct-TTS Modern Admin Console Controller
// Version: 3.0.0
// ==========================================================================

const API_BASE = '/api/admin';

// ==================== 全局状态 ====================
let currentModels = [];
let currentSelectedModel = '';
let currentAudios = [];
let selectedModelNames = new Set();
let selectedAudioPaths = new Set();
let pendingDeleteModels = [];
let pendingDeleteAudios = [];

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    // 导航切换
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });

    // 初始化加载
    loadDashboard();
    loadModels();
    loadSettings();

    // 绑定 LLM 相关测试与选择
    bindFetchModelsButton();
    bindTestConnectionButton();
    bindAnalysisLLMButtons();
    bindSettingsTabs();

    // 加载 GPT-SoVITS 扩展配置
    setTimeout(() => {
        loadSovitsConfig();
        loadSovitsStatus();
    }, 500);

    // 显示通告弹窗
    const noticeDialog = document.getElementById('notice-dialog');
    if (noticeDialog) {
        noticeDialog.style.display = 'flex';
    }
});

// ==================== 页面导航 ====================
function switchPage(pageName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const targetNav = document.querySelector(`[data-page="${pageName}"]`);
    if (targetNav) targetNav.classList.add('active');

    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById(pageName);
    if (targetPage) targetPage.classList.add('active');

    if (pageName === 'audios') {
        populateModelSelect();
    }
}

// ==================== 现代化 Toast 消息通知 ====================
function showNotification(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span style="font-size: 1.1rem; line-height: 1;">${icons[type] || 'ℹ️'}</span>
        <span style="flex: 1;">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, duration);
}

// ==================== 对话框通用控制 ====================
function closeDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.style.display = 'none';
    }
}

// ==================== 仪表盘 ====================
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();

        // GPT-SoVITS 服务检测
        if (data.sovits_service) {
            const sovits = data.sovits_service;
            const statusEl = document.getElementById('sovits-status');
            const stateEl = document.getElementById('sovits-state');

            if (sovits.accessible) {
                statusEl.textContent = '运行中';
                statusEl.className = 'status-badge status-success';
                stateEl.textContent = '服务可访问 (OK)';
            } else {
                statusEl.textContent = '未运行';
                statusEl.className = 'status-badge status-error';
                stateEl.textContent = sovits.error || '无法连接';
            }
            document.getElementById('sovits-url').textContent = sovits.url;
        }

        // 检查版本更新
        checkVersion();
    } catch (error) {
        console.error('加载仪表盘失败:', error);
    }
}

function refreshStatus() {
    showNotification('正在刷新系统状态...', 'info');
    loadDashboard();
}

// ==========================================================================
// 模块 3: 模型管理体系 (完整搜索、多选、批量安全删除与角色解绑)
// ==========================================================================

async function loadModels() {
    try {
        const response = await fetch(`${API_BASE}/models`);
        const data = await response.json();

        currentModels = data.models || [];
        // 清理已勾选但不存在的模型
        const existingNames = new Set(currentModels.map(m => m.name));
        selectedModelNames = new Set([...selectedModelNames].filter(name => existingNames.has(name)));
        
        filterModels();
    } catch (error) {
        console.error('加载模型失败:', error);
        document.getElementById('models-list').innerHTML =
            '<p class="placeholder">加载模型失败，请检查后端服务是否正常运行</p>';
    }
}

function filterModels() {
    const searchInput = document.getElementById('model-search-input');
    const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();

    let filtered = currentModels;
    if (keyword) {
        filtered = currentModels.filter(m => m.name.toLowerCase().includes(keyword));
    }

    const totalBadge = document.getElementById('model-total-badge');
    if (totalBadge) {
        totalBadge.textContent = keyword 
            ? `筛选: ${filtered.length} / 共 ${currentModels.length} 个模型`
            : `共 ${currentModels.length} 个模型`;
    }

    renderModels(filtered);
    updateModelBulkBar();
}

function renderModels(models) {
    const container = document.getElementById('models-list');
    if (!container) return;

    if (models.length === 0) {
        container.innerHTML = '<p class="placeholder" style="grid-column: 1 / -1;">未找到符合条件的模型</p>';
        return;
    }

    container.innerHTML = models.map(model => {
        const isSelected = selectedModelNames.has(model.name);
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

function toggleSelectModel(modelName, checked) {
    if (checked) {
        selectedModelNames.add(modelName);
    } else {
        selectedModelNames.delete(modelName);
    }
    updateModelBulkBar();
    
    // 更新卡片高亮类
    const card = document.querySelector(`.model-card[data-model-name="${modelName}"]`);
    if (card) {
        card.classList.toggle('selected', checked);
    }
}

function toggleSelectAllModels(checked) {
    const searchInput = document.getElementById('model-search-input');
    const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const visibleModels = keyword 
        ? currentModels.filter(m => m.name.toLowerCase().includes(keyword))
        : currentModels;

    visibleModels.forEach(m => {
        if (checked) {
            selectedModelNames.add(m.name);
        } else {
            selectedModelNames.delete(m.name);
        }
    });

    filterModels();
}

function clearModelSelection() {
    selectedModelNames.clear();
    const selectAllCheckbox = document.getElementById('model-select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    filterModels();
}

function updateModelBulkBar() {
    const bulkBar = document.getElementById('model-bulk-bar');
    const countEl = document.getElementById('model-selected-count');
    const selectAllCheckbox = document.getElementById('model-select-all');

    const count = selectedModelNames.size;
    if (countEl) countEl.textContent = count;

    if (bulkBar) {
        if (count > 0) {
            bulkBar.classList.add('active');
        } else {
            bulkBar.classList.remove('active');
        }
    }

    if (selectAllCheckbox && currentModels.length > 0) {
        selectAllCheckbox.checked = count > 0 && count === currentModels.length;
    }
}

// 单个模型删除确认
function showDeleteSingleModelDialog(modelName) {
    pendingDeleteModels = [modelName];
    const listEl = document.getElementById('delete-model-list');
    listEl.innerHTML = `<div>• <strong>${modelName}</strong> (包含权重与参考音频)</div>`;
    document.getElementById('delete-model-dialog').style.display = 'flex';
}

// 批量删除模型确认
function showBatchDeleteModelsDialog() {
    if (selectedModelNames.size === 0) {
        showNotification('请先勾选要删除的模型', 'warning');
        return;
    }

    pendingDeleteModels = Array.from(selectedModelNames);
    const listEl = document.getElementById('delete-model-list');
    listEl.innerHTML = pendingDeleteModels.map(name => `<div>• <strong>${name}</strong></div>`).join('');
    document.getElementById('delete-model-dialog').style.display = 'flex';
}

// 执行模型删除
async function executeModelDeletion() {
    if (!pendingDeleteModels || pendingDeleteModels.length === 0) return;

    const confirmBtn = document.getElementById('confirm-delete-model-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '正在安全删除...';

    try {
        let result;
        if (pendingDeleteModels.length === 1) {
            // 单个删除
            const modelName = pendingDeleteModels[0];
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
                body: JSON.stringify({ models: pendingDeleteModels })
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
        selectedModelNames.clear();
        await loadModels();
        populateModelSelect();
    } catch (error) {
        console.error('删除模型失败:', error);
        showNotification(`删除失败: ${error.message}`, 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '确认永久删除';
    }
}

// ==================== 创建模型 ====================
function showCreateModelDialog() {
    document.getElementById('create-model-dialog').style.display = 'flex';
    document.getElementById('new-model-name').value = '';
    clearModelFile('gpt');
    clearModelFile('sovits');
    document.getElementById('upload-progress-container').style.display = 'none';
}

function previewModelFile(type) {
    const fileInput = document.getElementById(`${type}-model-file`);
    const preview = document.getElementById(`${type}-file-preview`);
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

        fileInfo.textContent = `📁 ${file.name} (${sizeMB} MB)`;
        preview.style.display = 'flex';
    } else {
        preview.style.display = 'none';
    }
}

function clearModelFile(type) {
    const fileInput = document.getElementById(`${type}-model-file`);
    const preview = document.getElementById(`${type}-file-preview`);
    fileInput.value = '';
    preview.style.display = 'none';
}

async function createModel() {
    const name = document.getElementById('new-model-name').value.trim();
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

    if (gptFileInput.files.length > 0) {
        formData.append('gpt_file', gptFileInput.files[0]);
    }
    if (sovitsFileInput.files.length > 0) {
        formData.append('sovits_file', sovitsFileInput.files[0]);
    }

    try {
        createBtn.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressText.textContent = '正在创建模型...';

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressPercent.textContent = percentComplete + '%';
                progressText.textContent = percentComplete < 100 ? '正在上传文件...' : '后端处理中...';
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
            createBtn.disabled = false;
            progressContainer.style.display = 'none';
        });

        xhr.addEventListener('error', () => {
            showNotification('创建请求出错，请检查后端服务', 'error');
            createBtn.disabled = false;
            progressContainer.style.display = 'none';
        });

        xhr.open('POST', `${API_BASE}/models/create`);
        xhr.send(formData);
    } catch (error) {
        console.error('创建模型失败:', error);
        showNotification('创建模型失败', 'error');
        createBtn.disabled = false;
        progressContainer.style.display = 'none';
    }
}

// ==========================================================================
// 模块 4: 参考音频管理体系 (多选、批量删除、批量修改情感前缀)
// ==========================================================================

function populateModelSelect() {
    const select = document.getElementById('audio-model-select');
    if (!select) return;

    const previousVal = select.value || currentSelectedModel;
    select.innerHTML = '<option value="">选择模型...</option>' +
        currentModels.map(m => `<option value="${m.name}">${m.name} (${m.audio_stats.total || 0}条)</option>`).join('');

    if (previousVal && currentModels.some(m => m.name === previousVal)) {
        select.value = previousVal;
    }
}

function goToAudioManagement(modelName) {
    switchPage('audios');
    const select = document.getElementById('audio-model-select');
    if (select) {
        select.value = modelName;
        loadAudios();
    }
}

async function loadAudios() {
    const modelName = document.getElementById('audio-model-select').value;
    const uploadBtn = document.getElementById('upload-btn');
    const batchEmotionBtn = document.getElementById('batch-emotion-btn');
    const langFilter = document.getElementById('audio-lang-filter');
    const searchInput = document.getElementById('audio-search-input');
    const selectAllWrap = document.getElementById('audio-select-all-wrap');
    const container = document.getElementById('audios-list');

    selectedAudioPaths.clear();
    updateAudioBulkBar();

    if (!modelName) {
        container.innerHTML = '<p class="placeholder" style="grid-column: 1 / -1;">请先在上方选择一个模型</p>';
        uploadBtn.disabled = true;
        batchEmotionBtn.disabled = true;
        langFilter.disabled = true;
        searchInput.disabled = true;
        if (selectAllWrap) selectAllWrap.style.display = 'none';
        document.getElementById('audio-total-badge').textContent = '0 个音频';
        return;
    }

    currentSelectedModel = modelName;
    uploadBtn.disabled = false;
    batchEmotionBtn.disabled = false;
    langFilter.disabled = false;
    searchInput.disabled = false;
    if (selectAllWrap) selectAllWrap.style.display = 'inline-flex';

    try {
        const response = await fetch(`${API_BASE}/models/${encodeURIComponent(modelName)}/audios`);
        const data = await response.json();

        currentAudios = data.audios || [];
        filterAudios();
    } catch (error) {
        console.error('加载音频失败:', error);
        container.innerHTML = '<p class="placeholder" style="grid-column: 1 / -1;">加载音频失败，请检查服务</p>';
    }
}

function filterAudios() {
    const langFilter = document.getElementById('audio-lang-filter');
    const searchInput = document.getElementById('audio-search-input');

    const selectedLang = langFilter ? langFilter.value : 'all';
    const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();

    let filtered = currentAudios;

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
            ? `筛选: ${filtered.length} / 共 ${currentAudios.length} 个音频`
            : `共 ${currentAudios.length} 个音频`;
    }

    renderAudios(filtered);
    updateAudioBulkBar();
}

function renderAudios(audios) {
    const container = document.getElementById('audios-list');
    if (!container) return;

    if (audios.length === 0) {
        container.innerHTML = '<p class="placeholder" style="grid-column: 1 / -1;">暂无匹配的参考音频</p>';
        return;
    }

    container.innerHTML = audios.map(audio => {
        const isSelected = selectedAudioPaths.has(audio.relative_path);
        const encodedModel = encodeURIComponent(currentSelectedModel);
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

function toggleSelectAudio(relPath, checked) {
    if (checked) {
        selectedAudioPaths.add(relPath);
    } else {
        selectedAudioPaths.delete(relPath);
    }
    updateAudioBulkBar();

    const card = document.querySelector(`.audio-card[data-audio-path="${relPath}"]`);
    if (card) {
        card.classList.toggle('selected', checked);
    }
}

function toggleSelectAllAudios(checked) {
    const langFilter = document.getElementById('audio-lang-filter');
    const searchInput = document.getElementById('audio-search-input');
    const selectedLang = langFilter ? langFilter.value : 'all';
    const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();

    let visibleAudios = currentAudios;
    if (selectedLang !== 'all') visibleAudios = visibleAudios.filter(a => a.language === selectedLang);
    if (keyword) visibleAudios = visibleAudios.filter(a => a.filename.toLowerCase().includes(keyword) || a.emotion.toLowerCase().includes(keyword));

    visibleAudios.forEach(a => {
        if (checked) {
            selectedAudioPaths.add(a.relative_path);
        } else {
            selectedAudioPaths.delete(a.relative_path);
        }
    });

    filterAudios();
}

function clearAudioSelection() {
    selectedAudioPaths.clear();
    const selectAllCheckbox = document.getElementById('audio-select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    filterAudios();
}

function updateAudioBulkBar() {
    const bulkBar = document.getElementById('audio-bulk-bar');
    const countEl = document.getElementById('audio-selected-count');
    const selectAllCheckbox = document.getElementById('audio-select-all');

    const count = selectedAudioPaths.size;
    if (countEl) countEl.textContent = count;

    if (bulkBar) {
        if (count > 0) {
            bulkBar.classList.add('active');
        } else {
            bulkBar.classList.remove('active');
        }
    }

    if (selectAllCheckbox && currentAudios.length > 0) {
        selectAllCheckbox.checked = count > 0 && count === currentAudios.length;
    }
}

// 单项音频删除确认
function showDeleteSingleAudioDialog(relPath, filename) {
    pendingDeleteAudios = [relPath];
    document.getElementById('delete-audio-count').textContent = '1';
    const listEl = document.getElementById('delete-audio-list');
    listEl.innerHTML = `<div>• <strong>${filename}</strong> (${relPath})</div>`;
    document.getElementById('delete-audio-dialog').style.display = 'flex';
}

// 批量音频删除确认
function showBatchDeleteAudiosDialog() {
    if (selectedAudioPaths.size === 0) {
        showNotification('请先勾选要删除的音频文件', 'warning');
        return;
    }

    pendingDeleteAudios = Array.from(selectedAudioPaths);
    document.getElementById('delete-audio-count').textContent = pendingDeleteAudios.length;
    const listEl = document.getElementById('delete-audio-list');
    listEl.innerHTML = pendingDeleteAudios.map(p => `<div>• ${p}</div>`).join('');
    document.getElementById('delete-audio-dialog').style.display = 'flex';
}

// 执行音频删除
async function executeAudioDeletion() {
    if (!pendingDeleteAudios || pendingDeleteAudios.length === 0) return;

    const confirmBtn = document.getElementById('confirm-delete-audio-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '正在删除...';

    try {
        if (pendingDeleteAudios.length === 1) {
            // 单个删除
            const relPath = pendingDeleteAudios[0];
            const response = await fetch(
                `${API_BASE}/models/${encodeURIComponent(currentSelectedModel)}/audios?relative_path=${encodeURIComponent(relPath)}`,
                { method: 'DELETE' }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || '删除失败');
            showNotification('音频删除成功', 'success');
        } else {
            // 批量删除
            const response = await fetch(
                `${API_BASE}/models/${encodeURIComponent(currentSelectedModel)}/audios/batch-delete`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ relative_paths: pendingDeleteAudios })
                }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || '批量删除失败');
            showNotification(`已成功删除 ${data.deleted_count || pendingDeleteAudios.length} 个音频文件`, 'success');
        }

        closeDialog('delete-audio-dialog');
        selectedAudioPaths.clear();
        await loadAudios();
        await loadModels(); // 刷新模型总音频数统计
    } catch (error) {
        console.error('删除音频失败:', error);
        showNotification(`删除失败: ${error.message}`, 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '确认删除';
    }
}

// ==================== 批量修改选中音频的情感 ====================
function showBatchSelectedEmotionDialog() {
    if (selectedAudioPaths.size === 0) {
        showNotification('请先勾选需要修改情感的音频', 'warning');
        return;
    }

    document.getElementById('batch-selected-audio-count').textContent = selectedAudioPaths.size;
    document.getElementById('batch-selected-new-emotion').value = '';
    document.getElementById('batch-selected-emotion-dialog').style.display = 'flex';
}

async function confirmBatchSelectedEmotion() {
    const newEmotion = document.getElementById('batch-selected-new-emotion').value.trim();
    if (!newEmotion) {
        showNotification('请输入新情感标签', 'warning');
        return;
    }

    const relPaths = Array.from(selectedAudioPaths);

    try {
        const response = await fetch(
            `${API_BASE}/models/${encodeURIComponent(currentSelectedModel)}/audios/batch-selected-emotion`,
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
            selectedAudioPaths.clear();
            await loadAudios();
            await loadModels();
        } else {
            showNotification(data.detail || data.error || '批量修改情感失败', 'error');
        }
    } catch (error) {
        console.error('批量修改情感异常:', error);
        showNotification('批量修改情感请求失败', 'error');
    }
}

// ==================== 音频上传与批量上传 ====================
function showUploadDialog() {
    if (!currentSelectedModel) {
        showNotification('请先选择一个模型', 'warning');
        return;
    }
    clearUploadFiles();
    document.getElementById('upload-dialog').style.display = 'flex';
}

function previewUploadFiles() {
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

    listEl.innerHTML = files.map(f => {
        totalBytes += f.size;
        return `
            <div class="upload-file-item">
                <span class="file-name" title="${f.name}">🎵 ${f.name}</span>
                <span class="file-size">${formatFileSize(f.size)}</span>
            </div>
        `;
    }).join('');

    countEl.textContent = files.length;
    sizeEl.textContent = formatFileSize(totalBytes);
    previewBox.style.display = 'block';
}

function clearUploadFiles() {
    const fileInput = document.getElementById('upload-file');
    if (fileInput) fileInput.value = '';
    const previewBox = document.getElementById('upload-files-preview-box');
    if (previewBox) previewBox.style.display = 'none';
    const progressContainer = document.getElementById('audio-upload-progress-container');
    if (progressContainer) progressContainer.style.display = 'none';
}

async function uploadAudio() {
    const language = document.getElementById('upload-language').value;
    const emotion = document.getElementById('upload-emotion').value.trim() || 'default';
    const fileInput = document.getElementById('upload-file');
    const files = fileInput.files;
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
        confirmBtn.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressText.textContent = `正在上传 ${files.length} 个音频文件...`;

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressPercent.textContent = percentComplete + '%';
                progressText.textContent = percentComplete < 100 ? `正在上传 (${percentComplete}%)...` : '音频时长校验与格式处理中...';
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
                await loadModels();
            } else {
                let detail = '上传失败';
                try {
                    const data = JSON.parse(xhr.responseText);
                    detail = data.detail || detail;
                } catch (e) {}
                showNotification(`上传出错: ${detail}`, 'error');
            }
            confirmBtn.disabled = false;
            progressContainer.style.display = 'none';
        });

        xhr.addEventListener('error', () => {
            showNotification('上传请求失败，请检查后端网络与服务状态', 'error');
            confirmBtn.disabled = false;
            progressContainer.style.display = 'none';
        });

        xhr.open('POST', `${API_BASE}/models/${encodeURIComponent(currentSelectedModel)}/audios/batch-upload`);
        xhr.send(formData);
    } catch (error) {
        console.error('音频上传异常:', error);
        showNotification(`上传异常: ${error.message}`, 'error');
        confirmBtn.disabled = false;
        progressContainer.style.display = 'none';
    }
}

// ==================== 音频重命名 ====================
let currentRenameContext = null;

function showRenameDialog(relativePath, currentFilename) {
    currentRenameContext = { modelName: currentSelectedModel, relativePath };
    document.getElementById('rename-new-filename').value = currentFilename;
    document.getElementById('rename-audio-dialog').style.display = 'flex';
}

async function confirmRename() {
    if (!currentRenameContext) return;

    const newFilename = document.getElementById('rename-new-filename').value.trim();
    if (!newFilename) {
        showNotification('请输入新文件名', 'warning');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/models/${encodeURIComponent(currentRenameContext.modelName)}/audios/rename?relative_path=${encodeURIComponent(currentRenameContext.relativePath)}&new_filename=${encodeURIComponent(newFilename)}`,
            { method: 'PUT' }
        );

        const data = await response.json();

        if (response.ok) {
            showNotification('音频重命名成功', 'success');
            closeDialog('rename-audio-dialog');
            await loadAudios();
            await loadModels();
        } else {
            showNotification(data.detail || data.error || '重命名失败', 'error');
        }
    } catch (error) {
        console.error('重命名音频失败:', error);
        showNotification('重命名失败', 'error');
    }
}

// ==================== 按旧情感批量替换 ====================
let currentBatchEmotionModel = null;

function showBatchEmotionDialog(modelName) {
    currentBatchEmotionModel = modelName;
    document.getElementById('batch-old-emotion').value = '';
    document.getElementById('batch-new-emotion').value = '';
    document.getElementById('batch-emotion-dialog').style.display = 'flex';
}

function showBatchEmotionDialogFromAudios() {
    if (!currentSelectedModel) {
        showNotification('请先选择模型', 'warning');
        return;
    }
    showBatchEmotionDialog(currentSelectedModel);
}

async function confirmBatchEmotion() {
    if (!currentBatchEmotionModel) return;

    const oldEmotion = document.getElementById('batch-old-emotion').value.trim();
    const newEmotion = document.getElementById('batch-new-emotion').value.trim();

    if (!oldEmotion || !newEmotion) {
        showNotification('请输入旧情感和新情感标签', 'warning');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/models/${encodeURIComponent(currentBatchEmotionModel)}/audios/batch-emotion?old_emotion=${encodeURIComponent(oldEmotion)}&new_emotion=${encodeURIComponent(newEmotion)}`,
            { method: 'POST' }
        );

        const data = await response.json();

        if (response.ok) {
            showNotification(`成功将 ${data.updated_count || 0} 个文件的 "${oldEmotion}" 替换为 "${newEmotion}"`, 'success');
            closeDialog('batch-emotion-dialog');

            if (currentSelectedModel === currentBatchEmotionModel) {
                await loadAudios();
            }
            await loadModels();
        } else {
            showNotification(data.detail || data.error || '批量替换失败', 'error');
        }
    } catch (error) {
        console.error('批量修改失败:', error);
        showNotification('批量修改失败', 'error');
    }
}

// ==================== 工具函数 ====================
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==========================================================================
// 系统设置与 LLM 测试模块
// ==========================================================================

function bindSettingsTabs() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = 'settings-tab-' + tab.dataset.tab;
            const targetContent = document.getElementById(tabId);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        const settings = await response.json();

        // 基础配置
        document.getElementById('setting-base-dir').value = settings.base_dir || '';
        document.getElementById('setting-cache-dir').value = settings.cache_dir || '';
        document.getElementById('setting-sovits-host').value = settings.sovits_host || 'http://127.0.0.1:9880';
        document.getElementById('setting-default-lang').value = settings.default_lang || 'Chinese';
        document.getElementById('setting-developer-mode').value = String(settings.developer_mode === true);

        // 分析引擎配置
        const analysis = settings.analysis_engine || {};
        document.getElementById('setting-analysis-enabled').value = String(analysis.enabled !== false);
        document.getElementById('setting-analysis-interval').value = analysis.analysis_interval || 3;
        document.getElementById('setting-analysis-threshold').value = analysis.trigger_threshold || 60;

        const analysisLlm = analysis.llm || {};
        document.getElementById('setting-analysis-llm-api-url').value = analysisLlm.api_url || '';
        document.getElementById('setting-analysis-llm-api-key').value = analysisLlm.api_key || '';

        const analysisModelSelect = document.getElementById('setting-analysis-llm-model');
        const savedAnalysisModel = analysisLlm.model || '';
        if (savedAnalysisModel) {
            let hasOpt = Array.from(analysisModelSelect.options).some(o => o.value === savedAnalysisModel);
            if (!hasOpt) {
                const opt = document.createElement('option');
                opt.value = savedAnalysisModel;
                opt.textContent = savedAnalysisModel;
                analysisModelSelect.appendChild(opt);
            }
            analysisModelSelect.value = savedAnalysisModel;
        }
        document.getElementById('setting-analysis-llm-temperature').value = analysisLlm.temperature || 0.8;
        document.getElementById('setting-analysis-llm-max-tokens').value = analysisLlm.max_tokens || 5000;

        // 电话功能配置
        const phoneCall = settings.phone_call || {};
        document.getElementById('setting-phone-call-enabled').value = String(phoneCall.enabled !== false);

        const llm = phoneCall.llm || {};
        document.getElementById('setting-llm-api-url').value = llm.api_url || 'http://127.0.0.1:7861/v1';
        document.getElementById('setting-llm-api-key').value = llm.api_key || '';

        const modelSelect = document.getElementById('setting-llm-model');
        const savedModel = llm.model || 'gemini-2.5-flash';
        let hasOption = Array.from(modelSelect.options).some(o => o.value === savedModel);
        if (!hasOption && savedModel) {
            const option = document.createElement('option');
            option.value = savedModel;
            option.textContent = savedModel;
            modelSelect.appendChild(option);
        }
        modelSelect.value = savedModel;
        document.getElementById('setting-llm-temperature').value = llm.temperature || 0.8;
        document.getElementById('setting-llm-max-tokens').value = llm.max_tokens || 5000;

        // TTS 配置
        const tts = phoneCall.tts_config || {};
        document.getElementById('setting-tts-text-lang').value = tts.text_lang || 'zh';
        document.getElementById('setting-tts-prompt-lang').value = tts.prompt_lang || 'zh';
        document.getElementById('setting-tts-text-split-method').value = tts.text_split_method || 'cut0';
        document.getElementById('setting-tts-use-aux-ref-audio').value = String(tts.use_aux_ref_audio || false);

        // 消息处理
        const msgProcessing = settings.message_processing || {};
        document.getElementById('setting-extract-tag').value = msgProcessing.extract_tag || '';
        document.getElementById('setting-filter-tags').value = msgProcessing.filter_tags || '';
    } catch (error) {
        console.error('加载系统配置失败:', error);
    }
}

async function saveSettings() {
    const settings = {
        base_dir: document.getElementById('setting-base-dir').value.trim(),
        cache_dir: document.getElementById('setting-cache-dir').value.trim(),
        sovits_host: document.getElementById('setting-sovits-host').value.trim(),
        default_lang: document.getElementById('setting-default-lang').value,
        developer_mode: document.getElementById('setting-developer-mode').value === 'true',

        analysis_engine: {
            enabled: document.getElementById('setting-analysis-enabled').value === 'true',
            analysis_interval: parseInt(document.getElementById('setting-analysis-interval').value) || 3,
            trigger_threshold: parseInt(document.getElementById('setting-analysis-threshold').value) || 60,
            llm: {
                api_url: document.getElementById('setting-analysis-llm-api-url').value.trim(),
                api_key: document.getElementById('setting-analysis-llm-api-key').value.trim(),
                model: document.getElementById('setting-analysis-llm-model').value.trim(),
                temperature: parseFloat(document.getElementById('setting-analysis-llm-temperature').value) || 0.8,
                max_tokens: parseInt(document.getElementById('setting-analysis-llm-max-tokens').value) || 5000
            }
        },

        message_processing: {
            extract_tag: document.getElementById('setting-extract-tag').value.trim(),
            filter_tags: document.getElementById('setting-filter-tags').value.trim()
        },

        phone_call: {
            enabled: document.getElementById('setting-phone-call-enabled').value === 'true',
            llm: {
                api_url: document.getElementById('setting-llm-api-url').value.trim(),
                api_key: document.getElementById('setting-llm-api-key').value.trim(),
                model: document.getElementById('setting-llm-model').value.trim(),
                temperature: parseFloat(document.getElementById('setting-llm-temperature').value) || 0.8,
                max_tokens: parseInt(document.getElementById('setting-llm-max-tokens').value) || 5000
            },
            tts_config: {
                text_lang: document.getElementById('setting-tts-text-lang').value,
                prompt_lang: document.getElementById('setting-tts-prompt-lang').value,
                text_split_method: document.getElementById('setting-tts-text-split-method').value,
                use_aux_ref_audio: document.getElementById('setting-tts-use-aux-ref-audio').value === 'true'
            }
        }
    };

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('系统配置保存成功！', 'success');
        } else {
            showNotification(data.detail || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showNotification('保存失败，请检查服务连接', 'error');
    }
}

// 获取 LLM 模型列表
async function fetchLLMModels(apiUrl, apiKey) {
    const baseUrl = apiUrl.replace(/\/chat\/completions.*$/, '');
    const modelsUrl = baseUrl + '/models';

    const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    let models = [];
    if (data.data && Array.isArray(data.data)) {
        models = data.data.map(m => m.id || m.name || m);
    } else if (Array.isArray(data)) {
        models = data.map(m => m.id || m.name || m);
    } else if (data.models && Array.isArray(data.models)) {
        models = data.models.map(m => m.id || m.name || m);
    }
    return models;
}

function bindFetchModelsButton() {
    const btn = document.getElementById('fetch-llm-models-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const apiUrl = document.getElementById('setting-llm-api-url').value.trim();
        const apiKey = document.getElementById('setting-llm-api-key').value.trim();

        if (!apiUrl) {
            showNotification('请先填写 LLM API 地址', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = '🔄 获取中...';

        try {
            const models = await fetchLLMModels(apiUrl, apiKey);
            const select = document.getElementById('setting-llm-model');
            const currentVal = select.value;

            select.innerHTML = '<option value="">请选择模型...</option>';
            models.forEach(model => {
                const opt = document.createElement('option');
                opt.value = model;
                opt.textContent = model;
                select.appendChild(opt);
            });

            if (currentVal && models.includes(currentVal)) {
                select.value = currentVal;
            } else if (models.length > 0) {
                select.value = models[0];
            }

            showNotification(`成功获取到 ${models.length} 个可用模型`, 'success');
        } catch (error) {
            console.error('获取模型列表失败:', error);
            showNotification(`获取模型失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 获取模型列表';
        }
    });
}

function bindTestConnectionButton() {
    const btn = document.getElementById('test-llm-connection-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const apiUrl = document.getElementById('setting-llm-api-url').value.trim();
        const apiKey = document.getElementById('setting-llm-api-key').value.trim();
        const model = document.getElementById('setting-llm-model').value.trim();

        if (!apiUrl) {
            showNotification('请先填写 API 地址', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = '🧪 测试中...';

        try {
            const endpoint = apiUrl.endsWith('/chat/completions') ? apiUrl : apiUrl + '/chat/completions';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 5
                })
            });

            if (response.ok) {
                showNotification('LLM 连接测试成功！', 'success');
            } else {
                const errData = await response.json().catch(() => ({}));
                showNotification(`连接失败: HTTP ${response.status} ${errData.error?.message || ''}`, 'error');
            }
        } catch (error) {
            console.error('测试连接失败:', error);
            showNotification(`连接失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🧪 测试连接';
        }
    });
}

function bindAnalysisLLMButtons() {
    const fetchBtn = document.getElementById('fetch-analysis-models-btn');
    const testBtn = document.getElementById('test-analysis-llm-btn');

    if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
            const apiUrl = document.getElementById('setting-analysis-llm-api-url').value.trim();
            const apiKey = document.getElementById('setting-analysis-llm-api-key').value.trim();

            if (!apiUrl) {
                showNotification('请先填写分析 LLM API 地址', 'warning');
                return;
            }

            fetchBtn.disabled = true;
            fetchBtn.textContent = '🔄 获取中...';

            try {
                const models = await fetchLLMModels(apiUrl, apiKey);
                const select = document.getElementById('setting-analysis-llm-model');
                const currentVal = select.value;

                select.innerHTML = '<option value="">请选择模型...</option>';
                models.forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model;
                    opt.textContent = model;
                    select.appendChild(opt);
                });

                if (currentVal && models.includes(currentVal)) {
                    select.value = currentVal;
                } else if (models.length > 0) {
                    select.value = models[0];
                }

                showNotification(`成功获取到 ${models.length} 个分析模型`, 'success');
            } catch (error) {
                console.error('获取分析模型失败:', error);
                showNotification(`获取失败: ${error.message}`, 'error');
            } finally {
                fetchBtn.disabled = false;
                fetchBtn.textContent = '🔄 获取模型列表';
            }
        });
    }

    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            const apiUrl = document.getElementById('setting-analysis-llm-api-url').value.trim();
            const apiKey = document.getElementById('setting-analysis-llm-api-key').value.trim();
            const model = document.getElementById('setting-analysis-llm-model').value.trim();

            if (!apiUrl) {
                showNotification('请先填写分析 API 地址', 'warning');
                return;
            }

            testBtn.disabled = true;
            testBtn.textContent = '🧪 测试中...';

            try {
                const endpoint = apiUrl.endsWith('/chat/completions') ? apiUrl : apiUrl + '/chat/completions';
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model || 'gpt-3.5-turbo',
                        messages: [{ role: 'user', content: 'Ping' }],
                        max_tokens: 5
                    })
                });

                if (response.ok) {
                    showNotification('分析引擎 LLM 连接测试成功！', 'success');
                } else {
                    const errData = await response.json().catch(() => ({}));
                    showNotification(`连接失败: HTTP ${response.status} ${errData.error?.message || ''}`, 'error');
                }
            } catch (error) {
                console.error('测试连接失败:', error);
                showNotification(`测试连接失败: ${error.message}`, 'error');
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = '🧪 测试连接';
            }
        });
    }
}

// ==========================================================================
// 版本更新与 GPT-SoVITS 推理端控制
// ==========================================================================

async function checkVersion() {
    try {
        const response = await fetch(`${API_BASE}/version/check`);
        const data = await response.json();

        const currentVerEl = document.getElementById('current-version');
        const latestVerEl = document.getElementById('latest-version');
        const latestVerInfo = document.getElementById('latest-version-info');
        const statusBadge = document.getElementById('version-status');
        const updateActions = document.getElementById('update-actions');
        const updateBadge = document.getElementById('update-badge');
        const navUpdateBadge = document.getElementById('nav-update-badge');

        if (data.current_version) {
            currentVerEl.textContent = data.current_version;
        }

        if (data.has_update) {
            latestVerEl.textContent = data.latest_version;
            latestVerInfo.style.display = 'flex';
            statusBadge.textContent = '有新版本';
            statusBadge.className = 'status-badge status-warning';
            updateActions.style.display = 'block';
            if (updateBadge) updateBadge.style.display = 'inline-block';
            if (navUpdateBadge) navUpdateBadge.style.display = 'inline-block';
        } else {
            statusBadge.textContent = '已是最新';
            statusBadge.className = 'status-badge status-success';
            latestVerInfo.style.display = 'none';
            updateActions.style.display = 'none';
            if (updateBadge) updateBadge.style.display = 'none';
            if (navUpdateBadge) navUpdateBadge.style.display = 'none';
        }
    } catch (error) {
        console.error('检查版本更新失败:', error);
    }
}

async function performUpdate() {
    const updateBtn = document.getElementById('update-btn');
    const updateProgress = document.getElementById('update-progress');
    const updateActions = document.getElementById('update-actions');
    const progressBar = document.getElementById('version-progress-bar');
    const progressText = document.getElementById('version-progress-text');

    updateBtn.disabled = true;
    updateActions.style.display = 'none';
    updateProgress.style.display = 'block';
    progressBar.style.width = '30%';
    progressText.textContent = '正在下载更新...';

    try {
        const response = await fetch(`${API_BASE}/version/update`, { method: 'POST' });
        const data = await response.json();

        if (response.ok && data.success) {
            progressBar.style.width = '100%';
            progressText.textContent = '更新成功！准备重启服务...';

            setTimeout(() => {
                fetch(`${API_BASE}/restart`, { method: 'POST' }).finally(() => {
                    setTimeout(() => window.location.reload(), 4000);
                });
            }, 1000);
        } else {
            throw new Error(data.error || data.detail || '更新失败');
        }
    } catch (error) {
        console.error('更新失败:', error);
        showNotification(`更新失败: ${error.message}`, 'error');
        updateBtn.disabled = false;
        updateProgress.style.display = 'none';
        updateActions.style.display = 'block';
    }
}

// 加载 GPT-SoVITS 配置
async function loadSovitsConfig() {
    try {
        const response = await fetch('/api/sovits/config');
        if (!response.ok) return;

        const data = await response.json();
        const config = data.config;

        if (config.install_path) {
            document.getElementById('sovits-install-path').value = config.install_path;
        }

        if (config.version_type) {
            const radio = document.querySelector(`input[name="gpu-type"][value="${config.version_type}"]`);
            if (radio) radio.checked = true;
        }

        document.getElementById('sovits-auto-start').checked = config.auto_start !== false;

        const statusBadge = document.getElementById('sovits-install-status');
        if (config.installed && config.install_path) {
            statusBadge.textContent = '已配置';
            statusBadge.className = 'status-badge status-success';
        } else {
            statusBadge.textContent = '未配置';
            statusBadge.className = 'status-badge status-warning';
        }
    } catch (error) {
        console.error('加载 GPT-SoVITS 配置失败:', error);
    }
}

// 保存 GPT-SoVITS 配置
async function saveSovitsConfig() {
    const config = {
        installed: true,
        version_type: document.querySelector('input[name="gpu-type"]:checked').value,
        install_path: document.getElementById('sovits-install-path').value.trim(),
        auto_start: document.getElementById('sovits-auto-start').checked,
        api_port: 9880
    };

    if (!config.install_path) {
        showNotification('请填写 GPT-SoVITS 安装路径', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/sovits/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('GPT-SoVITS 配置已成功保存', 'success');
            loadSovitsConfig();
        } else {
            showNotification(data.detail || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showNotification('保存配置失败', 'error');
    }
}

// 启动 GPT-SoVITS
async function startSovitsService() {
    showNotification('正在启动 GPT-SoVITS 服务...', 'info');

    try {
        const response = await fetch('/api/sovits/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();
        if (response.ok && data.success) {
            showNotification(`GPT-SoVITS 服务已启动 (PID: ${data.pid})`, 'success');
            loadDashboard();
            loadSovitsStatus();
        } else {
            showNotification(data.detail || data.message || '启动失败', 'error');
        }
    } catch (error) {
        console.error('启动服务失败:', error);
        showNotification('启动服务失败', 'error');
    }
}

// 停止 GPT-SoVITS
async function stopSovitsService() {
    showNotification('正在停止 GPT-SoVITS 服务...', 'info');

    try {
        const response = await fetch('/api/sovits/stop', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showNotification('GPT-SoVITS 服务已停止', 'success');
            loadDashboard();
            loadSovitsStatus();
        } else {
            showNotification(data.message || '停止失败', 'warning');
        }
    } catch (error) {
        console.error('停止服务失败:', error);
        showNotification('停止服务失败', 'error');
    }
}

// 测试 GPT-SoVITS 连接
async function testSovitsConnection() {
    showNotification('正在测试 GPT-SoVITS 连接...', 'info');

    try {
        const response = await fetch('/api/sovits/test', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showNotification(`连接成功！端口: ${data.port}`, 'success');
        } else {
            showNotification(data.message || '连接失败', 'error');
        }
    } catch (error) {
        console.error('测试连接失败:', error);
        showNotification('测试连接失败', 'error');
    }
}

// 加载 GPT-SoVITS 服务状态
async function loadSovitsStatus() {
    try {
        const response = await fetch('/api/sovits/status');
        if (!response.ok) return;

        const status = await response.json();
        const statusBadge = document.getElementById('sovits-install-status');
        if (status.api_reachable) {
            statusBadge.textContent = '运行中';
            statusBadge.className = 'status-badge status-success';
        } else if (status.installed && status.install_path) {
            statusBadge.textContent = '已配置';
            statusBadge.className = 'status-badge status-warning';
        } else {
            statusBadge.textContent = '未配置';
            statusBadge.className = 'status-badge';
        }
    } catch (error) {
        console.error('加载 GPT-SoVITS 状态失败:', error);
    }
}
