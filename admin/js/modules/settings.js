// ==========================================================================
// ST-Direct-TTS Admin Module: System Settings & LLM Configuration
// ==========================================================================

import { API_BASE } from '../core/api.js';
import { showNotification } from '../core/ui.js';

/**
 * 绑定设置页面的标签页切换事件
 */
export function bindSettingsTabs() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = 'settings-tab-' + tab.dataset.tab;
            const targetContent = document.getElementById(tabId);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

/**
 * 加载系统配置数据并填充表单
 */
export async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        const settings = await response.json();

        // 基础配置
        const baseDirEl = document.getElementById('setting-base-dir');
        const cacheDirEl = document.getElementById('setting-cache-dir');
        const sovitsHostEl = document.getElementById('setting-sovits-host');
        const managerPortEl = document.getElementById('setting-manager-port');
        const defaultLangEl = document.getElementById('setting-default-lang');
        const devModeEl = document.getElementById('setting-developer-mode');

        if (baseDirEl) baseDirEl.value = settings.base_dir || '';
        if (cacheDirEl) cacheDirEl.value = settings.cache_dir || '';
        if (sovitsHostEl) sovitsHostEl.value = settings.sovits_host || 'http://127.0.0.1:9880';
        if (managerPortEl) managerPortEl.value = settings.manager_port || 3000;
        if (defaultLangEl) defaultLangEl.value = settings.default_lang || 'Chinese';
        if (devModeEl) devModeEl.value = String(settings.developer_mode === true);

        // 分析引擎配置
        const analysis = settings.analysis_engine || {};
        const analysisEnabledEl = document.getElementById('setting-analysis-enabled');
        const analysisIntervalEl = document.getElementById('setting-analysis-interval');
        const analysisThresholdEl = document.getElementById('setting-analysis-threshold');
        if (analysisEnabledEl) analysisEnabledEl.value = String(analysis.enabled !== false);
        if (analysisIntervalEl) analysisIntervalEl.value = analysis.analysis_interval || 3;
        if (analysisThresholdEl) analysisThresholdEl.value = analysis.trigger_threshold || 60;

        const analysisLlm = analysis.llm || {};
        const analysisApiUrlEl = document.getElementById('setting-analysis-llm-api-url');
        const analysisApiKeyEl = document.getElementById('setting-analysis-llm-api-key');
        if (analysisApiUrlEl) analysisApiUrlEl.value = analysisLlm.api_url || '';
        if (analysisApiKeyEl) analysisApiKeyEl.value = analysisLlm.api_key || '';

        const analysisModelSelect = document.getElementById('setting-analysis-llm-model');
        const savedAnalysisModel = analysisLlm.model || '';
        if (analysisModelSelect && savedAnalysisModel) {
            let hasOpt = Array.from(analysisModelSelect.options).some(o => o.value === savedAnalysisModel);
            if (!hasOpt) {
                const opt = document.createElement('option');
                opt.value = savedAnalysisModel;
                opt.textContent = savedAnalysisModel;
                analysisModelSelect.appendChild(opt);
            }
            analysisModelSelect.value = savedAnalysisModel;
        }

        const analysisTempEl = document.getElementById('setting-analysis-llm-temperature');
        const analysisMaxTokensEl = document.getElementById('setting-analysis-llm-max-tokens');
        if (analysisTempEl) analysisTempEl.value = analysisLlm.temperature || 0.8;
        if (analysisMaxTokensEl) analysisMaxTokensEl.value = analysisLlm.max_tokens || 5000;

        // 电话功能配置
        const phoneCall = settings.phone_call || {};
        const phoneCallEnabledEl = document.getElementById('setting-phone-call-enabled');
        if (phoneCallEnabledEl) phoneCallEnabledEl.value = String(phoneCall.enabled !== false);

        const llm = phoneCall.llm || {};
        const llmApiUrlEl = document.getElementById('setting-llm-api-url');
        const llmApiKeyEl = document.getElementById('setting-llm-api-key');
        if (llmApiUrlEl) llmApiUrlEl.value = llm.api_url || 'http://127.0.0.1:7861/v1';
        if (llmApiKeyEl) llmApiKeyEl.value = llm.api_key || '';

        const modelSelect = document.getElementById('setting-llm-model');
        const savedModel = llm.model || 'gemini-2.5-flash';
        if (modelSelect) {
            let hasOption = Array.from(modelSelect.options).some(o => o.value === savedModel);
            if (!hasOption && savedModel) {
                const option = document.createElement('option');
                option.value = savedModel;
                option.textContent = savedModel;
                modelSelect.appendChild(option);
            }
            modelSelect.value = savedModel;
        }

        const llmTempEl = document.getElementById('setting-llm-temperature');
        const llmMaxTokensEl = document.getElementById('setting-llm-max-tokens');
        if (llmTempEl) llmTempEl.value = llm.temperature || 0.8;
        if (llmMaxTokensEl) llmMaxTokensEl.value = llm.max_tokens || 5000;

        // TTS 配置
        const tts = phoneCall.tts_config || {};
        const ttsTextLangEl = document.getElementById('setting-tts-text-lang');
        const ttsPromptLangEl = document.getElementById('setting-tts-prompt-lang');
        const ttsTextSplitEl = document.getElementById('setting-tts-text-split-method');
        const ttsAuxRefEl = document.getElementById('setting-tts-use-aux-ref-audio');

        if (ttsTextLangEl) ttsTextLangEl.value = tts.text_lang || 'zh';
        if (ttsPromptLangEl) ttsPromptLangEl.value = tts.prompt_lang || 'zh';
        if (ttsTextSplitEl) ttsTextSplitEl.value = tts.text_split_method || 'cut0';
        if (ttsAuxRefEl) ttsAuxRefEl.value = String(tts.use_aux_ref_audio || false);

        // 消息处理
        const msgProcessing = settings.message_processing || {};
        const extractTagEl = document.getElementById('setting-extract-tag');
        const filterTagsEl = document.getElementById('setting-filter-tags');
        if (extractTagEl) extractTagEl.value = msgProcessing.extract_tag || '';
        if (filterTagsEl) filterTagsEl.value = msgProcessing.filter_tags || '';

        // 远程穿透
        const autoShareTunnelEl = document.getElementById('setting-auto-share-tunnel');
        if (autoShareTunnelEl) autoShareTunnelEl.value = String(settings.auto_share_tunnel === true);
    } catch (error) {
        console.error('加载系统配置失败:', error);
    }
}

/**
 * 保存系统配置数据
 */
export async function saveSettings() {
    const baseDirEl = document.getElementById('setting-base-dir');
    const cacheDirEl = document.getElementById('setting-cache-dir');
    const sovitsHostEl = document.getElementById('setting-sovits-host');
    const managerPortEl = document.getElementById('setting-manager-port');
    const defaultLangEl = document.getElementById('setting-default-lang');
    const devModeEl = document.getElementById('setting-developer-mode');
    const autoShareTunnelEl = document.getElementById('setting-auto-share-tunnel');

    const analysisEnabledEl = document.getElementById('setting-analysis-enabled');
    const analysisIntervalEl = document.getElementById('setting-analysis-interval');
    const analysisThresholdEl = document.getElementById('setting-analysis-threshold');
    const analysisApiUrlEl = document.getElementById('setting-analysis-llm-api-url');
    const analysisApiKeyEl = document.getElementById('setting-analysis-llm-api-key');
    const analysisModelEl = document.getElementById('setting-analysis-llm-model');
    const analysisTempEl = document.getElementById('setting-analysis-llm-temperature');
    const analysisMaxTokensEl = document.getElementById('setting-analysis-llm-max-tokens');

    const extractTagEl = document.getElementById('setting-extract-tag');
    const filterTagsEl = document.getElementById('setting-filter-tags');

    const phoneCallEnabledEl = document.getElementById('setting-phone-call-enabled');
    const llmApiUrlEl = document.getElementById('setting-llm-api-url');
    const llmApiKeyEl = document.getElementById('setting-llm-api-key');
    const llmModelEl = document.getElementById('setting-llm-model');
    const llmTempEl = document.getElementById('setting-llm-temperature');
    const llmMaxTokensEl = document.getElementById('setting-llm-max-tokens');

    const ttsTextLangEl = document.getElementById('setting-tts-text-lang');
    const ttsPromptLangEl = document.getElementById('setting-tts-prompt-lang');
    const ttsTextSplitEl = document.getElementById('setting-tts-text-split-method');
    const ttsAuxRefEl = document.getElementById('setting-tts-use-aux-ref-audio');

    const settings = {
        base_dir: baseDirEl ? baseDirEl.value.trim() : '',
        cache_dir: cacheDirEl ? cacheDirEl.value.trim() : '',
        sovits_host: sovitsHostEl ? sovitsHostEl.value.trim() : 'http://127.0.0.1:9880',
        manager_port: managerPortEl ? (parseInt(managerPortEl.value) || 3000) : 3000,
        default_lang: defaultLangEl ? defaultLangEl.value : 'Chinese',
        developer_mode: devModeEl ? devModeEl.value === 'true' : false,
        auto_share_tunnel: autoShareTunnelEl ? autoShareTunnelEl.value === 'true' : false,

        analysis_engine: {
            enabled: analysisEnabledEl ? analysisEnabledEl.value === 'true' : true,
            analysis_interval: analysisIntervalEl ? parseInt(analysisIntervalEl.value) || 3 : 3,
            trigger_threshold: analysisThresholdEl ? parseInt(analysisThresholdEl.value) || 60 : 60,
            llm: {
                api_url: analysisApiUrlEl ? analysisApiUrlEl.value.trim() : '',
                api_key: analysisApiKeyEl ? analysisApiKeyEl.value.trim() : '',
                model: analysisModelEl ? analysisModelEl.value.trim() : '',
                temperature: analysisTempEl ? parseFloat(analysisTempEl.value) || 0.8 : 0.8,
                max_tokens: analysisMaxTokensEl ? parseInt(analysisMaxTokensEl.value) || 5000 : 5000
            }
        },

        message_processing: {
            extract_tag: extractTagEl ? extractTagEl.value.trim() : '',
            filter_tags: filterTagsEl ? filterTagsEl.value.trim() : ''
        },

        phone_call: {
            enabled: phoneCallEnabledEl ? phoneCallEnabledEl.value === 'true' : true,
            llm: {
                api_url: llmApiUrlEl ? llmApiUrlEl.value.trim() : '',
                api_key: llmApiKeyEl ? llmApiKeyEl.value.trim() : '',
                model: llmModelEl ? llmModelEl.value.trim() : '',
                temperature: llmTempEl ? parseFloat(llmTempEl.value) || 0.8 : 0.8,
                max_tokens: llmMaxTokensEl ? parseInt(llmMaxTokensEl.value) || 5000 : 5000
            },
            tts_config: {
                text_lang: ttsTextLangEl ? ttsTextLangEl.value : 'zh',
                prompt_lang: ttsPromptLangEl ? ttsPromptLangEl.value : 'zh',
                text_split_method: ttsTextSplitEl ? ttsTextSplitEl.value : 'cut0',
                use_aux_ref_audio: ttsAuxRefEl ? ttsAuxRefEl.value === 'true' : false
            }
        }
    };

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('系统配置保存成功！', 'success');
        } else {
            showNotification(data.detail || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showNotification('保存失败，请检查服务连接', 'error');
    }
}

/**
 * 远程获取指定 LLM API 提供的模型列表
 */
export async function fetchLLMModels(apiUrl, apiKey) {
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
        models = data.map(m => m.id || m.name || m);
    } else if (data.models && Array.isArray(data.models)) {
        models = data.models.map(m => m.id || m.name || m);
    }
    return models;
}

/**
 * 绑定电话 LLM 模型列表获取按钮
 */
export function bindFetchModelsButton() {
    const btn = document.getElementById('fetch-llm-models-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const apiUrl = document.getElementById('setting-llm-api-url').value.trim();
        const apiKey = document.getElementById('setting-llm-api-key').value.trim();

        if (!apiUrl) {
            showNotification('请先填写 LLM API 地址', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = '🔄 获取中...';

        try {
            const models = await fetchLLMModels(apiUrl, apiKey);
            const select = document.getElementById('setting-llm-model');
            const currentVal = select.value;

            select.innerHTML = '<option value="">请选择模型...</option>';
            models.forEach(model => {
                const opt = document.createElement('option');
                opt.value = model;
                opt.textContent = model;
                select.appendChild(opt);
            });

            if (currentVal && models.includes(currentVal)) {
                select.value = currentVal;
            } else if (models.length > 0) {
                select.value = models[0];
            }

            showNotification(`成功获取到 ${models.length} 个可用模型`, 'success');
        } catch (error) {
            console.error('获取模型列表失败:', error);
            showNotification(`获取模型失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 获取模型列表';
        }
    });
}

/**
 * 绑定电话 LLM 连接测试按钮
 */
export function bindTestConnectionButton() {
    const btn = document.getElementById('test-llm-connection-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const apiUrl = document.getElementById('setting-llm-api-url').value.trim();
        const apiKey = document.getElementById('setting-llm-api-key').value.trim();
        const model = document.getElementById('setting-llm-model').value.trim();

        if (!apiUrl) {
            showNotification('请先填写 API 地址', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = '🧪 测试中...';

        try {
            const endpoint = apiUrl.endsWith('/chat/completions') ? apiUrl : apiUrl + '/chat/completions';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 5
                })
            });

            if (response.ok) {
                showNotification('LLM 连接测试成功！', 'success');
            } else {
                const errData = await response.json().catch(() => ({}));
                showNotification(`连接失败: HTTP ${response.status} ${errData.error?.message || ''}`, 'error');
            }
        } catch (error) {
            console.error('测试连接失败:', error);
            showNotification(`连接失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🧪 测试连接';
        }
    });
}

/**
 * 绑定分析引擎 LLM 相关测试与拉取按钮
 */
export function bindAnalysisLLMButtons() {
    const fetchBtn = document.getElementById('fetch-analysis-models-btn');
    const testBtn = document.getElementById('test-analysis-llm-btn');

    if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
            const apiUrl = document.getElementById('setting-analysis-llm-api-url').value.trim();
            const apiKey = document.getElementById('setting-analysis-llm-api-key').value.trim();

            if (!apiUrl) {
                showNotification('请先填写分析 LLM API 地址', 'warning');
                return;
            }

            fetchBtn.disabled = true;
            fetchBtn.textContent = '🔄 获取中...';

            try {
                const models = await fetchLLMModels(apiUrl, apiKey);
                const select = document.getElementById('setting-analysis-llm-model');
                const currentVal = select.value;

                select.innerHTML = '<option value="">请选择模型...</option>';
                models.forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model;
                    opt.textContent = model;
                    select.appendChild(opt);
                });

                if (currentVal && models.includes(currentVal)) {
                    select.value = currentVal;
                } else if (models.length > 0) {
                    select.value = models[0];
                }

                showNotification(`成功获取到 ${models.length} 个分析模型`, 'success');
            } catch (error) {
                console.error('获取分析模型失败:', error);
                showNotification(`获取失败: ${error.message}`, 'error');
            } finally {
                fetchBtn.disabled = false;
                fetchBtn.textContent = '🔄 获取模型列表';
            }
        });
    }

    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            const apiUrl = document.getElementById('setting-analysis-llm-api-url').value.trim();
            const apiKey = document.getElementById('setting-analysis-llm-api-key').value.trim();
            const model = document.getElementById('setting-analysis-llm-model').value.trim();

            if (!apiUrl) {
                showNotification('请先填写分析 API 地址', 'warning');
                return;
            }

            testBtn.disabled = true;
            testBtn.textContent = '🧪 测试中...';

            try {
                const endpoint = apiUrl.endsWith('/chat/completions') ? apiUrl : apiUrl + '/chat/completions';
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model || 'gpt-3.5-turbo',
                        messages: [{ role: 'user', content: 'Ping' }],
                        max_tokens: 5
                    })
                });

                if (response.ok) {
                    showNotification('分析引擎 LLM 连接测试成功！', 'success');
                } else {
                    const errData = await response.json().catch(() => ({}));
                    showNotification(`连接失败: HTTP ${response.status} ${errData.error?.message || ''}`, 'error');
                }
            } catch (error) {
                console.error('测试连接失败:', error);
                showNotification(`测试连接失败: ${error.message}`, 'error');
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = '🧪 测试连接';
            }
        });
    }
}

/**
 * 绑定远程与穿透 Tab 控件逻辑 (Cloudflare 隧道 + Nginx 生成器)
 */
export function bindTunnelAndNginxControls() {
    const statusText = document.getElementById('tunnel-status-text');
    const statusIndicator = document.getElementById('tunnel-status-indicator');
    const startBtn = document.getElementById('btn-start-tunnel');
    const stopBtn = document.getElementById('btn-stop-tunnel');
    const refreshBtn = document.getElementById('btn-refresh-tunnel');
    const urlContainer = document.getElementById('tunnel-url-container');
    const urlInput = document.getElementById('tunnel-public-url-input');
    const copyUrlBtn = document.getElementById('btn-copy-tunnel-url');

    const updateTunnelUI = (isRunning, publicUrl) => {
        if (isRunning && publicUrl) {
            if (statusIndicator) statusIndicator.style.background = '#10b981';
            if (statusText) statusText.textContent = `🟢 隧道运行中: ${publicUrl}`;
            if (urlContainer) urlContainer.style.display = 'block';
            if (urlInput) urlInput.value = publicUrl;
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
        } else if (isRunning && !publicUrl) {
            if (statusIndicator) statusIndicator.style.background = '#f59e0b';
            if (statusText) statusText.textContent = '⏳ 隧道正在建立握手中...';
            if (urlContainer) urlContainer.style.display = 'none';
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
        } else {
            if (statusIndicator) statusIndicator.style.background = '#9ca3af';
            if (statusText) statusText.textContent = '⚪ 隧道未运行';
            if (urlContainer) urlContainer.style.display = 'none';
            if (startBtn) startBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'none';
        }
    };

    const fetchTunnelStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/system/tunnel/status`);
            if (res.ok) {
                const data = await res.json();
                updateTunnelUI(data.is_running, data.public_url);
            }
        } catch (e) {
            console.error('获取隧道状态失败:', e);
        }
    };

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            startBtn.disabled = true;
            startBtn.textContent = '⏳ 启动中...';
            try {
                const res = await fetch(`${API_BASE}/system/tunnel/start`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showNotification('Cloudflare 隧道已发起，正在获取公网地址...', 'info');
                    // 轮询 3 次状态
                    let attempts = 0;
                    const timer = setInterval(async () => {
                        attempts++;
                        await fetchTunnelStatus();
                        if (attempts >= 8) clearInterval(timer);
                    }, 1500);
                } else {
                    showNotification(data.message || '启动失败', 'error');
                }
            } catch (err) {
                showNotification(`请求失败: ${err.message}`, 'error');
            } finally {
                startBtn.disabled = false;
                startBtn.textContent = '🚀 开启公网隧道';
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE}/system/tunnel/stop`, { method: 'POST' });
                updateTunnelUI(false, null);
                showNotification('Cloudflare 安全隧道已关闭', 'info');
            } catch (err) {
                showNotification(`关闭失败: ${err.message}`, 'error');
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchTunnelStatus();
            showNotification('已刷新隧道状态', 'info');
        });
    }

    if (copyUrlBtn && urlInput) {
        copyUrlBtn.addEventListener('click', () => {
            if (urlInput.value) {
                navigator.clipboard.writeText(urlInput.value);
                showNotification('已成功复制公网直连 URL！可在酒馆插件直接填入', 'success');
            }
        });
    }

    // 初次加载拉取一次状态
    fetchTunnelStatus();

    // 2. Nginx 配置生成器绑定
    const enableSslSelect = document.getElementById('nginx-enable-ssl');
    const sslFields = document.getElementById('nginx-ssl-fields');
    const generateNginxBtn = document.getElementById('btn-generate-nginx');
    const nginxResultBox = document.getElementById('nginx-result-box');
    const nginxTextarea = document.getElementById('nginx-config-textarea');
    const copyNginxBtn = document.getElementById('btn-copy-nginx');

    if (enableSslSelect && sslFields) {
        enableSslSelect.addEventListener('change', () => {
            sslFields.style.display = enableSslSelect.value === 'true' ? 'block' : 'none';
        });
    }

    if (generateNginxBtn) {
        generateNginxBtn.addEventListener('click', async () => {
            const domain = document.getElementById('nginx-domain-input').value.trim() || 'tts.example.com';
            const enableSsl = enableSslSelect ? enableSslSelect.value === 'true' : true;
            const certPath = document.getElementById('nginx-ssl-cert-input')?.value.trim();
            const keyPath = document.getElementById('nginx-ssl-key-input')?.value.trim();
            const port = parseInt(document.getElementById('setting-manager-port')?.value) || 3000;

            generateNginxBtn.disabled = true;
            generateNginxBtn.textContent = '⏳ 生成中...';

            try {
                const res = await fetch(`${API_BASE}/system/tunnel/generate_nginx`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domain: domain,
                        local_port: port,
                        enable_ssl: enableSsl,
                        ssl_cert_path: certPath,
                        ssl_key_path: keyPath
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (nginxResultBox) nginxResultBox.style.display = 'block';
                    if (nginxTextarea) nginxTextarea.value = data.config;
                    showNotification('Nginx 配置文件已成功生成！', 'success');
                } else {
                    showNotification('生成失败', 'error');
                }
            } catch (err) {
                showNotification(`生成异常: ${err.message}`, 'error');
            } finally {
                generateNginxBtn.disabled = false;
                generateNginxBtn.textContent = '✨ 一键生成 Nginx 完整配置文件';
            }
        });
    }

    if (copyNginxBtn && nginxTextarea) {
        copyNginxBtn.addEventListener('click', () => {
            if (nginxTextarea.value) {
                navigator.clipboard.writeText(nginxTextarea.value);
                showNotification('已复制 Nginx 配置到剪贴板！', 'success');
            }
        });
    }
}
