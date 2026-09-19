async function request(path, method = 'GET', body) {
    const api = window.TTS_API;
    const response = await fetch(api._url(path), { method,
        headers: api._headers({ 'Content-Type': 'application/json' }),
        ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'ElevenLabs 请求失败');
    return result;
}

export function syncElevenLabsSettings(settings) {
    const cfg = settings?.elevenlabs_tts || {};
    for (const key of ['api_key', 'api_base', 'default_voice_id', 'stability']) {
        const node = document.getElementById(`tts-eleven-${key}`);
        if (node && document.activeElement !== node) node.value = cfg[key] ?? (key === 'stability' ? 0.5 : key === 'api_base' ? 'https://api.elevenlabs.io' : '');
    }
    $('#tts-eleven-audio_tags').prop('checked', cfg.audio_tags !== false);
    $('#tts-provider-panel-elevenlabs').trigger('tts:voices');
}

export function mountElevenLabsSettings() {
    const $root = $('#tts-provider-panel-elevenlabs').empty();
    if (!$root.length) return;
    $('<p>').text('Eleven V3 · 高级 Audio Tags。每段生成完整音频后播放。').appendTo($root);
    const field = (label, input) => { $('<label style="display:block;margin:8px 0">').append($('<span>').text(label), input.css('width', '100%')).appendTo($root); return input; };
    field('API Key', $('<input id="tts-eleven-api_key" type="password" class="text_pole" autocomplete="off">'));
    field('API 根地址', $('<input id="tts-eleven-api_base" class="text_pole">'));
    field('默认 Voice ID', $('<input id="tts-eleven-default_voice_id" class="text_pole">'));
    field('V3 表现力', $('<select id="tts-eleven-stability" class="text_pole">').append(
        $('<option value="0">').text('创意 · 情绪更强'), $('<option value="0.5">').text('自然 · 推荐'), $('<option value="1">').text('稳健 · 更克制')));
    $('<label>').append($('<input id="tts-eleven-audio_tags" type="checkbox">'), document.createTextNode('启用高级 Audio Tags')).appendTo($root);
    $('<p>').text('例：[Alice, whisper] “ [whispers] 别出声。[sighs] 我听见了。” 标签放在台词引号内。').appendTo($root);
    const $status = $('<p role="status">').appendTo($root);
    const action = (label, fn) => $('<button type="button" class="menu_button">').text(label).appendTo($root).on('click', async function () {
        $(this).prop('disabled', true); $status.text('处理中…');
        try { await fn(); } catch (error) { $status.text(error.message); }
        finally { $(this).prop('disabled', false); }
    });
    const updateVoices = voices => {
        window.TTS_State.CACHE.elevenlabs_voices = voices;
        renderVoices(); window.TTS_UI?.renderModelOptions?.();
    };
    action('保存 V3 配置', async () => {
        const cfg = { model: 'eleven_v3', audio_tags: $('#tts-eleven-audio_tags').prop('checked') };
        for (const key of ['api_key', 'api_base', 'default_voice_id']) cfg[key] = $(`#tts-eleven-${key}`).val().trim();
        cfg.stability = Number($('#tts-eleven-stability').val());
        await request('/update_settings', 'POST', { elevenlabs_tts: cfg });
        window.TTS_State.CACHE.settings.elevenlabs_tts = { ...window.TTS_State.CACHE.settings.elevenlabs_tts, ...cfg };
        $status.text('V3 配置已保存'); window.TTS_PromptInjector?.refreshAndInject();
        window.TTS_UI?.renderModelOptions?.();
    });
    action('连接并同步音色', async () => { const result = await request('/tts/elevenlabs/sync', 'POST'); updateVoices(result.voices); $status.text(result.message); });
    const $id = field('手动添加 Voice ID', $('<input class="text_pole" aria-label="ElevenLabs Voice ID">'));
    const $name = field('音色备注', $('<input class="text_pole" aria-label="ElevenLabs 音色备注">'));
    action('保存音色', async () => {
        const result = await request('/tts/elevenlabs/voices', 'POST', { id: $id.val().trim(), name: $name.val().trim() || $id.val().trim() });
        updateVoices(result.voices); $status.text('音色已保存，可在角色绑定中选择');
    });
    const $voices = $('<div>').appendTo($root);
    const renderVoices = () => {
        $voices.empty();
        for (const voice of window.TTS_State?.CACHE?.elevenlabs_voices || []) {
            $('<div>').append($('<span>').text(`${voice.name} · ${voice.id} `),
                $('<button type="button" class="menu_button">').text('编辑').on('click', () => { $id.val(voice.id); $name.val(voice.name); }),
                $('<button type="button" class="menu_button">').text('移除').on('click', async () => {
                    try { const result = await request('/tts/elevenlabs/voices/' + encodeURIComponent(voice.id), 'DELETE'); updateVoices(result.voices); }
                    catch (error) { $status.text(error.message); }
                })).appendTo($voices);
        }
    };
    $root.off('tts:voices').on('tts:voices', renderVoices);
    syncElevenLabsSettings(window.TTS_State?.CACHE?.settings); renderVoices();
}
