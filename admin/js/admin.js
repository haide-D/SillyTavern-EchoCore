// ==========================================================================
// ST-Direct-TTS Modern Admin Console - Main Modular Entry
// Version: 3.0.1 (Modularized)
// ==========================================================================

import { API_BASE, setAuthToken } from './core/api.js';
import { state } from './core/state.js';
import { showNotification, showDialog, closeDialog } from './core/ui.js';
import { formatFileSize, escapeHtml } from './core/utils.js';

import { loadDashboard, refreshStatus } from './modules/dashboard.js';
import {
    loadModels,
    filterModels,
    renderModels,
    toggleSelectModel,
    toggleSelectAllModels,
    clearModelSelection,
    updateModelBulkBar,
    showDeleteSingleModelDialog,
    showBatchDeleteModelsDialog,
    executeModelDeletion,
    showCreateModelDialog,
    previewModelFile,
    clearModelFile,
    createModel
} from './modules/models.js';
import {
    populateModelSelect,
    goToAudioManagement,
    loadAudios,
    filterAudios,
    renderAudios,
    toggleSelectAudio,
    toggleSelectAllAudios,
    clearAudioSelection,
    updateAudioBulkBar,
    showDeleteSingleAudioDialog,
    showBatchDeleteAudiosDialog,
    executeAudioDeletion,
    showBatchSelectedEmotionDialog,
    confirmBatchSelectedEmotion,
    showUploadDialog,
    previewUploadFiles,
    clearUploadFiles,
    uploadAudio,
    showRenameDialog,
    confirmRename,
    showBatchEmotionDialog,
    showBatchEmotionDialogFromAudios,
    confirmBatchEmotion
} from './modules/audios.js';
import {
    bindSettingsTabs,
    loadSettings,
    saveSettings,
    fetchLLMModels,
    bindFetchModelsButton,
    bindTestConnectionButton,
    bindTestMiniMaxButton,
    bindAnalysisLLMButtons,
    bindPromptAndEmotionControls,
    bindTextReplacementControls,
    bindTunnelAndNginxControls,
    bindSecurityControls
} from './modules/settings.js';
import {
    checkVersion,
    performUpdate,
    loadSovitsConfig,
    saveSovitsConfig,
    startSovitsService,
    stopSovitsService,
    testSovitsConnection,
    loadSovitsStatus
} from './modules/services.js';
import {
    loadWorkshopPresets,
    switchWorkshopFilter,
    filterWorkshopPresets,
    renderWorkshopPresets,
    openCreatePresetModal,
    openEditPresetModal,
    insertSlot,
    savePresetForm,
    showDeletePresetDialog,
    executePresetDeletion,
    exportPreset,
    triggerImportPresetFile,
    handlePresetFileSelected
} from './modules/workshop.js';
import {
    initPromptEmotionsPage,
    loadPromptEmotionsData,
    savePromptEmotionsSettings
} from './modules/prompt_emotions.js';

// ==================== 页面导航 ====================
export function switchPage(pageName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const targetNav = document.querySelector(`[data-page="${pageName}"]`);
    if (targetNav) targetNav.classList.add('active');

    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById(pageName);
    if (targetPage) targetPage.classList.add('active');

    if (pageName === 'audios') {
        populateModelSelect();
    } else if (pageName === 'workshop') {
        loadWorkshopPresets();
    } else if (pageName === 'prompt_emotions') {
        loadPromptEmotionsData();
    }
}

// ==================== 全局桥接挂载 (保持 HTML inline 事件 100% 兼容) ====================
Object.assign(window, {
    initPromptEmotionsPage,
    loadPromptEmotionsData,
    savePromptEmotionsSettings,
    // 核心与工具
    API_BASE,
    state,
    showNotification,
    showDialog,
    closeDialog,
    formatFileSize,
    escapeHtml,
    // 导航
    switchPage,
    // 仪表盘
    loadDashboard,
    refreshStatus,
    // 模型管理
    loadModels,
    filterModels,
    renderModels,
    toggleSelectModel,
    toggleSelectAllModels,
    clearModelSelection,
    updateModelBulkBar,
    showDeleteSingleModelDialog,
    showBatchDeleteModelsDialog,
    executeModelDeletion,
    showCreateModelDialog,
    previewModelFile,
    clearModelFile,
    createModel,
    // 音频管理
    populateModelSelect,
    goToAudioManagement,
    loadAudios,
    filterAudios,
    renderAudios,
    toggleSelectAudio,
    toggleSelectAllAudios,
    clearAudioSelection,
    updateAudioBulkBar,
    showDeleteSingleAudioDialog,
    showBatchDeleteAudiosDialog,
    executeAudioDeletion,
    showBatchSelectedEmotionDialog,
    confirmBatchSelectedEmotion,
    showUploadDialog,
    previewUploadFiles,
    clearUploadFiles,
    uploadAudio,
    showRenameDialog,
    confirmRename,
    showBatchEmotionDialog,
    showBatchEmotionDialogFromAudios,
    confirmBatchEmotion,
    // 系统设置
    bindSettingsTabs,
    loadSettings,
    saveSettings,
    fetchLLMModels,
    bindFetchModelsButton,
    bindTestConnectionButton,
    bindAnalysisLLMButtons,
    // 服务控制与版本
    checkVersion,
    performUpdate,
    loadSovitsConfig,
    saveSovitsConfig,
    startSovitsService,
    stopSovitsService,
    testSovitsConnection,
    loadSovitsStatus,
    // 创作者工坊
    loadWorkshopPresets,
    switchWorkshopFilter,
    filterWorkshopPresets,
    renderWorkshopPresets,
    openCreatePresetModal,
    openEditPresetModal,
    insertSlot,
    savePresetForm,
    showDeletePresetDialog,
    executePresetDeletion,
    exportPreset,
    triggerImportPresetFile,
    handlePresetFileSelected
});

// ==================== 登录鉴权弹窗与防护逻辑 ====================
window.showAdminLoginModal = function () {
    const dialog = document.getElementById('admin-login-dialog');
    const input = document.getElementById('admin-login-password-input');
    const errorMsg = document.getElementById('admin-login-error-msg');
    if (dialog) {
        dialog.style.display = 'flex';
        if (input) {
            input.value = '';
            input.focus();
        }
        if (errorMsg) errorMsg.style.display = 'none';
    }
};

async function handleAdminLoginSubmit() {
    const input = document.getElementById('admin-login-password-input');
    const errorMsg = document.getElementById('admin-login-error-msg');
    const submitBtn = document.getElementById('btn-submit-admin-login');
    const password = (input ? input.value : '').trim();

    if (!password) {
        if (errorMsg) {
            errorMsg.textContent = '请输入管理员密码';
            errorMsg.style.display = 'block';
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ 正在验证...';
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            setAuthToken(data.token);
            closeDialog('admin-login-dialog');
            showNotification('🔓 管理员身份验证成功！', 'success');
            // 重新刷新核心数据
            loadDashboard();
            loadModels();
            loadSettings();
            initPromptEmotionsPage();
        } else {
            if (errorMsg) {
                errorMsg.textContent = data.detail || data.message || '密码错误';
                errorMsg.style.display = 'block';
            }
        }
    } catch (err) {
        if (errorMsg) {
            errorMsg.textContent = `登录请求失败: ${err.message}`;
            errorMsg.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🔓 验证并解锁控制台';
        }
    }
}

// 检查鉴权状态并绑定登录事件
async function initAuthProtection() {
    const submitBtn = document.getElementById('btn-submit-admin-login');
    const input = document.getElementById('admin-login-password-input');

    if (submitBtn) {
        submitBtn.addEventListener('click', handleAdminLoginSubmit);
    }
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAdminLoginSubmit();
            }
        });
    }

    try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
            const data = await res.json();
            if (data.auth_required && !data.is_authenticated) {
                window.showAdminLoginModal();
            }
        }
    } catch (e) {
        console.warn('检查鉴权状态失败:', e);
    }
}

// ==================== 页面生命周期初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    // 导航切换
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });

    // 初始化鉴权拦截与弹窗
    initAuthProtection();

    // 初始化加载
    loadDashboard();
    loadModels();
    loadSettings();
    initPromptEmotionsPage();

    // 绑定 LLM、云端服务与安全测试
    bindFetchModelsButton();
    bindTestConnectionButton();
    bindTestMiniMaxButton();
    bindAnalysisLLMButtons();
    bindTextReplacementControls();
    bindTunnelAndNginxControls();
    bindSecurityControls();
    bindSettingsTabs();

    // 显示通告弹窗
    showDialog('notice-dialog');
});
