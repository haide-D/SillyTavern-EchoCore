// ================= ES6 模块导入 =================
// 导入 SillyTavern 核心 API
// 插件路径: data/default-user/extensions/st-direct-tts/index.js
// 参考 LittleWhiteBox: public/ 目录在浏览器中被映射为根路径 /
// 从当前目录向上4级到达 SillyTavern 根,然后访问 script.js 和 scripts/extensions.js
import { eventSource, event_types } from '../../../../script.js';
import { extension_settings, getContext } from '../../../extensions.js';

// 导入子模块
import * as TTS_Utils from './frontend/js/utils.js';
import { TTS_API } from './frontend/js/api.js';
import { TTS_State } from './frontend/js/state.js';
import { TTS_Parser } from './frontend/js/dom_parser.js';
import { TTS_Scheduler } from './frontend/js/scheduler.js';
import { TTS_Events } from './frontend/js/events.js';
import * as TTS_Templates from './frontend/js/ui_templates.js';
import { SpeakerManager } from './frontend/js/speaker_manager.js';

import { TTS_UI } from './frontend/js/ui_main.js';
import './frontend/js/ui_dashboard.js';  // 导入 ui_dashboard.js 以加载事件绑定函数
import { LLM_Client } from './frontend/js/llm_client.js';
import { TTS_Mobile } from './frontend/js/mobile_ui.js';
import { ThemeEngine } from './frontend/js/theme_engine.js';
import { WebSocketManager } from './frontend/js/websocket_manager.js';
import { ChatEventListener } from './frontend/js/chat_event_listener.js';
import { ThemeTesterUI } from './frontend/js/theme_tester_ui.js';
import { initSettingsUI } from './frontend/js/settings_ui.js';
import { PromptInjector } from './frontend/js/prompt_injector.js';
import { CallQueueManager } from './frontend/js/call_queue_manager.js';

// ================= 1. 配置区域 =================
const lsConfig = localStorage.getItem('tts_plugin_remote_config');
let remoteConfig = lsConfig ? JSON.parse(lsConfig) : { useRemote: false, ip: "", port: 3000, token: "" };

// 统一解析后端 API 地址 (彻底支持反代 HTTPS 与动态端口，解决 Issue #2)
const backendUrls = TTS_Utils.resolveBackendUrls(remoteConfig);
const MANAGER_API = backendUrls.httpUrl;

// ================= 暴露模块到 window 对象 (向后兼容) =================
// 由于部分模块内部仍使用 window.TTS_* 引用,需要暴露到全局
window.TTS_Utils = TTS_Utils;
window.TTS_API = TTS_API;
window.TTS_State = TTS_State;
window.TTS_Parser = TTS_Parser;
window.TTS_Scheduler = TTS_Scheduler;
window.TTS_Events = TTS_Events;
window.TTS_Templates = TTS_Templates;
window.TTS_PromptInjector = PromptInjector;  // 暴露 PromptInjector 供全局消费
window.LLM_Client = LLM_Client;  // 暴露 LLM_Client 供 mobile_ui.js 使用
window.TTS_ThemeEngine = ThemeEngine;  // 暴露 ThemeEngine 供通知处理器等使用
// 不要覆盖整个 window.TTS_UI,只添加 Templates
// ui_main.js 的 IIFE 已经初始化了 window.TTS_UI.CTX
if (!window.TTS_UI.Templates) {
    window.TTS_UI.Templates = TTS_Templates;
}
if (!window.TTS_UI.CTX) {
    window.TTS_UI.CTX = null;  // 如果 ui_main.js 还没设置,则初始化为 null
}

// ================= 2. 主逻辑函数 =================
function initPlugin() {
    console.log("✅ [TTS] 开始初始化插件核心...");

    const cachedStyle = localStorage.getItem('tts_bubble_style');
    const styleToApply = cachedStyle || 'default';

    document.body.setAttribute('data-bubble-style', styleToApply);
    console.log(`🎨 [Init] 皮肤已加载: ${styleToApply}`);

    // 2. 模块初始化
    TTS_API.init(MANAGER_API, remoteConfig.token || "");
    TTS_State.init();
    TTS_State.CACHE.API_URL = MANAGER_API; // 保存 API URL 供其他模块使用
    if (TTS_Parser.init) TTS_Parser.init();
    if (TTS_Events.init) TTS_Events.init();
    if (TTS_Scheduler.init) TTS_Scheduler.init();
    if (PromptInjector.init) PromptInjector.init();

    // 3. 建立局部引用
    const CACHE = TTS_State.CACHE;
    const Scheduler = TTS_Scheduler;

    // 3. 加载全局 CSS
    const styleCssUrl = `${MANAGER_API}/static/css/style.css?t=${new Date().getTime()}`;
    TTS_Utils.loadGlobalCSS(styleCssUrl, (cssContent) => {
        // CSS加载完毕后，手动扫描一次
        if (TTS_Parser.scan) TTS_Parser.scan();

        // 修复 Iframe 样式
        $('iframe').each(function () {
            try {
                const head = $(this).contents().find('head');
                if (head.length > 0 && head.find('#sovits-iframe-style').length === 0) {
                    const iframeLink = document.createElement('link');
                    iframeLink.id = 'sovits-iframe-style';
                    iframeLink.rel = 'stylesheet';
                    iframeLink.type = 'text/css';
                    iframeLink.href = styleCssUrl;
                    head.append(iframeLink);
                }
            } catch (e) { }
        });
    });

    // 动态注入手机壳、通话全屏与 App 模块化样式表
    const mobileCssUrl = `${MANAGER_API}/static/css/mobile.css?t=${new Date().getTime()}`;
    const phoneCallCssUrl = `${MANAGER_API}/static/css/phone_call.css?t=${new Date().getTime()}`;
    const mobileAppsCssUrl = `${MANAGER_API}/static/css/mobile_apps.css?t=${new Date().getTime()}`;

    TTS_Utils.injectStyleLink('tts-mobile-force-style-link', mobileCssUrl);
    TTS_Utils.injectStyleLink('tts-phone-call-style-link', phoneCallCssUrl);
    TTS_Utils.injectStyleLink('tts-mobile-apps-style-link', mobileAppsCssUrl);
    console.log("✅ [TTS] 全部模块化 CSS (Style, Mobile, Call, Apps) 已完成标准链路注入！");

    // 4. 定义核心回调函数 (传给 UI 模块使用)
    async function refreshData() {
        // 动态获取最新配置并同步 API 地址
        const currentCfg = TTS_Utils.getLatestRemoteConfig();
        const currentUrls = TTS_Utils.resolveBackendUrls(currentCfg);
        TTS_API.init(currentUrls.httpUrl, currentCfg.token || "");
        CACHE.API_URL = currentUrls.httpUrl;

        try {
            TTS_Utils.injectStyles();
            $('#tts-manager-btn').css({ 'border-color': 'rgba(255,255,255,0.3)', 'color': '#fff' }).text('🔊 TTS配置');

            const data = await TTS_API.getData();

            // 更新 State
            CACHE.models = data.models;
            CACHE.mappings = data.mappings;
            if (data.settings) CACHE.settings = { ...CACHE.settings, ...data.settings };

            if (CACHE.settings.bubble_style) {
                document.body.setAttribute('data-bubble-style', CACHE.settings.bubble_style);
                localStorage.setItem('tts_bubble_style', CACHE.settings.bubble_style);

                const currentStyle = CACHE.settings.bubble_style || 'default';
                const $trigger = $('.select-trigger');
                const $targetOption = $(`.option-item[data-value="${currentStyle}"]`);

                if ($targetOption.length > 0) {
                    $trigger.find('span').text($targetOption.text());
                    $trigger.attr('data-value', currentStyle);
                }
            }

            // 强制覆盖 iframe_mode
            const localIframeMode = localStorage.getItem('tts_plugin_iframe_mode');
            if (localIframeMode !== null) CACHE.settings.iframe_mode = (localIframeMode === 'true');

            CACHE.pendingTasks.clear();

            // 刷新 UI
            if (TTS_UI.renderModelOptions) {
                TTS_UI.renderModelOptions();
                TTS_UI.renderDashboardList();
            }

            // 自动生成检查
            if (CACHE.settings.enabled !== false && CACHE.settings.auto_generate) {
                Scheduler.scanAndSchedule();
            }

            // 开发者模式主题测试器
            ThemeTesterUI.init(CACHE.settings);
        } catch (e) {
            console.error("🔴 [TTS Backend Error]:", e);
            console.log("🔴 [Debug] 准备弹出救援配置界面...");
            TTS_Utils.showNotification("❌ 未检测到 TTS 后端服务", "error");
            $('#tts-manager-btn').css({ 'border-color': '#ff5252', 'color': '#ff5252' }).text('⚠️ TTS断开');

            console.log("🔴 [Debug] 调用 showEmergencyConfig, 当前目标 =", currentUrls.httpUrl);
            showEmergencyConfig(currentUrls.httpUrl);
            console.log("🔴 [Debug] showEmergencyConfig 调用完成");
        }
    }

    async function toggleMasterSwitch(checked) {
        CACHE.settings.enabled = checked;
        if (checked && TTS_Parser.scan) TTS_Parser.scan();
        try { await TTS_API.updateSettings({ enabled: checked }); } catch (e) { }
    }

    async function toggleAutoGenerate(checked) {
        CACHE.settings.auto_generate = checked;
        try {
            await TTS_API.updateSettings({ auto_generate: checked });
            if (checked && CACHE.settings.enabled !== false) Scheduler.scanAndSchedule();
        } catch (e) { }
    }

    async function changeBubbleStyle(styleName) {
        console.log("🎨 正在切换风格为:", styleName);

        document.body.setAttribute('data-bubble-style', styleName);
        localStorage.setItem('tts_bubble_style', styleName);

        try {
            const response = await fetch(`${MANAGER_API}/update_settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bubble_style: styleName })
            });

            const res = await response.json();
            if (res.status === 'success') {
                console.log("✅ 风格已永久保存:", styleName);
                if (TTS_State.CACHE.settings) {
                    TTS_State.CACHE.settings.bubble_style = styleName;
                }
            }
        } catch (e) {
            console.error("❌ 保存风格失败:", e);
        }
    }

    async function saveSettings(base, cache) {
        const b = base !== undefined ? base : $('#tts-base-path').val().trim();
        const c = cache !== undefined ? cache : $('#tts-cache-path').val().trim();
        try {
            await TTS_API.updateSettings({ base_dir: b, cache_dir: c });
            return true;
        } catch (e) { return false; }
    }

    // 5. 初始化 UI 模块
    if (TTS_UI.init) {
        TTS_UI.init({
            CACHE: CACHE,
            API_URL: MANAGER_API,
            Utils: TTS_Utils,
            Callbacks: { refreshData, saveSettings, toggleMasterSwitch, toggleAutoGenerate, changeBubbleStyle }
        }, false);
    }

    // 自定义下拉菜单交互逻辑
    $('body').on('click', '.select-trigger', function (e) {
        e.stopPropagation();
        $(this).parent('.tts-custom-select').toggleClass('open');
    });

    $('body').on('click', '.option-item', function () {
        const val = $(this).attr('data-value');
        const text = $(this).text();
        const $wrapper = $(this).closest('.tts-custom-select');

        const $trigger = $wrapper.find('.select-trigger');
        $trigger.find('span').text(text);
        $trigger.attr('data-value', val);

        $wrapper.removeClass('open');
        changeBubbleStyle(val);
    });

    $(document).on('click', function () {
        $('.tts-custom-select').removeClass('open');
    });

    // 6. 启动心跳看门狗
    function runWatchdog() {
        if (document.hidden) return;

        if (TTS_Utils.getStyleContent) {
            const currentCSS = TTS_Utils.getStyleContent();
            if ($('#sovits-iframe-style-main').length === 0 && currentCSS) {
                $('head').append(`<style id='sovits-iframe-style-main'>${currentCSS}</style>`);
            }
        }

        if (CACHE.settings.enabled && TTS_Parser.scan) {
            TTS_Parser.scan();
        }
    }

    // 立即执行一次
    refreshData();

    // 启动循环
    setInterval(runWatchdog, 1500);

    // 启动 DOM 监听
    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldScan = true;
                break;
            }
        }
        if (shouldScan && CACHE.settings.enabled && TTS_Parser.scan) {
            TTS_Parser.scan();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 暴露全局刷新
    window.refreshTTS = refreshData;
    setTimeout(runWatchdog, 500);
}

// ================= [新增] 救援模式 UI (手动 IP 配置) =================
function showEmergencyConfig(currentApi) {
    if ($('#tts-emergency-box').length > 0) return;

    const html = `
        <div id="tts-emergency-box" style="
            position: fixed; top: 10px; right: 10px; z-index: 999999;
            background: #2d3436; color: #fff; padding: 15px;
            border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            font-family: sans-serif; font-size: 14px; border: 1px solid #ff7675;
            max-width: 320px;
        ">
            <div style="font-weight:bold; color:#ff7675; margin-bottom:8px;">⚠️ 无法连接插件后端，请检查是否开启插件后端</div>
            <div style="font-size:12px; color:#aaa; margin-bottom:8px;">尝试连接: ${currentApi} 失败。<br>请输入电脑 IP、域名或反代 URL：</div>

            <input type="text" id="tts-emergency-ip" placeholder="例如: 64.83.25.198 或 https://tts.xxx.com"
                style="width:100%; box-sizing:border-box; padding:5px; margin-bottom:6px; border-radius:4px; border:none;">
            <input type="number" id="tts-emergency-port" placeholder="端口号 (默认 3000，反代URL忽略)" value="${remoteConfig.port || 3000}"
                style="width:100%; box-sizing:border-box; padding:5px; margin-bottom:6px; border-radius:4px; border:none;">
            <input type="password" id="tts-emergency-token" placeholder="访问凭证 / API Token (开启鉴权时填写)"
                style="width:100%; box-sizing:border-box; padding:5px; margin-bottom:8px; border-radius:4px; border:none;">

            <button id="tts-emergency-save" style="
                width:100%; padding:6px; background:#0984e3; color:white;
                border:none; border-radius:4px; cursor:pointer;
            ">保存并重连</button>

            <div style="margin-top:8px; text-align:center;">
                <button id="tts-emergency-close" style="background:none; border:none; color:#aaa; font-size:12px; text-decoration:underline; cursor:pointer;">关闭</button>
            </div>
        </div>
    `;

    $('body').append(html);

    const saved = localStorage.getItem('tts_plugin_remote_config');
    if (saved) {
        try {
            const p = JSON.parse(saved);
            if (p.ip) $('#tts-emergency-ip').val(p.ip);
            if (p.port) $('#tts-emergency-port').val(p.port);
            if (p.token) $('#tts-emergency-token').val(p.token);
        } catch (e) { }
    }

    $('#tts-emergency-close').on('click', function () {
        $('#tts-emergency-box').remove();
    });

    $('#tts-emergency-save').on('click', function () {
        const ip = $('#tts-emergency-ip').val().trim();
        const portVal = parseInt($('#tts-emergency-port').val()) || 3000;
        const token = $('#tts-emergency-token').val().trim();
        if (!ip) return alert("请输入 IP 或反代 URL");

        localStorage.setItem('tts_plugin_remote_config', JSON.stringify({
            useRemote: true,
            ip: ip,
            port: portVal,
            token: token
        }));

        alert(`设置已保存: ${ip}\n页面即将刷新...`);
        location.reload();
    });
}

// ================= 3. 启动插件 =================
console.log("🚀 [TTS] 正在初始化插件...");
initPlugin();

// 初始化主题引擎（异步）
if (TTS_Mobile && TTS_Mobile.init) {
    TTS_Mobile.init().catch(err => {
        console.error('❌ [TTS] 主题引擎初始化失败:', err);
    });
}

// 初始化聊天事件监听器 (延迟 2 秒,确保 SillyTavern 完全加载)
setTimeout(() => {
    if (ChatEventListener && ChatEventListener.init) {
        console.log("📞 [Loader] 开始初始化聊天事件监听器...");
        ChatEventListener.init();
    } else {
        console.warn("⚠️ [Loader] ChatEventListener 模块未找到");
    }
}, 2000);

// 初始化原生扩展设置面板与系统提示词注入
eventSource.on(event_types.APP_READY, () => {
    console.log("🛠️ [Loader] APP_READY: 正在挂载酒馆原生扩展设置面板...");
    initSettingsUI();
    if (PromptInjector && PromptInjector.refreshAndInject) {
        PromptInjector.refreshAndInject();
    }
});

console.log("✅ [TTS] 插件初始化完成");
