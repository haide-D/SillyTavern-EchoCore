/**
 * Direct-TTS 系统级提示词注入引擎 (Prompt Injector)
 * 
 * 核心职责:
 * 1. 维护三态说话人列表与情感约束场景库:
 *    - List 1: 已绑定角色 (Bound Speakers) 及其各自的情绪标签池 + 场景注释
 *    - List 2: 已跳过角色 (Skipped Speakers, 普通文本输出无标签)
 *    - 发现态: 新角色 (New Characters -> [Name, New])
 * 2. 支持完全自定义 Prompt 模版与插槽变量替换
 * 3. 规范化注入 ElevenLabs V3 格式指令与情感防突变约束
 */

// 默认内置全局情感场景与注释知识库
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

// 默认标准提示词模板 (支持插槽变量)
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

export const PromptInjector = {
    // 扩展提示词唯一标识
    EXTENSION_PROMPT_KEY: 'st_direct_tts_elevenlabs_v3',
    
    // 当前分支跳过的说话人集合
    skippedSpeakers: new Set(),
    
    // 当前分支已绑定角色信息缓存: { charName: [emotion1, emotion2, ...] }
    boundSpeakersMap: {},

    // 情感场景与注释字典: { "panting": "仅限剧烈运动/疲惫", ... }
    emotionAnnotations: { ...DEFAULT_EMOTION_ANNOTATIONS },

    // 自定义提示词模板 (如果为空则使用 DEFAULT_PROMPT_TEMPLATE)
    customTemplate: '',

    // 注入器开关与配置
    enabled: true,

    /**
     * 初始化提示词注入器
     */
    init() {
        console.log('🎙️ [PromptInjector] 初始化系统级提示词与情感约束注入引擎...');
        this._loadStorage();
        this.refreshAndInject();
    },

    /**
     * 从 LocalStorage / 插件配置加载设置
     */
    _loadStorage() {
        try {
            // 1. 跳过列表
            const rawSkipped = localStorage.getItem('tts_skipped_speakers');
            if (rawSkipped) {
                const list = JSON.parse(rawSkipped);
                if (Array.isArray(list)) this.skippedSpeakers = new Set(list);
            }

            // 2. 自定义模板
            const customTpl = localStorage.getItem('tts_custom_prompt_template');
            if (customTpl) {
                this.customTemplate = customTpl;
            }

            // 3. 情感注释字典
            const rawAnnotations = localStorage.getItem('tts_emotion_annotations');
            if (rawAnnotations) {
                const parsed = JSON.parse(rawAnnotations);
                if (parsed && typeof parsed === 'object') {
                    this.emotionAnnotations = { ...DEFAULT_EMOTION_ANNOTATIONS, ...parsed };
                }
            }
        } catch (e) {
            console.error('[PromptInjector] 加载本地配置失败:', e);
        }
    },

    /**
     * 保存自定义模板
     */
    setCustomTemplate(templateText) {
        this.customTemplate = templateText || '';
        if (this.customTemplate.trim()) {
            localStorage.setItem('tts_custom_prompt_template', this.customTemplate);
        } else {
            localStorage.removeItem('tts_custom_prompt_template');
        }
        this.refreshAndInject();
    },

    /**
     * 重置模板为默认
     */
    resetTemplate() {
        this.setCustomTemplate('');
    },

    /**
     * 更新某个情感的场景注释
     */
    setEmotionAnnotation(emotion, annotation) {
        if (!emotion) return;
        const cleanEmo = emotion.trim().toLowerCase();
        if (annotation && annotation.trim()) {
            this.emotionAnnotations[cleanEmo] = annotation.trim();
        } else {
            delete this.emotionAnnotations[cleanEmo];
        }
        localStorage.setItem('tts_emotion_annotations', JSON.stringify(this.emotionAnnotations));
        this.refreshAndInject();
    },

    /**
     * 批量更新情感注释字典
     */
    setAllEmotionAnnotations(annotationsMap) {
        if (annotationsMap && typeof annotationsMap === 'object') {
            this.emotionAnnotations = { ...DEFAULT_EMOTION_ANNOTATIONS, ...annotationsMap };
            localStorage.setItem('tts_emotion_annotations', JSON.stringify(this.emotionAnnotations));
            this.refreshAndInject();
        }
    },

    /**
     * 重置情感注释为官方默认
     */
    resetEmotionAnnotations() {
        this.emotionAnnotations = { ...DEFAULT_EMOTION_ANNOTATIONS };
        localStorage.removeItem('tts_emotion_annotations');
        this.refreshAndInject();
    },

    /**
     * 添加说话人到跳过列表 (进入 List 2)
     */
    skipSpeaker(speakerName) {
        if (!speakerName) return;
        const clean = speakerName.trim();
        this.skippedSpeakers.add(clean);
        localStorage.setItem('tts_skipped_speakers', JSON.stringify(Array.from(this.skippedSpeakers)));
        this.refreshAndInject();
    },

    /**
     * 从跳过列表中移除说话人
     */
    unskipSpeaker(speakerName) {
        if (!speakerName) return;
        const clean = speakerName.trim();
        if (this.skippedSpeakers.delete(clean)) {
            localStorage.setItem('tts_skipped_speakers', JSON.stringify(Array.from(this.skippedSpeakers)));
            this.refreshAndInject();
        }
    },

    getSkippedSpeakers() {
        return Array.from(this.skippedSpeakers);
    },

    /**
     * 刷新在场绑定角色、提取各角色专属情绪池，并编译注入 Prompt
     */
    refreshAndInject() {
        if (!this.enabled) {
            this._clearExtensionPrompt();
            return;
        }

        const state = window.TTS_State;
        if (!state || !state.CACHE) {
            return;
        }

        // 同步服务端配置中的 prompt_injector
        if (state.CACHE.settings && state.CACHE.settings.prompt_injector) {
            const pi = state.CACHE.settings.prompt_injector;
            if (pi.custom_template && !localStorage.getItem('tts_custom_prompt_template')) {
                this.customTemplate = pi.custom_template;
            }
            if (pi.emotion_annotations && typeof pi.emotion_annotations === 'object') {
                this.emotionAnnotations = { ...DEFAULT_EMOTION_ANNOTATIONS, ...pi.emotion_annotations };
            }
        }

        const mappings = state.CACHE.mappings || {};
        const modelsData = state.CACHE.models || {};

        // 1. 获取当前主角色名称 (Primary Character)
        let primaryChar = '';
        try {
            if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
                const ctx = window.SillyTavern.getContext();
                if (ctx.characters && ctx.characterId !== undefined && ctx.characters[ctx.characterId]) {
                    primaryChar = (ctx.characters[ctx.characterId].name || '').trim();
                } else if (ctx.name2) {
                    primaryChar = String(ctx.name2).trim();
                }
            }
        } catch (e) {
            console.warn('[PromptInjector] 获取主角色名失败:', e);
        }

        // 2. 构建 List 1: 已绑定角色及其情绪词池
        const boundMap = {};
        for (const [charName, modelName] of Object.entries(mappings)) {
            if (!charName || !modelName) continue;
            const cleanChar = charName.trim();
            
            if (this.skippedSpeakers.has(cleanChar)) continue;

            const modelConfig = modelsData[modelName];
            const emotionsSet = new Set(['default']);

            if (modelConfig && modelConfig.languages) {
                for (const langConfig of Object.values(modelConfig.languages)) {
                    if (Array.isArray(langConfig)) {
                        langConfig.forEach(ref => {
                            if (ref && ref.emotion) emotionsSet.add(ref.emotion.trim());
                        });
                    }
                }
            }

            boundMap[cleanChar] = Array.from(emotionsSet);
        }

        this.boundSpeakersMap = boundMap;

        // 3. 编译强力通用的提示词
        const promptText = this.buildPromptDirective(boundMap, Array.from(this.skippedSpeakers), primaryChar);

        // 4. 注入到 SillyTavern
        this._injectIntoSillyTavern(promptText);
    },

    /**
     * 编译注入指令（支持插槽变量替换与情感场景注释）
     */
    buildPromptDirective(boundMap, skippedList, primaryChar = '') {
        const boundEntries = Object.entries(boundMap);
        
        let boundSection = '';
        if (boundEntries.length > 0) {
            boundSection = boundEntries.map(([char, emotions]) => {
                const emotionLines = emotions.map(emo => {
                    const cleanEmo = emo.trim().toLowerCase();
                    const desc = this.emotionAnnotations[cleanEmo] || this.emotionAnnotations[emo] || '';
                    if (desc) {
                        return `       * ${emo}: ${desc}`;
                    }
                    return `       * ${emo}`;
                }).join('\n');
                return `   - **${char}** (Available emotions & constraints):\n${emotionLines}`;
            }).join('\n');
        } else {
            boundSection = '   (None currently bound - see Rule 4 below)';
        }

        let skippedSection = '';
        if (skippedList && skippedList.length > 0) {
            skippedSection = `   - [${skippedList.join(', ')}]`;
        } else {
            skippedSection = '   (None)';
        }

        const primaryCharNote = primaryChar ? `- Current Active Character: "${primaryChar}" (Ensure consistent naming if speaking).` : '';

        // 获取模板（优先使用用户自定义模板，否则使用默认）
        const template = (this.customTemplate && this.customTemplate.trim()) ? this.customTemplate : DEFAULT_PROMPT_TEMPLATE;

        // 插槽替换
        return template
            .replace(/\{\{primary_character_note\}\}/g, primaryCharNote)
            .replace(/\{\{bound_characters_section\}\}/g, boundSection)
            .replace(/\{\{skipped_characters_section\}\}/g, skippedSection)
            .trim();
    },

    /**
     * 向 SillyTavern 注入 Extension Prompt
     * @private
     */
    _injectIntoSillyTavern(promptText) {
        if (!promptText) return;

        try {
            if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
                const context = window.SillyTavern.getContext();
                if (typeof context.setExtensionPrompt === 'function') {
                    context.setExtensionPrompt(
                        this.EXTENSION_PROMPT_KEY,
                        promptText,
                        1, // IN_PROMPT (作为系统指令注入提示词)
                        1, // Depth 1 (紧贴当前上下文底部，确保大模型高度遵从)
                        false,
                        false,
                        0 // SYSTEM ROLE
                    );
                    return;
                }
            }

            if (typeof window.setExtensionPrompt === 'function') {
                window.setExtensionPrompt(
                    this.EXTENSION_PROMPT_KEY,
                    promptText,
                    1,
                    1,
                    false,
                    false,
                    0
                );
            }
        } catch (e) {
            console.error('[PromptInjector] ❌ 注入提示词失败:', e);
        }
    },

    /**
     * 清除注入的扩展提示词
     * @private
     */
    _clearExtensionPrompt() {
        try {
            if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
                const context = window.SillyTavern.getContext();
                if (typeof context.setExtensionPrompt === 'function') {
                    context.setExtensionPrompt(this.EXTENSION_PROMPT_KEY, '', 1, 1, false, false, 0);
                }
            }
        } catch (e) {
            console.error('[PromptInjector] 清除提示词失败:', e);
        }
    }
};
