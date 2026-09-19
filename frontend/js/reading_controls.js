import { readingButton, readingIcon } from './reading_ui.js';
import { mountMusic } from './bgm_ui.js';

const audioFor = node => node.querySelector('.tts-fulltext-player audio');
const seconds = value => `${Math.floor((value || 0) / 60)}:${String(Math.floor((value || 0) % 60)).padStart(2, '0')}`;

export function updateReadingControls(reader, detail = '') {
    document.querySelectorAll('.tts-reading-bar').forEach(bar => {
        const node = bar.closest('.mes');
        const session = Number(node.getAttribute('mesid')) === reader.activeMessageId ? reader.session : null;
        const audio = audioFor(node);
        const playing = session ? session.phase === '播放' && !session.paused : audio && !audio.paused && !audio.ended;
        const paused = session ? session.paused : !playing;
        const main = bar.querySelector('.tts-reading-main');
        const label = session ? paused ? '继续' : '暂停' : playing ? '暂停' : '全文朗读';
        main.innerHTML = readingIcon(paused ? 'play' : 'pause');
        main.title = label; main.setAttribute('aria-label', label); main.setAttribute('aria-pressed', String(!!playing));
        bar.classList.toggle('is-playing', !!playing);
        const status = bar.querySelector('.tts-reading-status');
        if (session) {
            status.textContent = `${session.paused ? '已暂停' : session.phase === '播放' ? session.speaker || '朗读中' : session.phase} · ${session.index || 0}/${session.total || 0}`;
            status.title = detail || `已准备 ${session.prepared}/${session.total}`;
        } else {
            status.textContent = audio ? `${seconds(audio.currentTime)} / ${Number.isFinite(audio.duration) ? seconds(audio.duration) : '已保存'}` : '听这段故事';
            status.title = '';
        }
        const meter = bar.querySelector('.tts-r-meter');
        meter.title = session ? `已准备 ${session.prepared}/${session.total}` : '';
        const prev = bar.querySelector('.tts-reading-previous');
        const next = bar.querySelector('.tts-reading-next');
        prev.disabled = session ? session.phase !== '播放' || !session.readyIndices?.has(session.index - 2) : !audio || !Number.isFinite(audio.duration);
        next.disabled = session ? session.phase !== '播放' || !session.readyIndices?.has(session.index) : !audio || !Number.isFinite(audio.duration);
        for (const [button, name] of [[prev, session ? '上一段' : '后退 10 秒'], [next, session ? '下一段' : '前进 10 秒']]) {
            button.title = name; button.setAttribute('aria-label', name);
        }
        bar.querySelector('.tts-reading-stop').disabled = !session && !playing;
        const seek = bar.querySelector('.tts-reading-seek');
        seek.hidden = !!session || !audio || !Number.isFinite(audio.duration);
        if (!seek.hidden) { seek.max = audio.duration; seek.value = audio.currentTime; }
        bar.querySelectorAll('[data-recording-action]').forEach(button => { button.hidden = !audio; });
    });
}

export function mountReadingControls(node, reader) {
    const id = () => Number(node.getAttribute('mesid'));
    const bar = $('<div class="tts-reading-bar tts-inline-sound" role="group" aria-label="消息声音控制">');
    const voice = $('<div class="tts-reading-group">').appendTo(bar);
    readingButton('play', '全文朗读', true).addClass('tts-reading-main tts-reading-pause').on('click', async () => {
        if (reader.session && reader.activeMessageId === id()) { reader.togglePause(); return; }
        const audio = audioFor(node);
        if (audio) {
            if (!audio.paused) audio.pause();
            else { try { await audio.play(); } catch { reader.notify('请再次点击播放，或检查后端音频文件。'); } }
        } else reader.previewFulltext(id());
    }).appendTo(voice);
    $('<div class="tts-reading-copy">').append($('<strong>').text('全文朗读'),
        $('<div class="tts-r-meter">').append($('<small class="tts-reading-status" role="status">').text('听这段故事'))).appendTo(voice);
    const steps = $('<div class="tts-reading-steps">').appendTo(voice);
    for (const [icon, cls, delta] of [['previous', 'previous', -1], ['next', 'next', 1]]) {
        readingButton(icon, delta < 0 ? '上一段' : '下一段', true).addClass(`tts-reading-${cls}`).prop('disabled', true).on('click', () => {
            if (reader.session && reader.activeMessageId === id()) reader.seekSegment(reader.session.index - 1 + delta);
            else { const audio = audioFor(node); if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta * 10)); }
        }).appendTo(steps);
    }
    // Native audio is kept hidden; a single SVG transport controls both segment and saved playback.
    $('<input class="tts-reading-seek" type="range" min="0" step="0.1" hidden aria-label="完整录音进度">')
        .on('input', function () { const audio = audioFor(node); if (audio && Number.isFinite(audio.duration)) audio.currentTime = Number(this.value); }).appendTo(voice);
    mountMusic(bar);
    const more = $('<details class="tts-reading-more">').appendTo(bar);
    $('<summary aria-label="朗读选项" title="朗读选项">').html(readingIcon('more')).appendTo(more);
    const menu = $('<div class="tts-reading-menu">').appendTo(more);
    const action = (icon, title, fn) => readingButton(icon, title).on('click', () => { more.prop('open', false); fn(); }).appendTo(menu);
    action('stop', '结束朗读', () => { reader.generation = null; reader.stop(); }).addClass('tts-reading-stop').prop('disabled', true);
    action('voice', '对白连播', () => reader.readDialogue(id()));
    action('settings', '朗读设置', () => reader.openSettings());
    action('download', '下载完整录音', () => {
        const audio = audioFor(node);
        if (audio) window.TTS_Events.downloadAudio(audio.src, '全文朗读', '完整音频');
    }).attr('data-recording-action', 'download').prop('hidden', true);
    action('bolt', '重新生成', () => { reader.stop(); reader.previewFulltext(id(), true); }).attr('data-recording-action', 'regenerate').prop('hidden', true);
    more.on('keydown', event => { if (event.key === 'Escape') { more.prop('open', false); more.find('summary').trigger('focus'); } });
    // Keep controls outside mes_text: its HTML is replaced by the existing dialogue parser.
    const text = $(node).find('.mes_text').first();
    if (text.length) text.before(bar);
    else { const block = $(node).find('.mes_block').first(); (block.length ? block : $(node)).append(bar); }
    return bar;
}

export function highlightReading(node, text, offset = 0) {
    clearReadingHighlight();
    const root = node?.querySelector('.mes_text');
    if (!root || !window.CSS?.highlights || !window.Highlight) return offset;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: child =>
        child.parentElement?.closest('script,style,button,.tts-reading-bar') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; let full = '', child;
    while ((child = walker.nextNode())) { nodes.push({ node: child, start: full.length }); full += child.textContent; }
    let start = full.indexOf(text, offset);
    if (start < 0) start = full.indexOf(text);
    if (start < 0) return offset;
    const end = start + text.length;
    const first = nodes.find(item => item.start + item.node.length > start);
    const last = nodes.find(item => item.start + item.node.length >= end);
    if (!first || !last) return offset;
    const range = document.createRange();
    range.setStart(first.node, start - first.start); range.setEnd(last.node, end - last.start);
    CSS.highlights.set('echocore-reading', new Highlight(range));
    return end;
}
export function clearReadingHighlight() { window.CSS?.highlights?.delete('echocore-reading'); }
