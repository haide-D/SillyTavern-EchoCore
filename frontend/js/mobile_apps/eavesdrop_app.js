/**
 * 对话追踪 / 剧场 App 模块 (Eavesdrop & Theater App)
 * 
 * 核心功能 (三子列表架构):
 * 1. 💬 当前对话: 查看当前聊天分支 (chat_branch) 下的私下密谈记录
 * 2. 📜 总的历史对话: 查看所有角色与历史密谈记录 (支持搜索与多角色录音完整回放)
 * 3. 🚀 开启密谈控制台: 内嵌式多 Speaker 勾选、联动剧本工坊 Presets、主题快捷池并一键开启密谈
 */

import { ChatInjector } from '../chat_injector.js';
import { WorldInfoExtractor } from '../world_info_extractor.js';
import { NotificationHandler } from '../notification_handler.js';
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from './shared/audio_player.js';
import { getApiHost, getChatBranch, formatTime, renderAvatarHtml, getCharacterAvatar, getDefaultAvatarDataUrl } from './shared/utils.js';
import { loadExtensionSettings } from '../settings_ui.js';
import { STATUS_SVGS, getEavesdropStatusTexts, isHarryPotterTheme } from '../themes/theme_status_helper.js';

export const id = 'eavesdrop';
export const defaultName = '对话追踪';
export const defaultIcon = STATUS_SVGS.ear;
export const sceneId = 'eavesdrop';
export const hidden = false;

// 视图状态与缓存
let _activeTab = 'current'; // 'current' | 'all' | 'launch'
let _lastGeneratedEavesdrop = null;
let _currentAudioPlayer = null;
let _allEavesdropsCache = [];
let _currentEavesdropsCache = [];
let _searchQuery = '';
let _presetsCache = [];
let _boundSpeakersCache = [];

const SVG = STATUS_SVGS;

/**
 * 注入样式
 */
const injectCSS = () => {
    if ($('#eavesdrop-app-css').length) return;
    const css = `
        .ed-app-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: transparent;
            color: #e5e7eb;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow-x: hidden;
            overflow-y: hidden;
            box-sizing: border-box;
            position: relative;
        }

        /* 多角色头像胶囊栈 */
        .ed-avatar-stack {
            display: flex;
            align-items: center;
        }
        .ed-avatar-stack-item {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid #181224;
            margin-left: -8px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            flex-shrink: 0;
        }
        .ed-avatar-stack-item:first-child {
            margin-left: 0;
        }
        .ed-avatar-stack-item.speaking {
            transform: scale(1.2);
            border-color: #f59e0b;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
            z-index: 20 !important;
        }
        .ed-avatar-stack-item.dimmed {
            opacity: 0.45;
            filter: grayscale(40%);
        }

        /* 顶部三子列表导航切换栏 */
        .ed-nav-tabs {
            display: flex !important;
            flex-direction: row !important;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(196, 155, 79, 0.2);
            padding: 8px 10px;
            gap: 6px;
            flex-shrink: 0;
            box-sizing: border-box;
            width: 100% !important;
        }
        .ed-nav-tab-btn {
            flex: 1;
            padding: 7px 6px;
            border-radius: 8px;
            border: 1px solid transparent;
            background: transparent;
            color: rgba(220, 200, 150, 0.7);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            white-space: nowrap;
        }
        .ed-nav-tab-btn:hover {
            color: rgba(220, 200, 150, 0.95);
            background: rgba(255, 255, 255, 0.04);
        }
        .ed-nav-tab-btn.active {
            background: rgba(217, 119, 6, 0.2);
            border-color: rgba(217, 119, 6, 0.5);
            color: #fde047;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(217, 119, 6, 0.2);
        }

        /* 历史列表视图容器 */
        .ed-history-scroll {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-sizing: border-box;
            width: 100%;
        }

        /* 搜索框 */
        .ed-search-row {
            display: flex;
            align-items: center;
            position: relative;
            margin-bottom: 4px;
            width: 100%;
            box-sizing: border-box;
        }
        .ed-search-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(196, 155, 79, 0.2);
            border-radius: 8px;
            padding: 7px 10px 7px 30px;
            font-size: 12px;
            color: #fff;
            outline: none;
            box-sizing: border-box;
            transition: all 0.2s;
        }
        .ed-search-input:focus {
            border-color: #f59e0b;
            background: rgba(255, 255, 255, 0.08);
        }
        .ed-search-icon {
            position: absolute;
            left: 10px;
            color: rgba(196, 155, 79, 0.6);
            pointer-events: none;
            display: flex;
        }

        /* 密谈记录卡片 */
        .ed-card {
            background: rgba(24, 18, 36, 0.75);
            border: 1px solid rgba(196, 155, 79, 0.2);
            border-radius: 10px;
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 7px;
            backdrop-filter: blur(8px);
            transition: all 0.2s;
            box-sizing: border-box;
            width: 100%;
        }
        .ed-card:hover {
            border-color: rgba(196, 155, 79, 0.45);
            background: rgba(30, 22, 45, 0.85);
        }
        .ed-card.highlight {
            border-color: #f59e0b;
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.2);
            background: linear-gradient(135deg, rgba(40, 30, 20, 0.8), rgba(25, 18, 12, 0.9));
        }
        .ed-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .ed-speakers-tag {
            font-size: 13px;
            font-weight: 600;
            color: #fef08a;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .ed-time {
            font-size: 11px;
            color: rgba(220, 200, 160, 0.6);
        }
        .ed-theme {
            font-size: 11.5px;
            color: rgba(220, 200, 160, 0.9);
            background: rgba(0, 0, 0, 0.3);
            padding: 4px 8px;
            border-radius: 5px;
            border-left: 2px solid #f59e0b;
        }
        .ed-dialog-preview {
            font-size: 11.5px;
            color: #d1d5db;
            line-height: 1.45;
            max-height: 80px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.25);
            padding: 5px 8px;
            border-radius: 5px;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .ed-card-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 3px;
            flex-wrap: wrap;
        }
        .ed-action-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #e5e7eb;
            border-radius: 5px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }
        .ed-action-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }
        .ed-action-btn.play {
            background: rgba(217, 119, 6, 0.2);
            border-color: rgba(217, 119, 6, 0.4);
            color: #fde047;
        }
        .ed-action-btn.play:hover {
            background: rgba(217, 119, 6, 0.35);
        }
        .ed-action-btn.inject {
            background: rgba(16, 185, 129, 0.15);
            border-color: rgba(16, 185, 129, 0.35);
            color: #6ee7b7;
        }
        .ed-action-btn.inject:hover {
            background: rgba(16, 185, 129, 0.3);
        }

        /* 内嵌式开启密谈控制台面板 */
        .ed-dial-panel {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-sizing: border-box;
            width: 100%;
        }
        .ed-system-hint {
            background: rgba(196, 155, 79, 0.08);
            border: 1px solid rgba(196, 155, 79, 0.2);
            padding: 7px 10px;
            border-radius: 7px;
            font-size: 11px;
            color: rgba(220, 200, 160, 0.85);
            line-height: 1.4;
            display: flex;
            align-items: center;
            gap: 6px;
            box-sizing: border-box;
            width: 100%;
        }
        .ed-form-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            width: 100%;
            box-sizing: border-box;
        }
        .ed-form-label {
            font-size: 11.5px;
            color: rgba(220, 200, 160, 0.9);
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ed-form-input, .ed-form-select {
            width: 100%;
            max-width: 100%;
            background: rgba(0, 0, 0, 0.45);
            border: 1px solid rgba(196, 155, 79, 0.25);
            border-radius: 7px;
            padding: 7px 10px;
            color: #fff;
            font-size: 12px;
            outline: none;
            box-sizing: border-box;
            transition: all 0.2s;
        }
        .ed-form-input:focus, .ed-form-select:focus {
            border-color: #f59e0b;
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
            background: rgba(0, 0, 0, 0.65);
        }
        .ed-form-select option {
            background: #181524;
            color: #fff;
        }

        /* 动态添加说话人按钮 */
        .ed-add-speaker-btn {
            background: rgba(245, 158, 11, 0.08);
            border: 1px dashed rgba(245, 158, 11, 0.35);
            color: #fde047;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }
        .ed-add-speaker-btn:hover {
            background: rgba(245, 158, 11, 0.2);
            border-color: #f59e0b;
            color: #fff;
        }

        .ed-quick-tag {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(196, 155, 79, 0.2);
            color: rgba(220, 200, 160, 0.85);
            padding: 3px 7px;
            border-radius: 10px;
            font-size: 10.5px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .ed-quick-tag:hover {
            background: rgba(245, 158, 11, 0.2);
            border-color: rgba(245, 158, 11, 0.5);
            color: #fde047;
        }
        .ed-main-btn {
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
            color: #fff;
            border: 1px solid rgba(245, 158, 11, 0.4);
            border-radius: 8px;
            padding: 9px 14px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-shadow: 0 3px 10px rgba(217, 119, 6, 0.25);
            transition: all 0.2s ease;
            width: 100%;
            box-sizing: border-box;
            margin-top: 4px;
        }
        .ed-main-btn:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
        }
        .ed-main-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        /* 监听待接听界面 */
        .ed-prompt-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 24px;
            text-align: center;
            gap: 16px;
        }
        .ed-prompt-icon {
            font-size: 48px;
            animation: ed-pulse 2s infinite ease-in-out;
        }
        @keyframes ed-pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 10px #f59e0b); }
        }
    `;
    $('head').append(`<style id="eavesdrop-app-css">${css}</style>`);
};

/**
 * 渲染对话追踪 / 剧场 App
 */
export async function render(container, createNavbar) {
    injectCSS();
    cleanupGlobalPlayer();
    container.empty();

    const eavesdropData = window.TTS_EavesdropData;

    // ========== 状态1: 接收到系统被动推送的窃听事件 ==========
    if (eavesdropData) {
        renderPassivePrompt(container, eavesdropData);
        return;
    }

    // ========== 状态2: 主界面 (三子列表导航) ==========
    container.append(createNavbar("对话追踪"));

    const $root = $(`
        <div class="ed-app-container">
            <!-- 顶部三子列表导航切换栏 -->
            <div class="ed-nav-tabs">
                <button class="ed-nav-tab-btn ${_activeTab === 'current' ? 'active' : ''}" data-tab="current">
                    ${SVG.chat || ''} 当前对话
                </button>
                <button class="ed-nav-tab-btn ${_activeTab === 'all' ? 'active' : ''}" data-tab="all">
                    ${SVG.history || ''} 总历史
                </button>
                <button class="ed-nav-tab-btn ${_activeTab === 'launch' ? 'active' : ''}" data-tab="launch">
                    ${SVG.theater || ''} 开启密谈
                </button>
            </div>

            <!-- 主视图容器 -->
            <div id="ed-tab-content" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                <div style="text-align:center; padding:30px; color:#9ca3af;">正在加载...</div>
            </div>
        </div>
    `);

    container.append($root);

    // 绑定 Tab 切换
    $root.find('.ed-nav-tab-btn').on('click', function () {
        const tab = $(this).data('tab');
        if (_activeTab === tab) return;
        _activeTab = tab;
        $root.find('.ed-nav-tab-btn').removeClass('active');
        $(this).addClass('active');
        renderActiveTabContent($root);
    });

    // 优先立即在当前 $root 容器中渲染子视图，0毫秒秒级出画面，不受全局挂载时钟影响
    renderActiveTabContent($root);

    // 后台静默刷新预设与 Speakers
    initPresetsAndSpeakers().then(() => {
        if (_activeTab === 'launch') {
            renderActiveTabContent($root);
        }
    }).catch(() => {});
}

/**
 * 初始化 Speakers 与剧本工坊预设池 (带超时保护与优雅回退)
 */
async function initPresetsAndSpeakers() {
    const apiHost = getApiHost();
    try {
        const fetchWithTimeout = (url, ms = 3000) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), ms);
            return fetch(url, { signal: controller.signal })
                .then(r => r.json())
                .catch(() => null)
                .finally(() => clearTimeout(timeoutId));
        };

        const [dataRes, presetsRes] = await Promise.all([
            fetchWithTimeout(`${apiHost}/api/get_data`),
            fetchWithTimeout(`${apiHost}/api/presets?category=eavesdrop`)
        ]);

        if (dataRes && dataRes.mappings) {
            _boundSpeakersCache = Object.keys(dataRes.mappings);
        }
        if (presetsRes && presetsRes.presets) {
            _presetsCache = presetsRes.presets;
        }
    } catch (e) {
        console.warn('[EavesdropApp] 初始化预设与 Speakers 失败 (使用内存缓存):', e);
    }
}

/**
 * 渲染当前激活的子视图内容 (支持上下文 DOM 容器)
 */
async function renderActiveTabContent($parentRoot) {
    const $container = ($parentRoot && $parentRoot.find('#ed-tab-content').length)
        ? $parentRoot.find('#ed-tab-content')
        : $('#ed-tab-content');
    if (!$container.length) return;

    if (_activeTab === 'current') {
        await renderCurrentBranchEavesdrops($container, $parentRoot);
    } else if (_activeTab === 'all') {
        await renderAllHistoryEavesdrops($container, $parentRoot);
    } else if (_activeTab === 'launch') {
        renderLaunchConsole($container, $parentRoot);
    }
}

/**
 * 子视图 1: 渲染当前对话分支的密谈记录
 */
async function renderCurrentBranchEavesdrops($container, $parentRoot) {
    const pendingCount = window.TTS_CallQueueManager ? window.TTS_CallQueueManager.getPendingCount() : 0;
    const queueBannerHtml = pendingCount > 0 ? `
        <div style="background:linear-gradient(135deg, rgba(168,85,247,0.15), rgba(147,51,234,0.15)); border:1px solid rgba(168,85,247,0.4); border-radius:10px; padding:10px 14px; margin:10px 14px 4px 14px; display:flex; align-items:center; justify-content:space-between;">
            <div style="font-size:12px; font-weight:600; color:#c084fc;">
                📬 待听队列中存有 ${pendingCount} 条密谈传讯
            </div>
            <button id="ed-play-all-queue-btn" style="background:#a855f7; color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer;">
                连续收听 🎧
            </button>
        </div>
    ` : '';

    $container.html(`
        ${queueBannerHtml}
        <div class="ed-history-scroll" id="ed-current-list">
            <div style="text-align:center; padding:30px; color:#9ca3af;">正在读取密谈记录...</div>
        </div>
    `);

    $container.find('#ed-play-all-queue-btn').on('click', function() {
        if (window.TTS_ThemeEngine) {
            window.TTS_ThemeEngine.showScene('eavesdrop');
        }
    });
    const $list = $container.find('#ed-current-list');

    const chatBranch = getChatBranch();
    const apiHost = getApiHost();

    try {
        const url = chatBranch 
            ? `${apiHost}/api/eavesdrop/history?chat_branch=${encodeURIComponent(chatBranch)}&limit=40`
            : `${apiHost}/api/eavesdrop/history?limit=40`;
        
        const res = await fetch(url).then(r => r.json());
        _currentEavesdropsCache = (res && (res.history || res.records)) || [];

        if (_currentEavesdropsCache.length === 0 && chatBranch) {
            // 如果指定分支暂无记录，尝试读取总历史作为智能兜底
            const fallbackRes = await fetch(`${apiHost}/api/eavesdrop/history?limit=20`).then(r => r.json()).catch(() => null);
            const allList = (fallbackRes && (fallbackRes.history || fallbackRes.records)) || [];
            if (allList.length > 0) {
                // 筛选出未绑定分支 (default / 空) 的记录
                const unbranched = allList.filter(r => !r.chat_branch || r.chat_branch === 'default' || r.chat_branch === '');
                if (unbranched.length > 0) {
                    _currentEavesdropsCache = unbranched;
                }
            }
        }

        renderEavesdropsToContainer($list, _currentEavesdropsCache, true, $parentRoot);
    } catch (e) {
        console.error('[EavesdropApp] 加载当前对话密谈失败:', e);
        $list.html(`<div style="text-align:center; padding:30px; color:#ef4444;">加载失败: ${e.message}</div>`);
    }
}

/**
 * 子视图 2: 渲染全量总历史
 */
async function renderAllHistoryEavesdrops($container, $parentRoot = null) {
    $container.html(`
        <div style="padding:10px 14px 0 14px;">
            <div class="ed-search-row">
                <span class="ed-search-icon">${SVG.search}</span>
                <input type="text" class="ed-search-input" id="ed-all-search" placeholder="搜索所有密谈角色或主题..." value="${_searchQuery}">
            </div>
        </div>
        <div class="ed-history-scroll" id="ed-all-list">
            <div style="text-align:center; padding:30px; color:#9ca3af;">正在加载全量历史...</div>
        </div>
    `);

    const $list = $container.find('#ed-all-list');
    const apiHost = getApiHost();

    try {
        const res = await fetch(`${apiHost}/api/eavesdrop/history?limit=80`).then(r => r.json());
        _allEavesdropsCache = (res && (res.history || res.records)) || [];

        const applyFilterAndRender = () => {
            const filtered = _allEavesdropsCache.filter(r => {
                if (!_searchQuery) return true;
                const spks = (Array.isArray(r.speakers) ? r.speakers.join(' ') : String(r.speakers || '')).toLowerCase();
                const themeMatch = (r.scene_description || r.theme || '').toLowerCase().includes(_searchQuery);
                return spks.includes(_searchQuery) || themeMatch;
            });
            renderEavesdropsToContainer($list, filtered, false, $parentRoot);
        };

        $container.find('#ed-all-search').on('input', function () {
            _searchQuery = $(this).val().trim().toLowerCase();
            applyFilterAndRender();
        });

        applyFilterAndRender();
    } catch (e) {
        console.error('[EavesdropApp] 加载全量历史失败:', e);
        $list.html(`<div style="text-align:center; padding:30px; color:#ef4444;">加载失败: ${e.message}</div>`);
    }
}

/**
 * 渲染密谈卡片通用列表
 */
function renderEavesdropsToContainer($list, records, isCurrentTab = false, $parentRoot = null) {
    $list.empty();
    const statusTexts = getEavesdropStatusTexts();

    if (_lastGeneratedEavesdrop && isCurrentTab) {
        const $latestCard = createEavesdropCard(_lastGeneratedEavesdrop, true);
        $list.append($latestCard);
    }

    if (records.length === 0 && (!_lastGeneratedEavesdrop || !isCurrentTab)) {
        $list.html(`
            <div style="text-align:center; padding:45px 20px; color:#9ca3af;">
                <div style="font-size:28px; margin-bottom:10px; opacity:0.8;">${SVG.ear}</div>
                <div style="font-weight:600; font-size:14px; color:#f3f4f6;">${isCurrentTab ? statusTexts.emptyCurrentTitle : statusTexts.emptyAllTitle}</div>
                <div style="font-size:11.5px; color:rgba(220,200,160,0.6); margin-top:6px;">
                    ${statusTexts.emptySub}
                </div>
                ${isCurrentTab ? `
                <div style="margin-top:16px;">
                    <button class="ed-go-all-btn" style="background:rgba(217,119,6,0.2); border:1px solid rgba(217,119,6,0.5); color:#fde047; padding:6px 14px; border-radius:8px; font-size:12px; cursor:pointer; font-weight:500;">
                        📜 查看总历史记录
                    </button>
                </div>
                ` : ''}
            </div>
        `);

        $list.find('.ed-go-all-btn').on('click', function () {
            _activeTab = 'all';
            const $root = $parentRoot || $('.ed-app-container');
            $root.find('.ed-nav-tab-btn').removeClass('active');
            $root.find('.ed-nav-tab-btn[data-tab="all"]').addClass('active');
            renderActiveTabContent($parentRoot);
        });
        return;
    }

    records.forEach(rec => {
        const $card = createEavesdropCard(rec, false);
        $list.append($card);
    });
}

/**
 * 辅助生成 Speaker 下拉列表 Options
 */
function buildSpeakerOptions(speakers, selectedSpeaker = null, placeholder = null) {
    let html = '';
    if (placeholder) {
        html += `<option value="" ${!selectedSpeaker ? 'selected' : ''} disabled>${placeholder}</option>`;
    }
    speakers.forEach(s => {
        const isSelected = s === selectedSpeaker ? 'selected' : '';
        html += `<option value="${s}" ${isSelected}>${s}</option>`;
    });
    return html;
}

/**
 * 子视图 3: 内嵌式开启密谈控制台 (联动工坊预设)
 */
function renderLaunchConsole($container) {
    const statusTexts = getEavesdropStatusTexts();
    const enriched = WorldInfoExtractor.getEnrichedContext({ maxMessages: 12 });
    const boundSpeakers = _boundSpeakersCache.length > 0 ? _boundSpeakersCache : (enriched.speakers.length > 0 ? enriched.speakers : [enriched.charName, "神秘人"]);

    // 默认两位参与密谈角色
    const defaultSpeaker1 = boundSpeakers[0] || enriched.charName || '角色A';
    const defaultSpeaker2 = boundSpeakers.length > 1 ? boundSpeakers[1] : (boundSpeakers[0] || '角色B');

    const speakerOptions1 = buildSpeakerOptions(boundSpeakers, defaultSpeaker1);
    const speakerOptions2 = buildSpeakerOptions(boundSpeakers, defaultSpeaker2);

    // 联动工坊窃听预设
    const presets = _presetsCache.length > 0 ? _presetsCache : [{ id: 'standard_eavesdrop', name: '私下密谈', description: '角色私下议论主角与局势' }];
    const presetOptions = presets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    const quickMotivations = ["商议秘密行动与情报", "暗中争执与彼此试探", "讨论当前局势与隐患", "私下交流与情感吐槽", "谋划意外惊喜"];
    const quickTagsHtml = quickMotivations.map(m => `<span class="ed-quick-tag" data-val="${m}">${m}</span>`).join('');

    const html = `
        <div class="ed-dial-panel">
            <!-- 沉浸式设定感应提示 -->
            <div class="ed-system-hint">
                ${statusTexts.systemHint}
            </div>

            <!-- 密谈角色 1 -->
            <div class="ed-form-group">
                <label class="ed-form-label">密谈角色 1</label>
                <select class="ed-form-select ed-speaker-select" id="ed-form-speaker-1">
                    ${speakerOptions1}
                </select>
            </div>

            <!-- 密谈角色 2 -->
            <div class="ed-form-group">
                <label class="ed-form-label">密谈角色 2</label>
                <select class="ed-form-select ed-speaker-select" id="ed-form-speaker-2">
                    ${speakerOptions2}
                </select>
            </div>

            <!-- 动态追加额外角色容器 (单行全宽) -->
            <div id="ed-extra-speakers-container" style="display:flex; flex-direction:column; gap:8px;"></div>

            <!-- 添加更多角色按钮 -->
            <div style="display:flex; justify-content:flex-end; margin-top:2px;">
                <button type="button" class="ed-add-speaker-btn" id="ed-btn-add-speaker">
                    ${SVG.plus || '+'} 添加更多角色
                </button>
            </div>

            <!-- 剧本工坊预设选择 -->
            <div class="ed-form-group">
                <div class="ed-form-label">
                    <span>剧本预设</span>
                    <span style="font-size:11px; color:rgba(196,155,79,0.85);">已同步工坊</span>
                </div>
                <select class="ed-form-select" id="ed-form-preset">
                    ${presetOptions}
                </select>
            </div>

            <!-- 对话语言选择器 -->
            <div class="ed-form-group">
                <label class="ed-form-label">对话语言</label>
                <select class="ed-form-select" id="ed-form-language">
                    <option value="auto" selected>智能自适应 (根据角色模型与语境)</option>
                    <option value="zh">中文 (Chinese)</option>
                    <option value="ja">日文 (Japanese)</option>
                    <option value="en">英文 (English)</option>
                </select>
            </div>

            <!-- 密谈主题 / 探听场景 -->
            <div class="ed-form-group">
                <label class="ed-form-label">${statusTexts.reasonLabel}</label>
                <input type="text" class="ed-form-input" id="ed-form-reason" value="${statusTexts.reasonDefault}">
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:2px;">
                    ${quickTagsHtml}
                </div>
            </div>

            <!-- 语气基调 (可选) -->
            <div class="ed-form-group">
                <label class="ed-form-label">语气基调 (可选)</label>
                <input type="text" class="ed-form-input" id="ed-form-tone" placeholder="${statusTexts.tonePlaceholder}">
            </div>

            <!-- 开启密谈大按钮 -->
            <button class="ed-main-btn" id="ed-form-submit-btn">
                ${statusTexts.btnIdle}
            </button>
        </div>
    `;

    $container.html(html);

    // 动态添加额外角色
    $('#ed-btn-add-speaker').on('click', function () {
        const extraCount = $('#ed-extra-speakers-container .ed-extra-speaker-row').length;
        const nextIndex = extraCount + 3;
        const emptyOptions = buildSpeakerOptions(boundSpeakers, '', `-- 请选择角色 ${nextIndex} --`);

        const $row = $(`
            <div class="ed-extra-speaker-row ed-form-group" style="margin-top:2px;">
                <div class="ed-form-label">
                    <span class="ed-extra-index">密谈角色 ${nextIndex}</span>
                    <button type="button" class="ed-remove-speaker-btn" title="移除此角色" style="background:transparent; border:none; color:rgba(239,68,68,0.8); cursor:pointer; font-size:11px;">
                        移除
                    </button>
                </div>
                <select class="ed-form-select ed-speaker-select">
                    ${emptyOptions}
                </select>
            </div>
        `);

        $row.find('.ed-remove-speaker-btn').on('click', function () {
            $row.remove();
            // 重新刷新序号
            $container.find('#ed-extra-speakers-container .ed-extra-speaker-row').each(function (idx) {
                $(this).find('.ed-extra-index').text(`密谈角色 ${idx + 3}`);
            });
        });

        $container.find('#ed-extra-speakers-container').append($row);
    });

    // 快捷主题点选
    $container.find('.ed-quick-tag').on('click', function () {
        $container.find('#ed-form-reason').val($(this).data('val'));
    });

    // 提交发起密谈
    $container.find('#ed-form-submit-btn').on('click', async function () {
        let selectedSpeakers = [];
        $container.find('.ed-speaker-select').each(function () {
            const val = $(this).val();
            if (val && typeof val === 'string' && val.trim()) {
                const cleanVal = val.trim();
                if (!selectedSpeakers.includes(cleanVal)) {
                    selectedSpeakers.push(cleanVal);
                }
            }
        });

        if (selectedSpeakers.length < 2) {
            alert('请选择至少 2 位不同的说话人以展开密谈！');
            return;
        }

        const presetId = $container.find('#ed-form-preset').val();
        const reason = $container.find('#ed-form-reason').val().trim() || '私下密谈';
        const tone = $container.find('#ed-form-tone').val().trim();
        const selectedLang = $container.find('#ed-form-language').val();

        await generateAndLaunchEavesdrop({
            speakers: selectedSpeakers,
            presetId,
            reason,
            tone,
            language: selectedLang,
            enriched
        });
    });
}

/**
 * 创建单条密谈卡片 (支持重播、重新生成与注入聊天)
 */
function createEavesdropCard(rec, isLatest = false) {
    let speakers = rec.speakers || [];
    if (typeof speakers === 'string') {
        try { speakers = JSON.parse(speakers); } catch (e) { speakers = [speakers]; }
    }
    const speakersStr = speakers.join(' & ') || '多人密谈';

    const timeStr = rec.created_at ? formatTime(rec.created_at) : "刚刚";
    const theme = rec.scene_description || rec.theme || "私下交流重要事宜";
    const audioUrl = rec.audio_url || (rec.audio ? `data:audio/wav;base64,${rec.audio}` : null);

    let segments = rec.segments || [];
    if (typeof segments === 'string') {
        try { segments = JSON.parse(segments); } catch (e) { segments = []; }
    }

    const previewTexts = segments.map(s => {
        const t = s.translation || s.text || '';
        return `<div><strong>${s.speaker || '角色'}:</strong> ${t}</div>`;
    }).join('');

    // 构造多角色头像胶囊栈
    const avatarStackHtml = speakers.map((s, idx) => `
        <div class="ed-avatar-stack-item" data-speaker="${s}" style="z-index:${10 - idx};" title="${s}">
            ${renderAvatarHtml(s, '', 'width:100%; height:100%; object-fit:cover;')}
        </div>
    `).join('');

    const $card = $(`
        <div class="ed-card ${isLatest ? 'highlight' : ''}">
            <div class="ed-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="ed-avatar-stack">
                        ${avatarStackHtml}
                    </div>
                    <div class="ed-speakers-tag">
                        ${speakersStr}
                        ${isLatest ? '<span style="font-size:10px; background:#d97706; color:#fff; padding:1px 6px; border-radius:10px;">最新密谈</span>' : ''}
                    </div>
                </div>
                <span class="ed-time">${timeStr}</span>
            </div>

            <div class="ed-theme">
                <strong>密谈背景:</strong> ${theme}
            </div>

            ${previewTexts ? `<div class="ed-dialog-preview">${previewTexts}</div>` : ''}

            <div class="ed-card-actions">
                ${audioUrl ? `
                    <button class="ed-action-btn play ws-btn-play" title="播放多角色完整录音">
                        ${SVG.play} 播放录音
                    </button>
                ` : ''}
                <button class="ed-action-btn ws-btn-regen" title="以相同参数重新生成">
                    ${SVG.refresh} 重新生成
                </button>
                <button class="ed-action-btn inject ws-btn-inject" title="将密谈内容追加到 SillyTavern 聊天消息">
                    ${SVG.inject} 注入当前聊天
                </button>
            </div>
        </div>
    `);

    // 播放/暂停及说话人动态切换
    $card.find('.ws-btn-play').on('click', function () {
        if (!audioUrl) return;
        const $btn = $(this);

        if (_currentAudioPlayer && _currentAudioPlayer.isPlaying()) {
            _currentAudioPlayer.pause();
            $btn.html(`${SVG.play} 播放录音`);
            $card.find('.ed-avatar-stack-item').removeClass('speaking dimmed');
            return;
        }

        cleanupGlobalPlayer();
        _currentAudioPlayer = new AudioPlayer({ audioUrl, segments });
        setGlobalPlayer(_currentAudioPlayer);

        // 监听说话人切换事件，动态聚光灯高亮当前发言人头像
        _currentAudioPlayer.on('speaker_change', ({ speaker }) => {
            $card.find('.ed-avatar-stack-item').each(function () {
                const spk = $(this).data('speaker');
                if (spk === speaker) {
                    $(this).addClass('speaking').removeClass('dimmed');
                } else {
                    $(this).removeClass('speaking').addClass('dimmed');
                }
            });
        });

        _currentAudioPlayer.on('ended', () => {
            $btn.html(`${SVG.play} 播放录音`);
            $card.find('.ed-avatar-stack-item').removeClass('speaking dimmed');
        });

        _currentAudioPlayer.play();
        $btn.html(`${SVG.pause} 暂停`);
    });

    // 重新生成
    $card.find('.ws-btn-regen').on('click', async () => {
        _activeTab = 'launch';
        $('.ed-nav-tab-btn').removeClass('active');
        $(`.ed-nav-tab-btn[data-tab="launch"]`).addClass('active');
        renderLaunchConsole($('#ed-tab-content'));
        if (speakers[0]) $('#ed-form-speaker-1').val(speakers[0]);
        if (speakers[1]) $('#ed-form-speaker-2').val(speakers[1]);
        if (rec.preset_id) $('#ed-form-preset').val(rec.preset_id);
        $('#ed-form-reason').val(theme);
    });

    // 注入当前聊天
    $card.find('.ws-btn-inject').on('click', async function () {
        const $btn = $(this);
        $btn.prop('disabled', true).text('注入中...');
        try {
            await ChatInjector.appendToLastAIMessage({
                type: 'eavesdrop',
                speakers: speakers,
                segments: segments,
                callId: rec.record_id || rec.id || Date.now(),
                audioUrl: audioUrl,
                sceneDescription: theme
            });
            $btn.html(`${SVG.inject} 已注入`);
            setTimeout(() => $btn.html(`${SVG.inject} 注入当前聊天`), 2000);
        } catch (e) {
            console.error('[EavesdropApp] 注入失败:', e);
            alert(`注入失败: ${e.message}`);
            $btn.html(`${SVG.inject} 注入当前聊天`);
        } finally {
            $btn.prop('disabled', false);
        }
    });

    return $card;
}

/**
 * 渲染被动待监听界面 (推送触发)
 */
function renderPassivePrompt(container, eavesdropData) {
    const speakers = eavesdropData.speakers || [];
    const speakersText = speakers.join(' 与 ') || '角色私聊';

    const avatarStackHtml = speakers.map((s, idx) => `
        <div style="width:52px; height:52px; border-radius:50%; overflow:hidden; border:3px solid rgba(217,119,6,0.6); margin-left:${idx === 0 ? '0' : '-16px'}; z-index:${10 - idx}; display:inline-block; box-shadow:0 4px 12px rgba(0,0,0,0.5);" title="${s}">
            ${renderAvatarHtml(s, '', 'width:100%; height:100%; object-fit:cover;')}
        </div>
    `).join('');

    const $prompt = $(`
        <div class="ed-app-container">
            <div class="ed-prompt-container">
                <div style="display:flex; justify-content:center; align-items:center; margin-bottom:12px;">
                    ${avatarStackHtml}
                </div>
                <h3 style="margin:0; font-size:18px; color:#fef08a;">检测到密谈: ${speakersText}</h3>
                <p style="margin:0; font-size:13px; color:rgba(220,200,160,0.85);">${eavesdropData.scene_description || '角色们正在私底下商讨重要事宜...'}</p>
                
                <div style="display:flex; gap:12px; margin-top:10px;">
                    <button id="ed-ignore-btn" style="padding:10px 20px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#d1d5db; cursor:pointer;">
                        忽略
                    </button>
                    <button id="ed-listen-btn" class="ed-main-btn" style="padding:10px 24px;">
                        ${SVG.ear} 立即监听
                    </button>
                </div>
            </div>
        </div>
    `);

    container.append($prompt);

    $prompt.find('#ed-ignore-btn').on('click', () => {
        window.TTS_EavesdropData = null;
        window.TTS_EavesdropReady = null;
        if (window.TTS_ThemeEngine) {
            window.TTS_ThemeEngine.notify('call_ended', {});
            window.TTS_ThemeEngine.showScene('home');
        } else {
            $('#mobile-home-btn').click();
        }
    });

    $prompt.find('#ed-listen-btn').on('click', async () => {
        window.TTS_EavesdropData = null;
        window.TTS_EavesdropReady = null;
        if (window.TTS_ThemeEngine) {
            window.TTS_ThemeEngine.notify('call_ended', {});
        }
        _lastGeneratedEavesdrop = eavesdropData;

        // 检查是否开启自动注入
        const settings = loadExtensionSettings();
        if (settings.auto_inject_on_answer) {
            try {
                await ChatInjector.appendToLastAIMessage({
                    type: 'eavesdrop',
                    segments: eavesdropData.segments || [],
                    speakers: eavesdropData.speakers || [],
                    callId: eavesdropData.record_id || Date.now(),
                    audioUrl: eavesdropData.audio_url,
                    sceneDescription: eavesdropData.scene_description
                });
                console.log('[EavesdropApp] ✅ 密谈内容已自动追加到聊天');
            } catch (e) {
                console.error('[EavesdropApp] 自动注入失败:', e);
            }
        } else {
            console.log('[EavesdropApp] ℹ️ 自动注入未开启，用户可手动在卡片上点击注入');
        }

        // 自动播放
        if (eavesdropData.audio_url) {
            cleanupGlobalPlayer();
            _currentAudioPlayer = new AudioPlayer({ audioUrl: eavesdropData.audio_url, segments: eavesdropData.segments || [] });
            setGlobalPlayer(_currentAudioPlayer);
            _currentAudioPlayer.play();
        }

        // 重新渲染为主界面展示
        _activeTab = 'current';
        render(container, () => $('<div></div>'));
    });
}

/**
 * 执行主动开启密谈生成全链路
 */
async function generateAndLaunchEavesdrop({ speakers, presetId, reason, tone, language, enriched }) {
    const apiHost = getApiHost();
    const statusTexts = getEavesdropStatusTexts();

    if (!window.LLM_Client || typeof window.LLM_Client.callLLM !== 'function') {
        alert('LLM_Client 未就绪，无法开启密谈');
        return;
    }

    const $btn = $('#ed-form-submit-btn');
    $btn.prop('disabled', true).html(statusTexts.btnLoading(statusTexts.step1Prompt));

    try {
        // 1. 构建 Prompt (直接对接工坊预设)
        const buildPayload = {
            context: enriched.context,
            speakers: speakers,
            user_name: enriched.userName,
            chat_branch: enriched.chatBranch,
            text_lang: language || 'zh',
            preset_id: presetId,
            theme: reason,
            call_reason: reason,
            call_tone: tone,
            character_persona: enriched.characterPersona,
            world_info: enriched.worldInfo
        };

        const buildRes = await fetch(`${apiHost}/api/eavesdrop/build_prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload)
        });

        if (!buildRes.ok) {
            const err = await buildRes.text();
            throw new Error(`连接失败: ${err}`);
        }
        const buildData = await buildRes.json();

        // 2. 调用 LLM
        $btn.html(statusTexts.btnLoading(statusTexts.step2LLM(speakers)));
        const llmConfig = {
            api_url: buildData.llm_config.api_url,
            api_key: buildData.llm_config.api_key,
            model: buildData.llm_config.model,
            temperature: buildData.llm_config.temperature || 0.8,
            max_tokens: buildData.llm_config.max_tokens || 4000,
            prompt: buildData.prompt
        };

        const llmResponse = await window.LLM_Client.callLLM(llmConfig);

        // 3. TTS 合成 (多角色分别合成并按音轨对齐合并)
        $btn.html(statusTexts.btnLoading(statusTexts.step3TTS));
        const parseRes = await fetch(`${apiHost}/api/eavesdrop/parse_and_generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                llm_response: llmResponse,
                speakers: speakers,
                text_lang: language || 'zh',
                chat_branch: enriched.chatBranch,
                context_fingerprint: enriched.contextFingerprint,
                scene_description: reason
            })
        });

        if (!parseRes.ok) {
            const err = await parseRes.text();
            throw new Error(`音频链路生成失败: ${err}`);
        }
        const parseData = await parseRes.json();

        // 组装生成结果对象
        const eavesdropData = {
            record_id: parseData.record_id || `manual_eavesdrop_${Date.now()}`,
            speakers: speakers,
            scene_description: reason,
            preset_id: presetId,
            segments: parseData.segments || [],
            audio_url: parseData.audio_url || (parseData.audio ? `data:audio/wav;base64,${parseData.audio}` : null),
            notification_text: `检测到 ${speakers.join(' 与 ')} 的密谈`,
            created_at: new Date().toISOString()
        };
        _lastGeneratedEavesdrop = eavesdropData;

        // 预设 Tab 为当前对话
        _activeTab = 'current';

        // 1. 自动收起/最小化当前面板
        if (window.TTS_ThemeEngine) {
            window.TTS_ThemeEngine.close();
        }

        // 2. 通过 NotificationHandler 分发密谈通知（触发悬浮球动效/粒子/法阵及Toast提示）
        await NotificationHandler.handleEavesdropReady(eavesdropData);

    } catch (e) {
        console.error('[EavesdropApp] 密谈生成失败:', e);
        alert(`密谈开启失败: ${e.message}`);
    } finally {
        $btn.prop('disabled', false).html(statusTexts.btnIdle);
    }
}

/**
 * 清理函数
 */
export function cleanup() {
    cleanupGlobalPlayer();
}
