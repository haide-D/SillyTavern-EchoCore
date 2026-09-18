// Browser regressions use only fixture messages and mocked audio/providers.
// Requires playwright and a Chromium browser; no TTS backend/API is called.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = process.cwd();
const jquery = process.env.JQUERY_PATH || path.resolve(root, '../../../../public/lib/jquery-3.5.1.min.js');
const recordings = new Map();
const server = http.createServer(async (req, res) => {
    try {
        if (req.url === '/api/fulltext-audio/identity') {
            let body = ''; for await (const chunk of req) body += chunk;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ key: createHash('sha256').update(JSON.parse(body).identity).digest('hex') })); return;
        }
        if (req.url.startsWith('/api/fulltext-audio/') && req.url.endsWith('/status')) {
            res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ exists: recordings.has(req.url.slice(0, -7)) })); return;
        }
        if (req.url.startsWith('/api/fulltext-audio/')) {
            if (req.method === 'PUT') {
                const chunks = []; for await (const chunk of req) chunks.push(chunk);
                recordings.set(req.url, Buffer.concat(chunks)); res.end('{}'); return;
            }
            if (recordings.has(req.url)) { res.setHeader('Content-Type', 'audio/wav'); res.end(recordings.get(req.url)); return; }
        }
        if (req.url === '/') {
            res.setHeader('Content-Type', 'text/html');
            res.end('<!doctype html><html><body><div id="chat"><div class="mes" mesid="0"><div class="mes_block"><div class="mes_text"></div></div></div></div><script src="/jquery.js"></script></body></html>');
            return;
        }
        const target = req.url === '/jquery.js' ? jquery : path.resolve(root, '.' + req.url);
        if (req.url !== '/jquery.js' && !target.startsWith(path.join(root, 'frontend', 'js') + path.sep) &&
            target !== path.join(root, 'frontend', 'css', 'core', 'reading.css')) throw new Error('Not allowed');
        res.setHeader('Content-Type', target.endsWith('.css') ? 'text/css' : 'text/javascript');
        res.end(await fs.readFile(target));
    } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const results = await page.evaluate(async () => {
        const text = await import('/frontend/js/reading_text.js');
        const { TTS_Reading: reader } = await import('/frontend/js/reading_controller.js');
        const { TTS_Scheduler: scheduler } = await import('/frontend/js/scheduler.js');
        const { TTS_Events: events } = await import('/frontend/js/events.js');
        const { ProviderManager } = await import('/frontend/js/providers/provider_manager.js');
        const { PromptInjector, DEFAULT_PROMPT_TEMPLATE } = await import('/frontend/js/prompt_injector.js');
        const passed = [];
        const check = (value, name) => { if (!value) throw new Error(name); passed.push(name); };
        const rejects = (fn, name) => { let failed = false; try { fn(); } catch { failed = true; } check(failed, name); };
        const tick = () => new Promise(resolve => setTimeout(resolve, 15));
        const settings = { ...text.READING_DEFAULTS, narrator: 'Narrator' };
        const mappings = { Narrator: 'n', Alice: 'a', Bob: 'b', Alice_Name: 'a' };
        const raw = 'OUTSIDE<think>private</think><tts-body>雨落。 [Alice, happy] “你好。” 风起。 [Bob, default] 「进来。」<status>HP 20</status><style>body{color:red}</style><script>alert(1)</script>```js\nsecret\n```</tts-body>OPTIONS';
        const cleaned = text.cleanBody(text.extractBody(raw, settings), settings);
        const segments = text.parseFulltext(cleaned, 'Narrator', mappings);
        check(JSON.stringify(segments.map(s => s.charName)) === JSON.stringify(['Narrator', 'Alice', 'Narrator', 'Bob']), 'fulltext order: narrator → Alice → narrator → Bob');
        check(!/OUTSIDE|private|HP|color|alert|secret|OPTIONS/.test(cleaned), 'excluded blocks and wrapper text removed');
        check(raw.includes('HP 20'), 'source message unchanged');
        for (const body of ['unwrapped', '<tts-body>broken', '<tts-body>a</tts-body><tts-body>b</tts-body>', '<tts-body><tts-body>x</tts-body></tts-body>', '</tts-body>x<tts-body>']) {
            rejects(() => text.extractBody(body, settings), 'reject missing/repeated/nested/reversed boundary');
        }
        rejects(() => text.cleanBody('<think>unfinished', settings), 'reject unclosed excluded block');
        rejects(() => text.parseFulltext('[Alice, happy] “unfinished', 'Narrator', mappings), 'reject malformed spoken quote');
        rejects(() => text.parseFulltext('', 'Narrator', mappings), 'reject empty body');
        check(text.extractBody('outsideBEGINbodyENDtail', { ...settings, startMarker: 'BEGIN', endMarker: 'END' }) === 'body', 'literal custom boundary');
        const special = text.cleanBody('[Alice_Name, default] “C# 与 1_2。”', settings);
        check(special.includes('Alice_Name') && special.includes('C#'), 'preserve names and legal punctuation');
        const unknown = text.parseFulltext('[Unknown, default] “Hello.”', 'Narrator', mappings);
        check(unknown[0].charName === 'Narrator' && unknown[0].fallback, 'unknown speaker explicitly falls back to narrator');
        check(text.splitReadingText('长'.repeat(901)).map(s => s.length).join(',') === '350,350,201', 'long body split without truncation');
        check(text.cleanBody('<think>one<think>two</think></think>保留。<div class="status-panel">secret</div>', settings) === '保留。', 'nested excluded tags and status containers');

        const emotionalSettings = { ...settings, enableEmotionalNarration: true };
        const narrationMixed = '[旁白, 紧张] 夜风。 [Alice, fear] “谁？” 普通旁白。 [Narration, sad] 雨落。';
        const emotionalSegments = text.parseFulltext(narrationMixed, 'Narrator', mappings, emotionalSettings);
        check(emotionalSegments.map(s => s.emotion).join(',') === '紧张,fear,default,sad', 'emotional narration boundaries and dialogue reset');
        check(emotionalSegments[0].charName === 'Narrator' && emotionalSegments[3].sourceName === '旁白', 'bilingual narration routes to chosen voice');
        check(text.parseFulltext(narrationMixed, 'Narrator', mappings).filter(s => s.sourceName === '旁白').every(s => s.emotion === 'default'), 'disabled narration strips tags and preserves default');
        check(text.fulltextPrompt(emotionalSettings).includes('do not fragment'), 'narration prompt continuity guidance');
        check(text.parseFulltext('[旁白, sad] ' + '长'.repeat(901), 'Narrator', mappings, emotionalSettings).every(s => s.emotion === 'sad'), 'long narration retains emotion in every chunk');

        const ctx = { chatId: 'fixture', chat: [{ mes: raw }], extensionSettings: { st_direct_tts: {} } };
        const notes = [];
        window.SillyTavern = { getContext: () => ctx };
        window.TTS_State = { CACHE: { mappings, models: {}, settings: { enabled: true }, audioMemory: {}, pendingTasks: new Set() } };
        window.TTS_Utils = { showNotification: msg => notes.push(msg) };
        window.TTS_Parser = { scan() {}, updateState() {} };
        window.TTS_Scheduler = scheduler;
        window.TTS_Events = events;
        window.TTS_Reading = reader;
        window.TTS_API = { _url: path => path, _headers: extra => extra };
        window.TTS_PromptInjector = { getModelSpeed: () => 1, refreshAndInject() {} };

        const { TTS_Parser: realParser } = await import('/frontend/js/dom_parser.js');
        window.TTS_Utils.getStyleContent = () => '';
        window.TTS_PromptInjector.getSkippedSpeakers = () => [];
        const realContent = document.querySelector('.mes_text');
        realContent.textContent = cleaned;
        realParser.scan();
        check([...realContent.querySelectorAll('.voice-bubble')].map(node => node.dataset.voiceName).join(',') === 'Alice,Bob', 'existing parser accepts fulltext dialogue protocol and excludes narration');
        check(reader.dialogueSegments(0).map(s => s.text).join(',') === '你好。,进来。', 'continuous consumes actual parser bubbles');
        realContent.replaceChildren();

        const handlers = {};
        const types = Object.fromEntries(['CHAT_CHANGED', 'MESSAGE_SWIPED', 'MESSAGE_UPDATED', 'MESSAGE_EDITED', 'MESSAGE_DELETED', 'GENERATION_STOPPED', 'GENERATION_STARTED', 'CHARACTER_MESSAGE_RENDERED', 'GENERATION_ENDED'].map(key => [key, key]));
        reader.init({ on: (name, fn) => { handlers[name] = fn; } }, types);
        check(document.querySelectorAll('.tts-reading-bar').length === 1, 'separate fulltext and continuous controls mounted once');
        reader.mount();
        check(document.querySelectorAll('.tts-reading-bar').length === 1, 'mount is idempotent');
        await reader.previewFulltext(0);
        check(document.querySelectorAll('#tts-reading-dialog li').length === 4, 'fulltext preview displays ordered segments');
        document.querySelector('#tts-reading-dialog').close();
        await tick();
        reader.openSettings();
        const settingsDialog = document.querySelector('#tts-reading-dialog');
        check(settingsDialog.querySelectorAll('input[type=checkbox]').length === 3, 'independent template, autoplay and narration settings');
        settingsDialog.close();
        await tick();
        check(PromptInjector.buildPromptDirective({}, []).startsWith(DEFAULT_PROMPT_TEMPLATE.split('\n')[0]), 'default prompt unchanged');
        localStorage.setItem('tts_reading_settings', JSON.stringify({ ...settings, fulltextTemplate: true }));
        check(PromptInjector.buildPromptDirective({}, []).includes('[Full Story Reading Protocol]'), 'fulltext prompt independently selectable');
        localStorage.setItem('tts_reading_settings', JSON.stringify(settings));

        // Existing bubbles, including repeated lines, define continuous reading order.
        const content = document.querySelector('.mes_text');
        for (const [name, value] of [['Bob', 'second'], ['Alice', 'first'], ['Bob', 'second']]) {
            const button = document.createElement('span');
            button.className = 'voice-bubble';
            button.setAttribute('data-voice-name', name);
            button.setAttribute('data-text', value);
            button.setAttribute('data-key', `${name}_${value}`);
            content.append(button);
        }
        const dialogue = reader.dialogueSegments(0);
        check(dialogue.map(s => s.text).join(',') === 'second,first,second', 'continuous preserves existing bubble order and intentional repeats');
        const audios = [];
        class MockAudio {
            constructor(url) { this.url = url; audios.push(this); }
            play() { this.paused = false; return Promise.resolve(); }
            pause() { this.paused = true; }
            end() { this.onended?.(); }
        }
        window.Audio = MockAudio;
        // Prepopulate in reverse completion order; playback must still follow DOM order.
        const cache = window.TTS_State.CACHE;
        cache.audioMemory.Alice_first = 'first';
        cache.audioMemory.Bob_second = 'second';
        const playing = reader.start(reader.snapshot(0), dialogue, 'test');
        await tick();
        check(audios.at(-1).url === 'second', 'cache completion order does not control playback');
        check(document.querySelector('.tts-reading-bar').classList.contains('is-playing'), 'sound wave is active during playback');
        reader.togglePause();
        check(audios.at(-1).paused, 'pause current audio');
        check(!document.querySelector('.tts-reading-bar').classList.contains('is-playing') && document.querySelector('.tts-reading-pause').getAttribute('aria-label') === '继续', 'paused waveform stops and resume control is accessible');
        reader.togglePause();
        check(!audios.at(-1).paused, 'resume current audio');
        audios.at(-1).end(); await tick();
        check(audios.at(-1).url === 'first', 'next segment waits for previous ended');
        audios.at(-1).end(); await tick();
        check(audios.at(-1).url === 'second', 'repeated dialogue plays again');
        audios.at(-1).end(); await playing;
        check(reader.session === null, 'queue completes and cleans up');

        let resolveGeneration;
        let generated = 0;
        const provider = { name: 'Fixture', async checkCache() { return { cached: false }; },
            generateAudio() { generated++; return new Promise(resolve => { resolveGeneration = resolve; }); } };
        ProviderManager.getProviderForCharacter = () => provider;
        const delayed = [{ charName: 'Alice', text: 'delayed', emotion: 'default' }];
        const delayedPlay = reader.start(reader.snapshot(0), delayed, 'late');
        await tick();
        const count = audios.length;
        reader.stop();
        await delayedPlay;
        resolveGeneration({ audioUrl: 'late-result' }); await tick();
        check(audios.length === count && scheduler.waiters.size === 0, 'stop rejects waiter and late synthesis never starts audio');
        check(!scheduler.isRunning && cache.pendingTasks.size === 0, 'scheduler cleans up completed pending task');

        // Duplicate requests share generation; stopping a waiter does not duplicate work.
        const abort1 = new AbortController();
        const abort2 = new AbortController();
        const a = scheduler.requestAudio({ ...delayed[0], text: 'shared' }, abort1.signal).catch(e => e.name);
        const b = scheduler.requestAudio({ ...delayed[0], text: 'shared' }, abort2.signal);
        await tick();
        abort1.abort();
        check(await a === 'AbortError', 'one waiter can cancel independently');
        resolveGeneration({ audioUrl: 'shared-result' });
        check((await b).audioUrl === 'shared-result' && generated === 2, 'duplicate pending request synthesizes only once');
        await tick();

        const beforeFailed = generated;
        provider.generateAudio = async () => { generated++; throw new Error('fixture failure'); };
        await reader.start(reader.snapshot(0), [{ ...delayed[0], text: 'fails' }], 'failure');
        check(generated === beforeFailed + 1 && reader.session === null && !scheduler.waiters.size, 'failure stops without automatic retry');

        const routes = [];
        let running = 0;
        let peak = 0;
        cache.models.a = { name: 'local-A' };
        const local = {
            name: 'GPT-SoVITS', validateModel: () => true, selectRefAudio: () => ({ path: 'fixture' }),
            checkCache: async () => ({ cached: false }), switchModel: async config => { routes.push('switch:' + config.name); },
            generateAudio: async (task, config) => {
                running++; peak = Math.max(peak, running); await tick(); running--;
                routes.push('local:' + config.name); return { audioUrl: task.text };
            },
        };
        const cloud = { name: 'FixtureCloud', checkCache: async () => ({ cached: false }),
            generateAudio: async task => { running++; peak = Math.max(peak, running); await tick(); running--; routes.push('cloud'); return { audioUrl: task.text }; } };
        ProviderManager.getProviderForCharacter = name => name === 'Alice' ? local : cloud;
        const mixed = await Promise.all([
            scheduler.requestAudio({ charName: 'Alice', text: 'local segment' }, new AbortController().signal),
            scheduler.requestAudio({ charName: 'Bob', text: 'cloud segment' }, new AbortController().signal),
        ]);
        await tick();
        check(mixed.length === 2 && routes.includes('switch:local-A') && routes.includes('local:local-A') && routes.includes('cloud') && peak === 2, 'cloud can run alongside correctly configured local synthesis');

        // Cloud lookahead: second result arrives first, but first audio starts without waiting for the whole message.
        const gates = new Map();
        const submitted = [];
        let activeCloud = 0;
        let cloudPeak = 0;
        const cloudStream = { name: 'CloudStream', checkCache: async () => ({ cached: false }),
            generateAudio: task => {
                submitted.push(task.text);
                activeCloud++; cloudPeak = Math.max(cloudPeak, activeCloud);
                return new Promise(resolve => gates.set(task.text, () => { activeCloud--; resolve({ audioUrl: task.text }); }));
            } };
        ProviderManager.getProviderForCharacter = () => cloudStream;
        // Even when the saved local strategy is batch, an entirely cloud message streams.
        localStorage.setItem('tts_reading_settings', JSON.stringify({ ...settings, localStrategy: 'batch' }));
        const cloudLines = ['cloud-1', 'cloud-2', 'cloud-3'].map((value, index) => ({ charName: index === 1 ? 'Bob' : 'Alice', text: value }));
        const initialAudioCount = audios.length;
        const cloudPlaying = reader.start(reader.snapshot(0), cloudLines, 'cloud');
        await tick();
        check(submitted.join(',') === 'cloud-1,cloud-2' && cloudPeak === 2, 'cloud submits first two segments concurrently in text order, without grouping by character');
        gates.get('cloud-2')(); await tick();
        check(audios.length === initialAudioCount, 'out-of-order second completion cannot play before first');
        gates.get('cloud-1')(); await tick();
        check(audios.at(-1).url === 'cloud-1' && !gates.has('cloud-3'), 'first ready segment plays before whole message has been generated');
        check(document.querySelector('.tts-reading-status').textContent.includes('已准备 2/3'), 'status displays prepared segment count');
        audios.at(-1).end(); await tick();
        check(audios.at(-1).url === 'cloud-2' && gates.has('cloud-3'), 'next synthesis overlaps playback of already prepared segment');
        reader.stop(); await cloudPlaying;
        const stoppedCount = audios.length;
        gates.get('cloud-3')(); await tick();
        check(audios.length === stoppedCount && activeCloud === 0, 'stopped cloud lookahead never plays late results');

        // Local eager mode holds one shared model lock and prefetches during playback.
        const localGates = new Map();
        const localOrder = [];
        const switches = [];
        let activeLocal = 0;
        let localPeak = 0;
        cache.models.b = { name: 'local-B' };
        const localStream = { ...local, switchModel: async config => { switches.push(config.name); },
            generateAudio: (task, config) => {
                localOrder.push(task.text);
                activeLocal++; localPeak = Math.max(localPeak, activeLocal);
                return new Promise(resolve => localGates.set(task.text, () => { activeLocal--; resolve({ audioUrl: task.text }); }));
            } };
        ProviderManager.getProviderForCharacter = () => localStream;
        localStorage.setItem('tts_reading_settings', JSON.stringify({ ...settings, localStrategy: 'eager' }));
        const localLines = ['eager-1', 'eager-2', 'eager-3'].map((value, index) => ({ charName: index === 1 ? 'Bob' : 'Alice', text: value }));
        const localPlaying = reader.start(reader.snapshot(0), localLines, 'local'); await tick();
        check(localOrder.join(',') === 'eager-1', 'local only starts one synthesis at a time');
        localGates.get('eager-1')(); await tick();
        check(audios.at(-1).url === 'eager-1' && localOrder.join(',') === 'eager-1,eager-2', 'local starts first audio and prepares next character during playback');
        localGates.get('eager-2')(); await tick(); audios.at(-1).end(); await tick();
        check(audios.at(-1).url === 'eager-2' && localOrder.at(-1) === 'eager-3', 'local eager mode follows text order across model changes');
        localGates.get('eager-3')(); await tick(); audios.at(-1).end(); await tick(); audios.at(-1).end(); await localPlaying;
        check(localPeak === 1 && switches.join(',') === 'local-A,local-B,local-A', 'local model changes and synthesis never overlap');

        // Batch mode reduces A/B/A switching but plays in source order only after every segment is ready.
        localStorage.setItem('tts_reading_settings', JSON.stringify({ ...settings, localStrategy: 'batch' }));
        scheduler.lastLocalModel = null;
        const batchLines = ['batch-1', 'batch-2', 'batch-3'].map((value, index) => ({ charName: index === 1 ? 'Bob' : 'Alice', text: value }));
        const batchAudioCount = audios.length;
        const batchPlaying = reader.start(reader.snapshot(0), batchLines, 'batch'); await tick();
        localGates.get('batch-1')(); await tick();
        check(localOrder.at(-1) === 'batch-3' && audios.length === batchAudioCount, 'local batch groups same model and waits before playback');
        localGates.get('batch-3')(); await tick();
        check(localOrder.at(-1) === 'batch-2' && audios.length === batchAudioCount, 'batch still waits for remaining model');
        localGates.get('batch-2')(); await tick();
        check(audios.at(-1).url === 'batch-1', 'batch starts after all ready in original source order');
        audios.at(-1).end(); await tick(); check(audios.at(-1).url === 'batch-2', 'batch playback ignores synthesis grouping');
        audios.at(-1).end(); await tick(); audios.at(-1).end(); await batchPlaying;

        // Stop discards queued reading-only synthesis rather than generating the entire abandoned batch.
        const cancelLines = ['cancel-1', 'cancel-2', 'cancel-3'].map(value => ({ charName: 'Alice', text: value }));
        const queuedPlaying = reader.start(reader.snapshot(0), cancelLines, 'cancel-batch'); await tick();
        check(scheduler.queue.length === 2, 'batch has two not-yet-issued local requests');
        reader.stop(); await queuedPlaying;
        localGates.get('cancel-1')(); await tick();
        check(!localGates.has('cancel-2') && !localGates.has('cancel-3') && scheduler.queue.length === 0 && cache.pendingTasks.size === 0, 'stop removes queued requests without sending additional synthesis');

        // Foreground eager reading promotes already queued bubbles without synthesizing duplicates.
        localStorage.setItem('tts_reading_settings', JSON.stringify({ ...settings, localStrategy: 'eager' }));
        const promoted = ['priority-1', 'priority-2', 'priority-3'].map((value, index) => ({ charName: index === 1 ? 'Bob' : 'Alice', text: value, key: `priority:${value}` }));
        for (const line of [promoted[2], promoted[1], promoted[0]]) {
            scheduler.addToQueue($('<span>').attr('data-status', 'waiting').data({ 'voice-name': line.charName, text: line.text, 'generation-key': line.key }));
        }
        const promotedPlaying = reader.start(reader.snapshot(0), promoted, 'priority'); await tick();
        check(localOrder.at(-1) === 'priority-1', 'foreground first segment takes priority over queued background model grouping');
        localGates.get('priority-1')(); await tick();
        check(localOrder.at(-1) === 'priority-2', 'foreground second segment retains text order among existing pending tasks');
        localGates.get('priority-2')(); await tick();
        audios.at(-1).end(); await tick();
        localGates.get('priority-3')(); await tick();
        audios.at(-1).end(); await tick(); audios.at(-1).end(); await promotedPlaying;
        check(localOrder.filter(value => value.startsWith('priority-')).length === 3, 'promoting pending bubbles never duplicates synthesis');

        const cancelled = reader.start(reader.snapshot(0), dialogue, 'cancel'); await tick();
        handlers.MESSAGE_SWIPED(); await cancelled;
        check(audios.at(-1).paused && reader.session === null, 'swipe stops active playback');
        const edited = reader.start(reader.snapshot(0), dialogue, 'edit'); await tick();
        ctx.chat[0].mes = 'changed';
        await new Promise(resolve => setTimeout(resolve, 240));
        await edited;
        check(reader.session === null && audios.at(-1).paused, 'source mutation invalidates playback without event');
        ctx.chat[0].mes = raw;

        let automatic = 0;
        reader.readDialogue = () => { automatic++; };
        localStorage.setItem('tts_reading_settings', JSON.stringify({ ...settings, autoDialogue: true }));
        handlers.CHARACTER_MESSAGE_RENDERED(0); await tick();
        check(automatic === 0, 'history render does not autoplay');
        handlers.GENERATION_STARTED('normal');
        handlers.GENERATION_ENDED(); await tick();
        check(automatic === 0, 'wait for completed message rendering');
        handlers.CHARACTER_MESSAGE_RENDERED(0); await tick();
        check(automatic === 1, 'autoplay works when generation ended precedes rendered event');
        handlers.GENERATION_ENDED(); handlers.CHARACTER_MESSAGE_RENDERED(0); await tick();
        check(automatic === 1, 'duplicate completion does not replay');
        handlers.GENERATION_STARTED('normal');
        ctx.chat[0].mes = raw + 'new';
        handlers.CHARACTER_MESSAGE_RENDERED(0); handlers.GENERATION_ENDED(); await tick();
        check(automatic === 2, 'autoplay works when render precedes generation ended');
        handlers.GENERATION_STARTED('normal'); handlers.CHARACTER_MESSAGE_RENDERED(0);
        handlers.GENERATION_STOPPED(); handlers.GENERATION_ENDED(); await tick();
        check(automatic === 2, 'stopped generation does not autoplay');
        const { FulltextRecording, recordingKey, mergeAudio } = await import('/frontend/js/fulltext_recording.js');
        const fixtureWav = value => {
            const data = new ArrayBuffer(44 + 4800);
            const view = new DataView(data);
            const str = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
            str(0, 'RIFF'); view.setUint32(4, 4836, true); str(8, 'WAVE'); str(12, 'fmt ');
            view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
            view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
            str(36, 'data'); view.setUint32(40, 4800, true);
            for (let i = 44; i < data.byteLength; i += 2) view.setInt16(i, value, true);
            return URL.createObjectURL(new Blob([data], { type: 'audio/wav' }));
        };
        const urls = [fixtureWav(12000), fixtureWav(-12000)];
        const merged = await mergeAudio(urls, new AbortController().signal);
        const wavData = new DataView(await merged.arrayBuffer());
        check(wavData.getUint32(40, true) === 9600 && wavData.getInt16(244, true) > 0 && wavData.getInt16(5044, true) < 0, 'real Web Audio merges WAV segments in source order');
        const savedSnapshot = reader.snapshot(0);
        const savedKey = await recordingKey(savedSnapshot, ctx);
        cache.audioMemory['save-first'] = urls[0];
        cache.audioMemory['save-second'] = urls[1];
        const firstFulltext = reader.start(savedSnapshot, [
            { charName: 'Alice', text: 'first', key: 'save-first' },
            { charName: 'Bob', text: 'second', key: 'save-second' },
        ], '全文朗读', { key: savedKey });
        await tick(); audios.at(-1).end(); await tick(); audios.at(-1).end(); await firstFulltext;
        check(await FulltextRecording.exists(savedKey), 'complete WAV persists on backend independently of segment memory');
        cache.audioMemory = {};
        reader.showRecording(savedSnapshot, savedKey);
        const native = document.querySelector('.tts-fulltext-player audio');
        check(native.controls && native.src.includes(savedKey), 'saved player exposes native seek controls and stable file URL');
        const priorGenerated = generated;
        await reader.previewFulltext(0);
        check(!document.querySelector('#tts-reading-dialog') && generated === priorGenerated, 'reopening fulltext uses saved player instead of preview or synthesis');
        reader.stop();
        document.querySelector('.tts-fulltext-player').remove();
        await reader.restoreRecording(0, document.querySelector('.mes'));
        check(!!document.querySelector('.tts-fulltext-player audio'), 'restoration recreates player without memory cache');
        await reader.previewFulltext(0, true);
        check(document.querySelector('#tts-r-title').textContent.includes('重新生成'), 'regeneration is a separate explicit preview');
        document.querySelector('#tts-reading-dialog').close();
        ctx.chat[0].mes += 'modified';
        await new Promise(resolve => setTimeout(resolve, 280));
        check(!document.querySelector('.tts-fulltext-player'), 'changed message invalidates saved player');
        urls.forEach(URL.revokeObjectURL);
        clearInterval(reader.recordingWatch);
        reader.observer.disconnect();
        reader.stop();
        return passed;
    });
    assert.deepEqual(errors, []);
    // Simulate a true browser refresh: rebuild globals and recover purely from backend file.
    const reloadFixture = await page.evaluate(() => {
        const ctx = window.SillyTavern.getContext();
        return { chatId: ctx.chatId, raw: ctx.chat[0].mes.slice(0, -'modified'.length) };
    });
    await page.reload();
    const restoredAfterReload = await page.evaluate(async fixture => {
        const { TTS_Reading: reader } = await import('/frontend/js/reading_controller.js');
        const ctx = { chatId: fixture.chatId, chat: [{ mes: fixture.raw }] };
        window.SillyTavern = { getContext: () => ctx };
        window.TTS_API = { _url: path => path, _headers: extra => extra };
        window.TTS_Events = { stopAudio() {} };
        window.TTS_State = { CACHE: { mappings: { Alice: 'a' }, settings: {} } };
        window.TTS_PromptInjector = { refreshAndInject() {} };
        window.TTS_Utils = { showNotification() {} };
        window.TTS_Reading = reader;
        reader.init({ on() {} }, {});
        await reader.restoreRecording(0, document.querySelector('.mes'));
        return !!document.querySelector('.tts-fulltext-player audio');
    }, reloadFixture);
    assert.ok(restoredAfterReload, 'fulltext player survives actual page reload without scheduler or TTS provider');
    await page.evaluate(() => {
        const shell = document.createElement('div');
        shell.id = 'settings-phone-fixture';
        shell.innerHTML = '<button id="tts-open-reading-settings"><span>全文朗读 / 连续读设置</span></button>';
        shell.addEventListener('click', event => event.stopPropagation());
        document.body.append(shell);
    });
    await page.locator('#tts-open-reading-settings span').click();
    assert.equal(await page.locator('#tts-reading-dialog').evaluate(node => node.open), true,
        'reading settings opens inside a phone shell that stops click propagation');
    await page.evaluate(() => {
        document.querySelector('#tts-reading-dialog').close();
        document.querySelector('#settings-phone-fixture').remove();
    });
    if (process.env.READING_SCREENSHOT_DIR) {
        await fs.mkdir(process.env.READING_SCREENSHOT_DIR, { recursive: true });
        await page.addStyleTag({ content: 'body { background:#101820; color:#d6dfe6; font-family:Arial,"Microsoft YaHei",sans-serif; margin:20px; }' });
        await page.setViewportSize({ width: 920, height: 1000 });
        await page.evaluate(() => window.TTS_Reading.openSettings());
        await page.locator('#tts-reading-dialog .tts-r-header').waitFor();
        await page.screenshot({ path: path.join(process.env.READING_SCREENSHOT_DIR, 'reading-settings-desktop.png') });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: path.join(process.env.READING_SCREENSHOT_DIR, 'reading-settings-mobile.png') });
        const overflow = await page.locator('#tts-reading-dialog').evaluate(node => node.scrollWidth > node.clientWidth);
        assert.equal(overflow, false, 'mobile settings do not overflow horizontally');
        await page.locator('#tts-reading-dialog summary').click();
        const footer = await page.locator('.tts-r-footer').boundingBox();
        assert.ok(footer.y >= 0 && footer.y + footer.height <= 844, 'save footer stays visible with advanced rules open');
        await page.getByRole('radio', { name: /尽快开播/ }).check();
        await page.getByRole('button', { name: '保存设置' }).click();
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tts_reading_settings')).localStrategy), 'eager', 'strategy cards persist settings');
        await page.setViewportSize({ width: 680, height: 180 });
        await page.evaluate(() => {
            window.TTS_Reading.activeMessageId = 0;
            window.TTS_Reading.session = { phase: '播放', paused: false };
            window.TTS_Reading.setStatus('全文朗读 · 播放 2/8 · 已准备 3/8');
        });
        await page.screenshot({ path: path.join(process.env.READING_SCREENSHOT_DIR, 'reading-player.png') });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const animation = await page.locator('.tts-r-wave rect').first().evaluate(node => getComputedStyle(node).animationName);
        assert.equal(animation, 'none', 'reduced-motion preference disables the wave animation');
    }
    // Preset editor exercises real DOM events, persistence and downloads using fixture data only.
    const presetPage = await browser.newPage();
    await presetPage.goto(`http://127.0.0.1:${server.address().port}`);
    await presetPage.evaluate(async () => {
        const { PromptInjector } = await import('/frontend/js/prompt_injector.js');
        const { mountPromptPresets } = await import('/frontend/js/prompt_presets_ui.js');
        const ctx = { extensionSettings: { st_direct_tts: { active_provider: 'gpt_sovits' } }, chat: [], name2: 'Alice', setExtensionPrompt(key, text) { window.lastPrompt = text; } };
        window.SillyTavern = { getContext: () => ctx };
        window.TTS_State = { CACHE: { mappings: { Alice: 'minimax:voice', Hidden: 'fish:voice' }, models: {}, settings: {} } };
        window.TTS_PromptInjector = PromptInjector;
        document.body.innerHTML = '<select id="tts-provider-select"><option value="gpt_sovits">Local</option><option value="fish_audio">Fish</option></select><div id="tts-prompt-presets"></div>';
        $('#tts-provider-select').on('change', event => { ctx.extensionSettings.st_direct_tts.active_provider = event.target.value; PromptInjector.refreshAndInject(); });
        PromptInjector.init(); mountPromptPresets();
    });
    await presetPage.getByLabel('预设名称', { exact: true }).fill('本地自定义');
    await presetPage.getByLabel('提示词模板', { exact: true }).fill('LOCAL {{primary_character_note}} {{bound_characters_section}} {{punctuation_rules}}');
    await presetPage.getByRole('button', { name: '保存 / 重命名', exact: true }).click();
    assert.ok(await presetPage.evaluate(() => window.lastPrompt.startsWith('LOCAL') && window.lastPrompt.includes('Alice') && !window.lastPrompt.includes('Hidden')));
    await presetPage.locator('#tts-provider-select').selectOption('fish_audio');
    assert.equal(await presetPage.getByLabel('提示词供应商').inputValue(), 'fish_audio');
    assert.ok(await presetPage.evaluate(() => !window.lastPrompt.startsWith('LOCAL')));
    await presetPage.getByLabel('预设名称', { exact: true }).fill('Fish 小说');
    await presetPage.getByLabel('提示词模板', { exact: true }).fill('FISH {{punctuation_rules}}');
    await presetPage.getByRole('button', { name: '保存 / 重命名', exact: true }).click();
    assert.ok(await presetPage.evaluate(() => window.lastPrompt.startsWith('FISH')));
    const downloadPromise = presetPage.waitForEvent('download');
    await presetPage.getByRole('button', { name: '导出当前预设', exact: true }).click();
    const download = await downloadPromise;
    const exported = await fs.readFile(await download.path());
    await presetPage.locator('input[type=file]').setInputFiles({ name: 'preset.json', mimeType: 'application/json', buffer: exported });
    assert.equal(await presetPage.getByLabel('生效预设').locator('option').count(), 3);
    await presetPage.locator('input[type=file]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":999}') });
    assert.ok((await presetPage.getByRole('status').textContent()).includes('不支持'));
    assert.equal(await presetPage.getByLabel('生效预设').locator('option').count(), 3);
    await presetPage.locator('#tts-provider-select').selectOption('gpt_sovits');
    assert.equal(await presetPage.getByLabel('预设名称', { exact: true }).inputValue(), '本地自定义');
    const persisted = await presetPage.evaluate(async () => {
        const { PromptPresetStore } = await import('/frontend/js/prompt_presets.js');
        return new PromptPresetStore('base').active('gpt_sovits').name;
    });
    assert.equal(persisted, '本地自定义');
    await presetPage.getByRole('button', { name: '恢复内置', exact: true }).click();
    assert.equal(await presetPage.getByLabel('预设名称', { exact: true }).inputValue(), 'GPT-SoVITS 默认');
    await presetPage.evaluate(async () => {
        const { recordingKey } = await import('/frontend/js/fulltext_recording.js');
        window.TTS_API = { _url: path => path, _headers: extra => extra };
        const snapshot = { id: 0, raw: 'same message', chatId: 'fixture' };
        const plain = await recordingKey(snapshot, {});
        localStorage.setItem('tts_reading_settings', JSON.stringify({ enableEmotionalNarration: true, narrator: 'Alice' }));
        if (await recordingKey(snapshot, {}) === plain) throw new Error('Emotional recording reused old plain audio');
    });
    await presetPage.evaluate(async () => {
        const { FishAudioProvider } = await import('/frontend/js/providers/fish_audio_provider.js');
        const { MiniMaxProvider } = await import('/frontend/js/providers/minimax_provider.js');
        const { GPTSoVITSProvider } = await import('/frontend/js/providers/gpt_sovits_provider.js');
        const calls = [];
        window.TTS_API = { checkCache: async params => { calls.push(params); return { cached: false }; }, generateAudio: async params => { calls.push(params); return { blob: new Blob(['fixture']), filename: 'fixture.wav' }; } };
        for (const Provider of [FishAudioProvider, MiniMaxProvider]) {
            const provider = new Provider({});
            await provider.checkCache({ text: '旁白', charName: 'Alice', emotion: 'sad' }, {});
            const audio = await provider.generateAudio({ text: '旁白', charName: 'Alice', emotion: 'sad' }, {});
            URL.revokeObjectURL(audio.audioUrl);
        }
        if (calls.some(call => call.emotion !== 'sad')) throw new Error('Provider dropped narration emotion');
        const local = new GPTSoVITSProvider({});
        const ref = local.selectRefAudio({ emotion: '紧张' }, { languages: { default: [{ emotion: 'happy', path: 'happy.wav' }, { emotion: 'default', path: 'default.wav' }] } });
        if (ref.path !== 'default.wav') throw new Error('Missing local narration emotion did not fall back');
    });
    if (process.env.READING_SCREENSHOT_DIR) {
        await presetPage.addStyleTag({ content: 'body { background:#202329;color:#eee;font:14px Arial;margin:16px; } .text_pole { display:block;box-sizing:border-box;width:100%;background:#30343b;color:#eee; } button { margin:3px;max-width:100%;white-space:normal;overflow-wrap:anywhere; }' });
        await presetPage.setViewportSize({ width: 390, height: 844 });
        await presetPage.screenshot({ path: path.join(process.env.READING_SCREENSHOT_DIR, 'prompt-presets-mobile.png'), fullPage: true });
        assert.equal(await presetPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await presetPage.close();
    console.log('Preset browser UI: save, provider switching, chat isolation, download/import, invalid-file rejection, reset, persistence and emotional recording identity passed.');
    console.log(`Reading browser regressions passed (${results.length} assertions).`);
    for (const result of results) console.log(`  ✓ ${result}`);
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
