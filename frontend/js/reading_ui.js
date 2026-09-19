// 内联 SVG 均为固定图形；用户文本始终通过 .text() / .val() 写入。
const shapes = {
    play: '<path d="m9 5 11 7-11 7z"/>',
    pause: '<path d="M9 5v14M16 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    book: '<path d="M12 5v15M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-6-2-10 1Z"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    voice: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
    cloud: '<path d="M7 18a5 5 0 1 1 0-10 6 6 0 0 1 12-1 5 5 0 0 1 0 11Z"/>',
    bolt: '<path d="m14 2-9 12h6l-1 8 9-12h-6z"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    music: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
    volume: '<path d="m11 5-5 4H3v6h3l5 4Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>',
    muted: '<path d="m11 5-5 4H3v6h3l5 4Zm5 5 5 5m0-5-5 5"/>',
    previous: '<path d="M6 5v14m12-14L8 12l10 7Z"/>',
    next: '<path d="M18 5v14M6 5l10 7-10 7Z"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
};

export function readingIcon(name) {
    return `<svg class="tts-r-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.play}</svg>`;
}

export function readingWave() {
    return '<svg class="tts-r-wave" viewBox="0 0 32 24" aria-hidden="true">' +
        [8, 16, 22, 12, 18].map((h, i) => `<rect x="${2 + i * 6}" y="${(24 - h) / 2}" width="3" height="${h}" rx="1.5" style="--bar-delay:${i * -0.17}s"/>`).join('') + '</svg>';
}

export function readingButton(icon, label, iconOnly = false) {
    return $('<button type="button" class="tts-r-button">').attr({ title: label, 'aria-label': label })
        .toggleClass('tts-r-icon-button', iconOnly).append(readingIcon(icon), iconOnly ? [] : $('<span>').text(label));
}

export function installReadingStyles() {
    if (!document.querySelector('#tts-sound-controls-style')) {
        $('<link id="tts-sound-controls-style" rel="stylesheet">')
            .attr('href', new URL('../css/core/sound_controls.css', import.meta.url).href).appendTo(document.head);
    }
    if (!document.querySelector('#tts-reading-controls-style')) {
        $('<link id="tts-reading-controls-style" rel="stylesheet">')
            .attr('href', new URL('../css/core/reading.css', import.meta.url).href).appendTo(document.head);
    }
}

export function readingDialog(title) {
    $('#tts-reading-dialog').remove();
    const $dialog = $('<dialog id="tts-reading-dialog" aria-labelledby="tts-r-title">');
    const $header = $('<header class="tts-r-header">').append(
        $('<div class="tts-r-brand">').append(readingWave()),
        $('<div>').append($('<small>').text('ECHOCORE · AUDIO'), $('<h3 id="tts-r-title">').text(title)),
        readingButton('close', '关闭', true).on('click', () => $dialog[0].close()));
    $dialog.append($header, $('<div class="tts-r-body">'), $('<footer class="tts-r-footer">'));
    $dialog.on('close', () => $dialog.remove()).appendTo(document.body);
    $dialog[0].showModal();
    return $dialog;
}
