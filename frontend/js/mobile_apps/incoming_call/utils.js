/**
 * 来电应用工具辅助模块 (Incoming Call Utils)
 */

/**
 * 下载通话录音音频
 * @param {Object} call - 来电记录数据
 */
export async function downloadAudio(call) {
    console.log('[IncomingCallUtils] 用户点击下载历史通话');

    let fullUrl = call.audio_url;
    if (fullUrl && fullUrl.startsWith('/') && window.TTS_API && window.TTS_API.baseUrl) {
        fullUrl = window.TTS_API.baseUrl + fullUrl;
    }

    const speaker = call.char_name || 'Unknown';
    const text = call.segments && call.segments.length > 0
        ? call.segments.map(seg => seg.translation || seg.text || '').join(' ')
        : '历史通话';

    console.log('📥 下载历史通话音频');
    console.log('  - audioUrl:', fullUrl);
    console.log('  - speaker:', speaker);
    console.log('  - text:', text);

    // 使用 TTS_Events.downloadAudio 下载
    if (window.TTS_Events && window.TTS_Events.downloadAudio) {
        try {
            await window.TTS_Events.downloadAudio(fullUrl, speaker, text);
            console.log('✅ 下载请求已发送');
        } catch (err) {
            console.error('❌ 下载失败:', err);
            alert('下载失败: ' + err.message);
        }
    } else {
        alert('下载功能未就绪,请刷新页面');
    }
}

/**
 * 清除来电全局状态
 */
export function clearCallState() {
    delete window.TTS_IncomingCall;
    $('#tts-manager-btn').removeClass('incoming-call').attr('title', '🔊 TTS配置');
    $('#tts-mobile-trigger').removeClass('incoming-call');
    if (window.TTS_ThemeEngine) {
        window.TTS_ThemeEngine.notify('call_ended', {});
    }
}
