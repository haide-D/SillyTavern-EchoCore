// ==========================================================================
// ST-Direct-TTS Admin Module: Prompt & Model Emotion Constraints Management
// ==========================================================================

import { API_BASE } from '../core/api.js';
import { showNotification } from '../core/ui.js';
import { escapeHtml } from '../core/utils.js';

// 官方标准默认提示词模板
export const DEFAULT_PROMPT_TEMPLATE = `[Voice Synthesis & Dialogue Protocol]
You must format spoken dialogue according to the following strict rules:
{{primary_character_note}}

### Core Rules:
1. **Character Naming Consistency (Crucial)**:
   - Each character MUST maintain a single, consistent, official name across the entire reply and conversation.
   - NEVER switch, alternate, or use temporary pronouns/titles/nicknames in place of the character's exact name. (Every line spoken by the same character must use the identical Character_Name prefix).

2. **Dialogue Tagging Format**:
   - Place voice tags immediately before direct spoken quotes: \`[Character_Name, emotion] "Spoken dialogue..."\` or \`[Character_Name, emotion] “对白内容……”\`
   - Narration, environmental descriptions, internal thoughts, and action beats must be written as regular text outside the tag. NEVER put non-spoken narration inside or as the sole content of the tag.

3. **Emotion Continuity & Anti-Whiplash (Crucial)**:
   - Emotion tags MUST follow natural human emotional progression. DO NOT abruptly jump between extreme emotions (e.g. from sad to climax/happy) without significant narrative transition.
   - Strictly adhere to each emotion's prescribed usage scenario.

4. **Speaker Categories & Permitted Emotions**:
   - **List 1: Bound Voice Characters & Emotion Constraints** (Must use listed emotion tags according to their rules):
{{bound_characters_section}}
   - **List 2: Skipped Characters** (Plain text only, NO voice tag):
{{skipped_characters_section}}
   - **List 3: New / Unbound Characters** (Anyone NOT listed above):
     Format: \`[New_Character_Name, New] "Spoken dialogue..."\` (Keep name consistent on subsequent lines).

### Demonstrations:
- ✅ Correct:
  She stepped out of the room and looked up with a smile.
  [Alice, happy] "Hello there! Nice to meet you."
  She tilted her head with mild curiosity.
  [Alice, default] "Are you heading to the library?"
- ❌ Forbidden:
  [Alice, happy] She stepped out of the room and smiled. (Error: putting narration into speech tag)
  [Assistant, happy] "Hello!" (Error: switching or inventing alternative names for the same person)
  [Alice, climax] "Good morning." (Error: abusing extreme climax emotion for ordinary morning greeting)`;

// 默认通用场景知识库
export const DEFAULT_EMOTION_ANNOTATIONS = {
    "default": "日常、平和对话基准语调",
    "happy": "心情愉悦、开朗、赞许或微笑时使用",
    "sad": "失落、悲伤、委屈、低落或哭腔时使用",
    "angry": "受到直接挑衅、被激怒或发生激烈争吵时使用",
    "surprise": "遇到意料之外事件、震惊或疑惑时使用",
    "fear": "感到危险、恐惧、被威胁或极度不安时使用",
    "panting": "仅在剧烈运动、长跑、极度疲惫或身体剧烈消耗时使用 (严禁日常闲聊误用)",
    "climax": "仅在全剧情最高潮绝境、决战或情绪极值爆发时使用 (严禁轻微情绪波动时误用)",
    "whisper": "窃窃私语、耳语或私密秘密对话时使用",
    "disgust": "极度厌恶、鄙夷、嫌弃或排斥时使用",
    "smug": "自鸣得意、傲娇、得意洋洋或嘲弄时使用",
    "neutral": "日常平稳对话、冷静叙述与事实表达"
};

// 内存缓存当前数据
let currentSettings = {};
let currentModels = [];

/**
 * 初始化提示词与模型情感管理页面
 */
export async function initPromptEmotionsPage() {
    bindPromptControls();
    await loadPromptEmotionsData();
}

/**
 * 加载全部数据 (Settings + Models) 并渲染
 */
export async function loadPromptEmotionsData() {
    const container = document.getElementById('model-emotion-cards-container');
    const promptTemplateEl = document.getElementById('setting-prompt-template');

    try {
        // 1. 并行获取系统设置与模型列表
        const [settingsRes, modelsRes] = await Promise.all([
            fetch(`${API_BASE}/settings`),
            fetch(`${API_BASE}/models`)
        ]);

        currentSettings = await settingsRes.json();
        const modelsData = await modelsRes.json();
        currentModels = modelsData.models || [];

        // 2. 渲染提示词模板：如果为空则默认直接填入官方标准内置模板
        const pi = currentSettings.prompt_injector || {};
        if (promptTemplateEl) {
            promptTemplateEl.value = (pi.custom_template && pi.custom_template.trim()) ? pi.custom_template : DEFAULT_PROMPT_TEMPLATE;
        }

        // 3. 渲染按模型划分的情感与语速卡片
        renderModelEmotionCards(currentModels, pi.models || {});
    } catch (e) {
        console.error('加载提示词与模型情感失败:', e);
        if (container) {
            container.innerHTML = `<div style="color:#ef4444; padding:16px;">❌ 加载失败: ${e.message}</div>`;
        }
    }
}

/**
 * 渲染模型卡片列表 (按模型划分)
 */
function renderModelEmotionCards(modelsList, savedModelsConfig) {
    const container = document.getElementById('model-emotion-cards-container');
    if (!container) return;

    if (!modelsList || modelsList.length === 0) {
        container.innerHTML = '<div style="color:#9ca3af; padding:20px; text-align:center; background:rgba(255,255,255,0.02); border-radius:8px;">未扫描到已装载模型，请先在「模型管理」中创建或添加模型。</div>';
        return;
    }

    container.innerHTML = '';

    modelsList.forEach(model => {
        const modelName = model.name;
        const modelConfig = savedModelsConfig[modelName] || {};
        const speed = (modelConfig.speed !== undefined && modelConfig.speed !== null) ? modelConfig.speed : 1.0;
        const savedEmotions = modelConfig.emotions || {};

        // 提取该模型拥有的所有情绪标签 (精准读取 audio_stats.by_emotion)
        const emotionsSet = new Set(['default']);
        
        // 1. 从 audio_stats.by_emotion 读取
        if (model.audio_stats && model.audio_stats.by_emotion) {
            Object.keys(model.audio_stats.by_emotion).forEach(emo => {
                if (emo && emo.trim()) emotionsSet.add(emo.trim());
            });
        }

        // 2. 兼容已保存的模型自定义情绪配置
        if (modelConfig.emotions) {
            Object.keys(modelConfig.emotions).forEach(emo => {
                if (emo && emo.trim()) emotionsSet.add(emo.trim());
            });
        }

        // 3. 兼容 languages 结构（若有）
        if (model.languages) {
            for (const langAudios of Object.values(model.languages)) {
                if (Array.isArray(langAudios)) {
                    langAudios.forEach(audio => {
                        if (audio && audio.emotion) {
                            emotionsSet.add(audio.emotion.trim());
                        }
                    });
                }
            }
        }

        const emotionsList = Array.from(emotionsSet);

        // 创建模型卡片
        const card = document.createElement('div');
        card.className = 'model-emotion-card';
        card.dataset.model = modelName;
        card.style.cssText = 'background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; transition:all 0.2s;';

        // 卡片头部
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:rgba(0,0,0,0.25); border-bottom:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; gap:10px;';
        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" class="model-select-checkbox" data-model="${escapeHtml(modelName)}" style="cursor:pointer; width:15px; height:15px;">
                <span style="font-size:16px;">🎙️</span>
                <strong style="font-size:14px; color:#f1f5f9;">${escapeHtml(modelName)}</strong>
                <span style="font-size:11px; background:rgba(196,155,79,0.2); color:#fde047; padding:2px 8px; border-radius:12px; border:1px solid rgba(196,155,79,0.4);">
                    ${emotionsList.length} 个可用情绪
                </span>
                <span style="font-size:11px; color:#94a3b8;">
                    (共 ${(model.audio_stats && model.audio_stats.total) || 0} 条音频)
                </span>
            </div>
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:12px; color:#94a3b8;">⚡ 语速倍率:</label>
                    <input type="number" step="0.05" min="0.5" max="2.0" class="input model-speed-input" value="${speed}" style="width:75px; text-align:center; font-weight:bold; color:#38bdf8; padding:3px 6px; font-size:12px;">
                    <span style="font-size:12px; color:#64748b;">x</span>
                </div>
                <button type="button" class="btn btn-primary btn-ai-summarize-single" data-model="${escapeHtml(modelName)}" style="padding:4px 10px; font-size:12px; display:flex; align-items:center; gap:4px;">
                    <span>🤖</span> AI 智能总结场景
                </button>
            </div>
        `;

        // 绑定单模型 AI 总结按钮
        header.querySelector('.btn-ai-summarize-single').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            await triggerAiSummarizeForModel(model, card, btn);
        });

        // 情绪列表内容区
        const body = document.createElement('div');
        body.style.cssText = 'padding:14px 16px; display:flex; flex-direction:column; gap:8px;';

        emotionsList.forEach(emo => {
            const cleanEmo = emo.toLowerCase();
            // 优先使用该模型已保存的说明，若无则使用全局知识库默认说明
            const descValue = savedEmotions[emo] || savedEmotions[cleanEmo] || DEFAULT_EMOTION_ANNOTATIONS[cleanEmo] || DEFAULT_EMOTION_ANNOTATIONS[emo] || '';

            const row = document.createElement('div');
            row.className = 'model-emotion-row';
            row.dataset.emotion = emo;
            row.style.cssText = 'display:flex; gap:10px; align-items:center; background:rgba(0,0,0,0.15); padding:6px 10px; border-radius:6px; transition:background-color 0.3s;';
            row.innerHTML = `
                <div style="width:110px; flex-shrink:0;">
                    <span style="font-size:12px; font-weight:600; color:#fde047; font-family:monospace; background:rgba(253,224,71,0.1); padding:2px 6px; border-radius:4px;">
                        ${escapeHtml(emo)}
                    </span>
                </div>
                <input type="text" class="input model-emotion-desc-input" value="${escapeHtml(descValue)}" style="flex:1; font-size:12px; padding:4px 8px; transition:border-color 0.3s;" placeholder="规定该模型在 ${escapeHtml(emo)} 情绪下的适用场景与限制...">
                <button type="button" class="btn btn-secondary btn-reset-single-emotion" title="恢复此情绪的默认推荐场景" style="padding:4px 8px; font-size:11px; white-space:nowrap;">🔄 默认</button>
            `;

            row.querySelector('.btn-reset-single-emotion').addEventListener('click', () => {
                const defaultDesc = DEFAULT_EMOTION_ANNOTATIONS[cleanEmo] || DEFAULT_EMOTION_ANNOTATIONS[emo] || '';
                row.querySelector('.model-emotion-desc-input').value = defaultDesc;
                showNotification(`已重置 ${emo} 为默认推荐场景说明`, 'info');
            });

            body.appendChild(row);
        });

        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
    });

    // 绑定全选与单选联动
    updateSelectAllCheckboxState();
}

/**
 * 触发单个模型的 AI 情绪场景分析与总结
 */
async function triggerAiSummarizeForModel(model, cardElement, triggerButton) {
    if (!model) return;

    // 1. 获取 LLM 配置
    const llmConfig = getActiveLLMConfig();
    if (!llmConfig.apiUrl || !llmConfig.apiKey) {
        showNotification('请先在「系统配置 -> 分析引擎/电话」中配置 LLM 的 API 地址与密钥！', 'error');
        return;
    }

    const originalBtnText = triggerButton ? triggerButton.innerHTML : '';
    if (triggerButton) {
        triggerButton.disabled = true;
        triggerButton.innerHTML = '<span>⏳</span> 正在拉取台词...';
    }

    try {
        // 2. 从后端 API 异步拉取该模型的所有参考音频台词与文件名
        const audiosRes = await fetch(`${API_BASE}/models/${encodeURIComponent(model.name)}/audios`);
        if (!audiosRes.ok) throw new Error(`拉取模型音频失败: HTTP ${audiosRes.status}`);
        const audiosData = await audiosRes.json();
        const audiosList = audiosData.audios || [];

        const samplesByEmotion = {};

        audiosList.forEach(audio => {
            const emo = audio.emotion ? audio.emotion.trim() : 'default';
            if (!samplesByEmotion[emo]) samplesByEmotion[emo] = [];

            // 提取台词内容：优先使用 audio.text，若无则从文件名提取
            let textContent = audio.text ? audio.text.trim() : '';
            if (!textContent && audio.filename) {
                const rawName = audio.filename.replace(/\.[^/.]+$/, "");
                if (rawName.includes('_')) {
                    textContent = rawName.split('_').slice(1).join('_').trim();
                } else {
                    textContent = rawName.trim();
                }
            }

            if (textContent) {
                samplesByEmotion[emo].push(`"${textContent}"`);
            }
        });

        const emotionKeys = Object.keys(samplesByEmotion);
        if (emotionKeys.length === 0) {
            showNotification(`模型「${model.name}」未找到任何音频台词样本！`, 'info');
            return;
        }

        // 构建发给 AI 的样本摘要文本
        let samplesText = '';
        for (const [emo, samples] of Object.entries(samplesByEmotion)) {
            const topSamples = samples.slice(0, 5).join('； ');
            samplesText += `- 情绪标签【${emo}】: ${topSamples}\n`;
        }

        if (triggerButton) {
            triggerButton.innerHTML = '<span>⏳</span> AI 正在推断场景...';
        }

        const resultDict = await callLLMForEmotionSummary(model.name, samplesText, llmConfig);

        // 回填到卡片中
        let updatedCount = 0;
        cardElement.querySelectorAll('.model-emotion-row').forEach(row => {
            const emo = row.dataset.emotion;
            const input = row.querySelector('.model-emotion-desc-input');
            const cleanEmo = emo.toLowerCase();

            if (resultDict[emo] || resultDict[cleanEmo]) {
                const desc = (resultDict[emo] || resultDict[cleanEmo]).trim();
                if (desc) {
                    input.value = desc;
                    row.style.background = 'rgba(34, 197, 94, 0.2)';
                    setTimeout(() => {
                        row.style.background = 'rgba(0,0,0,0.15)';
                    }, 2000);
                    updatedCount++;
                }
            }
        });

        showNotification(`🎉 已成功通过 AI 总结「${model.name}」的 ${updatedCount} 个情绪场景！请核对后点击保存。`, 'success');
    } catch (e) {
        console.error('AI 分析情绪场景失败:', e);
        showNotification(`AI 分析失败: ${e.message}`, 'error');
    } finally {
        if (triggerButton) {
            triggerButton.disabled = false;
            triggerButton.innerHTML = originalBtnText;
        }
    }
}

/**
 * 调用 LLM 生成简短精炼的情绪场景规则
 */
async function callLLMForEmotionSummary(modelName, samplesText, llmConfig) {
    const prompt = `你是一位专业的声音导演与戏剧角色分析专家。
以下是角色「${modelName}」在不同情绪标签下的实际参考音频台词与文件样本：

${samplesText}

【任务要求】
请根据上述台词的内容语气、性格特征与语境，为该角色的每一个情绪标签提炼出极其简明精准的【适用场景与使用限制】：
1. 语言必须简短精炼，每条情绪的描述严格控制在 10 ~ 25 个字以内，一针见血，绝不废话！
2. 明确指出适用语境（如：何时使用）与限制边界（对于 panting/climax 等特殊情绪须强调日常闲聊禁用）。
3. 严格输出标准 JSON 键值对（键为情绪英文名，值为描述），不要包含任何多余文字或解释。

【输出格式示例】
{
  "angry": "受到直接挑衅或争吵时使用",
  "climax": "仅限全剧情最高潮绝境爆发时使用",
  "neutral": "日常平稳对话与事实叙述",
  "panting": "仅在剧烈运动或极度疲惫喘息时使用"
}`;

    const endpoint = llmConfig.apiUrl.endsWith('/chat/completions') 
        ? llmConfig.apiUrl 
        : llmConfig.apiUrl.replace(/\/+$/, '') + '/chat/completions';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${llmConfig.apiKey}`
        },
        body: JSON.stringify({
            model: llmConfig.model || 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are an expert voice director that always outputs valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.5,
            max_tokens: 800
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`LLM 接口返回 HTTP ${response.status}: ${err.error?.message || ''}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    // 解析 JSON
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        content = content.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(content);
}

/**
 * 获取当前已配置的有效 LLM
 */
function getActiveLLMConfig() {
    const analysis = (currentSettings.analysis_engine && currentSettings.analysis_engine.llm) || {};
    const phone = (currentSettings.phone_call && currentSettings.phone_call.llm) || {};

    return {
        apiUrl: analysis.api_url || phone.api_url || '',
        apiKey: analysis.api_key || phone.api_key || '',
        model: analysis.model || phone.model || 'gpt-3.5-turbo'
    };
}

/**
 * 绑定提示词与插槽操作
 */
function bindPromptControls() {
    const promptTemplateEl = document.getElementById('setting-prompt-template');
    const resetPromptBtn = document.getElementById('btn-reset-prompt-template');
    const refreshModelsBtn = document.getElementById('btn-refresh-models-emotions');
    const saveBtn = document.getElementById('btn-save-prompt-emotions');
    const selectAllCheckbox = document.getElementById('checkbox-select-all-models');
    const batchAiBtn = document.getElementById('btn-batch-ai-summarize');

    if (resetPromptBtn && promptTemplateEl) {
        resetPromptBtn.addEventListener('click', () => {
            promptTemplateEl.value = DEFAULT_PROMPT_TEMPLATE;
            showNotification('已恢复官方标准 ElevenLabs V3 提示词模板', 'info');
        });
    }

    document.querySelectorAll('.btn-slot-insert').forEach(btn => {
        btn.addEventListener('click', () => {
            const slot = btn.dataset.slot;
            if (slot && promptTemplateEl) {
                const start = promptTemplateEl.selectionStart || 0;
                const end = promptTemplateEl.selectionEnd || 0;
                const val = promptTemplateEl.value;
                promptTemplateEl.value = val.substring(0, start) + slot + val.substring(end);
                promptTemplateEl.focus();
                promptTemplateEl.selectionStart = promptTemplateEl.selectionEnd = start + slot.length;
                showNotification(`已插入插槽变量: ${slot}`, 'info');
            }
        });
    });

    if (refreshModelsBtn) {
        refreshModelsBtn.addEventListener('click', async () => {
            refreshModelsBtn.disabled = true;
            refreshModelsBtn.textContent = '🔄 刷新中...';
            try {
                await loadPromptEmotionsData();
                showNotification('已成功刷新模型与情绪列表！', 'success');
            } finally {
                refreshModelsBtn.disabled = false;
                refreshModelsBtn.textContent = '🔄 刷新模型与情绪';
            }
        });
    }

    // 全选/反选
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('.model-select-checkbox').forEach(cb => {
                cb.checked = checked;
            });
        });
    }

    // 批量 AI 生成
    if (batchAiBtn) {
        batchAiBtn.addEventListener('click', async () => {
            const checkedBoxes = Array.from(document.querySelectorAll('.model-select-checkbox:checked'));
            if (checkedBoxes.length === 0) {
                showNotification('请先勾选需要 AI 分析总结的模型！', 'info');
                return;
            }

            batchAiBtn.disabled = true;
            const originalText = batchAiBtn.textContent;
            let successCount = 0;

            for (let i = 0; i < checkedBoxes.length; i++) {
                const cb = checkedBoxes[i];
                const modelName = cb.dataset.model;
                const model = currentModels.find(m => m.name === modelName);
                const card = cb.closest('.model-emotion-card');

                batchAiBtn.textContent = `🤖 正在分析 (${i + 1}/${checkedBoxes.length}): ${modelName}...`;

                if (model && card) {
                    try {
                        await triggerAiSummarizeForModel(model, card, null);
                        successCount++;
                    } catch (err) {
                        console.error(`批量分析 ${modelName} 失败:`, err);
                    }
                }
            }

            batchAiBtn.disabled = false;
            batchAiBtn.textContent = originalText;
            showNotification(`🎉 批量处理完毕！已成功为 ${successCount} 个模型生成情绪场景说明。请检查后点击保存。`, 'success');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            savePromptEmotionsSettings();
        });
    }
}

function updateSelectAllCheckboxState() {
    const selectAllCheckbox = document.getElementById('checkbox-select-all-models');
    const allBoxes = document.querySelectorAll('.model-select-checkbox');
    
    allBoxes.forEach(cb => {
        cb.addEventListener('change', () => {
            if (selectAllCheckbox) {
                const checkedCount = document.querySelectorAll('.model-select-checkbox:checked').length;
                selectAllCheckbox.checked = checkedCount === allBoxes.length && allBoxes.length > 0;
            }
        });
    });
}

/**
 * 收集并保存提示词与模型情感规则设置
 */
export async function savePromptEmotionsSettings() {
    const saveBtn = document.getElementById('btn-save-prompt-emotions');
    const promptTemplateEl = document.getElementById('setting-prompt-template');

    // 1. 收集各模型配置
    const modelsConfig = {};
    document.querySelectorAll('.model-emotion-card').forEach(card => {
        const modelName = card.dataset.model;
        if (!modelName) return;

        const speedInput = card.querySelector('.model-speed-input');
        const speedVal = speedInput ? (parseFloat(speedInput.value) || 1.0) : 1.0;

        const emotions = {};
        card.querySelectorAll('.model-emotion-row').forEach(row => {
            const emo = row.dataset.emotion;
            const descInput = row.querySelector('.model-emotion-desc-input');
            if (emo && descInput) {
                emotions[emo] = descInput.value.trim();
            }
        });

        modelsConfig[modelName] = {
            speed: speedVal,
            emotions: emotions
        };
    });

    const payload = {
        prompt_injector: {
            enabled: true,
            custom_template: promptTemplateEl ? promptTemplateEl.value.trim() : DEFAULT_PROMPT_TEMPLATE,
            models: modelsConfig,
            emotion_annotations: DEFAULT_EMOTION_ANNOTATIONS
        }
    };

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '💾 正在保存...';
    }

    try {
        const res = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showNotification('🎉 提示词模板与各模型情感规则已成功保存并即时生效！', 'success');
        } else {
            const err = await res.json().catch(() => ({}));
            showNotification(`保存失败: ${err.detail || '未知错误'}`, 'error');
        }
    } catch (e) {
        showNotification(`保存异常: ${e.message}`, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 保存全部配置';
        }
    }
}
