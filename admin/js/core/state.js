// ==========================================================================
// ST-Direct-TTS Admin Core State
// ==========================================================================

export const state = {
    // 模型管理状态
    currentModels: [],
    currentSelectedModel: '',
    selectedModelNames: new Set(),
    pendingDeleteModels: [],

    // 音频管理状态
    currentAudios: [],
    selectedAudioPaths: new Set(),
    pendingDeleteAudios: [],
    currentRenameContext: null,
    currentBatchEmotionModel: null,

    // 创作者工坊状态
    allWorkshopPresets: [],
    currentWorkshopFilter: 'all',
    pendingDeletePreset: null
};
