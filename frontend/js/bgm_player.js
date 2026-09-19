// One music player per tab. Files remain in this browser's IndexedDB.
const STORE = 'tracks';
const PREFS = 'tts_bgm_preferences_v1';
let database;
async function db() {
    if (!database) database = new Promise((resolve, reject) => {
        const request = indexedDB.open('echocore-bgm', 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
        request.onsuccess = () => {
            request.result.onversionchange = () => { request.result.close(); database = null; };
            resolve(request.result);
        };
        request.onerror = () => { database = null; reject(new Error('无法打开本机曲库，请检查浏览器存储权限。')); };
        request.onblocked = () => { database = null; reject(new Error('曲库正被其他页面使用，请关闭旧页面后重试。')); };
    });
    return database;
}
async function transaction(mode, action) {
    const connection = await db();
    return new Promise((resolve, reject) => {
        const tx = connection.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = tx.onabort = () => reject(new Error(tx.error?.name === 'QuotaExceededError'
            ? '本机曲库存储空间不足，请移除一些音乐后重试。' : '曲库操作失败，请检查浏览器存储权限。'));
    });
}
function validateAudio(file) {
    if (!file.size || file.size > 50 * 1024 * 1024) throw new Error('请选择 50 MB 以内的音频文件。');
    if (!/^audio\//.test(file.type) && !/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name)) throw new Error('请选择音频文件。');
    return new Promise((resolve, reject) => {
        const audio = document.createElement('audio');
        const url = URL.createObjectURL(file);
        const finish = error => {
            clearTimeout(timer); audio.onloadedmetadata = audio.onerror = null;
            audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url);
            error ? reject(error) : resolve();
        };
        const timer = setTimeout(() => finish(new Error('无法读取此音频，请尝试 MP3 或 WAV。')), 10000);
        audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) && audio.duration > 0 ? null : new Error('音频时长无效。'));
        audio.onerror = () => finish(new Error('浏览器无法播放此音频，请尝试 MP3 或 WAV。'));
        audio.preload = 'metadata'; audio.src = url;
    });
}

export const BGM = {
    tracks: [], selected: '', volume: 0.28, playing: false, busy: false, error: '', contextKey: '',
    audio: null, url: null, epoch: 0, loadedId: null, listeners: new Set(), ready: null,
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    changed() { for (const fn of this.listeners) fn(this); },
    init() {
        if (!this.ready) this.ready = this.refresh().catch(error => { this.error = error.message; this.changed(); });
        return this.ready;
    },
    async refresh() {
        this.tracks = (await transaction('readonly', store => store.getAll())).map(({ blob, ...metadata }) => metadata)
            .sort((a, b) => a.added - b.added);
        if (!this.tracks.some(track => track.id === this.selected)) this.selected = this.tracks[0]?.id || '';
        this.changed();
    },
    setContext(context = {}) {
        const key = JSON.stringify([context.chatId ?? context.chat_id ?? '', context.groupId ?? context.characterId ?? context.name2 ?? '']);
        if (key === this.contextKey) return;
        this.stop(); this.contextKey = key; this.error = '';
        try {
            const saved = JSON.parse(localStorage.getItem(PREFS) || '{}')[key] || {};
            this.selected = typeof saved.track === 'string' ? saved.track : '';
            this.volume = Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.28;
        } catch { this.selected = ''; this.volume = 0.28; }
        if (this.tracks.length && !this.tracks.some(track => track.id === this.selected)) this.selected = this.tracks[0].id;
        if (this.audio) this.audio.volume = this.volume;
        this.changed();
    },
    save() {
        try {
            const saved = JSON.parse(localStorage.getItem(PREFS) || '{}');
            saved[this.contextKey] = { track: this.selected, volume: this.volume };
            localStorage.setItem(PREFS, JSON.stringify(saved));
        } catch { this.error = '当前设置可用，但浏览器未能保存音乐偏好。'; }
    },
    ensureAudio() {
        if (this.audio) return this.audio;
        const audio = document.createElement('audio');
        audio.loop = true; audio.volume = this.volume;
        audio.onplay = () => { this.playing = true; this.changed(); };
        audio.onpause = () => { this.playing = false; this.changed(); };
        audio.onerror = () => { this.playing = false; this.error = '音乐无法播放，可重新导入此文件。'; this.changed(); };
        this.audio = audio;
        window.addEventListener('pagehide', () => this.stop());
        return audio;
    },
    stop() {
        this.epoch++; this.busy = false;
        if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); }
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = null; this.loadedId = null; this.playing = false; this.changed();
    },
    pause() { this.epoch++; this.busy = false; this.audio?.pause(); this.playing = false; this.changed(); },
    async play(id = this.selected || this.tracks[0]?.id) {
        const epoch = ++this.epoch;
        this.busy = true; this.error = ''; this.changed();
        try {
            const track = await transaction('readonly', store => store.get(id));
            if (epoch !== this.epoch) return;
            if (!track) throw new Error('请先导入或选择音乐。');
            const audio = this.ensureAudio();
            if (this.loadedId !== id) {
                audio.pause();
                if (this.url) URL.revokeObjectURL(this.url);
                this.url = URL.createObjectURL(track.blob); audio.src = this.url; this.loadedId = id;
            }
            this.selected = id; this.save();
            await audio.play();
        } catch (error) {
            if (epoch === this.epoch) {
                this.playing = false;
                this.error = error.name === 'NotAllowedError' ? '请点击播放按钮开启音乐。' : error.message;
            }
        } finally { if (epoch === this.epoch) { this.busy = false; this.changed(); } }
    },
    async toggle() { if (this.playing || this.busy) this.pause(); else await this.play(); },
    async skip(direction) {
        if (!this.tracks.length) return;
        const index = this.tracks.findIndex(track => track.id === this.selected);
        await this.play(this.tracks[(index + direction + this.tracks.length) % this.tracks.length].id);
    },
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, Number(value) || 0));
        if (this.audio) this.audio.volume = this.volume;
        this.save(); this.changed();
    },
    async importFiles(files) {
        const contextKey = this.contextKey;
        let imported = 0;
        const failures = [];
        for (const file of files) {
            try {
                await validateAudio(file);
                const id = [...crypto.getRandomValues(new Uint8Array(16))].map(value => value.toString(16).padStart(2, '0')).join('');
                const record = { id, name: file.name.replace(/\.[^.]+$/, ''),
                    size: file.size, added: Date.now(), blob: file };
                await transaction('readwrite', store => store.put(record));
                if (!this.selected && contextKey === this.contextKey) { this.selected = record.id; this.save(); }
                imported++;
            } catch (error) { failures.push(`${file.name}：${error.message}`); }
        }
        await this.refresh();
        this.error = failures.join('\n'); this.changed();
        return imported;
    },
    async remove(id) {
        await transaction('readwrite', store => store.delete(id));
        if (this.selected === id) { this.stop(); this.selected = ''; }
        await this.refresh(); this.save();
    },
};
