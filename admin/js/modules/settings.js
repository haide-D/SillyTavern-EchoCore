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
    "smug": "自鸣得意、傲娇、得意洋洋或嘲弄时使用"
};

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

let currentEmotionAnnotations = { ...DEFAULT_EMOTION_ANNOTATIONS };

/**
 * 渲染情感规则列表
 */
export function renderEmotionRulesUI(annotations) {
    const container = document.getElementById('emotion-rules-container');
    if (!container) return;

    currentEmotionAnnotations = annotations ? { ...annotations } : { ...DEFAULT_EMOTION_ANNOTATIONS };
    container.innerHTML = '';

    const entries = Object.entries(currentEmotionAnnotations);
    if (entries.length === 0) {
        container.innerHTML = '<div style="font-size:12px; color:#9ca3af; padding:8px;">暂无自定义规则，将使用基础标签名</div>';
        return;
    }

    entries.forEach(([emo, desc]) => {
        const row = document.createElement('div');
        row.className = 'emotion-rule-row';
        row.style.cssText = 'display:flex; gap:8px; align-items:center; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);';
        row.innerHTML = `
            <input type="text" class="input emotion-key-input" value="${escapeHtml(emo)}" style="width:130px; font-weight:bold; color:#fde047; font-family:monospace; padding:4px 8px; font-size:12px;" placeholder="情感名 (如 angry)">
            <input type="text" class="input emotion-desc-input" value="${escapeHtml(desc)}" style="flex:1; padding:4px 8px; font-size:12px;" placeholder="适用场景与限制规定">
            <button type="button" class="btn btn-danger btn-delete-emotion-row" style="padding:4px 8px; font-size:11px;">🗑️</button>
        `;

        row.querySelector('.btn-delete-emotion-row').addEventListener('click', () => {
            row.remove();
        });

        container.appendChild(row);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * 从当前 UI 收集情感规则字典
 */
export function collectEmotionRulesFromUI() {
    const result = {};
    document.querySelectorAll('.emotion-rule-row').forEach(row => {
        const key = row.querySelector('.emotion-key-input')?.value.trim();
        const desc = row.querySelector('.emotion-desc-input')?.value.trim();
        if (key) {
            result[key] = desc || '';
        }
    });
    return result;
}

/**
 * 绑定设置页面的标签页切换事件
 */
export function bindSettingsTabs() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = 'settings-tab-' + tab.dataset.tab;
            const targetContent = document.getElementById(tabId);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

/**
 * 加载系统配置数据并填充表单
 */
export async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        const settings = await response.json();

        // 基础配置
        const baseDirEl = document.getElementById('setting-base-dir');
        const cacheDirEl = document.getElementById('setting-cache-dir');
        const sovitsHostEl = document.getElementById('setting-sovits-host');
        const managerPortEl = document.getElementById('setting-manager-port');
        const defaultLangEl = document.getElementById('setting-default-lang');
        const devModeEl = document.getElementById('setting-developer-mode');

        if (baseDirEl) baseDirEl.value = settings.base_dir || '';
        if (cacheDirEl) cacheDirEl.value = settings.cache_dir || '';
        if (sovitsHostEl) sovitsHostEl.value = settings.sovits_host || 'http://127.0.0.1:9880';
        if (managerPortEl) managerPortEl.value = settings.manager_port || 3000;
        if (defaultLangEl) defaultLangEl.value = settings.default_lang || 'Chinese';
        if (devModeEl) devModeEl.value = String(settings.developer_mode || false);

        // 提示词与情感
        const promptInjector = settings.prompt_injector || {};
        const promptTemplateEl = document.getElementById('setting-prompt-template');
        if (promptTemplateEl) {
            promptTemplateEl.value = promptInjector.custom_template || '';
        }
        renderEmotionRulesUI(promptInjector.emotion_annotations || DEFAULT_EMOTION_ANNOTATIONS);

        if (baseDirEl) baseDirEl.value = settings.base_dir || '';
        if (cacheDirEl) cacheDirEl.value = settings.cache_dir || '';
        if (sovitsHostEl) sovitsHostEl.value = settings.sovits_host || 'http://127.0.0.1:9880';
        if (managerPortEl) managerPortEl.value = settings.manager_port || 3000;
        if (defaultLangEl) defaultLangEl.value = settings.default_lang || 'Chinese';
        if (devModeEl) devModeEl.value = String(settings.developer_mode === true);

        // 分析引擎配置
        const analysis = settings.analysis_engine || {};
        const analysisEnabledEl = document.getElementById('setting-analysis-enabled');
        const analysisIntervalEl = document.getElementById('setting-analysis-interval');
        const analysisThresholdEl = document.getElementById('setting-analysis-threshold');
        if (analysisEnabledEl) analysisEnabledEl.value = String(analysis.enabled !== false);
        if (analysisIntervalEl) analysisIntervalEl.value = analysis.analysis_interval || 3;
        if (analysisThresholdEl) analysisThresholdEl.value = analysis.trigger_threshold || 60;

        const analysisLlm = analysis.llm || {};
        const analysisApiUrlEl = document.getElementById('setting-analysis-llm-api-url');
        const analysisApiKeyEl = document.getElementById('setting-analysis-llm-api-key');
        if (analysisApiUrlEl) analysisApiUrlEl.value = analysisLlm.api_url || '';
        if (analysisApiKeyEl) analysisApiKeyEl.value = analysisLlm.api_key || '';

        const analysisModelSelect = document.getElementById('setting-analysis-llm-model');
        const savedAnalysisModel = analysisLlm.model || '';
        if (analysisModelSelect && savedAnalysisModel) {
            let hasOpt = Array.from(analysisModelSelect.options).some(o => o.value === savedAnalysisModel);
            if (!hasOpt) {
                const opt = document.createElement('option');
                opt.value = savedAnalysisModel;
                opt.textContent = savedAnalysisModel;
                analysisModelSelect.appendChild(opt);
            }
            analysisModelSelect.value = savedAnalysisModel;
        }

        const analysisTempEl = document.getElementById('setting-analysis-llm-temperature');
        const analysisMaxTokensEl = document.getElementById('setting-analysis-llm-max-tokens');
        if (analysisTempEl) analysisTempEl.value = analysisLlm.temperature || 0.8;
        if (analysisMaxTokensEl) analysisMaxTokensEl.value = analysisLlm.max_tokens || 5000;

        // 电话功能配置
        const phoneCall = settings.phone_call || {};
        const phoneCallEnabledEl = document.getElementById('setting-phone-call-enabled');
        if (phoneCallEnabledEl) phoneCallEnabledEl.value = String(phoneCall.enabled !== false);

        const llm = phoneCall.llm || {};
        const llmApiUrlEl = document.getElementById('setting-llm-api-url');
        const llmApiKeyEl = document.getElementById('setting-llm-api-key');
        if (llmApiUrlEl) llmApiUrlEl.value = llm.api_url || 'http://127.0.0.1:7861/v1';
        if (llmApiKeyEl) llmApiKeyEl.value = llm.api_key || '';

        const modelSelect = document.getElementById('setting-llm-model');
        const savedModel = llm.model || 'gemini-2.5-flash';
        if (modelSelect) {
            let hasOption = Array.from(modelSelect.options).some(o => o.value === savedModel);
            if (!hasOption && savedModel) {
                const option = document.createElement('option');
                option.value = savedModel;
                option.textContent = savedModel;
                modelSelect.appendChild(option);
            }
            modelSelect.value = savedModel;
        }

        const llmTempEl = document.getElementById('setting-llm-temperature');
        const llmMaxTokensEl = document.getElementById('setting-llm-max-tokens');
        if (llmTempEl) llmTempEl.value = llm.temperature || 0.8;
        if (llmMaxTokensEl) llmMaxTokensEl.value = llm.max_tokens || 5000;

        // TTS 配置
        const tts = phoneCall.tts_config || {};
        const ttsTextLangEl = document.getElementById('setting-tts-text-lang');
        const ttsPromptLangEl = document.getElementById('setting-tts-prompt-lang');
        const ttsTextSplitEl = document.getElementById('setting-tts-text-split-method');
        const ttsAuxRefEl = document.getElementById('setting-tts-use-aux-ref-audio');

        if (ttsTextLangEl) ttsTextLangEl.value = tts.text_lang || 'zh';
        if (ttsPromptLangEl) ttsPromptLangEl.value = tts.prompt_lang || 'zh';
        if (ttsTextSplitEl) ttsTextSplitEl.value = tts.text_split_method || 'cut0';
        if (ttsAuxRefEl) ttsAuxRefEl.value = String(tts.use_aux_ref_audio || false);

        // 消息处理
        const msgProcessing = settings.message_processing || {};
        const extractTagEl = document.getElementById('setting-extract-tag');
        const filterTagsEl = document.getElementById('setting-filter-tags');
        if (extractTagEl) extractTagEl.value = msgProcessing.extract_tag || '';
        if (filterTagsEl) filterTagsEl.value = msgProcessing.filter_tags || '';
    } catch (error) {
        console.error('加载系统配置失败:', error);
    }
}

/**
 * 保存系统配置数据
 */
export async function saveSettings() {
    const baseDirEl = document.getElementById('setting-base-dir');
    const cacheDirEl = document.getElementById('setting-cache-dir');
    const sovitsHostEl = document.getElementById('setting-sovits-host');
    const managerPortEl = document.getElementById('setting-manager-port');
    const defaultLangEl = document.getElementById('setting-default-lang');
    const devModeEl = document.getElementById('setting-developer-mode');

    const analysisEnabledEl = document.getElementById('setting-analysis-enabled');
    const analysisIntervalEl = document.getElementById('setting-analysis-interval');
    const analysisThresholdEl = document.getElementById('setting-analysis-threshold');
    const analysisApiUrlEl = document.getElementById('setting-analysis-llm-api-url');
    const analysisApiKeyEl = document.getElementById('setting-analysis-llm-api-key');
    const analysisModelEl = document.getElementById('setting-analysis-llm-model');
    const analysisTempEl = document.getElementById('setting-analysis-llm-temperature');
    const analysisMaxTokensEl = document.getElementById('setting-analysis-llm-max-tokens');

    const extractTagEl = document.getElementById('setting-extract-tag');
    const filterTagsEl = document.getElementById('setting-filter-tags');

    const phoneCallEnabledEl = document.getElementById('setting-phone-call-enabled');
    const llmApiUrlEl = document.getElementById('setting-llm-api-url');
    const llmApiKeyEl = document.getElementById('setting-llm-api-key');
    const llmModelEl = document.getElementById('setting-llm-model');
    const llmTempEl = document.getElementById('setting-llm-temperature');
    const llmMaxTokensEl = document.getElementById('setting-llm-max-tokens');

    const ttsTextLangEl = document.getElementById('setting-tts-text-lang');
    const ttsPromptLangEl = document.getElementById('setting-tts-prompt-lang');
    const ttsTextSplitEl = document.getElementById('setting-tts-text-split-method');
    const ttsAuxRefEl = document.getElementById('setting-tts-use-aux-ref-audio');

    // 提示词与情感规则
    const promptTemplateEl = document.getElementById('setting-prompt-template');
    const emotionAnnotations = collectEmotionRulesFromUI();

    const settings = {
        base_dir: baseDirEl ? baseDirEl.value.trim() : '',
        cache_dir: cacheDirEl ? cacheDirEl.value.trim() : '',
        sovits_host: sovitsHostEl ? sovitsHostEl.value.trim() : 'http://127.0.0.1:9880',
        manager_port: managerPortEl ? (parseInt(managerPortEl.value) || 3000) : 3000,
        default_lang: defaultLangEl ? defaultLangEl.value : 'Chinese',
        developer_mode: devModeEl ? devModeEl.value === 'true' : false,

        prompt_injector: {
            enabled: true,
            custom_template: promptTemplateEl ? promptTemplateEl.value.trim() : '',
            emotion_annotations: emotionAnnotations
        },

        analysis_engine: {
            enabled: analysisEnabledEl ? analysisEnabledEl.value === 'true' : true,
            analysis_interval: analysisIntervalEl ? parseInt(analysisIntervalEl.value) || 3 : 3,
            trigger_threshold: analysisThresholdEl ? parseInt(analysisThresholdEl.value) || 60 : 60,
            llm: {
                api_url: analysisApiUrlEl ? analysisApiUrlEl.value.trim() : '',
                api_key: analysisApiKeyEl ? analysisApiKeyEl.value.trim() : '',
                model: analysisModelEl ? analysisModelEl.value.trim() : '',
                temperature: analysisTempEl ? parseFloat(analysisTempEl.value) || 0.8 : 0.8,
                max_tokens: analysisMaxTokensEl ? parseInt(analysisMaxTokensEl.value) || 5000 : 5000
            }
        },

        message_processing: {
            extract_tag: extractTagEl ? extractTagEl.value.trim() : '',
            filter_tags: filterTagsEl ? filterTagsEl.value.trim() : ''
        },

        phone_call: {
            enabled: phoneCallEnabledEl ? phoneCallEnabledEl.value === 'true' : true,
            llm: {
                api_url: llmApiUrlEl ? llmApiUrlEl.value.trim() : '',
                api_key: llmApiKeyEl ? llmApiKeyEl.value.trim() : '',
                model: llmModelEl ? llmModelEl.value.trim() : '',
                temperature: llmTempEl ? parseFloat(llmTempEl.value) || 0.8 : 0.8,
                max_tokens: llmMaxTokensEl ? parseInt(llmMaxTokensEl.value) || 5000 : 5000
            },
            tts_config: {
                text_lang: ttsTextLangEl ? ttsTextLangEl.value : 'zh',
                prompt_lang: ttsPromptLangEl ? ttsPromptLangEl.value : 'zh',
                text_split_method: ttsTextSplitEl ? ttsTextSplitEl.value : 'cut0',
                use_aux_ref_audio: ttsAuxRefEl ? ttsAuxRefEl.value === 'true' : false
            }
        }
    };

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('系统配置保存成功！', 'success');
        } else {
            showNotification(data.detail || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showNotification('保存失败，请检查服务连接', 'error');
    }
}

/**
 * 远程获取指定 LLM API 提供的模型列表
 */
export async function fetchLLMModels(apiUrl, apiKey) {
    const baseUrl = apiUrl.replace(/\/chat\/completions.*$/, '');
    const modelsUrl = baseUrl + '/models';

    const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    let models = [];
    if (data.data && Array.isArray(data.data)) {
        models = data.data.map(m => m.id || m.name || m);
    } else if (Array.isArray(data)) {
        models = data.map(m => m.id || m.name || m);
    } else if (data.models && Array.isArray(data.models)) {
        models = data.models.map(m => m.id || m.name || m);
    }
    return models;
}

/**
 * 绑定电话 LLM 模型列表获取按钮
 */
export function bindFetchModelsButton() {
    const btn = document.getElementById('fetch-llm-models-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const apiUrl = document.getElementById('setting-llm-api-url').value.trim();
        const apiKey = document.getElementById('setting-llm-api-key').value.trim();

        if (!apiUrl) {
            showNotification('请先填写 LLM API 地址', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = '🔄 获取中...';

        try {
            const models = await fetchLLMModels(apiUrl, apiKey);
            const select = document.getElementById('setting-llm-model');
            const currentVal = select.value;

            select.innerHTML = '<option value="">请选择模型...</option>';
            models.forEach(model => {
                const opt = document.createElement('option');
                opt.value = model;
                opt.textContent = model;
                select.appendChild(opt);
            });

            if (currentVal && models.includes(currentVal)) {
                select.value = currentVal;
            } else if (models.length > 0) {
                select.value = models[0];
            }

            showNotification(`成功获取到 ${models.length} 个可用模型`, 'success');
        } catch (error) {
            console.error('获取模型列表失败:', error);
            showNotification(`获取模型失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 获取模型列表';
        }
    });
}

/**
 * 绑定电话 LLM 连接测试按钮
 */
export function bindTestConnectionButton() {
    const btn = document.getElementById('test-llm-connection-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const apiUrl = document.getElementById('setting-llm-api-url').value.trim();
        const apiKey = document.getElementById('setting-llm-api-key').value.trim();
        const model = document.getElementById('setting-llm-model').value.trim();

        if (!apiUrl) {
            showNotification('请先填写 API 地址', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = '🧪 测试中...';

        try {
            const endpoint = apiUrl.endsWith('/chat/completions') ? apiUrl : apiUrl + '/chat/completions';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 5
                })
            });

            if (response.ok) {
                showNotification('LLM 连接测试成功！', 'success');
            } else {
                const errData = await response.json().catch(() => ({}));
                showNotification(`连接失败: HTTP ${response.status} ${errData.error?.message || ''}`, 'error');
            }
        } catch (error) {
            console.error('测试连接失败:', error);
            showNotification(`连接失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🧪 测试连接';
        }
    });
}

/**
 * 绑定分析引擎 LLM 相关测试与拉取按钮
 */
export function bindAnalysisLLMButtons() {
    const fetchBtn = document.getElementById('fetch-analysis-models-btn');
    const testBtn = document.getElementById('test-analysis-llm-btn');

    if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
            const apiUrl = document.getElementById('setting-analysis-llm-api-url').value.trim();
            const apiKey = document.getElementById('setting-analysis-llm-api-key').value.trim();

            if (!apiUrl) {
                showNotification('请先填写分析 LLM API 地址', 'warning');
                return;
            }

            fetchBtn.disabled = true;
            fetchBtn.textContent = '🔄 获取中...';

            try {
                const models = await fetchLLMModels(apiUrl, apiKey);
                const select = document.getElementById('setting-analysis-llm-model');
                const currentVal = select.value;

                select.innerHTML = '<option value="">请选择模型...</option>';
                models.forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model;
                    opt.textContent = model;
                    select.appendChild(opt);
                });

                if (currentVal && models.includes(currentVal)) {
                    select.value = currentVal;
                } else if (models.length > 0) {
                    select.value = models[0];
                }

                showNotification(`成功获取到 ${models.length} 个分析模型`, 'success');
            } catch (error) {
                console.error('获取分析模型失败:', error);
                showNotification(`获取失败: ${error.message}`, 'error');
            } finally {
                fetchBtn.disabled = false;
                fetchBtn.textContent = '🔄 获取模型列表';
            }
        });
    }

    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            const apiUrl = document.getElementById('setting-analysis-llm-api-url').value.trim();
            const apiKey = document.getElementById('setting-analysis-llm-api-key').value.trim();
            const model = document.getElementById('setting-analysis-llm-model').value.trim();

            if (!apiUrl) {
                showNotification('请先填写分析 API 地址', 'warning');
                return;
            }

            testBtn.disabled = true;
            testBtn.textContent = '🧪 测试中...';

            try {
                const endpoint = apiUrl.endsWith('/chat/completions') ? apiUrl : apiUrl + '/chat/completions';
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model || 'gpt-3.5-turbo',
                        messages: [{ role: 'user', content: 'Ping' }],
                        max_tokens: 5
                    })
                });

                if (response.ok) {
                    showNotification('分析引擎 LLM 连接测试成功！', 'success');
                } else {
                    const errData = await response.json().catch(() => ({}));
                    showNotification(`连接失败: HTTP ${response.status} ${errData.error?.message || ''}`, 'error');
                }
            } catch (error) {
                console.error('测试连接失败:', error);
                showNotification(`测试连接失败: ${error.message}`, 'error');
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = '🧪 测试连接';
            }
        });
    }
}

/**
 * 绑定提示词与情感规则 Tab 按钮与交互
 */
export function bindPromptAndEmotionControls() {
    // 1. 恢复默认提示词模板
    const resetPromptBtn = document.getElementById('btn-reset-prompt-template');
    const promptTemplateEl = document.getElementById('setting-prompt-template');
    if (resetPromptBtn && promptTemplateEl) {
        resetPromptBtn.addEventListener('click', () => {
            promptTemplateEl.value = DEFAULT_PROMPT_TEMPLATE;
            showNotification('已恢复官方标准 ElevenLabs V3 提示词模板', 'info');
        });
    }

    // 2. 插入插槽变量按钮
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

    // 3. 添加新情感规则
    const addEmotionBtn = document.getElementById('btn-add-emotion-rule');
    const container = document.getElementById('emotion-rules-container');
    if (addEmotionBtn && container) {
        addEmotionBtn.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'emotion-rule-row';
            row.style.cssText = 'display:flex; gap:8px; align-items:center; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);';
            row.innerHTML = `
                <input type="text" class="input emotion-key-input" value="" style="width:130px; font-weight:bold; color:#fde047; font-family:monospace; padding:4px 8px; font-size:12px;" placeholder="情感名 (如 shyness)">
                <input type="text" class="input emotion-desc-input" value="" style="flex:1; padding:4px 8px; font-size:12px;" placeholder="描述限制场景 (如: 仅在害羞脸红时使用)">
                <button type="button" class="btn btn-danger btn-delete-emotion-row" style="padding:4px 8px; font-size:11px;">🗑️</button>
            `;
            row.querySelector('.btn-delete-emotion-row').addEventListener('click', () => {
                row.remove();
            });
            container.prepend(row);
            row.querySelector('.emotion-key-input').focus();
        });
    }

    // 4. 恢复默认情感场景字典
    const resetEmotionsBtn = document.getElementById('btn-reset-emotion-rules');
    if (resetEmotionsBtn) {
        resetEmotionsBtn.addEventListener('click', () => {
            renderEmotionRulesUI(DEFAULT_EMOTION_ANNOTATIONS);
            showNotification('已重置为官方内置常见情感场景说明', 'info');
        });
    }
}

