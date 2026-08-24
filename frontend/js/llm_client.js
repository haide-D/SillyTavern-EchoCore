function getBackendProxyUrl(endpoint) {
    let base = '';
    if (window.TTS_API && typeof window.TTS_API.getBaseUrl === 'function') {
        base = window.TTS_API.getBaseUrl();
    } else if (window.TTS_Utils && typeof window.TTS_Utils.getLatestRemoteConfig === 'function') {
        const cfg = window.TTS_Utils.getLatestRemoteConfig();
        const resolved = window.TTS_Utils.resolveBackendUrls(cfg);
        if (resolved && resolved.httpUrl) {
            base = resolved.httpUrl;
        }
    }
    base = (base || '').replace(/\/+$/, '');
    return `${base}${endpoint}`;
}

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = window.TTS_API?.apiToken || (window.TTS_Utils?.getLatestRemoteConfig?.()?.token) || localStorage.getItem('st_tts_auth_token') || '';
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Api-Token'] = token;
    }
    return headers;
}

async function fetchModels(apiUrl, apiKey) {
    if (!apiUrl) {
        throw new Error('缺少 API 地址');
    }

    // 1. 优先通过后端代理获取模型列表 (规避浏览器跨域 CORS 拦截)
    try {
        const proxyUrl = getBackendProxyUrl('/api/admin/llm/models');
        const resp = await fetch(proxyUrl, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ api_url: apiUrl.trim(), api_key: apiKey ? apiKey.trim() : '' })
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data.success && Array.isArray(data.models) && data.models.length > 0) {
                console.log(`[LLM_Client] ✅ 通过后端代理成功拉取到 ${data.models.length} 个模型`);
                return data.models;
            }
        } else {
            const errData = await resp.json().catch(() => ({}));
            console.warn('[LLM_Client] 后端代理拉取模型失败:', errData.detail || `HTTP ${resp.status}`);
        }
    } catch (proxyErr) {
        console.warn('[LLM_Client] 后端代理拉取模型请求异常:', proxyErr);
    }

    // 2. 降级容灾: 尝试前端直连拉取模型
    try {
        const baseUrl = apiUrl.trim().replace(/\/chat\/completions.*$/, '').replace(/\/+$/, '');
        const candidateUrls = [
            `${baseUrl}/models`,
            `${baseUrl}/v1/models`
        ];
        const headers = {};
        if (apiKey && apiKey.trim()) {
            headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        }
        for (const mUrl of candidateUrls) {
            try {
                const resp = await fetch(mUrl, { headers });
                if (resp.ok) {
                    const data = await resp.json();
                    let models = [];
                    if (Array.isArray(data.data)) {
                        models = data.data.map(m => (typeof m === 'object' ? (m.id || m.name) : m)).filter(Boolean);
                    } else if (Array.isArray(data.models)) {
                        models = data.models.map(m => (typeof m === 'object' ? (m.id || m.name) : m)).filter(Boolean);
                    }
                    if (models.length > 0) {
                        console.log(`[LLM_Client] ✅ 前端直连成功拉取到 ${models.length} 个模型 (${mUrl})`);
                        return Array.from(new Set(models));
                    }
                }
            } catch {}
        }
    } catch (directErr) {
        console.warn('[LLM_Client] 前端直连拉取模型失败:', directErr);
    }

    return [];
}

/**
 * 判断是否为网络或可重试的临时错误
 */
function isNetworkError(error) {
    const retryablePatterns = [
        'Failed to fetch',
        'NetworkError',
        'ERR_CONNECTION_RESET',
        'ERR_CONNECTION_REFUSED',
        'ERR_CONNECTION_TIMED_OUT',
        'ERR_NETWORK',
        'net::ERR_',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'CORS',
        '429',
        '502',
        '503',
        '504',
        '520',
        '521',
        '522',
        '524',
        '408',
        '超时',
        'timeout'
    ];

    const errorMessage = error.message || error.toString();
    return retryablePatterns.some(pattern => errorMessage.toLowerCase().includes(pattern.toLowerCase()));
}

/**
 * 延迟函数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化远程 API 端点 (确保兼容 OpenAI 标准规范)
 */
function normalizeChatUrl(rawUrl) {
    if (!rawUrl) return '';
    let url = rawUrl.trim();
    if (!url.includes('/chat/completions')) {
        url = url.replace(/\/+$/, '') + '/chat/completions';
    }
    return url;
}

/**
 * 深度解析并格式化错误信息，识别 524、CORS 与超时原因
 */
function formatLLMErrorMessage(error, context = {}) {
    const rawMsg = error?.message || String(error);
    const is524 = rawMsg.includes('524') || rawMsg.includes('ERR_FAILED 524');
    const isCorsOrFetch = rawMsg.includes('Failed to fetch') || rawMsg.includes('CORS') || rawMsg.includes('NetworkError');
    const isTimeout = rawMsg.includes('超时') || rawMsg.includes('timeout') || rawMsg.includes('504') || rawMsg.includes('408');

    if (is524 || (isCorsOrFetch && context.isTunnel)) {
        return `远程 LLM 响应超时 (Cloudflare 隧道 524 超时)。上游模型服务响应耗时超过了隧道限制(100s)。建议：1. 检查模型名称是否正确(${context.model || ''}) 2. 降低 max_tokens 3. 检查中转站响应速度。`;
    }
    if (isTimeout) {
        return `LLM 请求超时: 上游模型响应时间过长。(${rawMsg})`;
    }
    return rawMsg;
}

async function callLLM(config) {
    if (!config.api_url) {
        throw new Error('缺少必要的 LLM 配置: api_url');
    }

    const MAX_RETRIES = Math.min(Math.max(1, parseInt(config.max_retries || 2, 10)), 3);
    const targetModel = config.model || 'gpt-3.5-turbo';
    const proxyUrl = getBackendProxyUrl('/api/admin/llm/chat');
    const isCloudflareTunnel = proxyUrl.includes('trycloudflare.com') || proxyUrl.includes('cloudflare');

    const requestBody = {
        api_url: config.api_url.trim(),
        api_key: config.api_key ? config.api_key.trim() : '',
        model: targetModel,
        messages: config.messages || [{ role: "user", content: config.prompt }],
        prompt: config.prompt,
        temperature: config.temperature !== undefined ? config.temperature : 0.8,
        max_retries: 2
    };

    if (config.max_tokens) {
        requestBody.max_tokens = config.max_tokens;
    }

    console.log(`[LLM_Client] 🚀 准备调用 LLM -> 模型: ${targetModel}, 服务地址: ${requestBody.api_url}, 代理地址: ${proxyUrl}`);

    let lastError = null;

    // 阶段 1: 优先尝试后端代理转发
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[LLM_Client] [第 ${attempt}/${MAX_RETRIES} 次] 发起后端代理请求...`);
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorDetail = '';
                try {
                    const errJson = await response.json();
                    errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
                } catch {
                    errorDetail = await response.text();
                }
                console.error(`[LLM_Client] ❌ 后端 LLM 代理返回 HTTP ${response.status}:`, errorDetail);
                
                // 超时 (504)、鉴权 (401/403)、参数错误 (400) 或限流处理完毕的错误，直接抛出不进行无意义二次盲等
                throw new Error(`(HTTP ${response.status}): ${errorDetail.substring(0, 300)}`);
            }

            const data = await response.json();
            return parseResponse(data);

        } catch (error) {
            lastError = error;
            const errMsg = error.message || '';

            // 如果是超时、鉴权或已处理的 HTTP 错误，直接跳出终止，绝不让用户再次盲等 6 分钟
            if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('504') || errMsg.includes('API Key') || errMsg.includes('鉴权失败') || errMsg.includes('超时') || errMsg.includes('Timeout')) {
                throw error;
            }

            console.warn(`[LLM_Client] ⚠️ 后端代理调用异常 (第 ${attempt} 次): ${errMsg}`);

            // 如果未用尽重试次数，短暂停顿后重试 (仅网络连接故障)
            if (attempt < MAX_RETRIES && isNetworkError(error)) {
                await delay(1000 * attempt);
            }
        }
    }

    // 阶段 2: 若后端代理因 524 隧道超时 / CORS / 网络中断失败，自动尝试【前端直连目标 LLM 服务】降级容灾
    console.warn('[LLM_Client] ⚠️ 后端代理全部尝试失败，正在尝试前端直连降级调用目标 API...');
    try {
        const directUrl = normalizeChatUrl(config.api_url);
        const directHeaders = { 'Content-Type': 'application/json' };
        if (config.api_key && config.api_key.trim()) {
            directHeaders['Authorization'] = `Bearer ${config.api_key.trim()}`;
        }

        const directPayload = {
            model: targetModel,
            messages: requestBody.messages,
            temperature: requestBody.temperature,
            stream: false
        };
        if (requestBody.max_tokens) {
            directPayload.max_tokens = requestBody.max_tokens;
        }

        console.log(`[LLM_Client] 🌐 发起前端直连请求 -> ${directUrl}`);
        const directResponse = await fetch(directUrl, {
            method: 'POST',
            headers: directHeaders,
            body: JSON.stringify(directPayload)
        });

        if (directResponse.ok) {
            const directData = await directResponse.json();
            console.log('[LLM_Client] ✅ 前端直连成功获取响应！');
            return parseResponse(directData);
        } else {
            const errText = await directResponse.text().catch(() => '');
            console.warn(`[LLM_Client] 前端直连返回 HTTP ${directResponse.status}:`, errText);
        }
    } catch (directErr) {
        console.warn('[LLM_Client] 前端直连尝试同样失败 (可能目标服务不支持前端 CORS):', directErr.message);
    }

    // 阶段 3: 构造精准可读的诊断错误信息
    const formattedError = formatLLMErrorMessage(lastError, {
        isTunnel: isCloudflareTunnel,
        model: targetModel
    });

    console.error('[LLM_Client] ❌ LLM 调用最终失败:', formattedError);
    console.error('[LLM_Client] 请求配置摘要:', JSON.stringify({
        model: targetModel,
        api_url: config.api_url,
        max_tokens: config.max_tokens,
        prompt_length: config.prompt?.length || 0
    }));

    throw new Error(formattedError);
}

function parseResponse(data) {
    if (!data) {
        throw new Error('LLM 响应为空');
    }

    // 如果响应直接是字符串
    if (typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed) return trimmed;
    }

    // 智能解包外层包装 (兼容 { success: true, data: { choices: [...] } } 或 { result: { choices: [...] } } 等中转网关)
    let target = data;
    if (target && typeof target === 'object') {
        if (target.data && typeof target.data === 'object' && !Array.isArray(target.data)) {
            if (target.data.choices || target.data.content || target.data.output || target.data.response || target.data.candidates || target.data.message) {
                target = target.data;
            }
        } else if (target.result && typeof target.result === 'object' && !Array.isArray(target.result)) {
            if (target.result.choices || target.result.content || target.result.output || target.result.response || target.result.candidates || target.result.message) {
                target = target.result;
            }
        }
    }

    // 添加详细的调试日志
    console.log('[LLM_Client] 🔍 开始解析LLM响应');
    console.log('[LLM_Client] 响应数据类型:', typeof target);
    if (target !== null && typeof target === 'object') {
        console.log('[LLM_Client] 响应对象的键:', Object.keys(target));
    }

    let content = null;

    // 1. 标准 OpenAI 格式: choices[0].message.content
    if (target.choices?.[0]?.message?.content) {
        content = target.choices[0].message.content.trim();
        console.log('[LLM_Client] ✅ 使用 target.choices[0].message.content');
    }
    // 2. DeepSeek reasoning 或特殊推理字段
    else if (target.choices?.[0]?.message?.reasoning_content) {
        content = target.choices[0].message.reasoning_content.trim();
        console.log('[LLM_Client] ✅ 使用 target.choices[0].message.reasoning_content');
    }
    // 3. 旧版 Completion 格式: choices[0].text
    else if (target.choices?.[0]?.text) {
        content = target.choices[0].text.trim();
        console.log('[LLM_Client] ✅ 使用 target.choices[0].text');
    }
    // 4. Gemini 原生格式: candidates[0].content.parts[0].text
    else if (target.candidates?.[0]?.content?.parts?.[0]?.text) {
        content = target.candidates[0].content.parts[0].text.trim();
        console.log('[LLM_Client] ✅ 使用 target.candidates[0].content.parts[0].text');
    }
    // 5. Claude 原生数组格式 或 直接 content 字段
    else if (target.content) {
        if (Array.isArray(target.content)) {
            content = target.content
                .filter(item => item && (item.text || item.type === 'text'))
                .map(item => item.text || '')
                .join('\n')
                .trim();
        } else if (typeof target.content === 'string') {
            content = target.content.trim();
        }
        if (content) console.log('[LLM_Client] ✅ 使用 target.content');
    }
    // 6. Ollama 原生 chat 格式: message.content
    else if (target.message?.content) {
        content = target.message.content.trim();
        console.log('[LLM_Client] ✅ 使用 target.message.content');
    }
    // 7. 通用 output 字段
    else if (target.output) {
        if (typeof target.output === 'string') {
            content = target.output.trim();
        } else if (target.output.text) {
            content = target.output.text.trim();
        }
        if (content) console.log('[LLM_Client] ✅ 使用 target.output');
    }
    // 8. 通用 response 字段 (如 Ollama generate 模式)
    else if (target.response && typeof target.response === 'string') {
        content = target.response.trim();
        console.log('[LLM_Client] ✅ 使用 target.response');
    }
    // 9. 通用 result 字段
    else if (target.result) {
        content = typeof target.result === 'string' ? target.result.trim() : JSON.stringify(target.result);
        console.log('[LLM_Client] ✅ 使用 target.result');
    }

    if (!content) {
        console.error('[LLM_Client] ❌ 无法从响应中提取内容');
        console.error('[LLM_Client] 已尝试的路径:');
        console.error('  - target.choices[0].message.content');
        console.error('  - target.choices[0].message.reasoning_content');
        console.error('  - target.choices[0].text');
        console.error('  - target.candidates[0].content.parts[0].text');
        console.error('  - target.content');
        console.error('  - target.message.content');
        console.error('  - target.output');
        console.error('  - target.response');
        console.error('  - target.result');

        // 创建错误对象并附加原始响应数据
        const error = new Error('无法解析LLM响应 (响应格式不兼容)');
        error.rawResponse = data;  // 附加原始响应数据
        throw error;
    }

    console.log('[LLM_Client] ✅ 成功解析,内容长度:', content.length);
    return content;
}

export const LLM_Client = {
    fetchModels,
    callLLM,
    parseResponse
};
