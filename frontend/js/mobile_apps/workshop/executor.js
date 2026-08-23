/**
 * 剧本工坊定向呼叫 / 密谈侦听执行器
 */
import { getApiHost, getContextInfo } from './api.js';
import { getAuthHeaders } from '../shared/utils.js';
import { NotificationHandler } from '../../notification_handler.js';
import { getWorkshopStepTexts } from '../../themes/theme_status_helper.js';

let _toastTimer = null;

export function showToast(msg, isPersistent = false) {
    let $toast = $('#ws-test-toast');
    if (!$toast.length) {
        $toast = $(`
            <div class="ws-test-toast" id="ws-test-toast">
                <div class="ws-spinner"></div>
                <span id="ws-test-toast-msg"></span>
            </div>
        `);
        $('body').append($toast);
    }
    $('#ws-test-toast-msg').text(msg);
    $toast.find('.ws-spinner').toggle(isPersistent);
    $toast.addClass('show');

    if (_toastTimer) clearTimeout(_toastTimer);
    if (!isPersistent) {
        _toastTimer = setTimeout(() => hideToast(), 3000);
    }
}

export function hideToast() {
    $('#ws-test-toast').removeClass('show');
}

/**
 * 执行定向呼叫 / 侦听链路 (自动注入人设与世界书)
 */
export async function executeDirectedAction(category, preset, options = {}) {
    const apiHost = getApiHost();
    const ctxInfo = await getContextInfo();

    if (!window.LLM_Client || typeof window.LLM_Client.callLLM !== 'function') {
        alert('LLM_Client 未就绪，无法驱动大模型生成，请确认配置。');
        return;
    }

    const isPhone = category === 'phone_call';
    const defaultSpeaker = ctxInfo.boundSpeakers[0] || ctxInfo.charName;
    const caller = options.caller || defaultSpeaker;
    const target = options.target || ctxInfo.userName;
    const reason = options.reason || preset.description || (isPhone ? "电话问候" : "私下密谈");
    const tone = options.tone || "";

    showToast(`[1/3] 正在构建「${preset.name}」提示词...`, true);

    try {
        if (isPhone) {
            // 1. 构建定向电话提示词
            const buildPayload = {
                char_name: caller,
                context: ctxInfo.context,
                user_name: ctxInfo.userName,
                chat_branch: ctxInfo.chatBranch,
                preset_id: preset.id,
                caller: caller,
                target: target,
                receiver: target,
                call_reason: reason,
                call_tone: tone,
                character_persona: ctxInfo.characterPersona,
                world_info: ctxInfo.worldInfo,
                text_lang: options.language || 'zh'
            };

            const buildRes = await fetch(`${apiHost}/api/phone_call/build_prompt`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(buildPayload)
            });

            if (!buildRes.ok) {
                const err = await buildRes.text();
                throw new Error(`构建提示词失败: ${err}`);
            }
            const buildData = await buildRes.json();

            const stepTexts = getWorkshopStepTexts('phone_call', { caller, target });

            // 2. 调用 LLM
            showToast(stepTexts.step2, true);
            const llmConfig = {
                api_url: buildData.llm_config.api_url,
                api_key: buildData.llm_config.api_key,
                model: buildData.llm_config.model,
                temperature: preset.recommended_params?.temperature || buildData.llm_config.temperature || 0.8,
                max_tokens: buildData.llm_config.max_tokens || 4000,
                prompt: buildData.prompt
            };

            const llmResponse = await window.LLM_Client.callLLM(llmConfig);

            // 3. TTS 合成
            showToast(stepTexts.step3, true);
            const parseRes = await fetch(`${apiHost}/api/phone_call/parse_and_generate`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    char_name: caller,
                    llm_response: llmResponse,
                    generate_audio: true,
                    chat_branch: ctxInfo.chatBranch,
                    context_fingerprint: ctxInfo.contextFingerprint,
                    target_user: target,
                    text_lang: options.language || 'zh'
                })
            });

            if (!parseRes.ok) {
                const err = await parseRes.text();
                throw new Error(`TTS 语音生成失败: ${err}`);
            }
            const parseData = await parseRes.json();

            hideToast();

            // 自动收起/最小化面板，展现悬浮球/法阵来电呼吸动效
            if (window.TTS_ThemeEngine) {
                window.TTS_ThemeEngine.close();
            }

            // 4. 调用 NotificationHandler 拉起沉浸界面
            await NotificationHandler.handlePhoneCallReady({
                call_id: parseData.call_id || `directed_${Date.now()}`,
                char_name: caller,
                selected_speaker: caller,
                target_user: target,
                call_reason: reason,
                preset_id: preset.id,
                segments: parseData.segments || [],
                audio_url: parseData.audio_url || (parseData.audio ? `data:audio/wav;base64,${parseData.audio}` : null)
            });

        } else {
            // ================= 窃听定向生成 =================
            const speakers = (options.speakers && options.speakers.length >= 2) 
                ? options.speakers 
                : (ctxInfo.boundSpeakers.length >= 2 ? ctxInfo.boundSpeakers.slice(0, 2) : [caller, "神秘人"]);

            const stepTexts = getWorkshopStepTexts('eavesdrop', { speakers });

            const buildPayload = {
                context: ctxInfo.context,
                speakers: speakers,
                user_name: ctxInfo.userName,
                chat_branch: ctxInfo.chatBranch,
                text_lang: options.language || 'zh',
                preset_id: preset.id,
                theme: reason,
                call_reason: reason,
                call_tone: tone,
                character_persona: ctxInfo.characterPersona,
                world_info: ctxInfo.worldInfo
            };

            const buildRes = await fetch(`${apiHost}/api/eavesdrop/build_prompt`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(buildPayload)
            });

            if (!buildRes.ok) {
                const err = await buildRes.text();
                throw new Error(`构建密谈连接失败: ${err}`);
            }
            const buildData = await buildRes.json();

            // 2. 调用 LLM
            showToast(stepTexts.step2, true);
            const llmConfig = {
                api_url: buildData.llm_config.api_url,
                api_key: buildData.llm_config.api_key,
                model: buildData.llm_config.model,
                temperature: preset.recommended_params?.temperature || buildData.llm_config.temperature || 0.8,
                max_tokens: buildData.llm_config.max_tokens || 4000,
                prompt: buildData.prompt
            };

            const llmResponse = await window.LLM_Client.callLLM(llmConfig);

            // 3. TTS 合成
            showToast(stepTexts.step3, true);
            const parseRes = await fetch(`${apiHost}/api/eavesdrop/parse_and_generate`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    llm_response: llmResponse,
                    speakers: speakers,
                    text_lang: options.language || 'zh',
                    chat_branch: ctxInfo.chatBranch,
                    context_fingerprint: ctxInfo.contextFingerprint,
                    scene_description: `[${preset.name}] ${reason}`
                })
            });

            if (!parseRes.ok) {
                const err = await parseRes.text();
                throw new Error(`密谈语音合成失败: ${err}`);
            }
            const parseData = await parseRes.json();

            hideToast();

            // 自动收起/最小化面板，展现悬浮球/法阵密谈动效
            if (window.TTS_ThemeEngine) {
                window.TTS_ThemeEngine.close();
            }

            // 4. 调用 NotificationHandler 拉起窃听界面
            await NotificationHandler.handleEavesdropReady({
                record_id: parseData.record_id || `directed_${Date.now()}`,
                speakers: speakers,
                segments: parseData.segments || [],
                audio_url: parseData.audio_url,
                scene_description: `[${preset.name}] ${reason}`,
                notification_text: `检测到 ${speakers.join(' 与 ')} 的密谈`,
                preset_id: preset.id
            });
        }
    } catch (e) {
        hideToast();
        console.error('[Workshop] 剧本呼叫失败:', e);
        alert(`剧本呼叫失败:\n${e.message}`);
    }
}
