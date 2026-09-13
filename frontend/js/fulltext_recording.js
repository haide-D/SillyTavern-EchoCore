// 成品不保存原文或密钥，标识仅由聊天与消息快照计算。
export async function recordingKey(snapshot, context) {
    const identity = JSON.stringify(['fulltext-v1', context.getCurrentChatId?.() || snapshot.chatId,
        context.characterId, context.groupId, snapshot.id, snapshot.swipe, snapshot.raw]);
    const api = window.TTS_API;
    const response = await fetch(api._url('/api/fulltext-audio/identity'), { method: 'POST',
        headers: api._headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ identity }) });
    if (!response.ok) throw new Error('全文音频记录不可用，请更新并重启后端');
    return (await response.json()).key;
}

export async function mergeAudio(urls, signal) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass({ sampleRate: 24000 });
    const parts = [];
    let frames = 0;
    try {
        for (const url of urls) {
            signal.throwIfAborted();
            const response = await fetch(url, { signal });
            if (!response.ok) throw new Error('无法读取已生成的语音片段');
            const buffer = await context.decodeAudioData(await response.arrayBuffer());
            signal.throwIfAborted();
            frames += buffer.length;
            if (frames * 2 + 44 > 200 * 1024 * 1024) throw new Error('完整音频超过 200MB，请缩短正文');
            const pcm = new Int16Array(buffer.length);
            const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
            for (let i = 0; i < buffer.length; i++) {
                const sample = channels.reduce((sum, channel) => sum + channel[i], 0) / channels.length;
                pcm[i] = Math.round(Math.max(-1, Math.min(1, sample)) * 32767);
            }
            parts.push(pcm);
        }
        const header = new ArrayBuffer(44);
        const view = new DataView(header);
        const ascii = (offset, str) => [...str].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
        ascii(0, 'RIFF'); view.setUint32(4, frames * 2 + 36, true); ascii(8, 'WAVE');
        ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
        view.setUint16(22, 1, true); view.setUint32(24, 24000, true); view.setUint32(28, 48000, true);
        view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        ascii(36, 'data'); view.setUint32(40, frames * 2, true);
        return new Blob([header, ...parts], { type: 'audio/wav' });
    } finally { await context.close(); }
}

export const FulltextRecording = {
    async exists(key) {
        const response = await fetch(window.TTS_API._url(`/api/fulltext-audio/${key}/status`));
        if (!response.ok) throw new Error('无法读取全文音频记录，请确认后端已更新并重启');
        return (await response.json()).exists;
    },
    url(key) { return window.TTS_API._url(`/api/fulltext-audio/${key}`); },
    async save(key, urls, signal) {
        const blob = await mergeAudio(urls, signal);
        const response = await fetch(this.url(key), { method: 'PUT', body: blob, signal,
            headers: window.TTS_API._headers({ 'Content-Type': 'audio/wav' }) });
        if (!response.ok) throw new Error('完整音频保存失败，请检查后端空间及版本');
    },
};
