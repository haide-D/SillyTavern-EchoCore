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

    // 统一通过后端代理获取模型列表 (彻底规避浏览器跨域 CORS 拦截)
    try {
        const proxyUrl = getBackendProxyUrl('/api/admin/llm/models');
        const resp = await fetch(proxyUrl, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ api_url: apiUrl.trim(), api_key: apiKey ? apiKey.trim() : '' })
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data.success && Array.isArray(data.models)) {
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

    return [];
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
    if (!config.api_url) {
        throw new Error('缺少必要的 LLM 配置: api_url');
    }

    // ✅ 彻底统一走后端代理，杜绝前端直连导致的 CORS 跨域拦截
    const proxyUrl = getBackendProxyUrl('/api/admin/llm/chat');
    const requestBody = {
        api_url: config.api_url.trim(),
        api_key: config.api_key ? config.api_key.trim() : '',
        model: config.model || 'gpt-3.5-turbo',
        messages: config.messages || [{ role: "user", content: config.prompt }],
        prompt: config.prompt,
        temperature: config.temperature !== undefined ? config.temperature : 0.8
    };

    if (config.max_tokens) {
        requestBody.max_tokens = config.max_tokens;
    }

    console.log(`[LLM_Client] 🚀 通过后端代理调用 LLM -> 模型: ${requestBody.model}, 目标服务: ${requestBody.api_url}`);

    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
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
                console.error('[LLM_Client] ❌ 后端 LLM 代理返回错误');
                console.error('[LLM_Client] 目标模型:', requestBody.model);
                console.error('[LLM_Client] 响应状态:', response.status);
                console.error('[LLM_Client] 错误详情:', errorDetail);
                throw new Error(`LLM 代理调用失败 (HTTP ${response.status}): ${errorDetail.substring(0, 300)}`);
            }

            const data = await response.json();
            return parseResponse(data);

        } catch (error) {
            lastError = error;

            if (attempt === 1 || attempt === MAX_RETRIES) {
                console.error('[LLM_Client] ❌ LLM 调用失败:', error.message);
                console.error('[LLM_Client] 请求配置:', JSON.stringify({
                    model: requestBody.model,
                    temperature: requestBody.temperature,
                    max_tokens: requestBody.max_tokens,
                    prompt_length: config.prompt?.length || 0
                }));
                if (error.rawResponse) {
                    console.error('[LLM_Client] 原始响应数据:', JSON.stringify(error.rawResponse, null, 2));
                }
            }

            // 只有网络连接错误才重试
            if (isNetworkError(error) && attempt < MAX_RETRIES) {
                console.warn(`[LLM_Client] ⚠️ 网络连接异常, 第 ${attempt}/${MAX_RETRIES} 次重试... (${error.message})`);
                await delay(1000 * attempt);
                continue;
            }

            // 非网络错误或已用尽重试次数，直接抛出
            throw error;
        }
    }

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
