const roots = new Set(['dashboard', 'models', 'audios', 'workshop', 'prompt_emotions', 'providers', 'settings']);
let bound = false;

export function renderStudioRoute() {
    const [root, sub, encodedModel] = location.hash.slice(1).split('/');
    if (!roots.has(root)) return;
    document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === root));
    document.querySelectorAll('.nav-item[data-page]').forEach(link => {
        link.classList.toggle('active', link.dataset.page === root);
        if (link.dataset.page === root) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (root === 'providers' || root === 'settings') {
        const page = document.getElementById(root);
        const tabs = [...page.querySelectorAll('.settings-tab')];
        const active = tabs.find(tab => tab.dataset.tab === sub) || tabs[0];
        tabs.forEach(tab => { tab.classList.toggle('active', tab === active); tab.setAttribute('aria-pressed', String(tab === active)); });
        page.querySelectorAll('.settings-tab-content').forEach(panel => panel.classList.toggle('active', panel.id === `settings-tab-${active?.dataset.tab}`));
    }
    if (root !== 'prompt_emotions') return;
    const models = sub === 'models';
    document.getElementById('prompt-presets-view').hidden = models;
    document.getElementById('prompt-models-view').hidden = !models;
    document.getElementById('btn-save-prompt-emotions').hidden = !models;
    document.querySelectorAll('[data-prompt-view]').forEach(link => {
        const active = link.dataset.promptView === (models ? 'models' : 'presets');
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    let name = '';
    try { name = decodeURIComponent(encodedModel || ''); } catch { /* Invalid deep link returns to the list. */ }
    const cards = [...document.querySelectorAll('.model-emotion-card')];
    const selected = models && cards.find(card => card.dataset.model === name);
    cards.forEach(card => { card.hidden = card !== selected; });
    document.getElementById('model-emotion-overview').hidden = Boolean(selected);
    document.getElementById('model-emotion-breadcrumb').hidden = !selected;
    document.getElementById('model-emotion-detail-title').textContent = selected ? name : '';
    document.querySelectorAll('[data-model-list-tools]').forEach(el => { el.hidden = Boolean(selected); });
}

export function initStudioNavigation() {
    if (!bound) {
        bound = true;
        window.addEventListener('hashchange', renderStudioRoute);
    }
    renderStudioRoute();
}

function foldFields(panel, title, ids) {
    if (!panel || panel.querySelector(`[data-fold="${title}"]`)) return;
    const fields = [...new Set(ids.map(id => document.getElementById(id)?.closest('.form-group')).filter(Boolean))];
    if (!fields.length) return;
    const fold = document.createElement('details'); fold.className = 'studio-fold'; fold.dataset.fold = title;
    const summary = document.createElement('summary'); summary.textContent = title; fold.append(summary);
    const form = panel.querySelector('.settings-form') || panel;
    form.append(fold); fields.forEach(field => fold.append(field));
}

export function organizeProviderFields() {
    const ids = {
        minimax: ['setting-minimax-group-id', 'setting-minimax-api-url', 'setting-minimax-custom-emotions', 'setting-minimax-speed'],
        elevenlabs: ['setting-elevenlabs-api_base'],
        fish_audio: ['setting-fish_audio-api-url', 'setting-fish_audio-speed', 'setting-fish_audio-vol'],
    };
    for (const [provider, fields] of Object.entries(ids)) {
        const panel = document.getElementById(`settings-tab-${provider}`);
        foldFields(panel, '高级设置', fields);
        panel?.querySelectorAll('.settings-form > small, :scope > p').forEach(el => { el.hidden = true; });
    }
}
