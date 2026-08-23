/**
 * LLM 测试 App 模块
 * 测试 LLM API 连接和模型调用
 */

import { getApiHost, getAuthHeaders } from './shared/utils.js';

/**
 * 渲染 LLM 测试 App
 * @param {jQuery} container - App 容器
 * @param {Function} createNavbar - 创建导航栏函数
 */
export async function render(container, createNavbar) {
    container.empty();
    container.append(createNavbar("LLM连接测试"));

    // 从配置文件读取默认值
    let defaultConfig = {
        api_url: 'http://127.0.0.1:7861/v1',
        api_key: 'pwd',
        model: 'gemini-2.5-flash',
        temperature: 0.8,
        max_tokens: 500
    };

    try {
        // 从后端API加载配置
        const apiHost = getApiHost();
        const settingsRes = await fetch(`${apiHost}/api/settings`, { headers: getAuthHeaders() });
        if (settingsRes.ok) {
            const settings = await settingsRes.json();
            console.log('[LLM测试] 加载的配置', settings);

            if (settings.phone_call && settings.phone_call.llm) {
                const llmConfig = settings.phone_call.llm;
                defaultConfig = {
                    api_url: llmConfig.api_url || defaultConfig.api_url,
                    api_key: llmConfig.api_key || defaultConfig.api_key,
                    model: llmConfig.model || defaultConfig.model,
                    temperature: llmConfig.temperature !== undefined ? llmConfig.temperature : defaultConfig.temperature,
                    max_tokens: llmConfig.max_tokens || defaultConfig.max_tokens
                };
                console.log('[LLM测试] 成功加载配置');
            }
        } else {
            console.warn('[LLM测试] 配置API返回错误:', settingsRes.status);
        }
    } catch (e) {
        console.warn('[LLM测试] 无法加载配置,使用默认值', e.message);
    }

    const $content = $(`
        <div style="padding:15px; flex:1; overflow-y:auto; background:#f2f2f7;">
            <div style="background:#fff; border-radius:12px; padding:15px; margin-bottom:15px;">
                <h3 style="margin:0 0 15px 0; font-size:16px; color:#333;">📡 API配置</h3>
                
                <div style="margin-bottom:12px;">
                    <label style="display:block; margin-bottom:5px; font-size:13px; color:#666;">API地址</label>
                    <input type="text" id="llm-api-url" value="${defaultConfig.api_url}" 
                        style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:14px;">
                </div>
                
                <div style="margin-bottom:12px;">
                    <label style="display:block; margin-bottom:5px; font-size:13px; color:#666;">API密钥</label>
                    <input type="password" id="llm-api-key" value="${defaultConfig.api_key}" 
                        style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:14px;">
                </div>
                
                <div style="margin-bottom:12px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">
                        <label style="font-size:13px; color:#666;">模型名称</label>
                        <button id="llm-fetch-models" style="padding:4px 10px; background:#8b5cf6; color:#fff; border:none; border-radius:6px; font-size:12px; cursor:pointer;">
                            🔄 获取模型列表
                        </button>
                    </div>
                    <input type="text" id="llm-model" list="llm-model-list" value="${defaultConfig.model || ''}"
                        placeholder="直接输入模型名，例: cline-pass/deepseek-v4-pro"
                        style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:14px; background:#fff;">
                    <datalist id="llm-model-list"></datalist>
                </div>
                
                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:5px; font-size:13px; color:#666;">温度</label>
                        <input type="number" id="llm-temperature" value="${defaultConfig.temperature}" 
                            step="0.1" min="0" max="2"
                            style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:14px;">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:5px; font-size:13px; color:#666;">最大Token</label>
                        <input type="number" id="llm-max-tokens" value="${defaultConfig.max_tokens}" 
                            style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:14px;">
                    </div>
                </div>
            </div>
            
            <div style="background:#fff; border-radius:12px; padding:15px; margin-bottom:15px;">
                <h3 style="margin:0 0 15px 0; font-size:16px; color:#333;">💬 测试提示词</h3>
                <textarea id="llm-test-prompt" 
                    style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:14px; min-height:80px; resize:vertical;"
                    placeholder="输入测试提示词...">你好,请回复'测试成功'</textarea>
            </div>
            
            <button id="llm-test-btn" 
                style="width:100%; padding:15px; background:#8b5cf6; color:#fff; border:none; border-radius:12px; font-size:16px; font-weight:bold; cursor:pointer; margin-bottom:15px;">
                🚀 开始测试
            </button>
            
            <div id="llm-test-result" style="display:none; background:#fff; border-radius:12px; padding:15px;">
                <h3 style="margin:0 0 15px 0; font-size:16px; color:#333;">📊 测试结果</h3>
                <div id="llm-result-content"></div>
            </div>
        </div>
    `);

    container.append($content);

    // 使用事件委托确保元素存在
    $content.on('click', '#llm-fetch-models', async function () {
        const $btn = $(this);
        const $input = $('#llm-model');
        const $datalist = $('#llm-model-list');
        const apiUrl = $('#llm-api-url').val().trim();
        const apiKey = $('#llm-api-key').val().trim();

        if (!apiUrl || !apiKey) {
            alert('请先填写API地址和密钥');
            return;
        }

        $btn.prop('disabled', true).text('获取中...');

        try {
            console.log('[LLM测试] 开始获取模型列表...');
            const models = await window.LLM_Client.fetchModels(apiUrl, apiKey);
            console.log('[LLM测试] 成功获取模型:', models);

            $datalist.empty();
            if (Array.isArray(models)) {
                models.forEach(model => {
                    $datalist.append(`<option value="${model}">`);
                });
            }

            if (!$input.val().trim() && Array.isArray(models) && models.length > 0) {
                $input.val(models[0]);
            }

            alert(`已拉取可用模型列表，您可直接在输入框中自由填入或修改任意模型名称`);
        } catch (error) {
            console.error('[LLM测试] 获取模型失败:', error);
            alert(`获取模型列表失败: ${error.message} (您可直接在输入框中手动输入模型名称)`);
        } finally {
            $btn.prop('disabled', false).text('🔄 获取模型列表');
        }
    });

    $content.on('click', '#llm-test-btn', async function () {
        const $btn = $(this);
        const $result = $('#llm-test-result');
        const $resultContent = $('#llm-result-content');

        const config = {
            api_url: $('#llm-api-url').val().trim(),
            api_key: $('#llm-api-key').val().trim(),
            model: $('#llm-model').val().trim(),
            temperature: parseFloat($('#llm-temperature').val()),
            max_tokens: parseInt($('#llm-max-tokens').val()),
            prompt: $('#llm-test-prompt').val().trim()
        };

        if (!config.api_url || !config.api_key || !config.model) {
            alert('请填写完整的API配置');
            return;
        }

        $btn.prop('disabled', true).text('测试中...');
        $result.show();
        $resultContent.html('<div style="text-align:center; padding:20px; color:#666;">正在连接LLM...</div>');

        try {
            console.log('[LLM测试] 开始调用LLM...', config);
            const content = await window.LLM_Client.callLLM(config);
            console.log('[LLM测试] LLM响应成功:', content);

            // 显示成功结果
            $resultContent.html(`
                <div style="padding:15px; background:#d1fae5; border-radius:8px; margin-bottom:10px;">
                    <div style="font-size:18px; margin-bottom:5px;">✅ 连接成功</div>
                    <div style="font-size:13px; color:#065f46;">LLM响应正常</div>
                </div>
                
                <div style="margin-bottom:10px;">
                    <strong style="color:#666; font-size:13px;">📤 测试提示词</strong>
                    <div style="background:#f9fafb; padding:10px; border-radius:6px; margin-top:5px; font-size:13px; color:#333;">
                        ${config.prompt}
                    </div>
                </div>
                
                <div style="margin-bottom:10px;">
                    <strong style="color:#666; font-size:13px;">📥 LLM响应 (${content.length}字符):</strong>
                    <div style="background:#f9fafb; padding:10px; border-radius:6px; margin-top:5px; font-size:13px; color:#333; max-height:200px; overflow-y:auto;">
                        ${content}
                    </div>
                </div>
                
                <div style="font-size:12px; color:#999; padding:10px; background:#f9fafb; border-radius:6px;">
                    <div>🔧 模型: ${config.model}</div>
                    <div>🌡️ 温度: ${config.temperature}</div>
                    <div>📊 最大Token: ${config.max_tokens}</div>
                    <div>🌐 API: ${config.api_url}</div>
                </div>
            `);

        } catch (error) {
            console.error('[LLM测试] 失败:', error);

            $resultContent.html(`
                <div style="padding:15px; background:#fee2e2; border-radius:8px; margin-bottom:10px;">
                    <div style="font-size:18px; margin-bottom:5px;">❌ 连接失败</div>
                    <div style="font-size:13px; color:#991b1b;">${error.message}</div>
                </div>
                
                <div style="background:#f9fafb; padding:10px; border-radius:6px; font-size:12px; color:#666;">
                    <strong>错误详情:</strong><br>
                    ${error.message}
                </div>
                
                <div style="margin-top:10px; padding:10px; background:#fef3c7; border-radius:6px; font-size:12px; color:#92400e;">
                    💡 <strong>排查建议:</strong><br>
                    1. 检查API地址是否正确 (当前: ${config.api_url})<br>
                    2. 确认API密钥有效<br>
                    3. 验证模型名称是否存在 (当前: ${config.model})<br>
                    4. 打开浏览器控制台查看详细日志<br>
                    5. 检查是否有CORS跨域问题
                </div>
            `);
        } finally {
            $btn.prop('disabled', false).text('🚀 开始测试');
        }
    });
}

export default { render };
