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
    "neutral": "中立、冷静、客观叙述时使用"
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

        // 提取该模型拥有的所有情绪标签
        const emotionsSet = new Set(['default']);
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
        card.style.cssText = 'background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; transition:border-color 0.2s;';

        // 卡片头部
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:rgba(0,0,0,0.25); border-bottom:1px solid rgba(255,255,255,0.06);';
        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:16px;">🎙️</span>
                <strong style="font-size:14px; color:#f1f5f9;">${escapeHtml(modelName)}</strong>
                <span style="font-size:11px; background:rgba(196,155,79,0.2); color:#fde047; padding:2px 8px; border-radius:12px; border:1px solid rgba(196,155,79,0.4);">
                    ${emotionsList.length} 个可用情绪
                </span>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:12px; color:#94a3b8;">⚡ 语速倍率:</label>
                    <input type="number" step="0.05" min="0.5" max="2.0" class="input model-speed-input" value="${speed}" style="width:75px; text-align:center; font-weight:bold; color:#38bdf8; padding:3px 6px; font-size:12px;">
                    <span style="font-size:12px; color:#64748b;">x</span>
                </div>
            </div>
        `;

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
            row.style.cssText = 'display:flex; gap:10px; align-items:center; background:rgba(0,0,0,0.15); padding:6px 10px; border-radius:6px;';
            row.innerHTML = `
                <div style="width:110px; flex-shrink:0;">
                    <span style="font-size:12px; font-weight:600; color:#fde047; font-family:monospace; background:rgba(253,224,71,0.1); padding:2px 6px; border-radius:4px;">
                        ${escapeHtml(emo)}
                    </span>
                </div>
                <input type="text" class="input model-emotion-desc-input" value="${escapeHtml(descValue)}" style="flex:1; font-size:12px; padding:4px 8px;" placeholder="规定该模型在 ${escapeHtml(emo)} 情绪下的适用场景与限制...">
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
}

/**
 * 绑定提示词与插槽操作
 */
function bindPromptControls() {
    const promptTemplateEl = document.getElementById('setting-prompt-template');
    const resetPromptBtn = document.getElementById('btn-reset-prompt-template');
    const refreshModelsBtn = document.getElementById('btn-refresh-models-emotions');
    const saveBtn = document.getElementById('btn-save-prompt-emotions');

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

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            savePromptEmotionsSettings();
        });
    }
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
