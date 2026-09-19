import { BGM } from './bgm_player.js';
import { readingIcon, readingButton } from './reading_ui.js';

let popup, anchor, signature = '', initialized = false;
export function closeMusic(returnFocus = false) {
    popup?.remove(); popup = null;
    anchor?.setAttribute('aria-expanded', 'false');
    if (returnFocus && anchor?.isConnected) anchor.focus();
    anchor = null;
}
function position() {
    if (!popup || !anchor) return;
    if (!anchor.isConnected) { closeMusic(); return; }
    const rect = anchor.getBoundingClientRect();
    const height = window.visualViewport?.height || innerHeight;
    const width = window.visualViewport?.width || innerWidth;
    if (rect.bottom < 0 || rect.top > height) { closeMusic(); return; }
    const box = popup[0].getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - box.width, width - box.width - 8));
    const top = Math.max(8, Math.min(rect.bottom + 8 + box.height <= height - 8 ? rect.bottom + 8 : rect.top - box.height - 8, height - box.height - 8));
    popup.css({ left, top });
}
function update() {
    const selected = BGM.tracks.find(track => track.id === BGM.selected);
    $('.tts-bgm-name').text(selected?.name || '氛围音乐');
    $('.tts-bgm-state').text(BGM.error ? '查看提示' : BGM.busy ? '载入中' : BGM.playing ? '正在播放' : '本机曲库');
    $('.tts-bgm-toggle').attr({ 'aria-label': BGM.playing || BGM.busy ? '暂停背景音乐' : '播放背景音乐',
        title: BGM.playing || BGM.busy ? '暂停背景音乐' : '播放背景音乐', 'aria-pressed': String(BGM.playing) })
        .html(readingIcon(BGM.playing ? 'volume' : 'muted'));
    if (!popup) return;
    popup.find('.tts-bgm-error').text(BGM.error).prop('hidden', !BGM.error);
    popup.find('.tts-bgm-play').html(readingIcon(BGM.playing ? 'pause' : 'play'))
        .attr('aria-label', BGM.playing || BGM.busy ? '暂停音乐' : '播放音乐');
    popup.find('.tts-bgm-transport button').prop('disabled', !BGM.tracks.length);
    popup.find('input[type=range]').val(Math.round(BGM.volume * 100));
    popup.find('output').text(Math.round(BGM.volume * 100));
    const next = JSON.stringify([BGM.tracks, BGM.selected]);
    if (signature !== next) {
        signature = next;
        const list = popup.find('.tts-bgm-tracks').empty();
        if (!BGM.tracks.length) $('<p class="tts-sound-empty">').text('导入一首音乐，留一点氛围。').appendTo(list);
        for (const track of BGM.tracks) {
            const row = $('<div class="tts-bgm-row">').appendTo(list);
            const select = $('<button type="button" class="tts-bgm-track">').attr('aria-pressed', String(track.id === BGM.selected))
                .append($('<span class="tts-bgm-art">').html(readingIcon('music')),
                    $('<span class="tts-bgm-track-copy">').append($('<strong>').text(track.name), $('<small>').text('本地音乐')),
                    $('<span class="tts-bgm-check">').html(readingIcon('check'))).appendTo(row);
            select.on('click', () => { closeMusic(true); void BGM.play(track.id); });
            readingButton('trash', `移除 ${track.name}`, true).addClass('tts-bgm-remove').on('click', async () => {
                try { await BGM.remove(track.id); popup?.find('.tts-bgm-import').trigger('focus'); }
                catch (error) { BGM.error = error.message; BGM.changed(); }
            }).appendTo(row);
        }
    }
    position();
}
export async function openMusic(button) {
    if (anchor === button && popup) { closeMusic(true); return; }
    closeMusic(); anchor = button; signature = '';
    button.setAttribute('aria-expanded', 'true');
    popup = $('<section class="tts-sound-popover tts-bgm-popover" role="dialog" aria-label="背景音乐">').appendTo(document.body);
    const head = $('<header>').append($('<strong>').text('氛围')).appendTo(popup);
    readingButton('close', '关闭音乐选择', true).on('click', () => closeMusic(true)).appendTo(head);
    $('<div class="tts-bgm-tracks">').appendTo(popup);
    const transport = $('<div class="tts-bgm-transport">').appendTo(popup);
    readingButton('previous', '上一首', true).on('click', () => BGM.skip(-1)).appendTo(transport);
    readingButton('play', '播放音乐', true).addClass('tts-bgm-play').on('click', () => BGM.toggle()).appendTo(transport);
    readingButton('next', '下一首', true).on('click', () => BGM.skip(1)).appendTo(transport);
    $('<label class="tts-bgm-volume">').append(readingIcon('volume'),
        $('<input type="range" min="0" max="100" aria-label="音乐音量">').on('input', event => BGM.setVolume(event.target.value / 100)), $('<output>')).appendTo(popup);
    const file = $('<input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus" multiple hidden>').appendTo(popup);
    const upload = readingButton('upload', '导入音乐').addClass('tts-bgm-import').on('click', () => file[0].click()).appendTo(popup);
    file.on('change', async () => {
        upload.prop('disabled', true); BGM.error = ''; BGM.changed();
        try { await BGM.importFiles([...file[0].files]); }
        catch (error) { BGM.error = error.message; BGM.changed(); }
        finally { upload.prop('disabled', false); file.val(''); }
    });
    $('<small class="tts-bgm-error" role="status" hidden>').appendTo(popup);
    update(); popup.find('header button').trigger('focus');
    await BGM.init(); update();
}
export function mountMusic(bar) {
    if (!initialized) {
        initialized = true; BGM.subscribe(update);
        document.addEventListener('pointerdown', event => {
            if (popup && !popup[0].contains(event.target) && !anchor?.contains(event.target)) closeMusic();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && popup) { event.preventDefault(); closeMusic(true); }
        });
        document.addEventListener('scroll', position, true);
        window.addEventListener('resize', position);
    }
    const group = $('<div class="tts-bgm-entry">').appendTo(bar);
    const open = $('<button type="button" class="tts-bgm-open" aria-label="选择背景音乐" aria-expanded="false">')
        .append($('<span class="tts-bgm-art">').html(readingIcon('music')),
            $('<span class="tts-bgm-copy">').append($('<strong class="tts-bgm-name">'), $('<small class="tts-bgm-state">')))
        .on('click', function () { void openMusic(this); }).appendTo(group);
    readingButton('muted', '播放背景音乐', true).addClass('tts-bgm-toggle').on('click', () => {
        if (!BGM.selected) void openMusic(open[0]); else void BGM.toggle();
    }).appendTo(group);
    update();
}
