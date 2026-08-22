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

        if (modelKeys.length === 0) {
            if (window.TTS_Utils && window.TTS_Utils.showNotification) {
                window.TTS_Utils.showNotification("未发现可用的 GPT-SoVITS 语音模型", "error");
            }
            return;
        }

        // 移除旧弹窗
        $('#tts-quick-bind-modal').remove();

        const optionsHtml = modelKeys.map(k => {
            const isMatch = k.toLowerCase().includes(speakerName.toLowerCase()) || speakerName.toLowerCase().includes(k.toLowerCase());
            return `<option value="${escapeHtmlAttr(k)}" ${isMatch ? 'selected' : ''}>${escapeHtmlAttr(k)}</option>`;
        }).join('');

        const modalHtml = `
            <div id="tts-quick-bind-modal" class="tts-quick-modal-overlay">
                <div class="tts-quick-modal-content">
                    <div class="tts-quick-modal-header">
                        <h3>🎙️ 绑定音色: <span class="highlight">${escapeHtmlAttr(speakerName)}</span></h3>
                        <button class="tts-modal-close" onclick="$('#tts-quick-bind-modal').remove()">✕</button>
                    </div>
                    <div class="tts-quick-modal-body">
                        <label>选择已有 GPT-SoVITS 模型:</label>
                        <select id="tts-quick-model-select" class="tts-quick-select">
                            ${optionsHtml}
                        </select>
                        <p class="tts-hint-text">绑定后，该角色后续发言将自动注入情绪标签并驱动语音合成。</p>
                    </div>
                    <div class="tts-quick-modal-footer">
                        <button class="tts-btn-secondary" onclick="$('#tts-quick-bind-modal').remove()">取消</button>
                        <button id="tts-btn-confirm-quick-bind" class="tts-btn-primary">立即绑定</button>
                    </div>
                </div>
            </div>
        `;

        $('body').append(modalHtml);

        $('#tts-btn-confirm-quick-bind').on('click', async function () {
            const selectedModel = $('#tts-quick-model-select').val();
            if (!selectedModel) return;

            try {
                if (window.TTS_API && window.TTS_API.saveMapping) {
                    const currentMappings = Object.assign({}, CACHE.mappings || {});
                    currentMappings[speakerName] = selectedModel;
                    
                    await window.TTS_API.saveMapping(currentMappings);
                    CACHE.mappings = currentMappings;

                    // 从跳过列表中移除 (若存在)
                    if (window.TTS_PromptInjector) {
                        window.TTS_PromptInjector.unskipSpeaker(speakerName);
                        window.TTS_PromptInjector.refreshAndInject();
                    }

                    if (window.TTS_Utils && window.TTS_Utils.showNotification) {
                        window.TTS_Utils.showNotification(`成功绑定 "${speakerName}" -> "${selectedModel}"`, 'info');
                    }

                    $('#tts-quick-bind-modal').remove();

                    // 重新扫描页面以应用新绑定的气泡
                    if (TTS_Parser.scan) TTS_Parser.scan();
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

        // 更新 Iframe 内部
        $('iframe').each(function () {
            try {
                const $iframeBody = $(this).contents().find('body');
                if ($iframeBody.length > 0) _doUpdate($iframeBody);
            } catch (e) { }
        });
    },

    _executeScan() {
        const CACHE = window.TTS_State ? window.TTS_State.CACHE : {};
        const TTS_Utils = window.TTS_Utils;
        const Scheduler = window.TTS_Scheduler;

        if (CACHE.settings && CACHE.settings.enabled === false) return;

        const isIframeMode = CACHE.settings && CACHE.settings.iframe_mode === true;
        const currentCSS = TTS_Utils ? TTS_Utils.getStyleContent() : '';
        const activeStyle = (CACHE.settings && CACHE.settings.bubble_style) || localStorage.getItem('tts_bubble_style') || 'default';

        const parseTextToBubbles = (html) => {
            if (!html || typeof html !== 'string') return html;

            let modifiedHtml = html;

            // 1. 解析 [新角色, New] 或 [新角色, new] -> 渲染发现态交互卡片
            const NEW_SPEAKER_REGEX = /\[([^\],:\n]{1,30})\s*[,，]\s*(?:New|new)\](?:\s*([^[\n<]+))?/gi;
            if (NEW_SPEAKER_REGEX.test(modifiedHtml)) {
                NEW_SPEAKER_REGEX.lastIndex = 0;
                modifiedHtml = modifiedHtml.replace(NEW_SPEAKER_REGEX, (match, speaker, spokenText) => {
                    const cleanSpeaker = speaker.trim();
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

            // 2. 解析 ElevenLabs V3 格式: [Speaker, emotion] 紧随对白
            // 排除 [TTSVoice...] 和 [Speaker, New]
            const V3_REGEX = /\[([^\],:\n]{1,30})\s*[,，]\s*([^\]\n]{1,30})\](?:\s*([^[\n<]+))?/gi;
            if (V3_REGEX.test(modifiedHtml)) {
                V3_REGEX.lastIndex = 0;
                modifiedHtml = modifiedHtml.replace(V3_REGEX, (match, name, emotion, text) => {
                    const cleanName = name.trim();
                    const cleanEmotion = emotion.trim();

                    // 过滤保留字与 New
                    if (cleanEmotion.toLowerCase() === 'new' || cleanName.toLowerCase().startsWith('tts')) {
                        return match;
                    }

                    // 检查是否在跳过列表中
                    if (window.TTS_PromptInjector && window.TTS_PromptInjector.getSkippedSpeakers().includes(cleanName)) {
                        return text ? text : '';
                    }

                    const cleanText = text ? text.replace(/<[^>]+>|&lt;[^&]+&gt;/g, '').trim() : '';
                    if (!cleanText) return match;

                    const key = Scheduler.getTaskKey(cleanName, cleanText);
                    let status = 'waiting';
                    let dataUrlAttr = '';
                    let loadingClass = '';
                    if (CACHE.audioMemory && CACHE.audioMemory[key]) {
                        status = 'ready';
                        dataUrlAttr = `data-audio-url='${CACHE.audioMemory[key]}'`;
                    } else if (CACHE.pendingTasks && CACHE.pendingTasks.has(key)) {
                        status = 'queued';
                        loadingClass = 'loading';
                    }
                    const d = Math.max(1, Math.ceil(cleanText.length * 0.25));
                    const bubbleWidth = Math.min(220, 60 + d * 10);

                    const safeKey = escapeHtmlAttr(key);
                    const safeText = escapeHtmlAttr(cleanText);
                    const safeName = escapeHtmlAttr(cleanName);
                    const safeEmotion = escapeHtmlAttr(cleanEmotion);

                    return `<span class="voice-bubble ${loadingClass}"
                        style="width: ${bubbleWidth}px"
                        data-status="${status}" data-key="${safeKey}" ${dataUrlAttr} data-text="${safeText}"
                        data-voice-name="${safeName}" data-voice-emotion="${safeEmotion}">
                        ${BARS_HTML}
                        <span class="sovits-voice-duration">${d}"</span>
                    </span> ${cleanText}`;
                });
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

                    const key = Scheduler.getTaskKey(cleanName, cleanText);
                    let status = 'waiting';
                    let dataUrlAttr = '';
                    let loadingClass = '';
                    if (CACHE.audioMemory && CACHE.audioMemory[key]) {
                        status = 'ready';
                        dataUrlAttr = `data-audio-url='${CACHE.audioMemory[key]}'`;
                    } else if (CACHE.pendingTasks && CACHE.pendingTasks.has(key)) {
                        status = 'queued';
                        loadingClass = 'loading';
                    }
                    const d = Math.max(1, Math.ceil(cleanText.length * 0.25));
                    const bubbleWidth = Math.min(220, 60 + d * 10);
                    const prefix = spaceChars || '';

                    const safeKey = escapeHtmlAttr(key);
                    const safeText = escapeHtmlAttr(cleanText);
                    const safeName = escapeHtmlAttr(cleanName);
                    const safeEmotion = escapeHtmlAttr(cleanEmotion);

                    return `${prefix}<span class="voice-bubble ${loadingClass}"
                        style="width: ${bubbleWidth}px"
                        data-status="${status}" data-key="${safeKey}" ${dataUrlAttr} data-text="${safeText}"
                        data-voice-name="${safeName}" data-voice-emotion="${safeEmotion}">
                        ${BARS_HTML}
                        <span class="sovits-voice-duration">${d}"</span>
                    </span>`;
                });
            }

            return modifiedHtml;
        };

        // IFRAME 模式处理
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

                    const targets = body.find('*').filter(function () {
                        if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'BUTTON'].includes(this.tagName)) return false;
                        let hasTargetText = false;
                        $(this).contents().each(function () {
                            if (this.nodeType === 3 && this.nodeValue && this.nodeValue.indexOf("[") !== -1) {
                                hasTargetText = true;
                                return false;
                            }
                        });
                        return hasTargetText;
                    });

                    targets.each(function () {
                        const $this = $(this);
                        const html = $this.html();
                        const newHtml = parseTextToBubbles(html);
                        if (newHtml !== html) {
                            $this.html(newHtml);
                            if (CACHE.settings && CACHE.settings.auto_generate) {
                                setTimeout(() => Scheduler.scanAndSchedule(), 100);
                            }
                        }
                    });
                } catch (e) { console.error(e); }
            });
        } else {
            // 普通模式
            if (currentCSS && $('#sovits-iframe-style-main').length === 0) {
                $('head').append(`<style id='sovits-iframe-style-main'>${currentCSS}</style>`);
            }
            if (document.body.getAttribute('data-bubble-style') !== activeStyle) {
                document.body.setAttribute('data-bubble-style', activeStyle);
            }

            $('.mes_text, .message-body, .markdown-content').each(function () {
                const $this = $(this);
                const html = $this.html();
                const newHtml = parseTextToBubbles(html);

                if (newHtml !== html) {
                    $this.html(newHtml);
                    if (CACHE.settings && CACHE.settings.auto_generate) {
                        setTimeout(() => Scheduler.scanAndSchedule(), 100);
                    }
                }
            });
        }
    }
};
