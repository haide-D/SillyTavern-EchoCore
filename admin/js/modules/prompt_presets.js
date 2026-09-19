import { PromptPresetStore, PROVIDER_RULES } from '/static/js/prompt_presets.js';
import { API_BASE } from '../core/api.js';

// The admin uses the same schema as the extension, but saves to the backend.
export function mountAdminPromptPresets(baseTemplate, config = {}) {
    const root = document.getElementById('admin-prompt-presets');
    const resetButton = document.getElementById('btn-reset-prompt-template');
    const templateFold = document.getElementById('prompt-template-fold');
    const template = document.getElementById('setting-prompt-template');
    const store = new PromptPresetStore(baseTemplate, { getItem: () => null, setItem: () => {} });
    if (config.provider_presets) store.commit(config.provider_presets);
    else if (config.custom_template?.trim() && config.custom_template.trim() !== baseTemplate.trim()) {
        for (const provider of Object.keys(PROVIDER_RULES)) {
            store.save({ ...store.active(provider), name: '原有自定义模板', template: config.custom_template }, true);
        }
    }
    resetButton.remove();
    templateFold.remove();
    root.replaceChildren();
    const row = document.createElement('div'); row.className = 'prompt-preset-fields'; root.append(row);
    const field = (parent, title, tag, label = title) => {
        const wrapper = document.createElement('label'); wrapper.textContent = title;
        const input = document.createElement(tag); input.className = 'input'; input.setAttribute('aria-label', label);
        wrapper.append(input); parent.append(wrapper); return input;
    };
    const provider = field(row, '供应商', 'select', '提示词供应商');
    for (const [id, [name]] of Object.entries(PROVIDER_RULES)) provider.add(new Option(name, id));
    const list = field(row, '生效预设', 'select');
    const name = field(row, '预设名称', 'input'); name.maxLength = 100;
    const actions = document.createElement('div'); actions.className = 'prompt-preset-actions'; root.append(actions);
    const details = document.createElement('details'); details.className = 'studio-fold';
    const summary = document.createElement('summary'); summary.textContent = '发音规则与情绪'; details.append(summary); root.append(details);
    root.insertBefore(templateFold, details);
    const rules = field(details, '标点与发音规则', 'textarea'); rules.rows = 3;
    const emotions = field(details, '可用情绪（逗号分隔；留空沿用参考音频）', 'input', '可用情绪');
    const overwriteLabel = document.createElement('label'); overwriteLabel.className = 'preset-overwrite';
    const overwrite = document.createElement('input'); overwrite.type = 'checkbox';
    overwriteLabel.append(overwrite, '导入时覆盖同 ID 预设'); details.append(overwriteLabel);
    const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true; root.append(file);
    const status = document.createElement('p'); status.setAttribute('role', 'status'); root.append(status);
    let current, busy = false;
    const drafts = new Map();
    const message = (text, error = false) => { status.textContent = text; status.dataset.error = String(error); };
    const edited = () => ({ ...current, name: name.value, template: template.value,
        punctuation_guide: rules.value, allowed_emotions: emotions.value.split(/[,，]/).map(e => e.trim()).filter(Boolean) });
    const stash = () => { if (current) drafts.set(current.id, edited()); };
    const refresh = () => {
        const active = store.active(provider.value);
        list.replaceChildren(...store.list(provider.value).map(p => new Option(p.name + (p.is_builtin ? ' · 内置' : ''), p.id)));
        list.value = active.id; current = active;
        const draft = drafts.get(active.id) || active;
        name.value = draft.name; template.value = draft.template; rules.value = draft.punctuation_guide;
        emotions.value = draft.allowed_emotions.join(', ');
        remove.disabled = busy || active.is_builtin;
    };
    const lock = value => {
        busy = value;
        root.querySelectorAll('button, input, select, textarea').forEach(el => { el.disabled = value; });
        template.disabled = value;
        resetButton.disabled = value;
        document.getElementById('btn-save-prompt-emotions').disabled = value;
        if (!value) remove.disabled = store.active(provider.value).is_builtin;
    };
    const capture = () => {
        const draft = edited();
        if (JSON.stringify(draft) !== JSON.stringify(current)) store.save(draft);
        else store.select(provider.value, current.id);
    };
    const persist = async (extra = {}, action = capture, clearDraft = true) => {
        if (busy) return false;
        const before = structuredClone(store.state);
        lock(true); message('正在保存…');
        try {
            action();
            const res = await fetch(`${API_BASE}/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt_injector: { ...extra, provider_presets: store.state } }) });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `保存失败 (${res.status})`);
            if (clearDraft) drafts.delete(current.id);
            refresh(); message('已保存 · 刷新酒馆生效'); return true;
        } catch (error) {
            store.commit(before); list.value = current.id; message(error.message, true); return false;
        } finally { lock(false); }
    };
    const button = (label, action, primary = false) => {
        const el = document.createElement('button'); el.type = 'button'; el.className = `btn ${primary ? 'btn-success' : 'btn-secondary'}`;
        el.textContent = label; el.onclick = action; actions.append(el); return el;
    };
    button('新建', () => { stash(); persist({}, () => store.save({ ...store.builtins[`builtin_${provider.value}`], name: '新预设' }, true), false); });
    button('保存预设', () => persist(), true);
    button('另存为', () => persist({}, () => store.save(edited(), true)));
    const remove = button('删除', () => persist({}, () => store.remove(current.id)));
    const tools = document.createElement('details'); tools.className = 'studio-fold preset-tools';
    const toolsSummary = document.createElement('summary'); toolsSummary.textContent = '导入导出与管理'; tools.append(toolsSummary);
    const toolActions = document.createElement('div'); toolActions.className = 'prompt-preset-actions'; tools.append(toolActions);
    root.insertBefore(tools, status); toolActions.append(remove, resetButton);
    const download = id => {
        const url = URL.createObjectURL(new Blob([store.export(id)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'echocore-prompt-presets.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    toolActions.append(button('导出当前', () => download(current.id)), button('导出全部', () => download()), button('导入', () => file.click()));
    tools.append(overwriteLabel);
    provider.onchange = () => { stash(); refresh(); message(''); };
    list.onchange = () => { stash(); const id = list.value; persist({}, () => store.select(provider.value, id), false); };
    file.onchange = async () => {
        try {
            const selected = file.files[0]; if (!selected) return;
            if (selected.size > 2000000) throw new Error('预设文件不能超过 2MB');
            const raw = await selected.text();
            await persist({}, () => store.import(raw, overwrite.checked));
        } catch (error) { message(error.message, true); }
        finally { file.value = ''; }
    };
    resetButton.onclick = () => persist({}, () => {
        const id = `builtin_${provider.value}`; store.select(provider.value, id); drafts.delete(id);
    });
    template.oninput = name.oninput = rules.oninput = emotions.oninput = () => message('未保存');
    refresh();
    return { save: extra => persist(extra) };
}
