// ==========================================================================
// ST-Direct-TTS Modern Admin Console - Main Modular Entry
// Version: 3.0.0 (Modularized)
// ==========================================================================

import { API_BASE } from './core/api.js';
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
    bindAnalysisLLMButtons
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
    }
}

// ==================== 全局桥接挂载 (保持 HTML inline 事件 100% 兼容) ====================
Object.assign(window, {
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

    // 初始化加载
    loadDashboard();
    loadModels();
    loadSettings();

    // 绑定 LLM 相关测试与选择
    bindFetchModelsButton();
    bindTestConnectionButton();
    bindAnalysisLLMButtons();
    bindSettingsTabs();

    // 显示通告弹窗
    showDialog('notice-dialog');
});
