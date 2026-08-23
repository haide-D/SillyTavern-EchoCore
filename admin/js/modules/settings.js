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

        const analysisModelEl = document.getElementById('setting-analysis-llm-model');
        if (analysisModelEl) analysisModelEl.value = analysisLlm.model || '';

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

        const llmModelEl = document.getElementById('setting-llm-model');
        if (llmModelEl) llmModelEl.value = llm.model || '';

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

        // 安全与鉴权配置
        const sec = settings.security || {};
        const secEnabledEl = document.getElementById('setting-security-enabled');
        const secAdminPassEl = document.getElementById('setting-security-admin-password');
        const secApiTokenEl = document.getElementById('setting-security-api-token');

        if (secEnabledEl) secEnabledEl.value = String(sec.enabled || false);
        if (secAdminPassEl) secAdminPassEl.value = sec.admin_password || '';
        if (secApiTokenEl) secApiTokenEl.value = sec.api_token || '';

        // MiniMax TTS 配置
        const mm = settings.minimax_tts || {};
        const mmEnabledEl = document.getElementById('setting-minimax-enabled');
        const mmApiKeyEl = document.getElementById('setting-minimax-api-key');
        const mmGroupIdEl = document.getElementById('setting-minimax-group-id');
        const mmApiUrlEl = document.getElementById('setting-minimax-api-url');
        const mmModelEl = document.getElementById('setting-minimax-model');
        const mmDefaultVoiceEl = document.getElementById('setting-minimax-default-voice');
        const mmSpeedEl = document.getElementById('setting-minimax-speed');
        const mmPitchEl = document.getElementById('setting-minimax-pitch');
        const mmVolEl = document.getElementById('setting-minimax-vol');

        if (mmEnabledEl) mmEnabledEl.value = String(mm.enabled || false);
        if (mmApiKeyEl) mmApiKeyEl.value = mm.api_key || '';
        if (mmGroupIdEl) mmGroupIdEl.value = mm.group_id || '';
        if (mmApiUrlEl) mmApiUrlEl.value = mm.api_url || 'https://api.minimax.chat/v1/t2a_v2';
        if (mmModelEl) mmModelEl.value = mm.model || 'speech-01-turbo';
        if (mmDefaultVoiceEl) mmDefaultVoiceEl.value = mm.default_voice_id || 'female-shaonv';
        if (mmSpeedEl) mmSpeedEl.value = mm.speed !== undefined ? mm.speed : 1.0;
        if (mmPitchEl) mmPitchEl.value = mm.pitch !== undefined ? mm.pitch : 0;
        if (mmVolEl) mmVolEl.value = mm.vol !== undefined ? mm.vol : 1.0;

        // 远程穿透
        const autoShareTunnelEl = document.getElementById('setting-auto-share-tunnel');
        if (autoShareTunnelEl) autoShareTunnelEl.value = String(settings.auto_share_tunnel === true);

        // 渲染文本发音替换词库列表 (如果为空则展示默认常用词库)
        const replacements = (msgProcessing.text_replacements && Object.keys(msgProcessing.text_replacements).length > 0)
            ? msgProcessing.text_replacements
            : DEFAULT_TEXT_REPLACEMENTS;
        renderTextReplacementsUI(replacements);
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
    const autoShareTunnelEl = document.getElementById('setting-auto-share-tunnel');

    const secEnabledEl = document.getElementById('setting-security-enabled');
    const secAdminPassEl = document.getElementById('setting-security-admin-password');
    const secApiTokenEl = document.getElementById('setting-security-api-token');

    const mmEnabledEl = document.getElementById('setting-minimax-enabled');
    const mmApiKeyEl = document.getElementById('setting-minimax-api-key');
    const mmGroupIdEl = document.getElementById('setting-minimax-group-id');
    const mmApiUrlEl = document.getElementById('setting-minimax-api-url');
    const mmModelEl = document.getElementById('setting-minimax-model');
    const mmDefaultVoiceEl = document.getElementById('setting-minimax-default-voice');
    const mmSpeedEl = document.getElementById('setting-minimax-speed');
    const mmPitchEl = document.getElementById('setting-minimax-pitch');
    const mmVolEl = document.getElementById('setting-minimax-vol');

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
        auto_share_tunnel: autoShareTunnelEl ? autoShareTunnelEl.value === 'true' : false,

        security: {
            enabled: secEnabledEl ? secEnabledEl.value === 'true' : false,
            admin_password: secAdminPassEl ? secAdminPassEl.value.trim() : '',
            api_token: secApiTokenEl ? secApiTokenEl.value.trim() : ''
        },

        minimax_tts: {
            enabled: mmEnabledEl ? mmEnabledEl.value === 'true' : false,
            api_key: mmApiKeyEl ? mmApiKeyEl.value.trim() : '',
            group_id: mmGroupIdEl ? mmGroupIdEl.value.trim() : '',
            api_url: mmApiUrlEl ? mmApiUrlEl.value.trim() : 'https://api.minimax.chat/v1/t2a_v2',
            model: mmModelEl ? mmModelEl.value : 'speech-01-turbo',
            default_voice_id: mmDefaultVoiceEl ? mmDefaultVoiceEl.value : 'female-shaonv',
            speed: mmSpeedEl ? parseFloat(mmSpeedEl.value) || 1.0 : 1.0,
            pitch: mmPitchEl ? parseInt(mmPitchEl.value) || 0 : 0,
            vol: mmVolEl ? parseFloat(mmVolEl.value) || 1.0 : 1.0
        },

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
            filter_tags: filterTagsEl ? filterTagsEl.value.trim() : '',
            text_replacements: collectTextReplacements()
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
 * 远程获取指定 LLM API 提供的模型列表 (优先后端代理规避 CORS，前端直连兜底，404 友好预设)
 */
export async function fetchLLMModels(apiUrl, apiKey) {
    try {
        const response = await fetch(`${API_BASE}/llm/models`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_url: apiUrl,
                api_key: apiKey
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.models && Array.isArray(data.models)) {
                return data;
            }
        } else {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `HTTP ${response.status}`);
        }
    } catch (backendError) {
        console.warn('后端代理获取模型失败，尝试前端直连兜底:', backendError);
        // 兜底：尝试前端直接请求（适用于同域或完全开放 CORS 的服务）
        try {
            const baseUrl = apiUrl.replace(/\/chat\/completions.*$/, '');
            const modelsUrl = baseUrl + '/models';

            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                let models = [];
                if (data.data && Array.isArray(data.data)) {
                    models = data.data.map(m => m.id || m.name || m);
                } else if (Array.isArray(data)) {
                    models = data.map(m => m.id || m.name || m);
                } else if (data.models && Array.isArray(data.models)) {
                    models = data.models.map(m => m.id || m.name || m);
                }
                if (models.length > 0) {
                    return { success: true, models, is_fallback: false };
                }
            }
        } catch (e) {
            console.warn('前端直连亦失败:', e);
        }

        // 当远程接口未开放 /models（如 404）时，返回空列表并提示自由输入
        return {
            success: true,
            models: [],
            is_fallback: true,
            message: `远程接口未提供 /models 查询列表 (${backendError.message})，请直接在输入框中填入您要使用的模型名称`
        };
    }
}

/**
 * 填充模型 Datalist 自动补全建议列表
 */
function populateModelDatalist(datalistId, inputId, models) {
    const datalist = document.getElementById(datalistId);
    const input = document.getElementById(inputId);
    if (!datalist) return;

    datalist.innerHTML = '';
    models.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model;
        datalist.appendChild(opt);
    });

    if (input && !input.value.trim() && models.length > 0) {
        input.value = models[0];
    }
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
        const input = document.getElementById('setting-llm-model');

        if (!apiUrl) {
            showNotification('请先填写 LLM API 地址', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = '🔄 获取中...';

        try {
            const res = await fetchLLMModels(apiUrl, apiKey);
            const models = res.models || [];

            populateModelDatalist('setting-llm-model-list', 'setting-llm-model', models);

            if (res.is_fallback) {
                showNotification(res.message || '远程接口未提供 /models 列表，您可直接在输入框中填入模型名称', 'info');
            } else {
                showNotification(`成功获取到 ${models.length} 个可用模型，已加入输入建议`, 'success');
            }
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
        if (!model) {
            showNotification('请先填入模型名称', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = '🧪 测试中...';

        try {
            const response = await fetch(`${API_BASE}/llm/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_url: apiUrl,
                    api_key: apiKey,
                    model: model
                })
            });

            const data = await response.json();
            if (response.ok && data.status === 'success') {
                showNotification('LLM 连接测试成功！', 'success');
            } else {
                showNotification(`连接失败: ${data.message || data.detail || '未知错误'}`, 'error');
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
                const res = await fetchLLMModels(apiUrl, apiKey);
                const models = res.models || [];

                populateModelDatalist('setting-analysis-llm-model-list', 'setting-analysis-llm-model', models);

                if (res.is_fallback) {
                    showNotification(res.message || '远程接口未提供 /models 列表，您可直接在输入框中填入模型名称', 'info');
                } else {
                    showNotification(`成功获取到 ${models.length} 个分析模型，已加入输入建议`, 'success');
                }
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
            if (!model) {
                showNotification('请先填入模型名称', 'warning');
                return;
            }

            testBtn.disabled = true;
            testBtn.textContent = '🧪 测试中...';

            try {
                const response = await fetch(`${API_BASE}/llm/test`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        api_url: apiUrl,
                        api_key: apiKey,
                        model: model
                    })
                });

                const data = await response.json();
                if (response.ok && data.status === 'success') {
                    showNotification('分析引擎 LLM 连接测试成功！', 'success');
                } else {
                    showNotification(`连接失败: ${data.message || data.detail || '未知错误'}`, 'error');
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

export const DEFAULT_TEXT_REPLACEMENTS = {
    "操我": "肏我",
    "操你": "肏你",
    "我操": "我肏",
    "卧槽": "卧肏",
    "重重地": "虫虫地",
    "行了": "形了",
    "行的": "形得",
    "干嘛": "干麻",
    "噢": "哦",
    "3Q": "谢谢",
    "666": "溜溜溜",
    "233": "哈哈哈"
};

/**
 * 渲染文本替换规则 UI 列表
 */
export function renderTextReplacementsUI(replacementsMap = {}) {
    const container = document.getElementById('text-replacements-container');
    if (!container) return;

    container.innerHTML = '';
    const entries = Object.entries(replacementsMap);

    if (entries.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; font-size:12px; text-align:center; padding:10px;">暂无替换规则，点击上方「➕ 添加替换词」添加</div>';
        return;
    }

    entries.forEach(([oldWord, newWord]) => {
        const row = document.createElement('div');
        row.className = 'replacement-rule-row';
        row.style.cssText = 'display:flex; gap:8px; align-items:center; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);';
        row.innerHTML = `
            <input type="text" class="input rep-old-input" value="${escapeHtml(oldWord)}" style="flex:1; padding:4px 8px; font-size:12px;" placeholder="原词 (如 操我)">
            <span style="color:#38bdf8; font-size:12px; font-weight:bold;">➔</span>
            <input type="text" class="input rep-new-input" value="${escapeHtml(newWord)}" style="flex:1; padding:4px 8px; font-size:12px; color:#a7f3d0;" placeholder="替换为 (如 肏我)">
            <button type="button" class="btn btn-danger btn-delete-rep-row" style="padding:2px 6px; font-size:11px;">🗑️</button>
        `;

        row.querySelector('.btn-delete-rep-row').addEventListener('click', () => {
            row.remove();
            if (container.children.length === 0) {
                container.innerHTML = '<div style="color:#94a3b8; font-size:12px; text-align:center; padding:10px;">暂无替换规则，点击上方「➕ 添加替换词」添加</div>';
            }
        });

        container.appendChild(row);
    });
}

/**
 * 收集当前配置的文本替换词字典
 */
export function collectTextReplacements() {
    const replacements = {};
    document.querySelectorAll('.replacement-rule-row').forEach(row => {
        const oldInput = row.querySelector('.rep-old-input');
        const newInput = row.querySelector('.rep-new-input');
        if (oldInput && newInput) {
            const oldVal = oldInput.value.trim();
            const newVal = newInput.value.trim();
            if (oldVal) {
                replacements[oldVal] = newVal;
            }
        }
    });
    return replacements;
}

/**
 * 绑定文本替换词库按钮操作
 */
export function bindTextReplacementControls() {
    const addBtn = document.getElementById('btn-add-replacement-rule');
    const resetBtn = document.getElementById('btn-reset-replacements');
    const container = document.getElementById('text-replacements-container');

    if (addBtn && container) {
        addBtn.addEventListener('click', () => {
            // 清理占位空提示
            if (container.querySelector('.replacement-rule-row') === null) {
                container.innerHTML = '';
            }

            const row = document.createElement('div');
            row.className = 'replacement-rule-row';
            row.style.cssText = 'display:flex; gap:8px; align-items:center; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);';
            row.innerHTML = `
                <input type="text" class="input rep-old-input" value="" style="flex:1; padding:4px 8px; font-size:12px;" placeholder="原词 (如 操我)">
                <span style="color:#38bdf8; font-size:12px; font-weight:bold;">➔</span>
                <input type="text" class="input rep-new-input" value="" style="flex:1; padding:4px 8px; font-size:12px; color:#a7f3d0;" placeholder="替换为 (如 肏我)">
                <button type="button" class="btn btn-danger btn-delete-rep-row" style="padding:2px 6px; font-size:11px;">🗑️</button>
            `;

            row.querySelector('.btn-delete-rep-row').addEventListener('click', () => {
                row.remove();
                if (container.children.length === 0) {
                    container.innerHTML = '<div style="color:#94a3b8; font-size:12px; text-align:center; padding:10px;">暂无替换规则，点击上方「➕ 添加替换词」添加</div>';
                }
            });

            container.prepend(row);
            row.querySelector('.rep-old-input').focus();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            renderTextReplacementsUI(DEFAULT_TEXT_REPLACEMENTS);
            showNotification('已恢复官方推荐的常用发音/多音字替换词库', 'info');
        });
    }
}

/**
 * 绑定 MiniMax 云端连接测试按钮
 */
export function bindTestMiniMaxButton() {
    const btn = document.getElementById('test-minimax-connection-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const apiKey = document.getElementById('setting-minimax-api-key')?.value.trim();
        const groupId = document.getElementById('setting-minimax-group-id')?.value.trim();
        const apiUrl = document.getElementById('setting-minimax-api-url')?.value.trim();
        const resEl = document.getElementById('test-minimax-connection-result');

        if (!apiKey) {
            showNotification('请先填写 MiniMax API Key', 'warning');
            if (resEl) {
                resEl.textContent = '❌ 请先填写 MiniMax API Key';
                resEl.style.color = '#ef4444';
            }
            return;
        }

        btn.disabled = true;
        btn.textContent = '🔄 测试中...';
        if (resEl) {
            resEl.textContent = '正在连接 MiniMax 开放平台...';
            resEl.style.color = '#9ca3af';
        }

        try {
            const resp = await fetch(`${API_BASE}/tts/minimax/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: apiKey, group_id: groupId, api_url: apiUrl })
            });
            const data = await resp.json();
            if (data.success) {
                showNotification(data.message, 'success');
                if (resEl) {
                    resEl.textContent = `✅ ${data.message}`;
                    resEl.style.color = '#10b981';
                }
            } else {
                showNotification(data.message, 'error');
                if (resEl) {
                    resEl.textContent = `❌ ${data.message}`;
                    resEl.style.color = '#ef4444';
                }
            }
        } catch (e) {
            showNotification(`连接失败: ${e.message}`, 'error');
            if (resEl) {
                resEl.textContent = `❌ 请求异常: ${e.message}`;
                resEl.style.color = '#ef4444';
            }
        } finally {
            btn.disabled = false;
            btn.textContent = '⚡ 测试 MiniMax API 连接';
        }
    });
}

/**
 * 绑定远程与穿透 Tab 控件逻辑 (Cloudflare 隧道 + Nginx 生成器)
 */
export function bindTunnelAndNginxControls() {
    const statusText = document.getElementById('tunnel-status-text');
    const statusIndicator = document.getElementById('tunnel-status-indicator');
    const startBtn = document.getElementById('btn-start-tunnel');
    const stopBtn = document.getElementById('btn-stop-tunnel');
    const refreshBtn = document.getElementById('btn-refresh-tunnel');
    const urlContainer = document.getElementById('tunnel-url-container');
    const urlInput = document.getElementById('tunnel-public-url-input');
    const copyUrlBtn = document.getElementById('btn-copy-tunnel-url');

    const updateTunnelUI = (isRunning, publicUrl) => {
        if (isRunning && publicUrl) {
            if (statusIndicator) statusIndicator.style.background = '#10b981';
            if (statusText) statusText.textContent = `🟢 隧道运行中: ${publicUrl}`;
            if (urlContainer) urlContainer.style.display = 'block';
            if (urlInput) urlInput.value = publicUrl;
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
        } else if (isRunning && !publicUrl) {
            if (statusIndicator) statusIndicator.style.background = '#f59e0b';
            if (statusText) statusText.textContent = '⏳ 隧道正在建立握手中...';
            if (urlContainer) urlContainer.style.display = 'none';
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
        } else {
            if (statusIndicator) statusIndicator.style.background = '#9ca3af';
            if (statusText) statusText.textContent = '⚪ 隧道未运行';
            if (urlContainer) urlContainer.style.display = 'none';
            if (startBtn) startBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'none';
        }
    };

    const fetchTunnelStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/system/tunnel/status`);
            if (res.ok) {
                const data = await res.json();
                updateTunnelUI(data.is_running, data.public_url);
            }
        } catch (e) {
            console.error('获取隧道状态失败:', e);
        }
    };

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            startBtn.disabled = true;
            startBtn.textContent = '⏳ 启动中...';
            try {
                const res = await fetch(`${API_BASE}/system/tunnel/start`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showNotification('Cloudflare 隧道已发起，正在获取公网地址...', 'info');
                    // 轮询 3 次状态
                    let attempts = 0;
                    const timer = setInterval(async () => {
                        attempts++;
                        await fetchTunnelStatus();
                        if (attempts >= 8) clearInterval(timer);
                    }, 1500);
                } else {
                    showNotification(data.message || '启动失败', 'error');
                }
            } catch (err) {
                showNotification(`请求失败: ${err.message}`, 'error');
            } finally {
                startBtn.disabled = false;
                startBtn.textContent = '🚀 开启公网隧道';
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE}/system/tunnel/stop`, { method: 'POST' });
                updateTunnelUI(false, null);
                showNotification('Cloudflare 安全隧道已关闭', 'info');
            } catch (err) {
                showNotification(`关闭失败: ${err.message}`, 'error');
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchTunnelStatus();
            showNotification('已刷新隧道状态', 'info');
        });
    }

    if (copyUrlBtn && urlInput) {
        copyUrlBtn.addEventListener('click', () => {
            if (urlInput.value) {
                navigator.clipboard.writeText(urlInput.value);
                showNotification('已成功复制公网直连 URL！可在酒馆插件直接填入', 'success');
            }
        });
    }

    // 初次加载拉取一次状态
    fetchTunnelStatus();

    // 2. Nginx 配置生成器绑定
    const enableSslSelect = document.getElementById('nginx-enable-ssl');
    const sslFields = document.getElementById('nginx-ssl-fields');
    const generateNginxBtn = document.getElementById('btn-generate-nginx');
    const nginxResultBox = document.getElementById('nginx-result-box');
    const nginxTextarea = document.getElementById('nginx-config-textarea');
    const copyNginxBtn = document.getElementById('btn-copy-nginx');

    if (enableSslSelect && sslFields) {
        enableSslSelect.addEventListener('change', () => {
            sslFields.style.display = enableSslSelect.value === 'true' ? 'block' : 'none';
        });
    }

    if (generateNginxBtn) {
        generateNginxBtn.addEventListener('click', async () => {
            const domain = document.getElementById('nginx-domain-input').value.trim() || 'tts.example.com';
            const enableSsl = enableSslSelect ? enableSslSelect.value === 'true' : true;
            const certPath = document.getElementById('nginx-ssl-cert-input')?.value.trim();
            const keyPath = document.getElementById('nginx-ssl-key-input')?.value.trim();
            const port = parseInt(document.getElementById('setting-manager-port')?.value) || 3000;

            generateNginxBtn.disabled = true;
            generateNginxBtn.textContent = '⏳ 生成中...';

            try {
                const res = await fetch(`${API_BASE}/system/tunnel/generate_nginx`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domain: domain,
                        local_port: port,
                        enable_ssl: enableSsl,
                        ssl_cert_path: certPath,
                        ssl_key_path: keyPath
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (nginxResultBox) nginxResultBox.style.display = 'block';
                    if (nginxTextarea) nginxTextarea.value = data.config;
                    showNotification('Nginx 配置文件已成功生成！', 'success');
                } else {
                    showNotification('生成失败', 'error');
                }
            } catch (err) {
                showNotification(`生成异常: ${err.message}`, 'error');
            } finally {
                generateNginxBtn.disabled = false;
                generateNginxBtn.textContent = '✨ 一键生成 Nginx 完整配置文件';
            }
        });
    }

    if (copyNginxBtn && nginxTextarea) {
        copyNginxBtn.addEventListener('click', () => {
            if (nginxTextarea.value) {
                navigator.clipboard.writeText(nginxTextarea.value);
                showNotification('已复制 Nginx 配置到剪贴板！', 'success');
            }
        });
    }
}

/**
 * 绑定安全设置中的密码/Token 生成器
 */
export function bindSecurityControls() {
    const genPassBtn = document.getElementById('btn-gen-admin-pass');
    const genTokenBtn = document.getElementById('btn-gen-api-token');
    const passInput = document.getElementById('setting-security-admin-password');
    const tokenInput = document.getElementById('setting-security-api-token');

    const generateRandomStr = (len) => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
        let str = '';
        for (let i = 0; i < len; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return str;
    };

    if (genPassBtn && passInput) {
        genPassBtn.addEventListener('click', () => {
            const pass = generateRandomStr(12);
            passInput.value = pass;
            passInput.type = 'text'; // 生成后短暂明文展示给用户记录
            showNotification('已生成随机管理员密码 (请保存配置并记下)', 'info');
        });
    }

    if (genTokenBtn && tokenInput) {
        genTokenBtn.addEventListener('click', () => {
            const token = 'st_sec_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            tokenInput.value = token;
            showNotification('已生成高强度 API Token (请保存配置并填入酒馆)', 'info');
        });
    }
}

