const BARS_HTML = `<span class='sovits-voice-waves'><span class='sovits-voice-bar'></span><span class='sovits-voice-bar'></span><span class='sovits-voice-bar'></span></span>`;

// HTML 属性转义函数，防止特殊字符破坏 HTML 结构
function escapeHtmlAttr(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export const TTS_Parser = {
    htmlCache: {},
    /**
     * 外部/扩展格式解析器字典 (formatId -> handler)
     */
    customParsers: new Map(),

    /**
     * 注册自定义/扩展正文格式解析器 (如双语格式、特殊四字段格式)
     * @param {string} formatId - 格式唯一标识 (如 'bilingual_v3', 'custom_tts')
     * @param {Function} handler - 接收 (html, context) 返回修改后的 html
     */
    registerParser(formatId, handler) {
        if (!formatId || typeof handler !== 'function') {
            console.error('[TTS_Parser] 注册 Parser 失败: 无效的 formatId 或 handler');
            return;
        }
        this.customParsers.set(formatId, handler);
        console.log(`[TTS_Parser] ✅ 成功注册扩展正文解析器: ${formatId}`);
    },

    init() {
        console.log("✅ [Parser] DOM 解析器已加载 (ElevenLabs V3 + Observer 模式)");
        this.startObserver();
        this.bindQuickActionEvents();
    },

    startObserver() {
        if (this.observer) return;
        this.observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (let mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    shouldScan = true;
                    break;
                }
            }
            if (shouldScan) {
                this._executeScan();
            }
        });
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    },

    scan() {
        this._executeScan();
    },

    /**
     * 绑定新角色快捷操作事件 (绑定音色 / 跳过)
     */
    bindQuickActionEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;

        // 绑定音色点击
        $(document).on('click', '.tts-btn-bind-quick', function (e) {
            e.stopPropagation();
            const speaker = $(this).attr('data-speaker');
            if (!speaker) return;

            TTS_Parser.openQuickBindModal(speaker);
        });

        // 跳过角色点击
        $(document).on('click', '.tts-btn-skip-quick', function (e) {
            e.stopPropagation();
            const speaker = $(this).attr('data-speaker');
            if (!speaker) return;

            if (window.TTS_PromptInjector && window.TTS_PromptInjector.skipSpeaker) {
                window.TTS_PromptInjector.skipSpeaker(speaker);
            }
            if (window.TTS_Utils && window.TTS_Utils.showNotification) {
                window.TTS_Utils.showNotification(`已将角色 "${speaker}" 加入跳过列表 (List 2)`, 'info');
            }

            // 移除该标签或转换为纯文本
            $(`.tts-new-speaker-badge[data-speaker="${escapeHtmlAttr(speaker)}"]`).fadeOut(200, function() {
                $(this).remove();
            });
        });
    },

    /**
     * 打开新角色快捷绑定弹窗
     * @param {string} speakerName 
     */
    openQuickBindModal(speakerName) {
        const CACHE = window.TTS_State ? window.TTS_State.CACHE : {};
        const models = CACHE.models || {};
        const modelKeys = Object.keys(models);

        const { presetVoices, customVoices } = (window.TTS_Utils && typeof window.TTS_Utils.getAllMiniMaxVoices === 'function')
            ? window.TTS_Utils.getAllMiniMaxVoices()
            : { presetVoices: [], customVoices: [] };

        if (modelKeys.length === 0 && presetVoices.length === 0 && customVoices.length === 0) {
            if (window.TTS_Utils && window.TTS_Utils.showNotification) {
                window.TTS_Utils.showNotification("未发现可用的语音模型或音色", "error");
            }
            return;
        }

        // 移除旧弹窗
        $('#tts-quick-bind-modal').remove();

        let optionsHtml = '';
        const currentBound = (CACHE.mappings && CACHE.mappings[speakerName]) ? CACHE.mappings[speakerName] : '';

        if (modelKeys.length > 0) {
            optionsHtml += '<optgroup label="📁 本地 GPT-SoVITS 模型">';
            optionsHtml += modelKeys.map(k => {
                const isSelected = currentBound ? (currentBound === k) : (k.toLowerCase().includes(speakerName.toLowerCase()) || speakerName.toLowerCase().includes(k.toLowerCase()));
                return `<option value="${escapeHtmlAttr(k)}" ${isSelected ? 'selected' : ''}>🎙️ ${escapeHtmlAttr(k)}</option>`;
            }).join('');
            optionsHtml += '</optgroup>';
        }

        if (customVoices.length > 0) {
            optionsHtml += '<optgroup label="✨ 我的自定义克隆音色">';
            optionsHtml += customVoices.map(v => {
                const val = `minimax:${v.id}`;
                const isSelected = currentBound === val;
                return `<option value="${escapeHtmlAttr(val)}" ${isSelected ? 'selected' : ''}>✨ ${escapeHtmlAttr(v.name)} (${escapeHtmlAttr(v.id)})</option>`;
            }).join('');
            optionsHtml += '</optgroup>';
        }

        optionsHtml += '<optgroup label="☁️ MiniMax 官方预设声线">';
        optionsHtml += presetVoices.map(v => {
            const val = `minimax:${v.id}`;
            const isSelected = currentBound === val;
            return `<option value="${escapeHtmlAttr(val)}" ${isSelected ? 'selected' : ''}>☁️ ${escapeHtmlAttr(v.name)} (${escapeHtmlAttr(v.id)})</option>`;
        }).join('');
        optionsHtml += '<option value="__custom_minimax__">✏️ 新增自定义 MiniMax 音色 (输入名称与 ID)...</option>';
        optionsHtml += '</optgroup>';

        const modalHtml = `
            <div id="tts-quick-bind-modal" class="tts-quick-modal-overlay">
                <div class="tts-quick-modal-content">
                    <div class="tts-quick-modal-header">
                        <h3>🎙️ 绑定音色: <span class="highlight">${escapeHtmlAttr(speakerName)}</span></h3>
                        <button class="tts-modal-close" onclick="$('#tts-quick-bind-modal').remove()">✕</button>
                    </div>
                    <div class="tts-quick-modal-body">
                        <label>选择语音模型 / 音色:</label>
                        <select id="tts-quick-model-select" class="tts-quick-select">
                            ${optionsHtml}
                        </select>
                        <div id="tts-quick-custom-voice-wrap" style="display:none; margin-top:10px; background:rgba(0,0,0,0.2); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1);">
                            <label style="font-size:12px; color:#fde047; display:block; margin-bottom:4px;">音色自定义备注名称:</label>
                            <input type="text" id="tts-quick-custom-voice-name" class="tts-quick-select" placeholder="例如: 傲娇大小姐 / 赛博警探" style="margin-bottom:8px;">
                            
                            <label style="font-size:12px; color:#fde047; display:block; margin-bottom:4px;">MiniMax Voice ID (官方/克隆音色 ID):</label>
                            <input type="text" id="tts-quick-custom-voice-input" class="tts-quick-select" placeholder="例如: female-shaonv 或 custom_voice_12345">
                            <small style="color:#aaa; font-size:11px; display:block; margin-top:4px;">💡 绑定后将自动保存至自定义音色库，后续角色可直接下拉选择。</small>
                        </div>
                        <p class="tts-hint-text" style="margin-top:8px;">绑定后，该角色后续发言将自动注入情绪标签并驱动语音合成。</p>
                    </div>
                    <div class="tts-quick-modal-footer">
                        <button class="tts-btn-secondary" onclick="$('#tts-quick-bind-modal').remove()">取消</button>
                        <button id="tts-btn-confirm-quick-bind" class="tts-btn-primary">立即绑定</button>
                    </div>
                </div>
            </div>
        `;

        $('body').append(modalHtml);

        $('#tts-quick-model-select').on('change', function () {
            if ($(this).val() === '__custom_minimax__') {
                $('#tts-quick-custom-voice-wrap').slideDown(150);
                $('#tts-quick-custom-voice-name').focus();
            } else {
                $('#tts-quick-custom-voice-wrap').slideUp(150);
            }
        });

        $('#tts-btn-confirm-quick-bind').on('click', async function () {
            let selectedModel = $('#tts-quick-model-select').val();
            if (!selectedModel) return;

            if (selectedModel === '__custom_minimax__') {
                let customId = $('#tts-quick-custom-voice-input').val().trim();
                let customName = $('#tts-quick-custom-voice-name').val().trim();
                if (!customId) {
                    if (window.TTS_Utils && window.TTS_Utils.showNotification) {
                        window.TTS_Utils.showNotification('请输入 MiniMax Voice ID', 'warning');
                    }
                    return;
                }
                const rawId = customId.startsWith('minimax:') ? customId.slice(8) : (customId.startsWith('minimax_') ? customId.slice(8) : customId);
                selectedModel = `minimax:${rawId}`;

                if (window.TTS_Utils && typeof window.TTS_Utils.saveCustomMiniMaxVoice === 'function') {
                    await window.TTS_Utils.saveCustomMiniMaxVoice(rawId, customName || rawId);
                }
            }

            try {
                if (window.TTS_API && typeof window.TTS_API.bindCharacter === 'function') {
                    await window.TTS_API.bindCharacter(speakerName, selectedModel);
                }

                if (!CACHE.mappings) CACHE.mappings = {};
                CACHE.mappings[speakerName] = selectedModel;

                // 从跳过列表中移除 (若存在)
                if (window.TTS_PromptInjector) {
                    window.TTS_PromptInjector.unskipSpeaker(speakerName);
                    window.TTS_PromptInjector.refreshAndInject();
                }

                if (window.TTS_Utils && window.TTS_Utils.showNotification) {
                    window.TTS_Utils.showNotification(`成功绑定 "${speakerName}" -> "${selectedModel}"`, 'info');
                }

                $('#tts-quick-bind-modal').remove();

                // 重新扫描页面以应用新绑定的气泡状态
                if (TTS_Parser.scan) TTS_Parser.scan();
                if (window.TTS_Scheduler && window.TTS_Scheduler.scanAndSchedule) {
                    setTimeout(() => window.TTS_Scheduler.scanAndSchedule(), 100);
                }
            } catch (err) {
                console.error('[QuickBind] 绑定失败:', err);
                if (window.TTS_Utils && window.TTS_Utils.showNotification) {
                    window.TTS_Utils.showNotification(`绑定失败: ${err.message}`, 'error');
                }
            }
        });
    },

    // 供 Scheduler 调用的状态更新函数
    updateState() {
        const CACHE = window.TTS_State ? window.TTS_State.CACHE : { audioMemory: {}, pendingTasks: new Set() };

        const _doUpdate = ($container) => {
            $container.find('.voice-bubble.loading').each(function () {
                const $btn = $(this);
                const key = $btn.attr('data-key');

                if (key && CACHE.audioMemory[key]) {
                    $btn.removeClass('loading');
                    $btn.attr('data-status', 'ready');
                    $btn.attr('data-audio-url', CACHE.audioMemory[key]);

                    if (window.TTS_Parser.htmlCache && window.TTS_Parser.htmlCache[key]) {
                        delete window.TTS_Parser.htmlCache[key];
                    }
                }
            });
        };

        // 更新主界面
        _doUpdate($('body'));

        // 更新 Iframe 内部 (仅在开启 iframe_mode 时执行)
        if (CACHE.settings && CACHE.settings.iframe_mode === true) {
            $('iframe').each(function () {
                try {
                    const $iframeBody = $(this).contents().find('body');
                    if ($iframeBody.length > 0) _doUpdate($iframeBody);
                } catch (e) { }
            });
        }
    },

    _executeScan() {
        const CACHE = window.TTS_State ? window.TTS_State.CACHE : {};
        const TTS_Utils = window.TTS_Utils;
        const Scheduler = window.TTS_Scheduler;

        if (CACHE.settings && CACHE.settings.enabled === false) return;

        const isIframeMode = CACHE.settings && CACHE.settings.iframe_mode === true;
        const currentCSS = TTS_Utils ? TTS_Utils.getStyleContent() : '';
        const activeStyle = (CACHE.settings && CACHE.settings.bubble_style) || localStorage.getItem('tts_bubble_style') || 'default';

        // 辅助函数：构建语音条 HTML
        const buildBubbleHtml = (cleanName, cleanEmotion, cleanText) => {
            const isBound = Boolean(CACHE.mappings && CACHE.mappings[cleanName]);
            const key = Scheduler.getTaskKey(cleanName, cleanText);
            let status = 'waiting';
            let dataUrlAttr = '';
            let loadingClass = '';
            let unboundClass = isBound ? '' : 'unbound';

            if (CACHE.audioMemory && CACHE.audioMemory[key]) {
                status = 'ready';
                dataUrlAttr = `data-audio-url='${CACHE.audioMemory[key]}'`;
            } else if (CACHE.pendingTasks && CACHE.pendingTasks.has(key)) {
                status = 'queued';
                loadingClass = 'loading';
            }
            // 按照文字字数精确计算预估时长：中文/日文按字数预估，自适应宽度
            const textLen = cleanText ? cleanText.length : 1;
            const d = Math.max(2, Math.ceil(textLen * 0.25));
            const bubbleWidth = Math.min(220, 60 + d * 10);

            const safeKey = escapeHtmlAttr(key);
            const safeText = escapeHtmlAttr(cleanText);
            const safeName = escapeHtmlAttr(cleanName);
            const safeEmotion = escapeHtmlAttr(cleanEmotion);
            const unboundHint = isBound ? '' : ' title="未绑定音色，点击快速绑定"';

            return `<span class="voice-bubble ${loadingClass} ${unboundClass}"
                style="width: ${bubbleWidth}px"
                data-status="${status}" data-key="${safeKey}" ${dataUrlAttr} data-text="${safeText}"
                data-voice-name="${safeName}" data-voice-emotion="${safeEmotion}"${unboundHint}>
                ${BARS_HTML}
                <span class="sovits-voice-duration">${d}"</span>
            </span>`;
        };

        const parseTextToBubbles = (html) => {
            if (!html || typeof html !== 'string') return html;

            let modifiedHtml = html;

            // 0. 串联执行已注册的外部扩展解析器 (如双语格式、多角色特殊格式)
            if (TTS_Parser.customParsers && TTS_Parser.customParsers.size > 0) {
                for (const [id, handler] of TTS_Parser.customParsers.entries()) {
                    try {
                        const parsed = handler(modifiedHtml, {
                            buildBubbleHtml,
                            CACHE,
                            escapeHtmlAttr,
                            isSkippedSpeaker: (spk) => window.TTS_PromptInjector && window.TTS_PromptInjector.getSkippedSpeakers().includes(spk)
                        });
                        if (typeof parsed === 'string') {
                            modifiedHtml = parsed;
                        }
                    } catch (e) {
                        console.error(`[TTS_Parser] 扩展解析器 [${id}] 执行异常:`, e);
                    }
                }
            }

            // 1. 解析 [新角色, New] 或 【新角色, new】 -> 渲染发现态交互卡片
            const NEW_SPEAKER_REGEX = /[\[【]([^\],:【】\[\]\n]{1,30})\s*[,，]\s*(?:New|new)[\]】](?:\s*[:：]?\s*([^[\n<]+))?/gi;
            if (NEW_SPEAKER_REGEX.test(modifiedHtml)) {
                NEW_SPEAKER_REGEX.lastIndex = 0;
                modifiedHtml = modifiedHtml.replace(NEW_SPEAKER_REGEX, (match, speaker, spokenText) => {
                    const cleanSpeaker = speaker.trim();
                    // 排除纯数字或系统保留字
                    if (/^\d+$/.test(cleanSpeaker) || /^(?:ONSTAGE|RECALL|ARCHIVE|FLOOR|STATUS|SYS|VAR|STAGE|SYSTEM)$/i.test(cleanSpeaker)) {
                        return match;
                    }
                    const textPart = spokenText ? ` ${spokenText}` : '';
                    const safeSpeaker = escapeHtmlAttr(cleanSpeaker);

                    // 检查是否已经在 List 2 (跳过列表) 中
                    if (window.TTS_PromptInjector && window.TTS_PromptInjector.getSkippedSpeakers().includes(cleanSpeaker)) {
                        return textPart;
                    }

                    return `<span class="tts-new-speaker-badge" data-speaker="${safeSpeaker}">
                        <span class="tts-badge-icon">✨</span>
                        <span class="tts-badge-title">新登场: <b>${safeSpeaker}</b></span>
                        <button class="tts-btn-bind-quick" data-speaker="${safeSpeaker}">绑定音色</button>
                        <button class="tts-btn-skip-quick" data-speaker="${safeSpeaker}">跳过</button>
                    </span>${textPart}`;
                });
            }

            // 2. 解析 ElevenLabs V3 格式: [Speaker, emotion] 或 【Speaker, emotion】
            // 采用稳健的“标签定位 + 后文对白窥探 + 智能防误伤”机制
            const TAG_REGEX = /[\[【]([^\],:【】\[\]\n]{1,30})\s*[,，]\s*([^\]】\n]{1,30})[\]】]/g;
            let result = '';
            let lastIndex = 0;
            let match;
            let matchedV3 = false;

            // 获取已知角色列表用于白名单与优先级匹配
            const knownSpeakers = new Set();
            if (CACHE.mappings) {
                Object.keys(CACHE.mappings).forEach(k => {
                    if (k && k.trim()) knownSpeakers.add(k.trim().toLowerCase());
                });
            }
            try {
                if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
                    const ctx = window.SillyTavern.getContext();
                    if (ctx.characters && ctx.characterId !== undefined && ctx.characters[ctx.characterId]) {
                        const name = ctx.characters[ctx.characterId].name;
                        if (name && name.trim()) knownSpeakers.add(name.trim().toLowerCase());
                    }
                    if (ctx.name2 && String(ctx.name2).trim()) {
                        knownSpeakers.add(String(ctx.name2).trim().toLowerCase());
                    }
                }
            } catch (e) { }

            // 排除常见的系统状态/数据库/缝合怪关键词
            const SYSTEM_KEYWORDS_REGEX = /^(?:ONSTAGE|RECALL|ARCHIVE|FLOOR|STATUS|SYS|VAR|STAGE|SYSTEM|CONFIG|DATA|MEMORY|DATABASE|DEBUG|INFO|ERROR|WARN|TAG|SETTING|VALUE|VARIABLE)$/i;

            while ((match = TAG_REGEX.exec(modifiedHtml)) !== null) {
                const fullTag = match[0];
                const rawName = match[1];
                const rawEmotion = match[2];
                const tagIndex = match.index;
                const tagEnd = tagIndex + fullTag.length;

                const cleanName = rawName.trim();
                const cleanEmotion = rawEmotion.trim();
                const cleanNameLower = cleanName.toLowerCase();
                const cleanEmotionLower = cleanEmotion.toLowerCase();

                // 过滤保留字与 New
                if (cleanEmotionLower === 'new' || cleanNameLower.startsWith('tts')) {
                    continue;
                }

                // 🌟 【防误伤规则 1】：排除系统/变量/数字/符号数据标签
                // - 情绪字段包含数字、冒号、斜杠、加减号、百分号（如 0, 力量:10, 100/100, +5）
                // - 角色名命中全大写系统关键字（如 ONSTAGE, RECALL, ARCHIVE, FLOOR, VAR 等）
                // - 角色名全为纯数字
                if (
                    /\d|[:：\+\-\/\\%=><]/.test(cleanEmotion) ||
                    SYSTEM_KEYWORDS_REGEX.test(cleanName) ||
                    /^\d+$/.test(cleanName) ||
                    cleanEmotion.length > 20
                ) {
                    continue; // 这是其它插件的数据或系统标签，坚决不碰！
                }

                // 检查是否在跳过列表中
                if (window.TTS_PromptInjector && window.TTS_PromptInjector.getSkippedSpeakers().includes(cleanName)) {
                    continue;
                }

                // 向后窥探对白内容 (Peek following text)
                const afterText = modifiedHtml.slice(tagEnd);
                let spokenText = '';
                let isQuoted = false;

                // ① 越过标签与开头可能存在的 HTML 标签（如 </p><p>、<em>、<br> 等）、冒号与空白字符
                const stripped = afterText.replace(/^(?:<[^>]+>|[:：\s]|\&nbsp;)+/gi, '');

                if (stripped) {
                    // ② 引号对白优先匹配（支持中文全角引号、英文双引号、日文引号、HTML 实体引号）
                    const quoteMatch = stripped.match(/^(?:([“"「『]|&ldquo;|&quot;|&#8220;)([\s\S]*?)([”"」』]|&rdquo;|&quot;|&#8221;))/i);
                    if (quoteMatch && quoteMatch[2]) {
                        spokenText = quoteMatch[2].replace(/<[^>]+>|&lt;[^&]+&gt;|&nbsp;/g, ' ').trim();
                        isQuoted = true;
                    }

                    // ③ 普通文本匹配 (如果没有使用引号包裹，只有当角色名属于已知绑定/在场角色时才提取到下一个标签/换行为止)
                    if (!spokenText && (knownSpeakers.has(cleanNameLower) || knownSpeakers.size === 0)) {
                        const plainMatch = stripped.match(/^([^<\[【\n\r]+)/);
                        if (plainMatch && plainMatch[1]) {
                            const candidate = plainMatch[1].replace(/&nbsp;/g, ' ').trim();
                            // 避免把空文本或单个符号当台词
                            if (candidate && candidate.length > 1) {
                                spokenText = candidate;
                            }
                        }
                    }
                }

                // 🌟 【防误伤规则 2】：如果既没有引号对白，名字又不是已知角色，则判定为普通文本或系统数据，直接跳过
                if (!spokenText || (!isQuoted && !knownSpeakers.has(cleanNameLower))) {
                    continue;
                }

                matchedV3 = true;
                result += modifiedHtml.slice(lastIndex, tagIndex);
                lastIndex = tagEnd;

                const d = Math.max(2, Math.ceil(spokenText.length * 0.25));
                console.log(`🎙️ [Direct-TTS 解析日志] 匹配标签: "${fullTag}" -> 角色: "${cleanName}", 情绪: "${cleanEmotion}", 提取台词: "${spokenText}" (${spokenText.length}字, 预估时长: ${d}秒)`);

                const bubbleHtml = buildBubbleHtml(cleanName, cleanEmotion, spokenText);
                result += bubbleHtml;
            }

            if (matchedV3) {
                result += modifiedHtml.slice(lastIndex);
                modifiedHtml = result;
            }

            // 3. 向下兼容旧版 [TTSVoice:Speaker:emotion:text] 格式
            const LEGACY_REGEX = /(\s*)\[TTSVoice[:：]\s*([^:：]+)\s*[:：]\s*([^:：]*)\s*[:：]\s*(.*?)\]/gi;
            if (LEGACY_REGEX.test(modifiedHtml)) {
                LEGACY_REGEX.lastIndex = 0;
                modifiedHtml = modifiedHtml.replace(LEGACY_REGEX, (match, spaceChars, name, emotion, text) => {
                    if (!text) return match;
                    const cleanName = name.trim();
                    const cleanEmotion = emotion.trim() || 'default';
                    const cleanText = text.replace(/<[^>]+>|&lt;[^&]+&gt;/g, '').trim();
                    if (!cleanText) return match;

                    const prefix = spaceChars || '';
                    const bubbleHtml = buildBubbleHtml(cleanName, cleanEmotion, cleanText);
                    return `${prefix}${bubbleHtml}`;
                });
            }

            return modifiedHtml;
        };

        // 统一扫描主界面与全部 iframe
        if (currentCSS && $('#sovits-iframe-style-main').length === 0) {
            $('head').append(`<style id='sovits-iframe-style-main'>${currentCSS}</style>`);
        }
        if (document.body.getAttribute('data-bubble-style') !== activeStyle) {
            document.body.setAttribute('data-bubble-style', activeStyle);
        }

        // 扫描主界面消息容器
        $('.mes_text, .message-body, .markdown-content, #chat .mes_text, .mes .text').each(function () {
            const $this = $(this);
            const html = $this.html();
            if (!html || (!html.includes('[') && !html.includes('【'))) return;

            const newHtml = parseTextToBubbles(html);
            if (newHtml !== html) {
                $this.html(newHtml);
                if (CACHE.settings && CACHE.settings.auto_generate) {
                    setTimeout(() => Scheduler.scanAndSchedule(), 100);
                }
            }
        });

        // 扫描所有 iframe (严格受 iframe_mode 开关控制，默认不侵入其他扩展 iframe)
        if (isIframeMode) {
            $('iframe').each(function () {
                try {
                    const $iframe = $(this);
                    const doc = $iframe.contents();
                    const head = doc.find('head');
                    const body = doc.find('body');

                    if (currentCSS && head.length > 0 && head.find('#sovits-iframe-style').length === 0) {
                        head.append(`<style id='sovits-iframe-style'>${currentCSS}</style>`);
                    }
                    if (body.attr('data-bubble-style') !== activeStyle) {
                        body.attr('data-bubble-style', activeStyle);
                    }

                    if (!body.data('tts-event-bound')) {
                        body.on('click', '.voice-bubble', function (e) {
                            e.stopPropagation();
                            const $this = $(this);
                            window.top.postMessage({
                                type: 'play_tts',
                                key: $this.attr('data-key'),
                                text: $this.attr('data-text'),
                                charName: $this.attr('data-voice-name'),
                                emotion: $this.attr('data-voice-emotion')
                            }, '*');
                        });
                        body.data('tts-event-bound', true);
                    }

                    // 仅扫描可能包含消息内容的容器，避免无差别破坏 iframe 全局结构
                    const targets = body.find('.mes_text, .message-body, .markdown-content, #chat .mes_text, .mes .text');
                    targets.each(function () {
                        const $this = $(this);
                        const html = $this.html();
                        if (!html || (!html.includes('[') && !html.includes('【'))) return;
                        const newHtml = parseTextToBubbles(html);
                        if (newHtml !== html) {
                            $this.html(newHtml);
                            if (CACHE.settings && CACHE.settings.auto_generate) {
                                setTimeout(() => Scheduler.scanAndSchedule(), 100);
                            }
                        }
                    });
                } catch (e) { }
            });
        }
    }
};
