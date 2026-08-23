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

async function callLLM(config) {
    if (!config.api_url) {
        throw new Error('缺少必要的 LLM 配置: api_url');
    }

    const MAX_RETRIES = Math.max(1, parseInt(config.max_retries || 5, 10));

    // ✅ 彻底统一走后端代理，杜绝前端直连导致的 CORS 跨域拦截
    const proxyUrl = getBackendProxyUrl('/api/admin/llm/chat');
    const requestBody = {
        api_url: config.api_url.trim(),
        api_key: config.api_key ? config.api_key.trim() : '',
        model: config.model || 'gpt-3.5-turbo',
        messages: config.messages || [{ role: "user", content: config.prompt }],
        prompt: config.prompt,
        temperature: config.temperature !== undefined ? config.temperature : 0.8,
        max_retries: MAX_RETRIES
    };

    if (config.max_tokens) {
        requestBody.max_tokens = config.max_tokens;
    }

    console.log(`[LLM_Client] 🚀 通过后端代理调用 LLM -> 模型: ${requestBody.model}, 目标服务: ${requestBody.api_url}, 最大重试次数: ${MAX_RETRIES}`);

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
                throw new Error(`(HTTP ${response.status}): ${errorDetail.substring(0, 300)}`);
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
                    prompt_length: config.prompt?.length || 0,
                    max_retries: MAX_RETRIES
                }));
                if (error.rawResponse) {
                    console.error('[LLM_Client] 原始响应数据:', JSON.stringify(error.rawResponse, null, 2));
                }
            }

            // 可重试错误且未耗尽次数
            if (isNetworkError(error) && attempt < MAX_RETRIES) {
                console.warn(`[LLM_Client] ⚠️ LLM 请求异常, 第 ${attempt}/${MAX_RETRIES} 次重试... (${error.message})`);
                await delay(1000 * attempt);
                continue;
            }

            // 非网络/临时错误或已用尽重试次数，直接抛出
            throw error;
        }
    }

    const cleanMsg = lastError?.message || '未知错误';
    if (cleanMsg.includes('已重试') || cleanMsg.includes('均失败')) {
        throw lastError;
    }
    throw new Error(`LLM 调用失败: API 已重试 ${MAX_RETRIES} 次均失败 (${cleanMsg})`);
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
