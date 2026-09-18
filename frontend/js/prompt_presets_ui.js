import { PROVIDER_RULES } from './prompt_presets.js';

export function mountPromptPresets() {
    const injector = window.TTS_PromptInjector;
    const $root = $('#tts-prompt-presets').empty();
    if (!$root.length || !injector) return;
    const store = injector.getPresetStore();
    const field = (title, input) => {
        input.css({ width: '100%', boxSizing: 'border-box' });
        $('<label style="display:block;margin:8px 0">').append($('<span>').text(title), input).appendTo($root);
        return input;
    };
    const $provider = field('供应商', $('<select class="text_pole" aria-label="提示词供应商">'));
    for (const [id, [name]] of Object.entries(PROVIDER_RULES)) $provider.append($('<option>').val(id).text(name));
    $provider.val(injector.getProvider());
    const $list = field('生效预设', $('<select class="text_pole" aria-label="生效预设">'));
    const $name = field('名称', $('<input class="text_pole" maxlength="100" aria-label="预设名称">'));
    const $rules = field('标点与发音规则', $('<textarea class="text_pole" rows="3" aria-label="标点规则">'));
    const $emotions = field('可用情绪（逗号分隔；本地留空沿用参考音频）', $('<input class="text_pole" aria-label="可用情绪">'));
    const $template = field('提示词模板', $('<textarea class="text_pole" rows="12" aria-label="提示词模板">'));
    const $status = $('<p role="status">').text(store.loadError || '').appendTo($root);
    const refresh = () => {
        const active = store.active($provider.val());
        $list.empty();
        for (const preset of store.list($provider.val())) $list.append($('<option>').val(preset.id).text(preset.name + (preset.is_builtin ? '（内置）' : '')));
        $list.val(active.id); $name.val(active.name); $rules.val(active.punctuation_guide);
        $template.val(active.template); $emotions.val(active.allowed_emotions.join(', '));
    };
    const run = action => { try { action(); injector.refreshAndInject(); refresh(); $status.text('已保存，提示词已更新'); } catch (error) { $status.text(error.message); } };
    const edited = () => ({ ...store.active($provider.val()), name: $name.val(), template: $template.val(),
        punctuation_guide: $rules.val(), allowed_emotions: $emotions.val().split(/[,，]/).map(e => e.trim()).filter(Boolean) });
    const button = (label, action) => $('<button type="button" class="menu_button">').css({ maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere' }).text(label).on('click', action).appendTo($root);
    $provider.on('change', refresh);
    $list.on('change', () => run(() => store.select($provider.val(), $list.val())));
    button('新建', () => run(() => store.save({ ...store.builtins[`builtin_${$provider.val()}`], name: '新预设' }, true)));
    button('保存 / 重命名', () => run(() => store.save(edited())));
    button('另存为', () => run(() => store.save(edited(), true)));
    button('恢复内置', () => run(() => store.select($provider.val(), `builtin_${$provider.val()}`)));
    button('删除自定义预设', () => run(() => store.remove($list.val())));
    $('<p>').text('内置预设修改后保存为自定义版本。全文模板开启时，正文结构与旁白规则优先。').appendTo($root);
    for (const slot of ['primary_character_note', 'bound_characters_section', 'skipped_characters_section', 'punctuation_rules']) {
        button(`插入 ${slot}`, () => {
            const input = $template[0]; input.setRangeText(`{{${slot}}}`, input.selectionStart, input.selectionEnd, 'end'); input.focus();
        });
    }
    const download = id => {
        const url = URL.createObjectURL(new Blob([store.export(id)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'echocore-prompt-presets.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    button('导出当前预设', () => download($list.val()));
    button('导出全部自定义预设', () => download());
    const $overwrite = $('<input type="checkbox">');
    $('<label>').append($overwrite, document.createTextNode('导入时覆盖同 ID 预设（默认保留双方）')).appendTo($root);
    const $file = $('<input type="file" accept=".json,application/json" hidden>').appendTo($root).on('change', async () => {
        try {
            const file = $file[0].files[0]; if (!file) return;
            if (file.size > 2000000) throw new Error('预设文件不能超过 2MB');
            const raw = await file.text(); run(() => store.import(raw, $overwrite.prop('checked')));
        } catch (error) { $status.text(error.message); }
        finally { $file.val(''); }
    });
    button('导入 JSON', () => $file[0].click());
    $('#tts-provider-select').off('change.promptPresets').on('change.promptPresets', event => {
        $provider.val(event.target.value); refresh();
    });
    refresh();
}
