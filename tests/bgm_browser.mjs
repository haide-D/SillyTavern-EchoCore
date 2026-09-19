// Uses generated local WAV fixtures and real browser media/IndexedDB, no external APIs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = process.cwd();
const jquery = process.env.JQUERY_PATH || path.resolve(root, '../../../../public/lib/jquery-3.5.1.min.js');
const server = http.createServer(async (req, res) => {
    try {
        if (req.url === '/') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>
            <style>body{background:#171c1b;color:#e3e7dc;margin:0;padding:30px 22px;font:14px 'Segoe UI','Microsoft YaHei',sans-serif}#chat{max-width:760px;margin:auto}.mes{margin:25px 0 60px}.mes_text{font:18px/2.1 Georgia,'SimSun',serif}.name{opacity:.6;margin-bottom:12px}</style>
            <div id="chat"><div class="mes" mesid="0"><div class="mes_block"><div class="name">林雨 · 雨停之前</div><div class="mes_text"><p>窗外的雨还没有停。旧唱片转过最后一道刻痕，房间里只剩下潮湿的风。</p><p>“别急着走。”她把书轻轻合上。</p></div></div></div>
            <div class="mes" mesid="1"><div class="mes_block"><div class="name">林雨</div><div class="mes_text">她没有再翻开那本书。</div></div></div></div>
            <script src="/jquery.js"></script><script type="module">
            import { TTS_Reading } from '/frontend/js/reading_controller.js';
            import { BGM } from '/frontend/js/bgm_player.js';
            window.fixtureContext={chatId:'bgm-fixture-a',chat:[{mes:'<tts-body>窗外的雨还没有停。</tts-body>'},{mes:'<tts-body>她没有再翻开那本书。</tts-body>'}]};
            window.SillyTavern={getContext:()=>window.fixtureContext};
            window.TTS_State={CACHE:{settings:{},mappings:{},audioMemory:{}}};
            window.TTS_Utils={showNotification(){}};window.TTS_Events={stopAudio(){}};
            window.handlers={}; TTS_Reading.init({on:(name,fn)=>window.handlers[name]=fn},{CHAT_CHANGED:'chat'});
            window.reader=TTS_Reading;window.BGM=BGM; await BGM.init(); window.fixtureReady=true;
            </script></body></html>`); return;
        }
        const target = req.url === '/jquery.js' ? jquery : path.resolve(root, '.' + req.url);
        if (req.url !== '/jquery.js' && !target.startsWith(path.join(root, 'frontend', 'js') + path.sep) &&
            !['reading.css', 'sound_controls.css'].some(file => target === path.join(root, 'frontend', 'css', 'core', file))) throw Error('Not allowed');
        res.setHeader('Content-Type', target.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(await fs.readFile(target));
    } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const wav = Buffer.alloc(44 + 24000 * 2 * 4);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
let browser;
try {
    browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'], ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    const page = await browser.newPage({ viewport: { width: 1050, height: 850 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`); await page.waitForFunction(() => window.fixtureReady);
    assert.equal(await page.locator('.tts-reading-bar').count(), 2);
    assert.equal(await page.locator('.mes').first().evaluate(node => node.querySelector('.tts-reading-bar').nextElementSibling.matches('.mes_text')), true);
    await page.evaluate(async () => {
        const { highlightReading, clearReadingHighlight } = await import('/frontend/js/reading_controls.js');
        const node = document.querySelector('.mes'); const before = node.querySelector('.mes_text').innerHTML;
        highlightReading(node, '窗外的雨还没有停。');
        if (CSS.highlights.get('echocore-reading').size !== 1 || node.querySelector('.mes_text').innerHTML !== before) throw new Error('Highlight changed message markup');
        clearReadingHighlight();
    });
    await page.locator('.tts-bgm-open').first().click();
    await page.locator('input[type=file]').setInputFiles([{ name: '雨夜微光.wav', mimeType: 'audio/wav', buffer: wav }, { name: '林间慢行.wav', mimeType: 'audio/wav', buffer: wav }]);
    await page.waitForFunction(() => window.BGM.tracks.length === 2);
    assert.equal(await page.evaluate(() => BGM.playing), false, 'import does not autoplay');
    await page.locator('.tts-bgm-track').nth(1).click();
    await page.waitForFunction(() => window.BGM.playing);
    assert.equal(await page.locator('.tts-bgm-name').first().textContent(), '林间慢行');
    assert.equal(await page.locator('.tts-bgm-name').last().textContent(), '林间慢行', 'every message uses the single shared player');
    assert.equal(await page.evaluate(() => BGM.audio.loop && !BGM.audio.paused && BGM.audio.currentSrc.startsWith('blob:')), true);
    await page.locator('.tts-bgm-open').first().click();
    await page.getByRole('slider', { name: '音乐音量' }).fill('42');
    assert.equal(await page.evaluate(() => BGM.audio.volume), .42);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.tts-bgm-popover').count(), 0);
    assert.equal(await page.locator('.tts-bgm-open').first().evaluate(node => node === document.activeElement), true);
    await page.locator('.tts-bgm-toggle').first().click();
    assert.equal(await page.evaluate(() => BGM.audio.paused && !BGM.playing), true);
    const selected = await page.evaluate(() => BGM.selected);
    await page.reload(); await page.waitForFunction(() => window.fixtureReady);
    assert.deepEqual(await page.evaluate(() => [BGM.tracks.length, BGM.selected, BGM.volume, BGM.playing]), [2, selected, .42, false]);
    await page.locator('.tts-bgm-toggle').first().click(); await page.waitForFunction(() => BGM.playing);
    await page.evaluate(() => { fixtureContext.chatId = 'bgm-fixture-b'; handlers.chat(); });
    assert.deepEqual(await page.evaluate(() => [BGM.playing, BGM.url, BGM.volume]), [false, null, .28]);
    await page.evaluate(() => { fixtureContext.chatId = 'bgm-fixture-a'; handlers.chat(); });
    assert.deepEqual(await page.evaluate(() => [BGM.selected, BGM.volume, BGM.playing]), [selected, .42, false]);
    await page.evaluate(async () => { await Promise.all([BGM.play(BGM.tracks[0].id), BGM.play(BGM.tracks[1].id)]); });
    assert.equal(await page.evaluate(() => BGM.loadedId === BGM.tracks[1].id && BGM.playing), true, 'latest selection wins concurrent loads');
    await page.evaluate(async () => {
        BGM.pause(); const original = BGM.audio.play;
        BGM.audio.play = () => Promise.reject(new DOMException('fixture', 'NotAllowedError'));
        await BGM.play(); BGM.audio.play = original;
    });
    assert.equal(await page.evaluate(() => !BGM.playing && BGM.error.includes('播放按钮')), true);
    await page.locator('.tts-bgm-open').first().click();
    await page.locator('input[type=file]').setInputFiles({ name: 'invalid.wav', mimeType: 'audio/wav', buffer: Buffer.from('not audio') });
    await page.waitForFunction(() => BGM.error.includes('无法播放此音频'));
    assert.equal(await page.evaluate(() => BGM.tracks.length), 2);
    await page.locator('.tts-bgm-transport button').last().click(); await page.waitForFunction(() => BGM.playing && !BGM.busy);
    assert.equal(await page.evaluate(() => BGM.selected === BGM.tracks[0].id), true);
    if (process.env.READING_SCREENSHOT_DIR) {
        await fs.mkdir(process.env.READING_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.READING_SCREENSHOT_DIR, 'sound-controls-desktop.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const box = await page.locator('.tts-bgm-popover').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844);
    if (process.env.READING_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.READING_SCREENSHOT_DIR, 'sound-controls-mobile.png'), fullPage: true });
    await page.locator('.tts-bgm-remove').first().click();
    await page.waitForFunction(() => BGM.tracks.length === 1);
    assert.equal(await page.evaluate(() => !BGM.playing && BGM.url === null), true, 'removing current track releases audio and does not start another');
    await page.locator('.tts-bgm-remove').click(); await page.waitForFunction(() => BGM.tracks.length === 0);
    assert.equal(await page.locator('.tts-bgm-transport button:disabled').count(), 3);
    assert.deepEqual(errors, []);
    console.log('BGM browser integration passed: real WAV import/playback, shared player, volume, refresh persistence, chat isolation, rapid selection, blocked playback, invalid audio, deletion/release and mobile layout.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
