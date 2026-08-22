/**
 * 对话追踪 / 剧场 App 模块 (Eavesdrop & Theater App)
 * 
 * 核心功能 (三子列表架构):
 * 1. 💬 当前对话: 查看当前聊天分支 (chat_branch) 下的私下密谈记录
 * 2. 📜 总的历史对话: 查看所有角色与历史密谈记录 (支持搜索与多角色录音完整回放)
 * 3. 🚀 开启密谈控制台: 内嵌式多 Speaker 勾选、联动剧本工坊 Presets、主题快捷池并一键开启密谈
 */

import { STATUS_SVGS } from '../themes/theme_status_helper.js';
import { injectCSS } from './eavesdrop/styles.js';
import { initPresetsAndSpeakers } from './eavesdrop/api.js';
import { stopCurrentPlayingCard } from './eavesdrop/card.js';
import { renderCurrentBranchEavesdrops, renderAllHistoryEavesdrops } from './eavesdrop/views.js';
import { renderLaunchConsole } from './eavesdrop/launch_console.js';
import { renderPassivePrompt } from './eavesdrop/passive_prompt.js';

export const id = 'eavesdrop';
export const defaultName = '对话追踪';
export const defaultIcon = STATUS_SVGS.ear;
export const sceneId = 'eavesdrop';
export const hidden = false;

// 视图状态与缓存
let _activeTab = 'current'; // 'current' | 'all' | 'launch'
let _lastGeneratedEavesdrop = null;
let _currentAppContainer = null;
let _currentCreateNavbar = null;
let _searchQuery = '';

/**
 * 渲染对话追踪 / 剧场 App 主入口
 */
export async function render(container, createNavbar) {
    injectCSS();
    stopCurrentPlayingCard();

    _currentAppContainer = container;
    _currentCreateNavbar = createNavbar;
    container.empty();

    const eavesdropData = window.TTS_EavesdropData;

    // ========== 状态1: 接收到系统被动推送的窃听事件 ==========
    if (eavesdropData) {
        renderPassivePrompt(container, eavesdropData, {
            onListenAccepted: (data) => {
                _lastGeneratedEavesdrop = data;
                _activeTab = 'current';
                render(container, () => $('<div></div>'));
            }
        });
        return;
    }

    // ========== 状态2: 主界面 (三子列表导航) ==========
    container.append(createNavbar("对话追踪"));

    const $root = $(`
        <div class="ed-app-container">
            <!-- 顶部三子列表导航切换栏 -->
            <div class="ed-nav-tabs">
                <button class="ed-nav-tab-btn ${_activeTab === 'current' ? 'active' : ''}" data-tab="current">
                    ${STATUS_SVGS.chat || ''} 当前对话
                </button>
                <button class="ed-nav-tab-btn ${_activeTab === 'all' ? 'active' : ''}" data-tab="all">
                    ${STATUS_SVGS.history || ''} 总历史
                </button>
                <button class="ed-nav-tab-btn ${_activeTab === 'launch' ? 'active' : ''}" data-tab="launch">
                    ${STATUS_SVGS.theater || ''} 开启密谈
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
        switchTab(tab, $root);
    });

    // 优先立即在当前 $root 容器中渲染子视图
    renderActiveTabContent($root);

    // 后台静默刷新预设与 Speakers
    initPresetsAndSpeakers().then(() => {
        if (_activeTab === 'launch') {
            renderActiveTabContent($root);
        }
    }).catch(() => {});
}

/**
 * 切换子视图 Tab
 */
function switchTab(tab, $root = null) {
    _activeTab = tab;
    const $targetRoot = $root || _currentAppContainer || $('.ed-app-container');
    $targetRoot.find('.ed-nav-tab-btn').removeClass('active');
    $targetRoot.find(`.ed-nav-tab-btn[data-tab="${tab}"]`).addClass('active');
    renderActiveTabContent($targetRoot);
}

/**
 * 渲染当前激活的子视图内容
 */
async function renderActiveTabContent($parentRoot) {
    const $container = ($parentRoot && $parentRoot.find('#ed-tab-content').length)
        ? $parentRoot.find('#ed-tab-content')
        : $('#ed-tab-content');
    if (!$container.length) return;

    const cardOptions = {
        currentAppContainer: _currentAppContainer,
        currentCreateNavbar: _currentCreateNavbar,
        onRerender: () => {
            if (_currentAppContainer && _currentCreateNavbar) {
                render(_currentAppContainer, _currentCreateNavbar);
            } else {
                renderActiveTabContent($parentRoot);
            }
        },
        onRegenerate: (rec, speakers, theme) => {
            switchTab('launch', $parentRoot);
            if (speakers[0]) $('#ed-form-speaker-1').val(speakers[0]);
            if (speakers[1]) $('#ed-form-speaker-2').val(speakers[1]);
            if (rec.preset_id) $('#ed-form-preset').val(rec.preset_id);
            $('#ed-form-reason').val(theme);
        }
    };

    if (_activeTab === 'current') {
        await renderCurrentBranchEavesdrops($container, $parentRoot, {
            lastGeneratedEavesdrop: _lastGeneratedEavesdrop,
            onSwitchTab: (tab) => switchTab(tab, $parentRoot),
            cardOptions
        });
    } else if (_activeTab === 'all') {
        await renderAllHistoryEavesdrops($container, $parentRoot, {
            lastGeneratedEavesdrop: _lastGeneratedEavesdrop,
            searchQuery: _searchQuery,
            onSearchQueryChange: (q) => { _searchQuery = q; },
            onSwitchTab: (tab) => switchTab(tab, $parentRoot),
            cardOptions
        });
    } else if (_activeTab === 'launch') {
        renderLaunchConsole($container, {
            onLaunchSuccess: (generatedData) => {
                _lastGeneratedEavesdrop = generatedData;
                switchTab('current', $parentRoot);
            }
        });
    }
}

/**
 * 清理函数
 */
export function cleanup() {
    stopCurrentPlayingCard();
}

export default { id, defaultName, defaultIcon, sceneId, hidden, render, cleanup };
