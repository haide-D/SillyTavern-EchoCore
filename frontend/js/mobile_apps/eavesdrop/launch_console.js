/**
 * 开启密谈控制台组件 (Eavesdrop Launch Console)
 * 支持多说话人动态增删、工坊预设池联动、快捷主题点选与参数调优
 */

import { WorldInfoExtractor } from '../../world_info_extractor.js';
import { STATUS_SVGS, getEavesdropStatusTexts } from '../../themes/theme_status_helper.js';
import { getCachedSpeakers, getCachedPresets, generateAndLaunchEavesdrop } from './api.js';

const SVG = STATUS_SVGS;

/**
 * 辅助生成 Speaker 下拉列表 Options
 */
export function buildSpeakerOptions(speakers, selectedSpeaker = null, placeholder = null) {
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
 * 渲染开启密谈控制台 (Tab 3)
 */
export function renderLaunchConsole($container, context = {}) {
    const { onLaunchSuccess } = context;
    const statusTexts = getEavesdropStatusTexts();
    const enriched = WorldInfoExtractor.getEnrichedContext({ maxMessages: 12 });
    const boundSpeakersCache = getCachedSpeakers();
    const presetsCache = getCachedPresets();

    const boundSpeakers = boundSpeakersCache.length > 0
        ? boundSpeakersCache
        : (enriched.speakers.length > 0 ? enriched.speakers : [enriched.charName, "神秘人"]);

    // 默认两位参与密谈角色
    const defaultSpeaker1 = boundSpeakers[0] || enriched.charName || '角色A';
    const defaultSpeaker2 = boundSpeakers.length > 1 ? boundSpeakers[1] : (boundSpeakers[0] || '角色B');

    const speakerOptions1 = buildSpeakerOptions(boundSpeakers, defaultSpeaker1);
    const speakerOptions2 = buildSpeakerOptions(boundSpeakers, defaultSpeaker2);

    // 联动工坊窃听预设
    const presets = presetsCache.length > 0 ? presetsCache : [{ id: 'standard_eavesdrop', name: '私下密谈', description: '角色私下议论主角与局势' }];
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
    $container.find('#ed-btn-add-speaker').on('click', function () {
        const extraCount = $container.find('#ed-extra-speakers-container .ed-extra-speaker-row').length;
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

        const $btn = $(this);
        $btn.prop('disabled', true);

        try {
            const generatedData = await generateAndLaunchEavesdrop({
                speakers: selectedSpeakers,
                presetId,
                reason,
                tone,
                language: selectedLang,
                enriched,
                onProgress: (html) => $btn.html(html)
            });

            if (typeof onLaunchSuccess === 'function') {
                onLaunchSuccess(generatedData);
            }
        } catch (e) {
            console.error('[EavesdropLaunchConsole] 密谈生成失败:', e);
            alert(`密谈开启失败: ${e.message}`);
        } finally {
            $btn.prop('disabled', false).html(statusTexts.btnIdle);
        }
    });
}
