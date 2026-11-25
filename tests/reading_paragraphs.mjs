import assert from 'node:assert/strict';
import { splitReadingParagraphs, parseFulltext, getReadingSettings } from '../frontend/js/reading_text.js';
globalThis.localStorage = { getItem: () => JSON.stringify({ localStrategy: 'batch' }) };
assert.equal(getReadingSettings().paragraphPlayback, true);
assert.equal(getReadingSettings().showReadingErrors, true);
const mixed = '…… [Alice, default] “...” [Alice, default] “等一下……” — [Alice, default] “0”';
for (const paragraphPlayback of [true, false]) {
    const lines = parseFulltext(mixed, 'Narrator', { Alice: 'voice' }, { paragraphPlayback });
    assert.deepEqual(lines.map(s => [s.charName, s.text]), [['Alice', '等一下……'], ['Alice', '0']]);
    assert.throws(() => parseFulltext('…… [Alice, default] “？！”', 'Narrator', { Alice: 'voice' }, { paragraphPlayback }), /没有可朗读内容/);
}
const long = '这是一个有完整含义的句子。'.repeat(60);
const chunks = splitReadingParagraphs(long, true);
assert.ok(chunks[0].length <= 100);
assert.ok(chunks.slice(1).every(chunk => chunk.length <= 240));
assert.equal(chunks.join(''), long);
assert.deepEqual(splitReadingParagraphs('第一自然段。\n第二自然段。'), ['第一自然段。', '第二自然段。']);
const tagged = '字'.repeat(92) + '[whispers] ' + '轻声。'.repeat(100);
const tagChunks = splitReadingParagraphs(tagged, true);
assert.ok(tagChunks.some(chunk => chunk.includes('[whispers]')));
assert.ok(tagChunks.every(chunk => (chunk.match(/\[/g) || []).length === (chunk.match(/\]/g) || []).length));
assert.equal(tagChunks.join('').replace(/\s/g, ''), tagged.replace(/\s/g, ''));
const segments = parseFulltext('[旁白, sad] ' + long + '\n[Alice, whisper] “ [whispers] Hello. [sighs] ”', 'Narrator', { Alice: 'elevenlabs:voice' }, { enableEmotionalNarration: true });
assert.ok(segments.slice(0, -1).every(segment => segment.emotion === 'sad'));
assert.ok(segments.at(-1).text.includes('[whispers]'));
console.log('Paragraph boundaries, short opening, text integrity, audio tag integrity and default progressive mode passed.');
