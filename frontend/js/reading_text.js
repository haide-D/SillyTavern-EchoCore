// 全文朗读协议与纯文本分段；不修改聊天原文。
export const READING_DEFAULTS = Object.freeze({
    autoDialogue: false,
    fulltextTemplate: false,
    enableEmotionalNarration: false,
    startMarker: '<tts-body>',
    endMarker: '</tts-body>',
    excludeTags: 'think,thinking,analysis,status,options,system',
    narrator: '',
    localStrategy: 'eager',
    paragraphPlayback: true,
    chunkLength: 240,
    firstChunkLength: 100,
});

export function getReadingSettings() {
    try {
        return { ...READING_DEFAULTS, ...JSON.parse(localStorage.getItem('tts_reading_settings') || '{}') };
    } catch { return { ...READING_DEFAULTS }; }
}

export function validateReadingSettings(settings) {
    if (settings.chunkLength !== undefined && (!Number.isInteger(settings.chunkLength) || settings.chunkLength < 120 || settings.chunkLength > 500)) {
        throw new Error('每段长度请选择 120–500 字符。');
    }
    if (settings.localStrategy !== undefined && !['eager', 'batch'].includes(settings.localStrategy)) {
        throw new Error('请选择本地朗读策略。');
    }
    const { startMarker, endMarker } = settings;
    if (!startMarker?.trim() || !endMarker?.trim() || startMarker === endMarker ||
        startMarker.includes(endMarker) || endMarker.includes(startMarker)) {
        throw new Error('正文起止标记必须非空、不同且不能相互包含。');
    }
    if (String(settings.excludeTags).split(/[,，\s]+/).filter(Boolean).some(tag => !/^[a-zA-Z][\w-]*$/.test(tag))) {
        throw new Error('排除标签请填写标签名，以逗号分隔，例如 think,status。');
    }
}

export function fulltextPrompt(settings) {
    return `[Full Story Reading Protocol]
{{primary_character_note}}
Write the COMPLETE story body, including ALL narration, action, internal monologue and dialogue, exactly once between these literal markers:
${settings.startMarker}
Complete story body here.
${settings.endMarker}
Never summarize or duplicate the story. Never nest or repeat these markers. Keep analysis, status panels, options, system notes, HTML/CSS/scripts and code OUTSIDE the body.
Inside the body use plain text. ${settings.enableEmotionalNarration ? 'Prefix each narration paragraph with [旁白, emotion] or [Narration, emotion]. Use default, happy, sad, angry, fear, whisper, excited; keep an emotion consistent across a paragraph or scene, do not fragment sentences or abruptly change emotions. Untagged narration remains default.' : 'Narration is untagged.'} Every spoken line uses [Exact_Character_Name, emotion] followed immediately by quoted speech: [Alice, happy] “Hello.”
Use matching quotes “…” or "…" or 「…」. Put action and narration outside the spoken quotes. Keep names consistent and emotions natural.
Bound characters and permitted emotions:
{{bound_characters_section}}
Other characters (including skipped characters) still use their exact name and the emotion default; include their complete dialogue.
Example body: ${settings.enableEmotionalNarration ? '[旁白, happy] ' : ''}She opened the door. [Alice, happy] “Hello.” Rain fell outside. [Bob, default] “Come in.”`;
}

export function extractBody(raw, settings) {
    validateReadingSettings(settings);
    const { startMarker, endMarker } = settings;
    const count = marker => raw.split(marker).length - 1;
    if (count(startMarker) !== 1 || count(endMarker) !== 1) {
        throw new Error('全文朗读需要唯一且完整的正文起止标记；请启用全文模板生成正文，或调整标记设置。');
    }
    const start = raw.indexOf(startMarker) + startMarker.length;
    const end = raw.indexOf(endMarker);
    if (end < start) throw new Error('正文起止标记顺序错误，已停止提取。');
    return raw.slice(start, end);
}

export function cleanBody(body, settings, Parser = DOMParser) {
    // 未闭合围栏保守删除至末尾；HTML 在惰性文档中解析，绝不注入页面。
    body = body.replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g, '');
    const excluded = new Set(('script,style,iframe,object,embed,svg,canvas,template,code,pre,details,button,input,select,textarea,think,thinking,analysis,status,options,system,' + settings.excludeTags)
        .split(/[,，\s]+/).filter(Boolean).map(tag => tag.toLowerCase()));
    // 排除区块损坏时拒绝播放，避免浏览器纠错把区块内容泄漏到正文。
    const stack = [];
    for (const match of body.matchAll(/<(\/?)([\w-]+)\b[^>]*>/g)) {
        const tag = match[2].toLowerCase();
        if (!excluded.has(tag) || /\/>$/.test(match[0]) || ['input', 'embed'].includes(tag)) continue;
        if (!match[1]) stack.push(tag);
        else if (stack.pop() !== tag) throw new Error('非正文排除标签未正确闭合，请先修正正文。');
    }
    if (stack.length) throw new Error('非正文排除标签未正确闭合，请先修正正文。');
    const doc = new Parser().parseFromString(body, 'text/html');
    for (const node of [...doc.body.querySelectorAll('*')]) {
        if (excluded.has(node.localName) || /(?:^|[\s_-])(status|options|analysis|thinking)(?:$|[\s_-])/i.test(`${node.id} ${node.className}`)) {
            node.remove();
        }
    }
    doc.body.querySelectorAll('br,p,div,li,h1,h2,h3,blockquote').forEach(node => node.append('\n'));
    return doc.body.textContent.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\(https?:\/\/[^)]*\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '').trim();
}

export function splitReadingText(text, maxLength = 350) {
    const chunks = [];
    let rest = text.trim();
    while (rest.length > maxLength) {
        const head = rest.slice(0, maxLength);
        let cut = Math.max(...['。', '！', '？', '；', '\n', '.', '!', '?', ' '].map(p => head.lastIndexOf(p) + 1));
        if (cut < maxLength / 3) cut = maxLength;
        // 不切断 UTF-16 代理对。
        if (/[\uD800-\uDBFF]/.test(rest[cut - 1])) cut--;
        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
    return chunks.filter(Boolean);
}

// Each request still returns a complete audio file. Short opening + paragraph
// boundaries reduce first-play latency without streaming or splitting audio tags.
export function splitReadingParagraphs(text, first = false, settings = {}) {
    const normalLimit = Math.max(120, Math.min(500, Number(settings.chunkLength) || 240));
    const firstLimit = Math.max(60, Math.min(normalLimit, Number(settings.firstChunkLength) || 100));
    const result = [];
    for (let rest of text.split(/\n+/).map(value => value.trim()).filter(Boolean)) {
        while (rest) {
            const limit = first && !result.length ? firstLimit : normalLimit;
            if (rest.length <= limit) { result.push(rest); break; }
            const head = rest.slice(0, limit);
            const endings = [...head.matchAll(/[。！？!?；;]|\.(?=\s)|\s/g)].map(match => match.index + 1);
            let cut = endings.filter(index => index >= Math.min(35, limit / 3)).at(-1) || limit;
            // Keep [audio tags] intact, even when a tag spans the proposed cut.
            const opening = rest.lastIndexOf('[', cut - 1);
            if (opening >= 0 && rest.indexOf(']', opening) >= cut) {
                cut = opening || rest.indexOf(']', opening) + 1;
            }
            if (cut <= 0) cut = limit;
            if (/[\uD800-\uDBFF]/.test(rest[cut - 1])) cut--;
            const chunk = rest.slice(0, cut).trim();
            if (chunk) result.push(chunk);
            rest = rest.slice(cut).trim();
        }
    }
    return result;
}

export function parseFulltext(text, narrator, mappings, settings = {}) {
    const segments = [];
    const tag = /[\[【]([^\],:【】\[\]\n]{1,30})\s*[,，]\s*([^\]】\n]{1,30})[\]】]/g;
    const pairs = { '“': '”', '"': '"', '「': '」', '『': '』' };
    const append = (sourceName, emotion, value, narration = false) => {
        const charName = narration || !mappings[sourceName] ? narrator : sourceName;
        const chunks = settings.paragraphPlayback === false ? splitReadingText(value)
            : splitReadingParagraphs(value, segments.length === 0, settings);
        for (const chunk of chunks) {
            segments.push({ charName, sourceName: narration ? '旁白' : sourceName, emotion: emotion === 'New' ? 'default' : emotion, text: chunk, fallback: !narration && !mappings[sourceName] });
        }
    };
    let narrationEmotion = 'default';
    let cursor = 0;
    let match;
    while ((match = tag.exec(text))) {
        append('', narrationEmotion, text.slice(cursor, match.index), true);
        if (/^(旁白|narration)$/i.test(match[1].trim())) {
            narrationEmotion = settings.enableEmotionalNarration ? match[2].trim() : 'default';
            cursor = tag.lastIndex;
            continue;
        }
        let start = tag.lastIndex;
        while (/\s/.test(text[start] || '') && start < text.length) start++;
        const close = pairs[text[start]];
        const end = close ? text.indexOf(close, start + 1) : -1;
        if (end < 0) throw new Error(`人物「${match[1].trim()}」的对白缺少配对引号，请先修正正文。`);
        append(match[1].trim(), match[2].trim(), text.slice(start + 1, end));
        narrationEmotion = 'default';
        cursor = end + 1;
        tag.lastIndex = cursor;
    }
    append('', narrationEmotion, text.slice(cursor), true);
    if (!segments.length) throw new Error('过滤后的正文为空，没有可朗读内容。');
    return segments;
}
