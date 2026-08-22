/**
 * 剧本工坊官方标准出厂模板与快捷插槽字典
 */
export const DEFAULT_WORKSHOP_TEMPLATES = {
    phone_call: {
        plot: `你是一个沉浸式剧情编剧。角色 {{caller}} 正在主动拨打电话联系 {{target}}。\n\n**呼叫背景与动机**:\n- 发起角色: {{caller}}\n- 接听对象: {{target}}\n- 传讯事由: {{call_reason}}\n- 情绪基调: {{call_tone}}\n\n**剧本创作核心要求与铁律**:\n1. 【深度剧情锚定 (严禁割裂)】: 必须仔细阅读【近期对话上下文】！通话内容严禁脱离当前故事主线凭空闲聊，必须自然承接最新剧情（如：两人刚分开的场景、未聊完的话题、刚经历的事件、提及的物品或约定）。将「{{call_reason}}」作为情感/行动契机融入对话中。\n2. 【单向通话/独角戏 (严禁假装互动)】: 这是一段单向来电/独白，接听方 {{target}} 在此阶段不会有任何语音回应。绝对禁止自导自演假装听到对方说话并自我回应（严禁出现“啊？你说什么？……哦，这样啊”等虚假互动），必须保持单向倾诉、询问或叙述的自然连贯口语感。\n3. 【口语真实感与人设】: 真实还原通话的呼吸感与口语质感，开头有符合双方关系与当前情境的称呼与问候，语言风格严格符合其性格人设与背景设定。\n4. speaker 字段必须为 {{caller}}。\n{{followup_call_instructions}}`,
        system: `**可用角色与情绪:**\n{{speakers_emotions}}\n\n**近期对话上下文:**\n{{context}}\n\n**角色卡人设与世界书设定**:\n- 角色人设: {{character_persona}}\n- 世界观设定: {{world_info}}\n\n**上次通话摘要** (若有):\n{{last_call_summary}}\n\n**⚠️ 纯语音输出铁律 (TTS 规范)**:\n1. text 字段只能包含**可朗读的纯台词文本**，严禁包含任何动作描述、括号心理活动或非台词字符（如 \`（叹气）\`、\`（看向窗外）\`、\`*笑*\`）。\n2. **【情绪标签严格闭环】**: 每个 segment 的 \`emotion\` 字段值**必须 100% 严格从上述【可用角色与情绪】列表中选取**，严禁自行编造或臆造列表中不存在的情绪词（若无对应情绪，使用 default 或 neutral）。\n\n**输出格式 (严格 JSON)**:\n\`\`\`json\n{\n  "speaker": "{{caller}}",\n  "segments": [\n    {\n      "emotion": "必须从可用情绪列表中选取",\n      "text": "纯对话内容，**必须使用{{lang_display}}**",\n      "translation": "中文翻译 (必填，若已是中文则一致)",\n      "pause_after": 0.4,\n      "speed": 1.0,\n      "filler_word": null\n    }\n  ]\n}\n\`\`\`\n\n生成 10-15 个具有真实生活感的情感片段。`
    },
    eavesdrop: {
        plot: `你是一个创意编剧，正在编写参与角色 {{speakers}} 之间的私下对话。\n\n**剧情主题与基调**:\n- 讨论主题: {{theme}}\n- 剧情起因: {{call_reason}}\n- 氛围张力: {{call_tone}}\n\n**剧本创作核心要求与铁律**:\n1. 【深度剧情锚定 (严禁割裂)】: 必须仔细阅读【对话历史参考】！角色私下谈话必须紧密结合刚才发生的剧情、主角刚才的举动或当前共同面临的环境，紧扣「{{theme}}」与「{{call_reason}}」展开。\n2. 【多人交替互动】: 参与角色自然交替说话，展现角色私底下对彼此的真实看法、心声或不为人知的秘密，避免一人垄断台词。\n3. 【性格人设与口吻】: 每个角色的说话风格严格符合其性格人设与背景设定，情绪自然起伏过渡。`,
        system: `**参与角色及其可用情绪**:\n{{speakers_emotions}}\n\n**对话历史参考**:\n{{context}}\n\n**角色卡与世界书背景**:\n- 角色人设: {{character_persona}}\n- 世界书背景: {{world_info}}\n\n**⚠️ 纯语音输出铁律 (TTS 规范)**:\n1. text 字段只能包含**纯台词**，严禁包含任何动作描述、括号心理活动或旁白。\n2. **【情绪标签严格闭环】**: 每个 segment 的 \`emotion\` 字段值**必须 100% 严格从该角色对应的【可用情绪列表】中选取**，严禁自行编造或臆造列表中不存在的情绪词。\n\n**输出格式 (严格 JSON)**:\n\`\`\`json\n{\n  "scene_description": "场景描述",\n  "segments": [\n    {\n      "speaker": "角色名 (必须是参与角色之一)",\n      "emotion": "必须从该角色的可用情绪列表中选取",\n      "text": "纯对话内容，无任何括号或动作描述，**必须使用{{lang_display}}**",\n      "translation": "中文翻译 (必填)",\n      "pause_after": 0.5\n    }\n  ]\n}\n\`\`\`\n\n生成 10-25 个对话片段，让参与角色自然交替说话。`
    }
};

export const QUICK_MOTIVATIONS = {
    phone_call: ["深夜想念与挂念", "突发险情与紧急示警", "日常分享与问候", "吃醋试探与质问", "秘密商量与约定", "生病求助与探望"],
    eavesdrop: ["商议秘密行动与情报", "暗中争执与彼此试探", "讨论当前局势与隐患", "私下交流吐槽"]
};

export const WORKSHOP_SLOTS = {
    phone_call: {
        plot: ["{{caller}}", "{{target}}", "{{receiver}}", "{{call_reason}}", "{{call_tone}}", "{{followup_call_instructions}}"],
        system: ["{{context}}", "{{character_persona}}", "{{world_info}}", "{{speakers_emotions}}", "{{lang_display}}", "{{last_call_summary}}", "{{story_summary}}"]
    },
    eavesdrop: {
        plot: ["{{speakers}}", "{{theme}}", "{{call_reason}}", "{{call_tone}}"],
        system: ["{{context}}", "{{character_persona}}", "{{world_info}}", "{{speakers_emotions}}", "{{lang_display}}", "{{last_call_summary}}", "{{story_summary}}"]
    }
};

/**
 * 获取当前活跃主题在弹窗中的主题隔离类名列表
 * 完整支持内置主题 (default, deathly_hallows) 以及未来任何导入/新建的第三方自定义主题
 */
export function getWorkshopModalThemeClass() {
    const engine = (window.TTS_Libs && window.TTS_Libs.ThemeEngine) || window.TTS_ThemeEngine;
    const currentTheme = (engine && typeof engine.getCurrentTheme === 'function') 
        ? engine.getCurrentTheme() 
        : { id: ($('#tts-dh-modal').length && $('#tts-dh-modal').is(':visible')) ? 'deathly_hallows' : 'default' };
    
    const id = currentTheme?.id || 'default';
    const isBuiltin = !currentTheme?.type || currentTheme?.type === 'builtin';

    const classes = [`ws-theme-${id}`];
    if (id === 'deathly_hallows') classes.push('ws-theme-dh');
    if (id === 'default') classes.push('ws-theme-default');
    if (!isBuiltin) classes.push('ws-theme-custom');

    return classes.join(' ');
}

