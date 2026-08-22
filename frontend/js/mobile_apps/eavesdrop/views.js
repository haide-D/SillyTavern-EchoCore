/**
 * 对话追踪列表主视图模块 (Eavesdrop List Views)
 * 包括当前分支密谈列表、全量总历史与搜索过滤、待听队列横幅
 */

import { fetchCurrentBranchHistory, fetchAllHistory } from './api.js';
import { createEavesdropCard } from './card.js';
import { STATUS_SVGS, getEavesdropStatusTexts } from '../../themes/theme_status_helper.js';

const SVG = STATUS_SVGS;

/**
 * 渲染当前对话分支的密谈记录 (Tab 1)
 */
export async function renderCurrentBranchEavesdrops($container, $parentRoot, context) {
    const { lastGeneratedEavesdrop, onSwitchTab, cardOptions } = context;

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

    try {
        const records = await fetchCurrentBranchHistory(40);
        renderEavesdropsToContainer($list, records, true, $parentRoot, {
            lastGeneratedEavesdrop,
            onSwitchTab,
            cardOptions
        });
    } catch (e) {
        console.error('[EavesdropViews] 加载当前对话密谈失败:', e);
        $list.html(`<div style="text-align:center; padding:30px; color:#ef4444;">加载失败: ${e.message}</div>`);
    }
}

/**
 * 渲染全量总历史 (Tab 2)
 */
export async function renderAllHistoryEavesdrops($container, $parentRoot, context) {
    const { lastGeneratedEavesdrop, onSwitchTab, cardOptions, searchQuery, onSearchQueryChange } = context;

    $container.html(`
        <div style="padding:10px 14px 0 14px;">
            <div class="ed-search-row">
                <span class="ed-search-icon">${SVG.search}</span>
                <input type="text" class="ed-search-input" id="ed-all-search" placeholder="搜索所有密谈角色或主题..." value="${searchQuery || ''}">
            </div>
        </div>
        <div class="ed-history-scroll" id="ed-all-list">
            <div style="text-align:center; padding:30px; color:#9ca3af;">正在加载全量历史...</div>
        </div>
    `);

    const $list = $container.find('#ed-all-list');

    try {
        const allRecords = await fetchAllHistory(80);

        const applyFilterAndRender = (query) => {
            const q = (query || '').toLowerCase();
            const filtered = allRecords.filter(r => {
                if (!q) return true;
                const spks = (Array.isArray(r.speakers) ? r.speakers.join(' ') : String(r.speakers || '')).toLowerCase();
                const themeMatch = (r.scene_description || r.theme || '').toLowerCase().includes(q);
                return spks.includes(q) || themeMatch;
            });
            renderEavesdropsToContainer($list, filtered, false, $parentRoot, {
                lastGeneratedEavesdrop,
                onSwitchTab,
                cardOptions
            });
        };

        $container.find('#ed-all-search').on('input', function () {
            const q = $(this).val().trim().toLowerCase();
            if (typeof onSearchQueryChange === 'function') {
                onSearchQueryChange(q);
            }
            applyFilterAndRender(q);
        });

        applyFilterAndRender(searchQuery);
    } catch (e) {
        console.error('[EavesdropViews] 加载全量历史失败:', e);
        $list.html(`<div style="text-align:center; padding:30px; color:#ef4444;">加载失败: ${e.message}</div>`);
    }
}

/**
 * 渲染密谈卡片通用列表
 */
export function renderEavesdropsToContainer($list, records, isCurrentTab = false, $parentRoot = null, context = {}) {
    const { lastGeneratedEavesdrop, onSwitchTab, cardOptions } = context;
    $list.empty();
    const statusTexts = getEavesdropStatusTexts();

    if (lastGeneratedEavesdrop && isCurrentTab) {
        const $latestCard = createEavesdropCard(lastGeneratedEavesdrop, true, cardOptions);
        $list.append($latestCard);
    }

    if (records.length === 0 && (!lastGeneratedEavesdrop || !isCurrentTab)) {
        $list.html(`
            <div class="ed-empty-state">
                <div class="ed-empty-icon" style="font-size:28px; margin-bottom:10px; opacity:0.9;">${statusTexts.emptyIcon || SVG.ear}</div>
                <div class="ed-empty-title">${isCurrentTab ? statusTexts.emptyCurrentTitle : statusTexts.emptyAllTitle}</div>
                <div class="ed-empty-desc">
                    ${statusTexts.emptySub}
                </div>
                ${isCurrentTab ? `
                <div>
                    <button class="ed-empty-btn ed-go-all-btn">
                        ${statusTexts.emptyBtnText || '📜 查看总历史记录'}
                    </button>
                </div>
                ` : ''}
            </div>
        `);

        $list.find('.ed-go-all-btn').on('click', function () {
            if (typeof onSwitchTab === 'function') {
                onSwitchTab('all');
            }
        });
        return;
    }

    records.forEach(rec => {
        const $card = createEavesdropCard(rec, false, cardOptions);
        $list.append($card);
    });
}
