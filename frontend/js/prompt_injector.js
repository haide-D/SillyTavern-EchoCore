/**
 * Direct-TTS 系统级提示词注入引擎 (Prompt Injector)
 * 
 * 核心职责:
 * 1. 维护三态说话人列表:
 *    - List 1: 已绑定角色 (Bound Speakers) 及其各自的情绪标签池
 *    - List 2: 已跳过角色 (Skipped Speakers, 普通文本输出无标签)
 *    - 发现态: 新角色 (New Characters -> [Name, New])
 * 2. 在 LLM 生成前通过 SillyTavern 扩展 API 自动注入 ElevenLabs V3 格式指令
 * 3. 彻底免除用户在酒馆主预设中编写复杂生成规则的依赖
 */

export const PromptInjector = {
    // 扩展提示词唯一标识
    EXTENSION_PROMPT_KEY: 'st_direct_tts_elevenlabs_v3',
    
    // 当前分支跳过的说话人集合 (持久化到 localStorage/数据库)
    skippedSpeakers: new Set(),
    
    // 当前分支已绑定角色信息缓存: { charName: [emotion1, emotion2, ...] }
    boundSpeakersMap: {},

    // 注入器开关与配置
    enabled: true,

    /**
     * 初始化提示词注入器
     */
    init() {
        console.log('🎙️ [PromptInjector] 初始化 ElevenLabs V3 提示词注入引擎...');
        this._loadSkippedSpeakers();
        this.refreshAndInject();
    },

    /**
     * 从 LocalStorage 加载已跳过的说话人列表
     */
    _loadSkippedSpeakers() {
        try {
            const raw = localStorage.getItem('tts_skipped_speakers');
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    this.skippedSpeakers = new Set(list);
                }
            }
        } catch (e) {
            console.error('[PromptInjector] 加载跳过角色列表失败:', e);
            this.skippedSpeakers = new Set();
        }
    },

    /**
     * 保存跳过的说话人列表到 LocalStorage
     */
    _saveSkippedSpeakers() {
        try {
            localStorage.setItem('tts_skipped_speakers', JSON.stringify(Array.from(this.skippedSpeakers)));
        } catch (e) {
            console.error('[PromptInjector] 保存跳过角色列表失败:', e);
        }
    },

    /**
     * 添加说话人到跳过列表 (进入 List 2)
     * @param {string} speakerName 
     */
    skipSpeaker(speakerName) {
        if (!speakerName) return;
        const clean = speakerName.trim();
        this.skippedSpeakers.add(clean);
        this._saveSkippedSpeakers();
        this.refreshAndInject();
        console.log(`[PromptInjector] ⏭️ 已将角色 "${clean}" 加入跳过列表 (List 2)`);
    },

    /**
     * 从跳过列表中移除说话人
     * @param {string} speakerName 
     */
    unskipSpeaker(speakerName) {
        if (!speakerName) return;
        const clean = speakerName.trim();
        if (this.skippedSpeakers.delete(clean)) {
            this._saveSkippedSpeakers();
            this.refreshAndInject();
            console.log(`[PromptInjector] 🔄 已从跳过列表中移除角色 "${clean}"`);
        }
    },

    /**
     * 获取当前所有跳过的角色
     * @returns {Array<string>}
     */
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
            
            // 跳过已在 List 2 的角色
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

        // 3. 编译强力通用的 ElevenLabs V3 提示词
        const promptText = this.buildPromptDirective(boundMap, Array.from(this.skippedSpeakers), primaryChar);

        // 4. 注入到 SillyTavern
        this._injectIntoSillyTavern(promptText);
    },

    /**
     * 编译通用强力 ElevenLabs V3 格式指令
     * @param {Object} boundMap - { "角色名": ["default", "happy", ...] }
     * @param {Array<string>} skippedList - ["角色A", "路人B"]
     * @param {string} primaryChar - 当前主角色名
     * @returns {string} 编译后的指令字符串
     */
    buildPromptDirective(boundMap, skippedList, primaryChar = '') {
        const boundEntries = Object.entries(boundMap);
        
        let boundSection = '';
        if (boundEntries.length > 0) {
            boundSection = boundEntries.map(([char, emotions]) => {
                return `   - ${char}: [${emotions.join(', ')}]`;
            }).join('\n');
        } else {
            boundSection = '   (None currently bound - see Rule 3 below)';
        }

        let skippedSection = '';
        if (skippedList && skippedList.length > 0) {
            skippedSection = `   - [${skippedList.join(', ')}]`;
        } else {
            skippedSection = '   (None)';
        }

        const primaryCharNote = primaryChar ? `\n- Current Active Character: "${primaryChar}" (Ensure consistent naming if speaking).` : '';

        return `
[Voice Synthesis & Dialogue Protocol]
You must format spoken dialogue according to the following strict rules:${primaryCharNote}

### Core Rules:
1. **Character Naming Consistency (Crucial)**:
   - Each character MUST maintain a single, consistent, official name across the entire reply and conversation.
   - NEVER switch, alternate, or use temporary pronouns/titles/nicknames in place of the character's exact name. (Every line spoken by the same character must use the identical Character_Name prefix).

2. **Dialogue Tagging Format**:
   - Place voice tags immediately before direct spoken quotes: \`[Character_Name, emotion] "Spoken dialogue..."\` or \`[Character_Name, emotion] “对白内容……”\`
   - Narration, environmental descriptions, internal thoughts, and action beats must be written as regular text outside the tag. NEVER put non-spoken narration inside or as the sole content of the tag.

3. **Speaker Categories**:
   - **List 1: Bound Voice Characters** (Must use corresponding emotion tag):
${boundSection}
   - **List 2: Skipped Characters** (Plain text only, NO voice tag):
${skippedSection}
   - **List 3: New / Unbound Characters** (Anyone NOT listed above):
     Format: \`[New_Character_Name, New] "Spoken dialogue..."\` (Keep name consistent on subsequent lines).

### Demonstrations:
- ✅ Correct:
  She stepped out of the room and looked up with a smile.
  [Alice, happy] "Hello there! Nice to meet you."
  She tilted her head playfully.
  [Alice, playful] "What do you think of this outfit?"
- ❌ Forbidden:
  [Alice, happy] She stepped out of the room and smiled. (Error: putting narration into speech tag)
  [Assistant, happy] "Hello!" (Error: switching or inventing alternative names for the same person)
`.trim();
    },

    /**
     * 向 SillyTavern 注入 Extension Prompt
     * @private
     */
    _injectIntoSillyTavern(promptText) {
        if (!promptText) return;

        try {
            // 方式 1: 使用 SillyTavern getContext().setExtensionPrompt API (标准推荐)
            if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
                const context = window.SillyTavern.getContext();
                if (typeof context.setExtensionPrompt === 'function') {
                    // 参数: id, value, position (0=in-chat, 1=in-prompt), depth (0-based), scan, run_on_edit, role
                    // position: 1 (IN_PROMPT), depth: 1, role: 0 (SYSTEM)
                    context.setExtensionPrompt(
                        this.EXTENSION_PROMPT_KEY,
                        promptText,
                        1, // IN_PROMPT (作为系统指令注入提示词)
                        1, // Depth 1 (紧贴当前上下文底部，确保大模型高度遵从)
                        false,
                        false,
                        0 // SYSTEM ROLE
                    );
                    console.log('[PromptInjector] ✅ 已通过 setExtensionPrompt 成功注入 ElevenLabs V3 指令');
                    return;
                }
            }

            // 方式 2: 使用全局 setExtensionPrompt (若存在)
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
                console.log('[PromptInjector] ✅ 已通过 window.setExtensionPrompt 注入');
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
