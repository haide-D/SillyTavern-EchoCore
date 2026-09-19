// Actual admin editor + injector modules, fixture settings only. No paid API calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root = process.cwd();
const html = await fs.readFile('admin/index.html', 'utf8');
const fixture = html.replace(/<script\b[\s\S]*?<\/script>/g, '').replaceAll('href="css/', 'href="/admin/css/');
let settings = { analysis_engine: { llm: { api_url: 'https://fixture.invalid/v1', api_key: 'fixture-only', model: 'fixture' } }, prompt_injector: { custom_template: 'Legacy {{bound_characters_section}}', models: { Voice: { speed: 1.2, emotions: { default: 'fixture' } } } } };
let fail = false, writes = 0, lastPayload;
const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://fixture');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (url.pathname === '/api/admin/settings') {
            if (req.method === 'POST') {
                writes++;
                if (fail) { res.statusCode = 500; res.end('{"detail":"fixture 保存失败"}'); return; }
                let raw = ''; for await (const chunk of req) raw += chunk;
                const update = JSON.parse(raw);
                lastPayload = structuredClone(update);
                settings = { ...settings, ...update, prompt_injector: { ...settings.prompt_injector, ...update.prompt_injector } };
            }
            res.end(JSON.stringify(settings)); return;
        }
        if (url.pathname === '/api/admin/models') { res.end(JSON.stringify({ models: [{ name: 'Voice' }, { name: 'Rain / ☔' }] })); return; }
        if (url.pathname === '/api/admin/status' || url.pathname === '/api/admin/version/check') { res.end('{}'); return; }
        if (url.pathname === '/api/admin/models/Voice/audios') { res.end(JSON.stringify({ audios: [{ emotion: 'default', text: 'fixture sentence' }] })); return; }
        if (url.pathname === '/api/admin/llm/chat') { res.end(JSON.stringify({ choices: [{ message: { content: '{"default":"fixture AI 场景"}' } }] })); return; }
        if (url.pathname === '/entry') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html.replaceAll('href="css/', 'href="/admin/css/').replaceAll('src="js/', 'src="/admin/js/')); return;
        }
        if (url.pathname === '/') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(fixture.replace('</body>', `<script type="module">import {initPromptEmotionsPage} from '/admin/js/modules/prompt_emotions.js'; import {loadSettings,bindSettingsTabs,saveSettings} from '/admin/js/modules/settings.js'; window.saveSettings=saveSettings; bindSettingsTabs(); await loadSettings(); await initPromptEmotionsPage(); window.ready=true;</script></body>`)); return;
        }
        const relative = url.pathname.startsWith('/static/') ? 'frontend/' + url.pathname.slice(8) : url.pathname.slice(1);
        const target = path.resolve(root, relative);
        if (!['admin', 'frontend'].some(dir => target.startsWith(path.join(root, dir) + path.sep))) throw new Error('path');
        res.setHeader('Content-Type', target.endsWith('.css') ? 'text/css' : 'text/javascript');
        res.end(await fs.readFile(target));
    } catch { res.statusCode = 404; res.end('{}'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
    browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1360, height: 960 } });
    await page.route('https://**', route => route.abort());
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const origin = `http://127.0.0.1:${server.address().port}`;
    let reloads = 0;
    const load = async () => { await page.goto(origin + '/?reload=' + (++reloads) + '#prompt_emotions/presets'); await page.waitForFunction(() => window.ready); };
    await load();
    const provider = page.getByLabel('提示词供应商');
    const name = page.getByLabel('预设名称', { exact: true });
    const template = page.locator('#setting-prompt-template');
    const status = page.locator('#admin-prompt-presets [role="status"]');
    const clickSave = async label => {
        if (['删除', '导出当前', '导出全部', '导入'].includes(label)) await openTools();
        await page.getByRole('button', { name: label, exact: true }).click();
        await page.waitForFunction(() => document.querySelector('#admin-prompt-presets [role="status"]').textContent.startsWith('已保存'));
    };
    const openTools = async () => { if (!await page.locator('.preset-tools').evaluate(el => el.open)) await page.locator('.preset-tools > summary').click(); };
    const openTemplate = async () => { if (!await page.locator('#prompt-template-fold').evaluate(el => el.open)) await page.locator('#prompt-template-fold > summary').click(); };
    assert.equal(await page.locator('#prompt-template-fold').evaluate(el => el.open), false);
    assert.equal(await template.inputValue(), 'Legacy {{bound_characters_section}}');
    await provider.selectOption('elevenlabs');
    await openTemplate();
    await name.fill('V3 小说'); await template.fill('V3 fixture {{bound_characters_section}} [whispers]');
    await clickSave('保存预设');
    const savedId = settings.prompt_injector.provider_presets.active_presets.elevenlabs;
    assert.equal(settings.prompt_injector.models.Voice.speed, 1.2);
    await provider.selectOption('minimax'); assert.equal(await template.inputValue(), 'Legacy {{bound_characters_section}}');
    await provider.selectOption('elevenlabs'); assert.equal(await name.inputValue(), 'V3 小说');
    await load(); assert.equal(await name.inputValue(), '原有自定义模板');
    await provider.selectOption('elevenlabs'); assert.match(await template.inputValue(), /V3 fixture/);
    await name.fill('V3 轻声'); await clickSave('另存为');
    assert.notEqual(settings.prompt_injector.provider_presets.active_presets.elevenlabs, savedId);
    const downloadPromise = page.waitForEvent('download');
    await openTools();
    await page.getByRole('button', { name: '导出当前', exact: true }).click();
    const download = await downloadPromise;
    const raw = await fs.readFile(await download.path(), 'utf8');
    assert.equal(Object.values(JSON.parse(raw).presets)[0].name, 'V3 轻声');
    await page.locator('#admin-prompt-presets input[type=file]').setInputFiles({ name: 'presets.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
    await page.waitForFunction(() => document.querySelector('#admin-prompt-presets [role="status"]').textContent.startsWith('已保存'));
    assert.equal(Object.values(settings.prompt_injector.provider_presets.presets).filter(p => p.provider === 'elevenlabs').length, 3);
    const importedId = settings.prompt_injector.provider_presets.active_presets.elevenlabs;
    await clickSave('删除'); await load(); await provider.selectOption('elevenlabs');
    assert.equal(settings.prompt_injector.provider_presets.presets[importedId], undefined);
    assert.equal(await page.getByLabel('生效预设').inputValue(), 'builtin_elevenlabs');
    // Repeated initialization must not register duplicate slot/save handlers.
    await page.evaluate(async () => (await import('/admin/js/modules/prompt_emotions.js')).initPromptEmotionsPage());
    await openTemplate();
    await provider.selectOption('elevenlabs'); await template.fill('Draft');
    await page.locator('.btn-slot-insert').first().click();
    assert.equal((await template.inputValue()).match(/bound_characters_section/g).length, 1);
    const beforeWrites = writes;
    await clickSave('保存预设'); assert.equal(writes, beforeWrites + 1);
    await page.locator('[data-prompt-view="models"]').click();
    assert.equal(await page.locator('.model-emotion-card:visible').count(), 0);
    await page.locator('.model-entry a').filter({ hasText: 'Voice' }).click();
    await page.getByLabel('Voice default 场景', { exact: true }).fill('情绪草稿');
    await page.locator('#model-emotion-breadcrumb a').click();
    await page.locator('.model-entry a').filter({ hasText: 'Voice' }).click();
    assert.equal(await page.getByLabel('Voice default 场景', { exact: true }).inputValue(), '情绪草稿');
    assert.equal(await page.locator('.model-emotion-card:visible').count(), 1);
    await page.getByRole('button', { name: '保存情绪配置', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('btn-save-prompt-emotions').disabled);
    assert.deepEqual(Object.keys(lastPayload.prompt_injector), ['models']);
    assert.equal(settings.prompt_injector.models.Voice.emotions.default, '情绪草稿');
    await page.locator('[data-prompt-view="presets"]').click();
    assert.equal(settings.prompt_injector.models.Voice.speed, 1.2);
    const before = structuredClone(settings);
    fail = true; await name.fill('失败草稿');
    await page.getByRole('button', { name: '保存预设', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#admin-prompt-presets [role="status"]').dataset.error === 'true');
    assert.match(await status.textContent(), /保存失败/); assert.deepEqual(settings, before);
    fail = false;
    await page.locator('#admin-prompt-presets input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
    await page.waitForTimeout(100); assert.deepEqual(settings, before);
    // Backend presets drive real prompt compilation, and frontend edits save to the same backend.
    const injected = await page.evaluate(async () => {
        const { PromptInjector } = await import('/frontend/js/prompt_injector.js');
        const { TTS_API } = await import('/frontend/js/api.js'); TTS_API.init(location.origin);
        const cfg = await (await fetch('/api/admin/settings')).json();
        window.TTS_State = { CACHE: { settings: cfg, mappings: { Alice: 'elevenlabs:voice' }, models: {} } };
        const ctx = { chat: [], name2: 'Alice', extensionSettings: { st_direct_tts: { active_provider: 'elevenlabs' } }, setExtensionPrompt(key, text) { window.injected = text; } };
        window.SillyTavern = { getContext: () => ctx };
        PromptInjector.refreshAndInject(); const first = window.injected;
        const store = PromptInjector.getPresetStore(); store.save({ ...store.active('elevenlabs'), name: '酒馆修改', template: 'Shared frontend template {{bound_characters_section}}' });
        await PromptInjector.persistPresets();
        return first;
    });
    assert.match(injected, /Draft/);
    await load(); await provider.selectOption('elevenlabs'); assert.equal(await name.inputValue(), '酒馆修改');
    await fs.mkdir('scratch/admin-preset-verification', { recursive: true });
    await page.screenshot({ path: 'scratch/admin-preset-verification/desktop.png', animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'scratch/admin-preset-verification/mobile.png', fullPage: true, animations: 'disabled' });
    const width = await page.locator('#admin-prompt-presets').evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    assert.ok(width.scroll <= width.client + 1);
    const deleted = settings.prompt_injector.provider_presets.active_presets.elevenlabs;
    await clickSave('删除'); await load();
    const afterDelete = await page.evaluate(async () => {
        const { PromptInjector } = await import('/frontend/js/prompt_injector.js');
        const { TTS_API } = await import('/frontend/js/api.js'); TTS_API.init(location.origin);
        window.TTS_State = { CACHE: { settings: await (await fetch('/api/admin/settings')).json() } };
        const store = PromptInjector.getPresetStore();
        return { active: store.active('elevenlabs').id, ids: Object.keys(store.state.presets) };
    });
    assert.equal(afterDelete.active, 'builtin_elevenlabs');
    assert.ok(!afterDelete.ids.includes(deleted), 'backend deletions also remove previously synced browser presets after reload');
    // Independent provider routes and save scopes. Moving DOM must preserve form drafts.
    await page.locator('.nav-item[data-page="providers"]').click();
    await page.locator('#providers [data-tab="elevenlabs"]').click();
    await page.locator('#setting-elevenlabs-default_voice_id').fill('fixture-voice');
    await page.locator('#setting-elevenlabs-api_key').fill('fixture-only');
    await page.locator('.nav-item[data-page="settings"]').click();
    assert.equal(await page.locator('#settings #setting-elevenlabs-api_key').count(), 0);
    await page.locator('#setting-base-dir').fill('fixture-draft-dir');
    await page.locator('.nav-item[data-page="providers"]').click();
    await page.locator('#providers [data-tab="elevenlabs"]').click();
    assert.equal(await page.locator('#setting-elevenlabs-default_voice_id').inputValue(), 'fixture-voice');
    await page.locator('#btn-save-provider').click();
    await page.waitForFunction(() => !document.getElementById('btn-save-provider').disabled);
    assert.deepEqual(Object.keys(lastPayload), ['elevenlabs_tts']);
    assert.equal(settings.base_dir, undefined, 'provider save leaves system draft untouched');
    await page.locator('.nav-item[data-page="settings"]').click();
    await page.locator('#btn-save-system').click();
    await page.waitForFunction(() => !document.getElementById('btn-save-system').disabled);
    assert.equal(lastPayload.base_dir, 'fixture-draft-dir');
    for (const key of ['elevenlabs_tts', 'fish_audio_tts', 'minimax_tts', 'sovits_host', 'prompt_injector']) assert.ok(!(key in lastPayload));
    await page.locator('.nav-item[data-page="providers"]').click();
    await page.locator('#providers [data-tab="minimax"]').click();
    assert.equal(await page.locator('#settings-tab-minimax details').evaluate(el => el.open), false);
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('#providers .settings-tab.active').dataset.tab === 'gpt_sovits');
    await page.goto(origin + '/#prompt_emotions/models/' + encodeURIComponent('Rain / ☔'));
    await page.waitForFunction(() => window.ready);
    assert.equal(await page.locator('#model-emotion-detail-title').textContent(), 'Rain / ☔');
    assert.equal(await page.locator('.model-emotion-card:visible').count(), 1);
    await page.locator('#model-emotion-breadcrumb a').click();
    await page.getByLabel('搜索模型').fill('Voice');
    assert.equal(await page.locator('.model-entry:visible').count(), 1);
    await fs.mkdir('scratch/admin-studio-verification', { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByLabel('搜索模型').fill('');
    await page.screenshot({ path: 'scratch/admin-studio-verification/models.png', animations: 'disabled' });
    await page.locator('[data-prompt-view="presets"]').click();
    await page.screenshot({ path: 'scratch/admin-studio-verification/presets.png', animations: 'disabled' });
    await page.locator('.nav-item[data-page="providers"]').click();
    await page.locator('#providers [data-tab="elevenlabs"]').click();
    await page.screenshot({ path: 'scratch/admin-studio-verification/provider.png', animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'scratch/admin-studio-verification/provider-mobile.png', fullPage: true, animations: 'disabled' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile provider page has no horizontal overflow');
    // Production entry point wires the same hierarchy, and navigating away does not reload drafts.
    await page.goto(origin + '/entry#providers/elevenlabs');
    await page.locator('[data-close-dialog="notice-dialog"]').click();
    await page.waitForFunction(() => document.getElementById('setting-elevenlabs-default_voice_id').value === 'fixture-voice');
    assert.equal(await page.locator('#providers .settings-tab.active').getAttribute('data-tab'), 'elevenlabs');
    await page.locator('.nav-item[data-page="prompt_emotions"]').click();
    await page.getByLabel('预设名称', { exact: true }).fill('导航草稿');
    await page.locator('.nav-item[data-page="providers"]').click();
    await page.locator('.nav-item[data-page="prompt_emotions"]').click();
    assert.equal(await page.getByLabel('预设名称', { exact: true }).inputValue(), '导航草稿');
    await page.locator('[data-prompt-view="models"]').click();
    await page.locator('.model-entry a').filter({ hasText: 'Voice' }).click();
    await page.screenshot({ path: 'scratch/admin-studio-verification/model-mobile.png', fullPage: true, animations: 'disabled' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'mobile model detail has no horizontal overflow');
    await page.getByLabel('Voice default 场景', { exact: true }).fill('刷新后保留');
    await page.locator('#model-emotion-breadcrumb a').click();
    await page.locator('#btn-refresh-models-emotions').click();
    await page.waitForFunction(() => !document.getElementById('btn-refresh-models-emotions').disabled);
    await page.locator('.model-entry a').filter({ hasText: 'Voice' }).click();
    assert.equal(await page.getByLabel('Voice default 场景', { exact: true }).inputValue(), '刷新后保留');
    await page.locator('[data-prompt-view="presets"]').click();
    assert.equal(await page.getByLabel('预设名称', { exact: true }).inputValue(), '导航草稿');
    await page.locator('[data-prompt-view="models"]').click();
    await page.getByLabel('选择 Voice', { exact: true }).check();
    await page.locator('#btn-batch-ai-summarize').click();
    await page.waitForFunction(() => !document.getElementById('btn-batch-ai-summarize').disabled);
    await page.locator('.model-entry a').filter({ hasText: 'Voice' }).click();
    assert.equal(await page.getByLabel('Voice default 场景', { exact: true }).inputValue(), 'fixture AI 场景');
    assert.deepEqual(errors, []);
    console.log('Admin studio passed: preset CRUD/import/export and sync; folded editor/tools; model list/detail/back/deep links/search and preserved drafts; isolated provider/system/emotion saves; mobile overflow.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
