/**
 * 收藏夹 App 模块
 * 显示当前对话和其他收藏的语音气泡
 */

import { getAuthHeaders } from './shared/utils.js';

/**
 * 渲染收藏夹 App
 * @param {jQuery} container - App 容器
 * @param {Function} createNavbar - 创建导航栏函数
 */
export async function render(container, createNavbar) {
    container.empty();
    container.append(createNavbar("我的收藏"));

    const CTX = window.TTS_UI.CTX;
    const activeStyle = (CTX && CTX.CACHE.settings && CTX.CACHE.settings.bubble_style) || 'default';

    const $tabs = $(`
        <div class="fav-tabs" style="display:flex; padding:10px 15px; gap:10px;">
            <div class="fav-tab active" data-tab="current" style="flex:1; text-align:center; padding:8px; border-radius:8px; font-weight:bold; cursor:pointer;">当前对话</div>
            <div class="fav-tab" data-tab="others" style="flex:1; text-align:center; padding:8px; border-radius:8px; cursor:pointer;">其他收藏</div>
        </div>
    `);
    container.append($tabs);

    const $content = $(`<div style="padding:0 15px 15px 15px; flex:1; overflow-y:auto;" data-bubble-style="${activeStyle}"></div>`);
    $content.html('<div style="text-align:center; padding-top:20px; opacity:0.6;">正在智能匹配...</div>');
    container.append($content);

    const fingerprints = window.TTS_Utils ? window.TTS_Utils.getCurrentContextFingerprints() : [];
    let charName = "";
    try {
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            if (ctx.characters && ctx.characterId !== undefined) {
                const charObj = ctx.characters[ctx.characterId];
                if (charObj && charObj.name) {
                    charName = charObj.name;
                }
            }
        }
    } catch (e) {
        console.warn("获取角色名失败", e);
    }

    console.log("🔍 [手机收藏] 正在查询角色:", charName || "所有角色");

    try {
        const res = await window.TTS_API.getMatchedFavorites({
            char_name: charName,
            fingerprints: fingerprints
        });
        if (res.status !== 'success') throw new Error(res.msg);
        const data = res.data;

        const renderList = (list, emptyMsg) => {
            if (!list || list.length === 0) {
                return `<div class="fav-empty-state" style="padding:40px 20px; text-align:center; opacity:0.6; font-size:14px;">${emptyMsg}</div>`;
            }
            const BARS_HTML = `<span class='sovits-voice-waves'><span class='sovits-voice-bar'></span><span class='sovits-voice-bar'></span><span class='sovits-voice-bar'></span></span>`;

            return list.map(item => {
                let contextHtml = '';
                if (item.context && item.context.length) {
                    contextHtml = `<div class="fav-context-box" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        📝 ${item.context[item.context.length - 1]}
                    </div>`;
                }

                let fullUrl = item.audio_url;

                if (fullUrl && fullUrl.startsWith('/favorites/')) {
                    const filename = fullUrl.replace('/favorites/', '');
                    fullUrl = window.TTS_API.baseUrl + `/download_favorite/${filename}`;
                } else if (fullUrl && fullUrl.startsWith('/') && window.TTS_API && window.TTS_API.baseUrl) {
                    fullUrl = window.TTS_API.baseUrl + fullUrl;
                }
                const cleanText = item.text || "";
                const d = Math.max(1, Math.ceil(cleanText.length * 0.25));
                const bubbleWidth = Math.min(220, 60 + d * 10);

                const itemClass = item.is_current ? 'fav-item current-item' : 'fav-item';

                return `
                    <div class="${itemClass}" data-id="${item.id}">

                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <strong class="fav-item-name">${item.char_name || '未知角色'}</strong>
                            <span class="fav-item-date">${item.created_at ? item.created_at.split(' ')[0] : ''}</span>
                        </div>
                        ${contextHtml}
                        <div class="fav-text-content">"${item.text}"</div>

                        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
                            <div class="voice-bubble ready fav-play-bubble"
                                 data-url="${fullUrl}"
                                 data-voice-name="${item.char_name}"
                                 data-text="${item.text}"
                                 data-status="ready"
                                 style="width: ${bubbleWidth}px; cursor:pointer; display:flex; align-items:center; justify-content:space-between;">

                                 ${BARS_HTML}

                                 <span class="sovits-voice-duration" style="margin-left:auto;">${d}"</span>
                            </div>

                            <button class="fav-download-btn" style="background:transparent; border:none; color:#3b82f6; opacity:0.6; padding:5px 10px;">⬇️</button>
                            <button class="fav-del-btn" style="background:transparent; border:none; color:#dc2626; opacity:0.6; padding:5px 10px;">🗑️</button>
                        </div>
                    </div>`;
            }).join('');
        };

        $content.html(renderList(data.current, "当前对话没有收藏记录<br>试着去其他收藏里找找吧"));

        $tabs.find('.fav-tab').click(function () {
            const $t = $(this);
            $tabs.find('.fav-tab').removeClass('active');
            $t.addClass('active');

            const tabType = $t.data('tab');
            if (tabType === 'current') {
                $content.html(renderList(data.current, "当前对话没有收藏记录"));
            } else {
                $content.html(renderList(data.others, "暂无其他收藏"));
            }
            bindListEvents();
        });

        function bindListEvents() {
            let currentAudio = null;
            let $currentBubble = null;

            $content.find('.fav-play-bubble').off().click(async function (e) {
                e.stopPropagation();
                const $bubble = $(this);
                let url = $bubble.data('url');

                if ($bubble.hasClass('playing') && currentAudio) {
                    currentAudio.pause();
                    resetBubble($bubble);
                    currentAudio = null;
                    return;
                }

                if (currentAudio) {
                    currentAudio.pause();
                    if ($currentBubble) resetBubble($currentBubble);
                }

                if (!url.startsWith('blob:')) {
                    try {
                        console.log("🔄 转换服务器路径为 Blob URL:", url);
                        const response = await fetch(url, { headers: getAuthHeaders() });
                        if (!response.ok) throw new Error('获取音频失败');
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);

                        $bubble.attr('data-audio-url', blobUrl);
                        url = blobUrl;
                        console.log("✅ Blob URL 已缓存", blobUrl);
                    } catch (err) {
                        console.error("转换 Blob URL 失败:", err);
                        alert("音频加载失败,请重试");
                        return;
                    }
                }

                console.log("▶️ 气泡播放:", url);

                $bubble.addClass('playing');

                const audio = new Audio(url);
                currentAudio = audio;
                $currentBubble = $bubble;

                audio.play().catch(err => {
                    console.error("播放失败", err);
                    resetBubble($bubble);
                });

                audio.onended = function () {
                    resetBubble($bubble);
                    currentAudio = null;
                };

                function resetBubble($b) {
                    $b.removeClass('playing').addClass('ready');
                    $b.attr('data-status', 'ready');
                }
            });

            $content.find('.fav-del-btn').off().click(async function (e) {
                e.stopPropagation();
                if (!confirm("确定删除这条收藏吗？")) return;
                const $item = $(this).closest('.fav-item');
                const id = $item.data('id');
                try {
                    await window.TTS_API.deleteFavorite(id);
                    $item.fadeOut(300, function () { $(this).remove(); });
                } catch (err) { alert("删除失败: " + err.message); }
            });

            $content.find('.fav-download-btn').off().click(async function (e) {
                e.stopPropagation();
                const $item = $(this).closest('.fav-item');
                const $bubble = $item.find('.fav-play-bubble');

                const audioUrl = $bubble.data('url');
                const speaker = $bubble.data('voice-name') || 'Unknown';
                const text = $bubble.data('text') || $item.find('.fav-text-content').text().replace(/^\"|\"$/g, '').trim();

                console.log("📥 下载收藏音频");
                console.log("  - audioUrl:", audioUrl);
                console.log("  - speaker:", speaker);
                console.log("  - text:", text);

                const cleanText = text.substring(0, 50).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
                const customFilename = `${speaker}:${cleanText}.wav`;

                // 将自定义文件名作为查询参数添加到 URL
                let finalUrl = audioUrl;
                if (audioUrl.includes('/download_favorite/')) {
                    const url = new URL(audioUrl);
                    url.searchParams.set('custom_filename', customFilename);
                    finalUrl = url.toString();
                }

                console.log("  - customFilename:", customFilename);
                console.log("  - final URL:", finalUrl);

                if (window.TTS_Events && window.TTS_Events.downloadAudio) {
                    await window.TTS_Events.downloadAudio(finalUrl, speaker, text);
                } else {
                    alert("下载功能未就绪,请刷新页面");
                }
            });
        }

        bindListEvents();

    } catch (e) {
        console.error(e);
        $content.html(`<div style="padding:20px; text-align:center; color:red;">加载失败: ${e.message}</div>`);
    }
}

export default { render };
