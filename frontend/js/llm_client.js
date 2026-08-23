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
    // 1. 优先尝试通过后端代理获取 (规避公网 VPS 跨域 CORS 拦截)
    try {
        const proxyUrl = getBackendProxyUrl('/api/admin/llm/models');
        const resp = await fetch(proxyUrl, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ api_url: apiUrl, api_key: apiKey })
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data.success && Array.isArray(data.models) && data.models.length > 0) {
                console.log(`[LLM_Client] ✅ 通过后端代理成功拉取到 ${data.models.length} 个模型`);
                return data.models;
            }
        }
    } catch (proxyErr) {
        console.warn('[LLM_Client] 后端代理拉取模型失败，回退前端直连:', proxyErr);
    }

    // 2. 前端直连兜底 (本地开发或已开放 CORS 场景)
    const baseUrl = apiUrl.replace(/\/chat\/completions.*$/, '');
    const modelsUrl = baseUrl + '/models';

    const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    let models = [];
    if (data.data && Array.isArray(data.data)) {
        models = data.data.map(m => m.id || m.name || m);
    } else if (Array.isArray(data)) {
        models = data.map(m => typeof m === 'string' ? m : (m.id || m.name));
    }

    if (models.length === 0) {
        throw new Error('未找到可用模型');
    }

    return models;
}

/**
 * 判断是否为网络错误（可重试）
 */
function isNetworkError(error) {
    const networkErrorPatterns = [
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
        'CORS'
    ];

    const errorMessage = error.message || error.toString();
    return networkErrorPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * 延迟函数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callLLM(config) {
    let llmUrl = config.api_url.trim();

    if (!llmUrl.includes('/chat/completions')) {
        llmUrl = llmUrl.replace(/\/$/, '') + '/chat/completions';
    }

    const requestBody = {
        model: config.model,
        messages: [{ role: "user", content: config.prompt }],
        temperature: config.temperature || 0.8,
        stream: false
    };

    if (config.max_tokens) {
        requestBody.max_tokens = config.max_tokens;
    }

    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(llmUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.api_key}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                // ✅ 打印完整请求信息
                console.error('[LLM_Client] ❌ HTTP 错误');
                console.error('[LLM_Client] 请求 URL:', llmUrl);
                console.error('[LLM_Client] 请求模型:', config.model);
                console.error('[LLM_Client] 请求体 (不含 prompt):', JSON.stringify({
                    model: requestBody.model,
                    temperature: requestBody.temperature,
                    max_tokens: requestBody.max_tokens,
                    prompt_length: config.prompt?.length || 0
                }));
                console.error('[LLM_Client] 响应状态:', response.status);
                console.error('[LLM_Client] 响应内容:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
            }

            const data = await response.json();
            return parseResponse(data);

        } catch (error) {
            lastError = error;

            // ✅ 在错误时打印完整请求信息（首次或最后一次重试）
            if (attempt === 1 || attempt === MAX_RETRIES) {
                console.error('[LLM_Client] ❌ LLM 调用失败');
                console.error('[LLM_Client] 错误信息:', error.message);
                console.error('[LLM_Client] 请求 URL:', llmUrl);
                console.error('[LLM_Client] 请求模型:', config.model);
                console.error('[LLM_Client] 请求配置:', JSON.stringify({
                    temperature: requestBody.temperature,
                    max_tokens: requestBody.max_tokens,
                    prompt_length: config.prompt?.length || 0
                }));
                if (error.rawResponse) {
                    console.error('[LLM_Client] 原始响应数据:', JSON.stringify(error.rawResponse, null, 2));
                }
            }

            // 如果遇到网络错误或跨域拦截，尝试通过中间件后端进行中转代理
            if (isNetworkError(error)) {
                console.warn(`[LLM_Client] ⚠️ 检测到网络/跨域异常 (${error.message})，尝试通过后端中间件代理调用...`);
                try {
                    const proxyUrl = getBackendProxyUrl('/api/admin/llm/chat');
                    const proxyResp = await fetch(proxyUrl, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                            api_url: config.api_url,
                            api_key: config.api_key,
                            model: config.model,
                            messages: [{ role: "user", content: config.prompt }],
                            temperature: config.temperature || 0.8,
                            max_tokens: config.max_tokens
                        })
                    });

                    if (proxyResp.ok) {
                        const proxyData = await proxyResp.json();
                        console.log('[LLM_Client] ✅ 通过后端代理调用成功');
                        return parseResponse(proxyData);
                    } else {
                        const errText = await proxyResp.text();
                        console.warn(`[LLM_Client] 后端代理返回错误 HTTP ${proxyResp.status}:`, errText);
                    }
                } catch (proxyErr) {
                    console.warn('[LLM_Client] 后端代理调用异常:', proxyErr);
                }
            }

            // 只有网络错误才重试
            if (isNetworkError(error) && attempt < MAX_RETRIES) {
                console.warn(`[LLM_Client] ⚠️ 网络错误,第 ${attempt}/${MAX_RETRIES} 次重试... (${error.message})`);
                await delay(1000 * attempt);  // 递增延迟: 1s, 2s, 3s
                continue;
            }

            // 非网络错误或已用尽重试次数,直接抛出
            throw error;
        }
    }

    // 理论上不会到这里,但以防万一
    throw lastError;
}

function parseResponse(data) {
    // 添加详细的调试日志
    console.log('[LLM_Client] 🔍 开始解析LLM响应');
    console.log('[LLM_Client] 响应数据类型:', typeof data);
    console.log('[LLM_Client] 响应是否为对象:', data !== null && typeof data === 'object');

    if (data !== null && typeof data === 'object') {
        console.log('[LLM_Client] 响应对象的键:', Object.keys(data));
        console.log('[LLM_Client] 完整响应数据:', JSON.stringify(data, null, 2));
    } else {
        console.log('[LLM_Client] 响应数据 (非对象):', data);
    }

    let content = null;

    if (data.choices?.[0]?.message?.content) {
        content = data.choices[0].message.content.trim();
        console.log('[LLM_Client] ✅ 使用 data.choices[0].message.content');
    }
    else if (data.choices?.[0]?.message?.reasoning_content) {
        content = data.choices[0].message.reasoning_content.trim();
        console.log('[LLM_Client] ✅ 使用 data.choices[0].message.reasoning_content');
    }
    else if (data.choices?.[0]?.text) {
        content = data.choices[0].text.trim();
        console.log('[LLM_Client] ✅ 使用 data.choices[0].text');
    }
    else if (data.content) {
        content = data.content.trim();
        console.log('[LLM_Client] ✅ 使用 data.content');
    }
    else if (data.output) {
        content = data.output.trim();
        console.log('[LLM_Client] ✅ 使用 data.output');
    }
    else if (data.response) {
        content = data.response.trim();
        console.log('[LLM_Client] ✅ 使用 data.response');
    }
    else if (data.result) {
        content = typeof data.result === 'string' ? data.result.trim() : JSON.stringify(data.result);
        console.log('[LLM_Client] ✅ 使用 data.result');
    }

    if (!content) {
        console.error('[LLM_Client] ❌ 无法从响应中提取内容');
        console.error('[LLM_Client] 已尝试的路径:');
        console.error('  - data.choices[0].message.content');
        console.error('  - data.choices[0].message.reasoning_content');
        console.error('  - data.choices[0].text');
        console.error('  - data.content');
        console.error('  - data.output');
        console.error('  - data.response');
        console.error('  - data.result');

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
