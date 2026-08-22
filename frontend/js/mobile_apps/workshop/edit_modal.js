/**
 * 剧本新建与编辑 Modal 模块 (上下分栏解耦体系 + AI 智能剧本生成)
 */
import { SVG } from './svgs.js';
import { DEFAULT_WORKSHOP_TEMPLATES, WORKSHOP_SLOTS, AI_SCRIPT_INSPIRATIONS, getWorkshopModalThemeClass } from './templates.js';
import { savePreset, getLlmConfig, getContextInfo } from './api.js';
import { showToast, hideToast } from './executor.js';

export function openEditModal(category, preset, onSaved) {
    const isNew = !preset;
    const isBuiltin = preset && !!preset.is_builtin;

    $('#ws-edit-modal-overlay').remove();

    const categoryDef = DEFAULT_WORKSHOP_TEMPLATES[category] || DEFAULT_WORKSHOP_TEMPLATES.phone_call;

    const initialData = preset || {
        id: `custom_${Date.now().toString(36)}`,
        name: '',
        category: category,
        author: '用户',
        version: '2.0.0',
        description: '',
        plot_template: categoryDef.plot,
        system_template: categoryDef.system,
        recommended_params: { temperature: 0.8, speed: 1.0 }
    };

    const initialPlot = initialData.plot_template || initialData.prompt_template || categoryDef.plot;
    const initialSystem = initialData.system_template || categoryDef.system;

    const slots = WORKSHOP_SLOTS[category] || WORKSHOP_SLOTS.phone_call;
    const plotSlotHtml = slots.plot.map(s => `<button type="button" class="ws-slot-btn" data-target="#ws-input-plot" data-slot="${s}">${s}</button>`).join('');
    const systemSlotHtml = slots.system.map(s => `<button type="button" class="ws-slot-btn" data-target="#ws-input-system" data-slot="${s}">${s}</button>`).join('');

    const inspirations = AI_SCRIPT_INSPIRATIONS[category] || AI_SCRIPT_INSPIRATIONS.phone_call;
    const inspirationChipsHtml = inspirations.map(txt => `<button type="button" class="ws-ai-chip" data-text="${txt}">${txt}</button>`).join('');

    const themeClass = getWorkshopModalThemeClass();
    const isPhone = category === 'phone_call';

    const modalHtml = `
        <div class="ws-modal-overlay show ${themeClass}" id="ws-edit-modal-overlay">
            <div class="ws-modal ws-modal-lg">
                <div class="ws-modal-header">
                    <h3 class="ws-modal-title">
                        ${SVG.edit} ${isNew ? '新建剧本预设' : (isBuiltin ? '查看出厂剧本 (另存为自定义)' : '编辑剧本预设')}
                    </h3>
                    <button class="ws-modal-close" id="ws-modal-close-btn">✕</button>
                </div>
                <div class="ws-modal-body">
                    <!-- ✨ AI 智能剧本创作助手 -->
                    <div class="ws-ai-gen-box">
                        <div class="ws-ai-gen-header">
                            <div class="ws-ai-gen-title">
                                <span class="ws-ai-badge">✨ AI 创作</span>
                                <span>输入剧情构想或选择灵感，AI 自动生成剧本设定</span>
                            </div>
                        </div>
                        <div class="ws-ai-gen-body">
                            <div class="ws-ai-input-row">
                                <input type="text" class="ws-form-input ws-ai-input" id="ws-ai-prompt-input" 
                                    placeholder="${isPhone ? '如: 深夜打来的带有哭腔的告白电话，包含傲娇和不知所措...' : '如: 两人私下秘密商量如何给主角准备生日惊喜...'}" />
                                <button type="button" class="ws-tool-btn ws-tool-btn-primary ws-ai-submit-btn" id="ws-ai-generate-btn">
                                    <span class="ws-ai-btn-text">✨ AI 生成剧本</span>
                                </button>
                            </div>
                            <div class="ws-ai-chips-row">
                                <span class="ws-ai-chips-label">💡 灵感推荐:</span>
                                <div class="ws-ai-chips-list">
                                    ${inspirationChipsHtml}
                                </div>
                            </div>
                            <div class="ws-ai-context-row">
                                <label class="ws-ai-checkbox-label">
                                    <input type="checkbox" id="ws-ai-use-context" checked>
                                    <span>结合当前聊天角色设定与背景 (生成更契合当前故事线的专属剧本)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- 基础信息行 -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="ws-form-group">
                            <label class="ws-form-label">剧本标识 (ID):</label>
                            <input type="text" class="ws-form-input" id="ws-input-id" value="${initialData.id}" ${(!isNew && !isBuiltin) ? 'readonly' : ''}>
                        </div>
                        <div class="ws-form-group">
                            <label class="ws-form-label">剧本名称:</label>
                            <input type="text" class="ws-form-input" id="ws-input-name" placeholder="如: 午夜私语、紧急求援..." value="${initialData.name}">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 10px;">
                        <div class="ws-form-group">
                            <label class="ws-form-label">作者 ID / 署名:</label>
                            <input type="text" class="ws-form-input" id="ws-input-author" placeholder="作者名" value="${initialData.author || '用户'}">
                        </div>
                        <div class="ws-form-group">
                            <label class="ws-form-label">场景描述:</label>
                            <input type="text" class="ws-form-input" id="ws-input-desc" placeholder="简要描述触发场景与互动风格..." value="${initialData.description}">
                        </div>
                    </div>

                    <!-- 上栏：主题与剧情细节设定 -->
                    <div class="ws-section-box">
                        <div class="ws-section-header">
                            <span class="ws-section-title">📝 上栏：主题与剧情细节设定 (核心创作区)</span>
                            <span style="font-size:11px; color:#fde047;">✨ 剧情插槽</span>
                        </div>
                        <p class="ws-section-subtitle">编写剧情主题、通话动机、语气张力与角色行为要求：</p>
                        <textarea class="ws-textarea" id="ws-input-plot" style="height: 130px;" placeholder="编写主题、剧情起因与创作细节...">${initialPlot}</textarea>
                        <div class="ws-slot-section" style="padding: 5px 8px;">
                            <div class="ws-slot-category">
                                <span class="ws-slot-cat-title">剧情插槽:</span>
                                ${plotSlotHtml}
                            </div>
                        </div>
                    </div>

                    <!-- 下栏：系统上下文注入与输出规范 -->
                    <div class="ws-section-box">
                        <div class="ws-section-header">
                            <span class="ws-section-title">⚙️ 下栏：系统上下文注入与输出规范</span>
                            <button type="button" class="ws-btn-mini" id="ws-reset-system-btn">↺ 恢复官方默认模板</button>
                        </div>
                        <p class="ws-section-subtitle">包含聊天历史、角色卡/世界书设定、情绪列表、TTS纯台词铁律及严格 JSON 格式。新建时固定预填官方模板，支持直接自由微调：</p>
                        <textarea class="ws-textarea" id="ws-input-system" style="height: 140px;" placeholder="系统注入与输出规范...">${initialSystem}</textarea>
                        <div class="ws-slot-section" style="padding: 5px 8px;">
                            <div class="ws-slot-category">
                                <span class="ws-slot-cat-title">系统插槽:</span>
                                ${systemSlotHtml}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ws-modal-footer">
                    <button class="ws-tool-btn ws-tool-btn-secondary" id="ws-modal-cancel-btn">取消</button>
                    <button class="ws-tool-btn ws-tool-btn-primary" id="ws-modal-save-btn">保存剧本</button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    // 灵感推荐标签点击
    $('#ws-edit-modal-overlay .ws-ai-chip').on('click', function () {
        const text = $(this).data('text');
        $('#ws-ai-prompt-input').val(text).focus();
    });

    // 提示词输入框回车触发生成
    $('#ws-ai-prompt-input').on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#ws-ai-generate-btn').trigger('click');
        }
    });

    // AI 生成剧本按钮点击事件
    $('#ws-ai-generate-btn').on('click', async function () {
        const userReq = $('#ws-ai-prompt-input').val().trim();
        if (!userReq) {
            alert('请输入剧本构想或要求（也可直接点击上方的灵感标签）');
            $('#ws-ai-prompt-input').focus();
            return;
        }

        if (!window.LLM_Client || typeof window.LLM_Client.callLLM !== 'function') {
            alert('LLM_Client 未就绪，无法驱动大模型生成，请确认配置。');
            return;
        }

        const $btn = $(this);
        const $btnText = $btn.find('.ws-ai-btn-text');
        const $input = $('#ws-ai-prompt-input');
        const useContext = $('#ws-ai-use-context').is(':checked');

        // 1. 获取系统 LLM 配置
        const llmConfig = await getLlmConfig();
        if (!llmConfig.api_url || !llmConfig.api_key || !llmConfig.model) {
            alert('未检测到有效的 LLM API 配置！\n请先前往手机【系统配置】或【LLM 测试】中配置 API 地址、密钥与模型名称。');
            return;
        }

        // 2. 状态置为生成中
        $btn.prop('disabled', true).addClass('loading');
        $input.prop('disabled', true);
        $btnText.text('⏳ AI 创作中...');
        showToast('✨ AI 正在为您构思创作专属剧本预设...', true);

        try {
            let ctxInfo = null;
            if (useContext) {
                ctxInfo = await getContextInfo();
            }

            const categoryName = isPhone ? '单向通话/来电剧本' : '多人私下密谈/窃听剧本';
            const slotGuide = isPhone 
                ? '必须合理在 plot_template 中使用以下剧情插槽：\n- {{caller}}: 发起通话的角色名\n- {{target}}: 接听通话的对象/用户\n- {{call_reason}}: 传讯事由与动机\n- {{call_tone}}: 语气基调与氛围张力'
                : '必须合理在 plot_template 中使用以下剧情插槽：\n- {{speakers}}: 参与私下对话的角色列表\n- {{theme}}: 讨论的核心主题\n- {{call_reason}}: 剧情起因\n- {{call_tone}}: 氛围张力';

            let contextPrompt = '';
            if (ctxInfo && (ctxInfo.charName || ctxInfo.characterPersona)) {
                contextPrompt = `\n【当前活跃角色与背景参考 (可根据剧情需求选择性融入)】:\n`
                    + (ctxInfo.charName ? `- 角色姓名: ${ctxInfo.charName}\n` : '')
                    + (ctxInfo.characterPersona ? `- 角色人设: ${ctxInfo.characterPersona.substring(0, 500)}\n` : '')
                    + (ctxInfo.worldInfo ? `- 世界观背景: ${ctxInfo.worldInfo.substring(0, 300)}\n` : '');
            }

            const systemInstruction = `你是一个专业的沉浸式互动剧情金牌编剧。用户希望为一个 AI 互动语音系统创建高质量的【${categoryName}】预设。
请根据用户的创作需求，编写一套生动、极富戏剧张力、且符合解耦规范的剧本预设。

【剧本规范与插槽要求】:
1. 剧本分为「剧本名称」、「场景描述」以及「上栏：主题与剧情细节设定 (核心创作区)」。
2. ${slotGuide}
3. 【上栏创作区要求 (plot_template)】:
   - 包含编剧角色定位、剧情主题与基调、呼叫/密谈动机。
   - 列出 3-4 条极具指导意义的【剧本创作核心要求与铁律】（如语气真实感、情绪起伏层次、与主线剧情的自然锚定、台词口语化质感等）。
   - 严禁在上栏中硬编码固定角色的死板台词，而是编写能引导实际对话时大模型产生逼真台词的提示词模板与插槽！

【输出格式 (极其严格)】:
必须直接输出且仅输出一个合法的 JSON 对象，严禁包含任何多余解释说明：
\`\`\`json
{
  "name": "剧本名称 (简练有力，4-8字，如: 午夜私语、密室谍影)",
  "description": "简要场景描述 (1-2句话，说明触发情境与互动风格)",
  "plot_template": "完整编写的上栏主题与剧情细节设定模板 (包含上述插槽与核心创作要求)"
}
\`\`\``;

            const userContent = `用户创作要求: ${userReq}${contextPrompt}`;
            const fullPrompt = `${systemInstruction}\n\n${userContent}`;

            const requestConfig = {
                api_url: llmConfig.api_url,
                api_key: llmConfig.api_key,
                model: llmConfig.model,
                temperature: 0.8,
                max_tokens: 3000,
                prompt: fullPrompt
            };

            const rawResponse = await window.LLM_Client.callLLM(requestConfig);

            // 安全提取 JSON
            let jsonStr = (rawResponse || '').trim();
            const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonStr = codeBlockMatch[1].trim();
            } else {
                const firstBrace = jsonStr.indexOf('{');
                const lastBrace = jsonStr.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                }
            }

            const generatedData = JSON.parse(jsonStr);

            if (!generatedData.name || !generatedData.plot_template) {
                throw new Error('生成的剧本数据格式不完整');
            }

            // 自动回填表单
            $('#ws-input-name').val(generatedData.name).addClass('ws-highlight-pulse');
            if (generatedData.description) {
                $('#ws-input-desc').val(generatedData.description).addClass('ws-highlight-pulse');
            }
            $('#ws-input-plot').val(generatedData.plot_template).addClass('ws-highlight-pulse');

            setTimeout(() => {
                $('.ws-highlight-pulse').removeClass('ws-highlight-pulse');
            }, 2500);

            hideToast();
            showToast(`✨ 剧本「${generatedData.name}」已由 AI 创作完成！`);

        } catch (e) {
            hideToast();
            console.error('[Workshop] AI 生成剧本失败:', e);
            alert(`AI 生成剧本失败: ${e.message}\n请检查网络或确认系统设置中的大模型配置。`);
        } finally {
            $btn.prop('disabled', false).removeClass('loading');
            $input.prop('disabled', false);
            $btnText.text('✨ AI 生成剧本');
        }
    });

    // 插槽点击插入至对应文本框
    $('#ws-edit-modal-overlay .ws-slot-btn').on('click', function () {
        const slot = $(this).data('slot');
        const targetSelector = $(this).data('target') || '#ws-input-plot';
        const $textarea = $(targetSelector);
        if (!$textarea.length) return;
        
        const dom = $textarea[0];
        const start = dom.selectionStart || 0;
        const end = dom.selectionEnd || 0;
        const text = $textarea.val();
        $textarea.val(text.substring(0, start) + slot + text.substring(end));
        dom.selectionStart = dom.selectionEnd = start + slot.length;
        $textarea.focus();
    });

    // 恢复官方默认系统注入模板
    $('#ws-reset-system-btn').on('click', function () {
        $('#ws-input-system').val(categoryDef.system);
        showToast('已恢复为官方标准系统注入模板');
    });

    const closeModal = () => $('#ws-edit-modal-overlay').remove();
    $('#ws-modal-close-btn, #ws-modal-cancel-btn').on('click', closeModal);
    $('#ws-edit-modal-overlay').on('click', function (e) {
        if (e.target === this) closeModal();
    });

    // 保存
    $('#ws-modal-save-btn').on('click', async () => {
        let idVal = $('#ws-input-id').val().trim();
        const nameVal = $('#ws-input-name').val().trim();
        const authorVal = $('#ws-input-author').val().trim() || '用户';
        const descVal = $('#ws-input-desc').val().trim();
        const plotVal = $('#ws-input-plot').val().trim();
        const sysVal = $('#ws-input-system').val().trim();

        if (!nameVal) {
            alert('请输入剧本名称');
            return;
        }
        if (!plotVal) {
            alert('上栏「主题与剧情细节设定」不能为空');
            return;
        }

        if (isBuiltin && idVal === preset.id) {
            idVal = `${idVal}_copy_${Date.now().toString(36)}`;
        }

        const combinedPrompt = sysVal ? `${plotVal}\n\n${sysVal}` : plotVal;

        const payload = {
            id: idVal,
            name: nameVal,
            category: category,
            author: authorVal,
            version: initialData.version || '2.0.0',
            description: descVal,
            plot_template: plotVal,
            system_template: sysVal,
            prompt_template: combinedPrompt,
            recommended_params: initialData.recommended_params || { temperature: 0.8 }
        };

        try {
            await savePreset(category, payload);
            showToast(`剧本「${nameVal}」保存成功`);
            closeModal();
            if (typeof onSaved === 'function') onSaved();
        } catch (e) {
            alert(`保存失败: ${e.message}`);
        }
    });
}

