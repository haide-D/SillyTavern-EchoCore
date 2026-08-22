/**
 * 剧本工坊 / 变幻秘典 App 模块 (Workshop App)
 * 
 * 模块化重构主入口 (调度层)
 * 核心架构原则:
 * 1. 严格以 Speaker 为核心交互主体 (主动电话: Speaker -> Target; 私下窃听: 2+ Speakers)
 * 2. 角色性格 (Persona) 与世界书 (World Info) 自动从 SillyTavern 角色卡读取注入
 * 3. 纯 SVG 极简现代 UI 与魔幻微光质感
 */

import { createNavbar as defaultCreateNavbar } from '../themes/theme_utils.js';
import { STATUS_SVGS } from '../themes/theme_status_helper.js';
import { SVG } from './workshop/svgs.js';
import { 
    getApiHost, 
    fetchPresets, 
    fetchActivePresets, 
    togglePresetActive, 
    setBatchActivePresets, 
    deletePreset 
} from './workshop/api.js';
import { showToast } from './workshop/executor.js';
import { openDirectedCallModal } from './workshop/directed_modal.js';
import { openEditModal } from './workshop/edit_modal.js';
import { openImportModal } from './workshop/import_modal.js';

export const id = 'workshop';
export const defaultName = '剧本工坊';
export const defaultIcon = STATUS_SVGS.wand;
export const sceneId = 'workshop';
export const hidden = false;

let _currentCategory = 'phone_call'; // 'phone_call' | 'eavesdrop'
let _presets = [];
let _activePresets = { phone_call: ['standard_call'], eavesdrop: ['standard_eavesdrop'] };
let _searchQuery = '';

/**
 * 渲染主界面
 */
export async function render(container, createNavbarFunc) {
    container.empty();

    let navFunc = defaultCreateNavbar;
    if (typeof createNavbarFunc === 'function') {
        navFunc = createNavbarFunc;
    } else if (createNavbarFunc && typeof createNavbarFunc.createNavbar === 'function') {
        navFunc = createNavbarFunc.createNavbar;
    }

    const nav = navFunc("剧本工坊");
    container.append(nav);

    const $wsRoot = $(`
        <div class="ws-container">
            <!-- 顶部选项卡 -->
            <div class="ws-tabs-bar">
                <button class="ws-tab-btn ${_currentCategory === 'phone_call' ? 'active' : ''}" data-cat="phone_call">
                    ${SVG.phone} 主动来电剧本
                </button>
                <button class="ws-tab-btn ${_currentCategory === 'eavesdrop' ? 'active' : ''}" data-cat="eavesdrop">
                    ${SVG.ear} 私下窃听剧本
                </button>
            </div>

            <!-- 工具栏：搜索与操作 -->
            <div class="ws-toolbar">
                <div class="ws-tool-row">
                    <div class="ws-search-box">
                        <span class="ws-search-icon">${SVG.search}</span>
                        <input type="text" class="ws-search-input" placeholder="搜索剧本名称或描述..." value="${_searchQuery}">
                    </div>
                    <button class="ws-tool-btn ws-tool-btn-primary" id="ws-btn-new">${SVG.plus} 新建</button>
                    <button class="ws-tool-btn ws-tool-btn-secondary" id="ws-btn-import">${SVG.import} 导入</button>
                </div>
                
                <!-- 批量生效状态与一键快捷栏 -->
                <div class="ws-batch-bar">
                    <div class="ws-batch-status" id="ws-batch-status-text">
                        ${SVG.sparkles} 正在获取生效剧本池...
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="ws-batch-btn" id="ws-btn-select-all" title="全选所有剧本批量生效">全选生效</button>
                        <button class="ws-batch-btn" id="ws-btn-reset-default" title="仅保留出厂默认剧本">恢复默认</button>
                    </div>
                </div>
            </div>

            <!-- 卡片列表容器 -->
            <div class="ws-cards-list" id="ws-cards-container">
                <div style="text-align:center; padding:30px; color:#9ca3af;">正在加载剧本列表...</div>
            </div>

            <!-- 即时测试状态浮层 -->
            <div class="ws-test-toast" id="ws-test-toast">
                <div class="ws-spinner"></div>
                <span id="ws-test-toast-msg">正在准备剧本呼叫...</span>
            </div>
        </div>
    `);

    container.append($wsRoot);

    // 绑定 Tab 切换
    $wsRoot.find('.ws-tab-btn').on('click', function () {
        const cat = $(this).data('cat');
        if (_currentCategory === cat) return;
        _currentCategory = cat;
        $wsRoot.find('.ws-tab-btn').removeClass('active');
        $(this).addClass('active');
        loadPresetsAndRender();
    });

    // 绑定搜索
    $wsRoot.find('.ws-search-input').on('input', function () {
        _searchQuery = $(this).val().trim().toLowerCase();
        renderCardList();
    });

    // 绑定新建与导入
    $wsRoot.find('#ws-btn-new').on('click', () => openEditModal(_currentCategory, null, loadPresetsAndRender));
    $wsRoot.find('#ws-btn-import').on('click', () => openImportModal(_currentCategory, loadPresetsAndRender));

    // 绑定全选与恢复默认
    $wsRoot.find('#ws-btn-select-all').on('click', async () => {
        const allIds = _presets.map(p => p.id);
        await handleBatchActive(allIds);
    });

    $wsRoot.find('#ws-btn-reset-default').on('click', async () => {
        const defaultId = _currentCategory === 'phone_call' ? 'standard_call' : 'standard_eavesdrop';
        await handleBatchActive([defaultId]);
    });

    // 加载初始数据并渲染
    await loadPresetsAndRender();
}

/**
 * 加载预设与激活状态
 */
async function loadPresetsAndRender() {
    const $container = $('#ws-cards-container');
    try {
        const [presets, active] = await Promise.all([
            fetchPresets(_currentCategory),
            fetchActivePresets()
        ]);

        _presets = presets || [];
        _activePresets = active || { phone_call: ['standard_call'], eavesdrop: ['standard_eavesdrop'] };

        updateBatchBarStatus();
        renderCardList();
    } catch (e) {
        console.error('[Workshop] 加载预设失败:', e);
        if ($container.length) {
            $container.html(`<div style="text-align:center; padding:30px; color:#ef4444;">加载失败: ${e.message}</div>`);
        }
    }
}

/**
 * 获取当前分类下的生效列表
 */
function getActiveList() {
    const list = _activePresets[_currentCategory];
    if (Array.isArray(list)) return list;
    if (typeof list === 'string') return [list];
    return [_currentCategory === 'phone_call' ? 'standard_call' : 'standard_eavesdrop'];
}

/**
 * 更新批量生效状态栏文案
 */
function updateBatchBarStatus() {
    const $status = $('#ws-batch-status-text');
    if (!$status.length) return;

    const activeList = getActiveList();
    const count = activeList.length;

    if (count > 1) {
        $status.html(`${SVG.sparkles} 已启用 <span class="ws-batch-highlight">${count}</span> 个剧本 · 后台将根据对话情境<span class="ws-batch-highlight">自动智能匹配</span>`);
    } else {
        const singleId = activeList[0] || '默认';
        const found = _presets.find(p => p.id === singleId);
        const name = found ? found.name : singleId;
        $status.html(`${SVG.check} 当前生效剧本: <span class="ws-batch-highlight">${name}</span>`);
    }
}

/**
 * 渲染预设卡片列表
 */
function renderCardList() {
    const $container = $('#ws-cards-container');
    if (!$container.length) return;

    const activeList = getActiveList();

    const filtered = _presets.filter(p => {
        if (_searchQuery) {
            const nameMatch = (p.name || '').toLowerCase().includes(_searchQuery);
            const descMatch = (p.description || '').toLowerCase().includes(_searchQuery);
            const authorMatch = (p.author || '').toLowerCase().includes(_searchQuery);
            if (!nameMatch && !descMatch && !authorMatch) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        $container.html(`<div style="text-align:center; padding:40px; color:#9ca3af;">未找到相关剧本预设</div>`);
        return;
    }

    $container.empty();

    filtered.forEach(preset => {
        const isActive = activeList.includes(preset.id);
        const isBuiltin = !!preset.is_builtin;

        const $card = $(`
            <div class="ws-preset-card ${isActive ? 'is-active' : ''}">
                <div class="ws-card-header">
                    <div class="ws-card-title-row">
                        <h4 class="ws-card-title">${preset.name || preset.id}</h4>
                        <span class="ws-card-author">@${preset.author || '官方'}</span>
                    </div>
                    ${isActive ? `<span class="ws-active-badge">${SVG.star} 已生效</span>` : ''}
                </div>

                <p class="ws-card-desc">${preset.description || '暂无场景描述'}</p>

                <div class="ws-card-actions">
                    <button class="ws-act-btn ws-act-directed" title="选择说话人与动机并立即发起交互">
                        ${_currentCategory === 'phone_call' ? SVG.directCall : SVG.ear} ${_currentCategory === 'phone_call' ? '发起呼叫' : '定向侦听'}
                    </button>
                    
                    <button class="ws-act-btn ${isActive ? 'ws-act-active-on' : 'ws-act-activate'}" title="${isActive ? '点击取消生效' : '点击加入生效池'}">
                        ${isActive ? `${SVG.check} 已启用` : `${SVG.plus} 设为生效`}
                    </button>

                    <button class="ws-act-icon-btn ws-act-edit" title="编辑剧本 Prompt">
                        ${SVG.edit} 编辑
                    </button>
                    <button class="ws-act-icon-btn ws-act-export" title="导出 JSON">
                        ${SVG.export} 导出
                    </button>
                    ${!isBuiltin ? `<button class="ws-act-icon-btn delete ws-act-delete" title="删除剧本">
                        ${SVG.trash}
                    </button>` : ''}
                </div>
            </div>
        `);

        // 切换生效状态
        $card.find('.ws-act-activate, .ws-act-active-on').on('click', async () => {
            try {
                const data = await togglePresetActive(_currentCategory, preset.id);
                _activePresets = data.active_presets;
                updateBatchBarStatus();
                renderCardList();
                showToast('生效剧本池已更新');
            } catch (e) {
                alert(`操作失败: ${e.message}`);
            }
        });

        // 定向主动呼叫 / 侦听
        $card.find('.ws-act-directed').on('click', () => {
            openDirectedCallModal(_currentCategory, preset);
        });

        // 编辑
        $card.find('.ws-act-edit').on('click', () => {
            openEditModal(_currentCategory, preset, loadPresetsAndRender);
        });

        // 导出
        $card.find('.ws-act-export').on('click', () => {
            const apiHost = getApiHost();
            window.open(`${apiHost}/api/presets/${_currentCategory}/${preset.id}/export`, '_blank');
        });

        // 删除
        $card.find('.ws-act-delete').on('click', async () => {
            if (!confirm(`确定要删除剧本 "${preset.name || preset.id}" 吗？此操作无法撤销。`)) return;
            try {
                await deletePreset(_currentCategory, preset.id);
                showToast('剧本已成功删除');
                loadPresetsAndRender();
            } catch (e) {
                alert(`删除失败: ${e.message}`);
            }
        });

        $container.append($card);
    });
}

/**
 * 批量设置生效预设辅助函数
 */
async function handleBatchActive(ids) {
    try {
        const data = await setBatchActivePresets(_currentCategory, ids);
        _activePresets = data.active_presets;
        updateBatchBarStatus();
        renderCardList();
        showToast(`已成功批量启用 ${ids.length} 个剧本`);
    } catch (e) {
        alert(`批量设置失败: ${e.message}`);
    }
}

/**
 * 清理资源
 */
export function cleanup() {
    $('#ws-directed-modal-overlay, #ws-edit-modal-overlay, #ws-import-modal-overlay').remove();
}
