// frontend/js/daily_egg.js
/**
 * 每日剧本盲盒预设与合规匿名日活 (DAU) 统计客户端模块
 * 严格遵从社区工具发布规范：
 * 1. 代码完全明文开源，标准 JSON 传输
 * 2. 尊重隐私：在设置面板提供显眼开关，关闭后 100% 拦截外部请求
 * 3. 安全边界：一键安装仅限制在 presets/custom/*.json，绝不执行远程脚本
 */

import { TTS_API } from './api.js';
import * as TTS_Utils from './utils.js';

const PLUGIN_VERSION = '3.1.0';
// 默认远端 VPS 盲盒服务地址 (作者部署后可在此填入生产域名，如 https://api.st-tts.com)
// 默认支持通过 localStorage 或 window.TTS_EGG_SERVER_URL 覆盖
const DEFAULT_REMOTE_URL = window.TTS_EGG_SERVER_URL || 'https://api.st-tts.com';

export const DailyEgg = {
    state: {
        clientId: null,
        isEnabled: true,
        todayData: null,
        lastFetchDate: null,
        serverUrl: DEFAULT_REMOTE_URL
    },

    /**
     * 获取或生成匿名设备 UUID
     */
    getClientId() {
        let cid = localStorage.getItem('tts_client_uuid');
        if (!cid) {
            cid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? 
                crypto.randomUUID() : 
                'cid_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
            localStorage.setItem('tts_client_uuid', cid);
        }
        return cid;
    },

    /**
     * 获取客户端操作系统简述
     */
    getOS() {
        const ua = navigator.userAgent || '';
        if (ua.includes('Win')) return 'win';
        if (ua.includes('Mac')) return 'mac';
        if (ua.includes('Linux')) return 'linux';
        if (ua.includes('Android')) return 'android';
        if (ua.includes('iPhone') || ua.includes('iPad')) return 'ios';
        return 'unknown';
    },

    /**
     * 获取当前北京时间日期字符串 YYYY-MM-DD
     */
    getTodayDateStr() {
        const now = new Date();
        const beijingOffset = 8 * 60; // UTC+8
        const localOffset = now.getTimezoneOffset(); // in minutes
        const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60000);
        return beijingTime.toISOString().split('T')[0];
    },

    /**
     * 初始化每日彩蛋与日活统计
     */
    async init() {
        this.state.clientId = this.getClientId();

        // 读取用户隐私开关
        const context = window.SillyTavern ? window.SillyTavern.getContext() : null;
        let isTelemetryEnabled = true;
        if (context && context.extensionSettings && context.extensionSettings.st_direct_tts) {
            if (context.extensionSettings.st_direct_tts.telemetry_enabled !== undefined) {
                isTelemetryEnabled = context.extensionSettings.st_direct_tts.telemetry_enabled;
            }
        }
        this.state.isEnabled = isTelemetryEnabled;

        // 若用户主动关闭，100% 拦截外部请求
        if (!this.state.isEnabled) {
            console.log("🛡️ [DailyEgg] 用户已关闭每日盲盒与匿名统计，跳过外部请求。");
            return;
        }

        const todayStr = this.getTodayDateStr();
        const cachedDate = localStorage.getItem('tts_egg_fetch_date');
        const cachedDataStr = localStorage.getItem('tts_egg_cache_data');

        // 如果今天已经拉取过，直接从本地缓存读取，不重复对 VPS 产生请求
        if (cachedDate === todayStr && cachedDataStr) {
            try {
                this.state.todayData = JSON.parse(cachedDataStr);
                console.log("🎁 [DailyEgg] 读取今日本地盲盒缓存成功");
                this.renderUI();
                return;
            } catch (e) { }
        }

        // 首次或新的一天，向 VPS 请求盲盒与打点
        await this.fetchTodayEgg();
    },

    /**
     * 每日首次拉取今日彩蛋并打点
     */
    async fetchTodayEgg() {
        if (!this.state.isEnabled) return;

        const cid = this.state.clientId;
        const os = this.getOS();
        const url = `${this.state.serverUrl}/api/egg/today?client_id=${encodeURIComponent(cid)}&v=${encodeURIComponent(PLUGIN_VERSION)}&os=${encodeURIComponent(os)}`;

        try {
            const resp = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();

            if (json.success && json.data) {
                this.state.todayData = json.data;
                const todayStr = this.getTodayDateStr();
                localStorage.setItem('tts_egg_fetch_date', todayStr);
                localStorage.setItem('tts_egg_cache_data', JSON.stringify(json.data));
                console.log("✅ [DailyEgg] 今日剧本盲盒已同步，日活打点成功！");
                this.renderUI();
            }
        } catch (err) {
            console.warn("⚠️ [DailyEgg] 连接盲盒服务超时或失败 (离线环境/服务未部署):", err.message);
            // 离线时不影响任何本地功能
        }
    },

    /**
     * 消耗次数抽取新盲盒（换一批）
     */
    async drawNextEgg() {
        if (!this.state.isEnabled) return;

        const $btn = $('#tts-egg-draw-btn');
        $btn.prop('disabled', true).text('🎲 抽取中...');

        const cid = this.state.clientId;
        const os = this.getOS();
        const url = `${this.state.serverUrl}/api/egg/draw`;

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: cid, version: PLUGIN_VERSION, os: os })
            });

            const json = await resp.json();
            if (!json.success) {
                TTS_Utils.showNotification(json.message || '今日抽卡次数已用完', 'warning');
                return;
            }

            this.state.todayData = json.data;
            const todayStr = this.getTodayDateStr();
            localStorage.setItem('tts_egg_fetch_date', todayStr);
            localStorage.setItem('tts_egg_cache_data', JSON.stringify(json.data));

            TTS_Utils.showNotification('🎉 盲盒抽取成功！已为你揭晓新剧本！', 'success');
            this.renderUI();
        } catch (err) {
            console.error("❌ [DailyEgg] 抽卡请求失败:", err);
            TTS_Utils.showNotification("抽卡失败，请检查网络连接", "error");
        } finally {
            $btn.prop('disabled', false);
        }
    },

    /**
     * 一键将盲盒预设安装到本地 presets/custom/ 目录
     */
    async installPreset(preset) {
        if (!preset || !preset.preset_data) {
            TTS_Utils.showNotification("预设数据损坏，无法安装", "error");
            return;
        }

        const $installBtn = $('#tts-egg-install-btn');
        $installBtn.prop('disabled', true).text('📥 正在安装...');

        try {
            // 获取当前本地 Manager API 地址
            const remoteConfig = TTS_Utils.getLatestRemoteConfig();
            const backendUrls = TTS_Utils.resolveBackendUrls(remoteConfig);
            const managerUrl = backendUrls.httpUrl;

            // 组装标准预设数据
            const payload = {
                name: preset.preset_data.name || preset.title,
                category: preset.category || 'phone_call',
                plot_template: preset.preset_data.plot_template || '',
                system_template: preset.preset_data.system_template || '',
                prompt_template: preset.preset_data.prompt_template || ''
            };

            const resp = await fetch(`${managerUrl}/api/workshop/presets/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.detail || `HTTP ${resp.status}`);
            }

            // 成功提示
            TTS_Utils.showNotification(`🎉 剧本【${payload.name}】已成功安装到本地自定义预设！`, 'success');
            $installBtn.text('✅ 已安装到本地').addClass('st-tts-btn-success');

            // 上报安装事件给 VPS (用于作者端统计热门剧本)
            if (this.state.isEnabled && preset.id) {
                fetch(`${this.state.serverUrl}/api/egg/installed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ preset_id: preset.id, client_id: this.state.clientId })
                }).catch(() => {});
            }

            // 触发前端预设列表刷新 (若有全局刷新函数)
            if (window.refreshTTS) window.refreshTTS();
        } catch (err) {
            console.error("❌ [DailyEgg] 安装预设失败:", err);
            TTS_Utils.showNotification(`安装失败: ${err.message}`, "error");
            $installBtn.prop('disabled', false).text('📥 一键安装到本地');
        }
    },

    /**
     * 渲染盲盒 UI 卡片到设置面板
     */
    renderUI() {
        const $container = $('#tts-daily-egg-container');
        if ($container.length === 0) return;

        if (!this.state.isEnabled) {
            $container.hide();
            return;
        }

        const data = this.state.todayData;
        if (!data || !data.current_preset) {
            $container.hide();
            return;
        }

        const current = data.current_preset;
        const remaining = data.remaining_draws !== undefined ? data.remaining_draws : 0;
        const tagsHtml = (current.tags || []).map(t => `<span class="st-tts-egg-tag">#${t}</span>`).join(' ');
        
        const previewQuotes = (current.preview_dialogue || []).map(q => 
            `<div class="st-tts-egg-quote">${q}</div>`
        ).join('');

        const categoryLabel = current.category === 'phone_call' ? '📞 电话情境' : '📻 密谈/偷听';

        const html = `
        <div class="st-tts-egg-card">
            <div class="st-tts-egg-header">
                <div class="st-tts-egg-title-row">
                    <span class="st-tts-egg-badge">${categoryLabel}</span>
                    <span class="st-tts-egg-title">${current.title}</span>
                    ${current.is_nsfw ? '<span class="st-tts-egg-nsfw-badge">NSFW</span>' : ''}
                </div>
                <div class="st-tts-egg-quota">
                    今日剩余抽取: <b>${remaining}</b> / ${data.max_draws || 3} 次
                </div>
            </div>

            <div class="st-tts-egg-tags">${tagsHtml}</div>

            <div class="st-tts-egg-summary">${current.summary || '独特的剧情设计与语气引导，专为高拟真 TTS 断句设计。'}</div>

            ${previewQuotes ? `
            <div class="st-tts-egg-dialogue-box">
                <div class="st-tts-egg-dialogue-title">💬 台词效果剧透:</div>
                ${previewQuotes}
            </div>` : ''}

            <div class="st-tts-egg-actions">
                <button type="button" id="tts-egg-install-btn" class="st-tts-btn st-tts-btn-primary st-tts-btn-sm" style="flex: 1.5;">
                    📥 一键安装到本地自定义预设
                </button>
                <button type="button" id="tts-egg-draw-btn" class="st-tts-btn st-tts-btn-secondary st-tts-btn-sm" style="flex: 1;" ${remaining <= 0 ? 'disabled title="今日抽卡机会已用尽"' : ''}>
                    🎲 换一批 (${remaining})
                </button>
            </div>
        </div>
        `;

        $container.html(html).slideDown(200);

        // 绑定事件
        $('#tts-egg-install-btn').off('click').on('click', () => {
            this.installPreset(current);
        });

        $('#tts-egg-draw-btn').off('click').on('click', () => {
            if (remaining > 0) {
                this.drawNextEgg();
            }
        });
    }
};

// 暴露到全局供其他模块与测试调用
window.TTS_DailyEgg = DailyEgg;
