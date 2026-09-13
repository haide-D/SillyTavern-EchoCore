import { readingIcon, readingWave, readingButton, readingDialog, installReadingStyles } from './reading_ui.js';
import { FulltextRecording, recordingKey } from './fulltext_recording.js';
import { getReadingSettings, validateReadingSettings, extractBody, cleanBody, parseFulltext } from './reading_text.js';

export const TTS_Reading = {
    session: null,
    generation: null,
    seen: new Map(),
    restoredNodes: new WeakMap(),

    context() { return window.SillyTavern?.getContext(); },
    notify(message) { window.TTS_Utils.showNotification(message, 'warning'); },

    snapshot(id) {
        const ctx = this.context();
        const message = ctx?.chat?.[id];
        if (!message || message.is_user || message.is_system) throw new Error('请选择一条 AI 正文消息。');
        return { id, chat: ctx.chat, chatId: ctx.chatId, message, raw: message.mes, swipe: message.swipe_id };
    },

    valid(snapshot) {
        const ctx = this.context();
        const message = ctx?.chat?.[snapshot.id];
        return ctx?.chat === snapshot.chat && ctx?.chatId === snapshot.chatId &&
            message === snapshot.message && message?.mes === snapshot.raw && message?.swipe_id === snapshot.swipe;
    },

    setStatus(text = '') {
        const session = this.session;
        $('.tts-reading-bar').each((_, bar) => {
            const active = Number($(bar).closest('.mes').attr('mesid')) === this.activeMessageId;
            const playing = active && session?.phase === '播放' && !session.paused;
            $(bar).toggleClass('is-playing', !!playing);
            $(bar).find('.tts-r-meter').prop('hidden', !active || !text);
            $(bar).find('.tts-reading-status').text(active ? text : '');
            $(bar).find('.tts-reading-pause').prop('disabled', !active || !session)
                .attr({ title: session?.paused ? '继续' : '暂停', 'aria-label': session?.paused ? '继续' : '暂停' })
                .html(readingIcon(session?.paused ? 'play' : 'pause'));
            $(bar).find('.tts-reading-stop').prop('disabled', !active || !session);
        });
    },

    stop() {
        document.querySelectorAll('.tts-fulltext-player audio').forEach(audio => audio.pause());
        const session = this.session;
        this.session = null;
        if (session) {
            session.abort.abort();
            clearInterval(session.watch);
            session.resume?.();
        }
        window.TTS_Events.stopAudio();
        this.setStatus();
    },

    togglePause() {
        const session = this.session;
        if (!session) return;
        session.paused = !session.paused;
        if (session.paused) window.TTS_Events.pauseAudio();
        else { session.resume?.(); window.TTS_Events.resumeAudio(); }
        session.progress?.();
    },

    async start(snapshot, segments, label, recording = null) {
        if (!this.valid(snapshot)) { this.notify('消息已改变，请重新打开朗读。'); return; }
        if (window.TTS_State.CACHE.settings.enabled === false) { this.notify('请先开启 TTS。'); return; }
        if (!segments.length) { this.notify('当前消息没有可连续朗读的语音气泡。'); return; }
        const missing = [...new Set(segments.filter(s => !window.TTS_State.CACHE.mappings[s.charName]).map(s => s.charName || '旁白'))];
        if (missing.length) { this.notify(`请先绑定音色：${missing.join('、')}。旁白在朗读设置中选择。`); return; }
        this.stop();
        const scheduler = window.TTS_Scheduler;
        const batch = getReadingSettings().localStrategy === 'batch' && segments.some(segment => scheduler.isLocalCharacter(segment.charName));
        const session = { abort: new AbortController(), paused: false, snapshot, prepared: 0, index: 0, phase: batch ? '批量准备' : '准备第一段' };
        this.session = session;
        this.activeMessageId = snapshot.id;
        const progress = () => {
            if (this.session === session) this.setStatus(`${label} · ${session.paused ? '已暂停' : session.phase}${session.index ? ` ${session.index}/${segments.length}` : ''} · 已准备 ${session.prepared}/${segments.length}`);
        };
        session.progress = progress;
        const pending = new Map();
        let saving = null;
        const saveCompleteAudio = () => {
            if (!recording || saving || session.prepared !== segments.length || session.abort.signal.aborted) return;
            saving = Promise.all([...pending.values()]).then(async results => {
                if (results.some(result => !result.audio)) return;
                await FulltextRecording.save(recording.key, results.map(result => result.audio.audioUrl), session.abort.signal);
                if (this.valid(snapshot) && !session.abort.signal.aborted) this.showRecording(snapshot, recording.key);
            }).catch(error => { if (!session.abort.signal.aborted) this.notify(error.message); });
        };
        const prepare = index => {
            if (index >= segments.length || pending.has(index) || session.abort.signal.aborted) return;
            // 立即挂错误处理，预取失败也不会产生未处理的 Promise 拒绝。
            pending.set(index, scheduler.requestAudio(segments[index], session.abort.signal, { batch, deferRun: true }).then(audio => {
                session.prepared++;
                progress();
                queueMicrotask(saveCompleteAudio);
                return { audio };
            }, error => {
                if (!session.abort.signal.aborted) {
                    this.notify(error.message);
                    if (this.session === session) this.stop();
                }
                return { error };
            }));
        };
        session.watch = setInterval(() => {
            if (!this.valid(snapshot) || window.TTS_State.CACHE.settings.enabled === false) this.stop();
        }, 200);
        let completed = false;
        try {
            progress();
            if (batch) {
                segments.forEach((_, index) => prepare(index));
                scheduler.run();
                await Promise.all(pending.values());
            }
            for (let i = 0; i < segments.length; i++) {
                if (session.abort.signal.aborted) break;
                session.index = i + 1;
                session.phase = i === 0 ? '准备第一段' : '等待语音';
                progress();
                prepare(i);
                if (!batch) prepare(i + 1);
                scheduler.run();
                const { audio, error } = await pending.get(i);
                if (error || session.abort.signal.aborted) break;
                if (session.paused) await new Promise(resolve => { session.resume = resolve; });
                session.resume = null;
                if (session.abort.signal.aborted || !this.valid(snapshot)) break;
                session.phase = '播放';
                progress();
                const ended = await window.TTS_Events.playAudio(audio.key, audio.audioUrl, { signal: session.abort.signal, managed: true });
                if (!ended && !session.abort.signal.aborted) throw new Error('播放未能完成。若浏览器拦截自动播放，请点击“连续读”后重试。');
                if (i === segments.length - 1 && ended) completed = true;
            }
        } catch (error) {
            if (!session.abort.signal.aborted) this.notify(error.message);
        } finally {
            if (completed && saving && !session.abort.signal.aborted) {
                session.phase = '保存完整音频';
                progress();
                await saving;
            }
            if (this.session === session) {
                this.stop();
                if (completed) this.setStatus(`${label} · 播放完毕 ${segments.length}/${segments.length}`);
            }
        }
    },

    dialogueSegments(id) {
        window.TTS_Parser.scan();
        const message = [...document.querySelectorAll('#chat .mes')].find(node => Number(node.getAttribute('mesid')) === id);
        if (!message) return [];
        const buttons = [];
        const collect = root => {
            for (const node of root.querySelectorAll('.voice-bubble, iframe')) {
                if (node.matches('iframe')) {
                    if (!window.TTS_State.CACHE.settings.iframe_mode) continue;
                    try { if (node.contentDocument) collect(node.contentDocument); } catch { /* 跨域 iframe 无法读取 */ }
                } else buttons.push(node);
            }
        };
        collect(message);
        return buttons.map(node => ({
            charName: node.getAttribute('data-voice-name'),
            text: node.getAttribute('data-text'),
            emotion: node.getAttribute('data-voice-emotion') || 'default',
            key: node.getAttribute('data-key'),
        })).filter(segment => segment.text?.trim());
    },

    readDialogue(id) {
        try { return this.start(this.snapshot(id), this.dialogueSegments(id), '连续读'); }
        catch (error) { this.notify(error.message); }
    },

    scheduleAutoRead(generation) {
        setTimeout(() => {
            if (this.generation !== generation || !generation.ended || !generation.ids.size) return;
            this.generation = null;
            if (!getReadingSettings().autoDialogue) return;
            const id = [...generation.ids].at(-1);
            try {
                const snapshot = this.snapshot(id);
                if (this.seen.get(id) === snapshot.raw) return;
                this.seen.set(id, snapshot.raw);
                this.readDialogue(id);
            } catch (error) { this.notify(error.message); }
        }, 0);
    },

    dialog(title) { return readingDialog(title); },

    async previewFulltext(id, regenerate = false) {
        try {
            const snapshot = this.snapshot(id);
            const key = await recordingKey(snapshot, this.context());
            if (!this.valid(snapshot)) return;
            if (!regenerate && await FulltextRecording.exists(key)) {
                if (this.valid(snapshot)) this.showRecording(snapshot, key, true);
                return;
            }
            const settings = getReadingSettings();
            const text = cleanBody(extractBody(snapshot.raw, settings), settings);
            const segments = parseFulltext(text, settings.narrator, window.TTS_State.CACHE.mappings);
            const $dialog = this.dialog(regenerate ? '重新生成全文 · 提取预览' : '全文朗读 · 提取预览');
            if (regenerate) $('<p class="tts-r-note">').text('将重新合成所有片段，云端可能产生费用；成功保存后替换旧成品。').appendTo($dialog.find('.tts-r-body'));
            $('<p class="tts-r-note">').text('人物与旁白依次呈现。确认内容后，点一次即可开始朗读。').appendTo($dialog.find('.tts-r-body'));
            const $list = $('<ol class="tts-r-preview">').appendTo($dialog.find('.tts-r-body'));
            for (const segment of segments) {
                $('<li>')
                    .text(`${segment.sourceName}${segment.fallback ? '（未绑定，使用旁白音色）' : ''}：${segment.text}`).appendTo($list);
            }
            readingButton('play', regenerate ? '确认重新生成' : '开始全文朗读').addClass('tts-r-primary').on('click', () => {
                $dialog[0].close();
                if (regenerate) {
                    const nonce = `${Date.now()}-${Math.random()}`;
                    segments.forEach(segment => { segment.key = `fulltext-regenerate:${nonce}:${JSON.stringify(segment)}`; segment.forceRegenerate = true; });
                }
                this.start(snapshot, segments, '全文朗读', { key });
            }).appendTo($dialog.find('.tts-r-footer'));
        } catch (error) { this.notify(error.message); }
    },

    showRecording(snapshot, key, autoplay = false) {
        if (!this.valid(snapshot)) return;
        const node = [...document.querySelectorAll('#chat .mes')].find(node => Number(node.getAttribute('mesid')) === snapshot.id);
        if (!node) return;
        $(node).find('.tts-fulltext-player audio').each((_, audio) => audio.pause());
        $(node).find('.tts-fulltext-player').remove();
        const $player = $('<div class="tts-fulltext-player">').data('snapshot', snapshot);
        $('<small>').text('全文音频已保存 · 可重播 / 拖动进度').appendTo($player);
        const $audio = $('<audio controls preload="metadata">').attr({ src: FulltextRecording.url(key), 'aria-label': '全文朗读完整音频' }).appendTo($player);
        $audio.on('error', () => $player.find('> small').text('完整音频暂时不可读取，请检查后端连接；不会自动重新合成。'));
        $audio.on('play', () => {
            if (!this.valid(snapshot)) { $audio[0].pause(); $player.remove(); return; }
            // 停止片段队列与其他成品播放器，随后继续当前原生播放器。
            const audio = $audio[0];
            document.querySelectorAll('.tts-fulltext-player audio').forEach(other => { if (other !== audio) other.pause(); });
            const session = this.session;
            if (session) { this.session = null; session.abort.abort(); clearInterval(session.watch); session.resume?.(); }
            window.TTS_Events.stopAudio();
            this.setStatus();
        });
        const $actions = $('<div>').appendTo($player);
        readingButton('play', '重播全文').on('click', () => { $audio[0].currentTime = 0; $audio[0].play().catch(() => this.notify('请点击播放器播放按钮')); }).appendTo($actions);
        readingButton('check', '下载音频').on('click', () => window.TTS_Events.downloadAudio(FulltextRecording.url(key), '全文朗读', '完整音频')).appendTo($actions);
        readingButton('bolt', '重新生成').on('click', () => {
            this.stop();
            this.previewFulltext(snapshot.id, true);
        }).appendTo($actions);
        $(node).find('.tts-reading-bar').after($player);
        if (autoplay) $audio[0].play().catch(() => this.notify('完整音频已恢复，请点击播放'));
    },

    async restoreRecording(id, node) {
        if (!window.TTS_API?._url) return;
        try {
            const snapshot = this.snapshot(id);
            const key = await recordingKey(snapshot, this.context());
            if (await FulltextRecording.exists(key) && node.isConnected && this.valid(snapshot)) this.showRecording(snapshot, key);
        } catch { /* 后端离线不阻塞普通气泡与设置；点击全文时明确提示。 */ }
    },

    openSettings() {
        const settings = getReadingSettings();
        const $dialog = this.dialog('朗读设置');
        const $body = $dialog.find('.tts-r-body');
        const section = (icon, title) => {
            const $section = $('<section class="tts-r-section">').appendTo($body);
            $('<h4 class="tts-r-section-title">').append(readingIcon(icon), $('<span>').text(title)).appendTo($section);
            return $section;
        };
        const copy = (title, description) => $('<span class="tts-r-copy">').append($('<strong>').text(title), $('<small>').text(description));
        const toggle = ($parent, icon, title, description, checked) => {
            const $input = $('<input type="checkbox">').prop('checked', checked);
            $('<label class="tts-r-toggle">').append(readingIcon(icon), copy(title, description), $input).appendTo($parent);
            return $input;
        };
        const field = ($parent, label, $input) => {
            $('<label class="tts-r-field">').append($('<span>').text(label), $input).appendTo($parent);
            return $input;
        };
        const $modes = section('play', '朗读方式');
        const auto = toggle($modes, 'play', '自动连播对白', '新回复完成后，自动播放已有对白气泡。', settings.autoDialogue);
        const template = toggle($modes, 'book', '全文朗读模板', '让后续回复包含可提取的人物对白与旁白。', settings.fulltextTemplate);
        const $voices = section('voice', '旁白声音');
        const narrator = field($voices, '使用已绑定的音色', $('<select>').append($('<option value="">').text('选择旁白音色')));
        for (const name of Object.keys(window.TTS_State.CACHE.mappings)) {
            if (window.TTS_State.CACHE.mappings[name]) narrator.append($('<option>').val(name).text(name));
        }
        narrator.val(settings.narrator);
        $('<p class="tts-r-note">').text('人物沿用各自音色；未绑定的人物使用旁白声音。').appendTo($voices);
        const $generation = section('layers', '播放准备');
        $('<p class="tts-r-note tts-r-cloud">').append(readingIcon('cloud'), $('<span>').text('云端自动边生成边播，最多同时准备 2 段。')).appendTo($generation);
        const $options = $('<div class="tts-r-options" role="radiogroup" aria-label="本地模型朗读方式">').appendTo($generation);
        for (const [value, icon, title, description] of [
            ['eager', 'bolt', '尽快开播', '本地按正文生成，边播边准备。'],
            ['batch', 'layers', '批量准备', '本地按模型生成，备齐再播放。'],
        ]) {
            $('<label class="tts-r-option">').append(
                $('<input type="radio" name="tts-r-strategy">').val(value).prop('checked', settings.localStrategy === value),
                readingIcon(icon), copy(title, description)).appendTo($options);
        }
        $('<p class="tts-r-note">').text('本地与混合音色使用此选择；尽快开播可能更频繁切换模型。').appendTo($generation);
        const $advanced = $('<details>').append($('<summary>').append(readingIcon('chevron'), $('<span>').text('高级 · 正文提取规则'))).appendTo($body);
        const start = field($advanced, '正文开始标记', $('<input type="text">').val(settings.startMarker));
        const end = field($advanced, '正文结束标记', $('<input type="text">').val(settings.endMarker));
        const exclude = field($advanced, '额外排除标签 · 逗号分隔', $('<input type="text">').val(settings.excludeTags));
        $('<p class="tts-r-note">').text('标记缺失或损坏时不朗读。关闭全文模板会恢复原模板；两个朗读开关互相独立。').appendTo($advanced);
        const $footer = $dialog.find('.tts-r-footer');
        $('<small>').text('设置保存在当前浏览器').appendTo($footer);
        readingButton('check', '保存设置').addClass('tts-r-primary').on('click', () => {
            try {
                const next = { autoDialogue: auto.prop('checked'), fulltextTemplate: template.prop('checked'), narrator: narrator.val() || '', localStrategy: $options.find('input:checked').val(),
                    startMarker: start.val().trim(), endMarker: end.val().trim(), excludeTags: exclude.val().trim() };
                validateReadingSettings(next);
                localStorage.setItem('tts_reading_settings', JSON.stringify(next));
                this.stop();
                this.generation = null;
                window.TTS_PromptInjector.refreshAndInject();
                $dialog[0].close();
            } catch (error) { this.notify(error.message); }
        }).appendTo($footer);
    },

    mount() {
        for (const node of document.querySelectorAll('#chat .mes')) {
            const messageId = Number(node.getAttribute('mesid'));
            const currentMessage = this.context()?.chat?.[messageId];
            const signature = JSON.stringify([this.context()?.chatId, messageId, currentMessage?.mes, currentMessage?.swipe_id]);
            if (currentMessage && !currentMessage.is_user && !currentMessage.is_system && this.restoredNodes.get(node) !== signature) {
                this.restoredNodes.set(node, signature);
                $(node).find('.tts-fulltext-player audio').each((_, audio) => audio.pause());
                $(node).find('.tts-fulltext-player').remove();
                this.restoreRecording(messageId, node);
            }
            if (node.querySelector('.tts-reading-bar')) continue;
            const id = Number(node.getAttribute('mesid'));
            const message = this.context()?.chat?.[id];
            if (!message || message.is_user || message.is_system) continue;
            const $bar = $('<div class="tts-reading-bar" role="group" aria-label="消息朗读">');
            // 点击时读取当前 mesid，避免删除消息后楼层重排读取错误消息。
            const currentId = () => Number(node.getAttribute('mesid'));
            readingButton('book', '全文朗读').on('click', () => this.previewFulltext(currentId())).appendTo($bar);
            readingButton('play', '对白连播').addClass('tts-r-primary').on('click', () => this.readDialogue(currentId())).appendTo($bar);
            readingButton('pause', '暂停', true).addClass('tts-reading-pause').prop('disabled', true).on('click', () => this.togglePause()).appendTo($bar);
            readingButton('stop', '停止', true).addClass('tts-reading-stop').prop('disabled', true).on('click', () => { this.generation = null; this.stop(); }).appendTo($bar);
            readingButton('settings', '朗读设置', true).on('click', () => this.openSettings()).appendTo($bar);
            const $meter = $('<div class="tts-r-meter" hidden>').append(readingWave()).appendTo($bar);
            $('<small class="tts-reading-status" role="status">').appendTo($meter);
            // 放在正文容器外，避免原解析器重写正文时销毁控件。
            $(node).find('.mes_block').first().length ? $(node).find('.mes_block').first().append($bar) : $(node).append($bar);
        }
    },

    init(eventSource, eventTypes) {
        installReadingStyles();
        const on = (name, handler) => { if (eventTypes[name]) eventSource.on(eventTypes[name], handler); };
        this.recordingWatch = setInterval(() => {
            $('.tts-fulltext-player').each((_, node) => {
                if (!this.valid($(node).data('snapshot'))) {
                    $(node).find('audio').each((_, audio) => audio.pause());
                    $(node).remove();
                }
            });
        }, 250);
        for (const name of ['CHAT_CHANGED', 'MESSAGE_SWIPED', 'MESSAGE_UPDATED', 'MESSAGE_EDITED', 'MESSAGE_DELETED', 'GENERATION_STOPPED']) {
            on(name, () => { this.generation = null; this.stop(); if (name === 'CHAT_CHANGED') this.seen.clear(); });
        }
        on('GENERATION_STARTED', (type, options, dryRun) => {
            if (dryRun || type === 'quiet') return;
            this.stop();
            this.generation = { ids: new Set() };
        });
        on('CHARACTER_MESSAGE_RENDERED', (id) => {
            this.mount();
            this.generation?.ids.add(Number(id));
            if (this.generation?.ended) this.scheduleAutoRead(this.generation);
        });
        on('GENERATION_ENDED', () => {
            const generation = this.generation;
            if (!generation) return;
            // 宿主流式生成可能先结束、后异步发出最终渲染事件；两者齐备后才读。
            generation.ended = true;
            this.scheduleAutoRead(generation);
        });
        // 手机外壳会阻止冒泡，在捕获阶段处理动态插入的设置入口。
        document.addEventListener('click', (event) => {
            if (event.target instanceof Element && event.target.closest('#tts-open-reading-settings')) {
                this.openSettings();
            }
        }, { capture: true });
        this.mount();
        this.observer = new MutationObserver(() => this.mount());
        const chat = document.querySelector('#chat');
        if (chat) this.observer.observe(chat, { childList: true, subtree: true });
    },
};
