/**
 * 定向呼叫 / 侦听控制台 Modal 模块
 */
import { SVG } from './svgs.js';
import { QUICK_MOTIVATIONS } from './templates.js';
import { getContextInfo, getSpeakerLanguageHint } from './api.js';
import { executeDirectedAction } from './executor.js';

export async function openDirectedCallModal(category, preset) {
    $('#ws-directed-modal-overlay').remove();
    const ctxInfo = await getContextInfo();

    const isPhone = category === 'phone_call';
    
    // 发起人严格限制为已绑定 TTS 模型的 Speaker
    const availableSpeakers = ctxInfo.boundSpeakers.length > 0 ? ctxInfo.boundSpeakers : [ctxInfo.charName];
    const defaultSpeaker = availableSpeakers.includes(ctxInfo.charName) ? ctxInfo.charName : availableSpeakers[0];
    const callerOptions = availableSpeakers.map(s => `<option value="${s}" ${s === defaultSpeaker ? 'selected' : ''}>🎙️ 说话人: ${s}</option>`).join('');
    const defaultReason = (preset && preset.description) || (isPhone ? "想与你通电话聊聊近况" : "私下商讨重要事宜");

    const quickMotivations = QUICK_MOTIVATIONS[category] || QUICK_MOTIVATIONS.phone_call;
    const quickTagsHtml = quickMotivations.map(m => `<span class="ws-quick-tag" data-val="${m}">${m}</span>`).join('');

    // 窃听模式下的多 Speaker 勾选组
    const speakersCheckboxes = availableSpeakers.map((s, i) => `
        <label class="ws-check-label ${i < 2 ? 'checked' : ''}">
            <input type="checkbox" name="ws_speakers" value="${s}" ${i < 2 ? 'checked' : ''} style="display:none;">
            <span>🎙️ ${s}</span>
        </label>
    `).join('');

    const defaultLangInfo = getSpeakerLanguageHint(defaultSpeaker);

    const modalHtml = `
        <div class="ws-modal-overlay show" id="ws-directed-modal-overlay">
            <div class="ws-modal">
                <div class="ws-modal-header">
                    <h3 class="ws-modal-title">
                        ${isPhone ? SVG.directCall : SVG.ear} 
                        ${isPhone ? '主动呼叫控制台' : '私下密谈侦听台'} · ${preset.name}
                    </h3>
                    <button class="ws-modal-close" id="ws-directed-close-btn">✕</button>
                </div>
                
                <div class="ws-modal-body">
                    <!-- 自动人设与世界书注入说明 -->
                    <div class="ws-auto-context-tip">
                        ${SVG.sparkles} 系统已自动从酒馆当前角色卡提取【性格/人设】并挂载【世界书设定与聊天历史】，无需重复填写。
                    </div>

                    ${isPhone ? `
                        <!-- 电话发起人与接听人配置 -->
                        <div style="display:flex; gap:10px;">
                            <div class="ws-form-group" style="flex:1;">
                                <label class="ws-form-label">📞 呼叫发起人 (已绑定语音的Speaker):</label>
                                <select class="ws-form-select" id="ws-direct-caller">
                                    ${callerOptions}
                                </select>
                            </div>
                            <div class="ws-form-group" style="flex:1;">
                                <label class="ws-form-label">🎯 通话接听人 (可随意指定):</label>
                                <input type="text" class="ws-form-input" id="ws-direct-target" placeholder="如: ${ctxInfo.userName} / 警官 / 某角色..." value="${ctxInfo.userName}">
                            </div>
                        </div>
                    ` : `
                        <!-- 窃听多 Speaker 交互组 -->
                        <div class="ws-form-group">
                            <label class="ws-form-label">🎭 参与窃听对话的 Speaker (必须已绑定语音，至少2位):</label>
                            <div class="ws-checkbox-group" id="ws-direct-speakers-group">
                                ${speakersCheckboxes}
                            </div>
                        </div>
                    `}

                    <!-- 语言偏好选择器 -->
                    <div class="ws-form-group">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <label class="ws-form-label" style="margin-bottom:0;">🌐 对话语言 (Language):</label>
                            <span id="ws-lang-hint" style="font-size:11px; color:#d19a66;">${defaultLangInfo.hint}</span>
                        </div>
                        <select class="ws-form-select" id="ws-direct-language">
                            <option value="auto" selected>🤖 智能自动 (根据角色模型与语境自适应)</option>
                            <option value="zh">🇨🇳 中文 (Chinese)</option>
                            <option value="ja">🇯🇵 日文 (Japanese)</option>
                            <option value="en">🇺🇸 英文 (English)</option>
                        </select>
                    </div>

                    <!-- 通话事由 / 密谈主题 -->
                    <div class="ws-form-group">
                        <label class="ws-form-label">
                            <span>${isPhone ? '💬 通话事由 / 动机 (Call Reason):' : '📜 密谈主题 (Theme):'}</span>
                            <span style="font-size:11px; color:#9ca3af;">点选快捷标签快速填入</span>
                        </label>
                        <input type="text" class="ws-form-input" id="ws-direct-reason" value="${defaultReason}">
                        <div class="ws-quick-tags-pool">
                            ${quickTagsHtml}
                        </div>
                    </div>

                    <!-- 情绪氛围/语气基调 -->
                    <div class="ws-form-group">
                        <label class="ws-form-label">🎭 情绪氛围 / 语气基调 (Tone, 可选):</label>
                        <input type="text" class="ws-form-input" id="ws-direct-tone" placeholder="如: 温柔深情、急促紧张、傲娇质问、严肃警惕..." value="">
                    </div>
                </div>

                <div class="ws-modal-footer">
                    <button class="ws-tool-btn ws-tool-btn-secondary" id="ws-directed-quick-btn" title="直接以默认参数快速呼叫">
                        ⚡ 快捷直拨
                    </button>
                    <button class="ws-tool-btn ws-tool-btn-primary" id="ws-directed-launch-btn">
                        🚀 ${isPhone ? '立即拨出通话' : '立即发起侦听'}
                    </button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    const closeModal = () => $('#ws-directed-modal-overlay').remove();
    $('#ws-directed-close-btn').on('click', closeModal);

    // 发起人切换联动更新语言感知提示
    $('#ws-direct-caller').on('change', function () {
        const langInfo = getSpeakerLanguageHint($(this).val());
        $('#ws-lang-hint').text(langInfo.hint);
    });

    // 快捷标签点选
    $('#ws-directed-modal-overlay .ws-quick-tag').on('click', function () {
        const val = $(this).data('val');
        $('#ws-direct-reason').val(val);
    });

    // 窃听角色多选切换
    $('#ws-direct-speakers-group .ws-check-label').on('click', function (e) {
        if (e.target.tagName !== 'INPUT') {
            const $chk = $(this).find('input');
            $chk.prop('checked', !$chk.prop('checked'));
        }
        $(this).toggleClass('checked', $(this).find('input').prop('checked'));
    });

    // 快捷直拨
    $('#ws-directed-quick-btn').on('click', async () => {
        closeModal();
        const caller = $('#ws-direct-caller').val() || defaultSpeaker;
        const langInfo = getSpeakerLanguageHint(caller);
        await executeDirectedAction(category, preset, { isQuick: true, caller, language: langInfo.recommended });
    });

    // 定向发起
    $('#ws-directed-launch-btn').on('click', async () => {
        const caller = $('#ws-direct-caller').val() || defaultSpeaker;
        const target = $('#ws-direct-target').val() ? $('#ws-direct-target').val().trim() : ctxInfo.userName;
        const reason = $('#ws-direct-reason').val().trim() || defaultReason;
        const tone = $('#ws-direct-tone').val().trim();
        const selectedLang = $('#ws-direct-language').val();

        let effectiveLang = selectedLang;
        if (selectedLang === 'auto') {
            const langInfo = getSpeakerLanguageHint(caller);
            effectiveLang = langInfo.recommended;
        }

        let selectedSpeakers = [];
        if (!isPhone) {
            $('#ws-direct-speakers-group input:checked').each(function () {
                selectedSpeakers.push($(this).val());
            });
            if (selectedSpeakers.length < 2) {
                alert('请至少勾选 2 位说话人以展开密谈！');
                return;
            }
        }

        closeModal();
        await executeDirectedAction(category, preset, {
            caller,
            target,
            reason,
            tone,
            speakers: selectedSpeakers,
            language: effectiveLang
        });
    });
}
