/**
 * 剧本工坊 / 变幻秘典 App 模块 (Workshop App)
 * 
 * 核心架构原则:
 * 1. 严格以 Speaker 为核心交互主体：
 *    - 发起人必须为数据库中已绑定 TTS 模型的 Speaker。
 *    - 主动电话：接听人 Target 任意（可为用户，也可由用户自定义指定任意名称）。
 *    - 私下窃听：由 2 位或更多已绑定 Speaker 围绕密谈主题 (Theme) 展开交流，无需 Target。
 * 2. 角色性格 (Persona) 与世界书 (World Info) 自动读取：
 *    - 自动从 SillyTavern 角色卡 (Description / Personality / Scenario) 与世界书中提取。
 *    - 无需用户手动填写性格，系统自动将其与历史上下文打包注入 Prompt。
 * 3. 纯 SVG 极简现代 UI：
 *    - 纯单色矢量图标，暗金魔幻微光质感。
 *    - 快捷动机标签池一键点选，支持快速直拨与定向触发。
 */

import { createNavbar as defaultCreateNavbar } from '../themes/theme_utils.js';
import { NotificationHandler } from '../notification_handler.js';
import { PhoneCallAPIClient } from '../phone_call_api_client.js';
import { WorldInfoExtractor } from '../world_info_extractor.js';

export const id = 'workshop';
export const defaultName = '剧本工坊';
export const defaultIcon = '📜';
export const sceneId = 'workshop';
export const hidden = false;

// ==================== 统一极简 SVG 图标库 ====================
const SVG = {
    phone: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    ear: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5v7a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><path d="M19 10v4a7 7 0 0 1-14 0v-4"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
    search: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    import: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    play: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    directCall: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    export: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    star: `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    sparkles: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
    target: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    users: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
};

let _currentCategory = 'phone_call'; // 'phone_call' | 'eavesdrop'
let _presets = [];
let _activePresets = { phone_call: ['standard_call'], eavesdrop: ['standard_eavesdrop'] };
let _searchQuery = '';
let _boundSpeakersCache = []; // 数据库中已绑定 TTS 模型的 Speaker 列表

/**
 * 获取 API 地址
 */
function getApiHost() {
    if (window.TTS_ThemeEngine && typeof window.TTS_ThemeEngine.getApiHost === 'function' && window.TTS_ThemeEngine.getApiHost()) {
        return window.TTS_ThemeEngine.getApiHost();
    }
    if (typeof PhoneCallAPIClient !== 'undefined' && PhoneCallAPIClient.getApiHost) {
        return PhoneCallAPIClient.getApiHost();
    }
    if (window.TTS_API && window.TTS_API.baseUrl) {
        return window.TTS_API.baseUrl;
    }
    return 'http://127.0.0.1:3000';
}

/**
 * 注入极简现代样式与魔幻微光设计
 */
const injectCSS = () => {
    if ($('#workshop-app-css').length) return;
    const css = `
        .ws-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            background: transparent;
            color: #e5e7eb;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            position: relative;
        }

        /* 顶部选项卡 */
        .ws-tabs-bar {
            display: flex;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(196, 155, 79, 0.15);
            padding: 8px 14px;
            gap: 10px;
            flex-shrink: 0;
        }
        .ws-tab-btn {
            flex: 1;
            padding: 8px 14px;
            border-radius: 8px;
            border: 1px solid transparent;
            background: transparent;
            color: rgba(220, 200, 150, 0.65);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .ws-tab-btn:hover {
            color: rgba(220, 200, 150, 0.9);
            background: rgba(255, 255, 255, 0.03);
        }
        .ws-tab-btn.active {
            background: rgba(196, 155, 79, 0.15);
            border-color: rgba(196, 155, 79, 0.4);
            color: #f6e05e;
            box-shadow: 0 2px 10px rgba(196, 155, 79, 0.15);
        }

        /* 工具栏：搜索与操作 */
        .ws-toolbar {
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            flex-shrink: 0;
        }
        .ws-tool-row {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .ws-search-box {
            flex: 1;
            position: relative;
            display: flex;
            align-items: center;
        }
        .ws-search-icon {
            position: absolute;
            left: 10px;
            color: rgba(196, 155, 79, 0.6);
            pointer-events: none;
            display: flex;
        }
        .ws-search-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(196, 155, 79, 0.2);
            border-radius: 8px;
            padding: 7px 10px 7px 30px;
            font-size: 12px;
            color: #fff;
            outline: none;
            box-sizing: border-box;
            transition: all 0.2s;
        }
        .ws-search-input:focus {
            border-color: rgba(196, 155, 79, 0.6);
            background: rgba(255, 255, 255, 0.08);
        }
        .ws-tool-btn {
            padding: 7px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .ws-tool-btn-primary {
            background: linear-gradient(135deg, rgba(217, 119, 6, 0.9), rgba(180, 83, 9, 0.9));
            color: #fff;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .ws-tool-btn-primary:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
        }
        .ws-tool-btn-secondary {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(220, 200, 150, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ws-tool-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
        }

        /* 状态与批量生效快捷栏 */
        .ws-batch-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            color: rgba(220, 200, 150, 0.7);
            padding: 0 2px;
        }
        .ws-batch-status {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .ws-batch-highlight {
            color: #fef08a;
            font-weight: 600;
        }
        .ws-batch-btn {
            background: none;
            border: none;
            color: rgba(220, 200, 150, 0.75);
            cursor: pointer;
            font-size: 11px;
            padding: 2px 4px;
            display: inline-flex;
            align-items: center;
            gap: 3px;
            transition: color 0.2s;
        }
        .ws-batch-btn:hover {
            color: #fde047;
            text-decoration: underline;
        }

        /* 预设卡片列表 */
        .ws-cards-list {
            flex: 1;
            overflow-y: auto;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .ws-preset-card {
            background: rgba(20, 16, 28, 0.7);
            border: 1px solid rgba(196, 155, 79, 0.2);
            border-radius: 12px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            position: relative;
            backdrop-filter: blur(8px);
            transition: all 0.25s ease;
        }
        .ws-preset-card:hover {
            border-color: rgba(196, 155, 79, 0.45);
            background: rgba(24, 20, 34, 0.85);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        }
        .ws-preset-card.is-active {
            border: 1px solid rgba(234, 179, 8, 0.7);
            box-shadow: 0 0 16px rgba(234, 179, 8, 0.2);
            background: linear-gradient(135deg, rgba(35, 28, 48, 0.85), rgba(22, 18, 30, 0.9));
        }

        .ws-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }
        .ws-card-title-row {
            display: flex;
            align-items: baseline;
            gap: 8px;
            flex-wrap: wrap;
        }
        .ws-card-title {
            font-size: 15px;
            font-weight: 600;
            color: #f3f4f6;
            margin: 0;
            letter-spacing: 0.3px;
        }
        .ws-card-author {
            font-size: 11px;
            color: rgba(220, 200, 150, 0.55);
            font-weight: 400;
        }
        .ws-active-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(234, 179, 8, 0.2);
            border: 1px solid rgba(234, 179, 8, 0.4);
            color: #fef08a;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 12px;
        }

        .ws-card-desc {
            font-size: 13px;
            color: rgba(220, 200, 160, 0.8);
            line-height: 1.5;
            margin: 0;
        }

        /* 卡片操作栏 */
        .ws-card-actions {
            display: flex;
            gap: 8px;
            margin-top: 4px;
            align-items: center;
            flex-wrap: wrap;
        }
        .ws-act-btn {
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .ws-act-directed {
            background: linear-gradient(135deg, #10b981, #059669);
            color: #fff;
            padding: 6px 14px;
            font-weight: 600;
            border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .ws-act-directed:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .ws-act-activate {
            background: rgba(234, 179, 8, 0.12);
            color: #fde047;
            border: 1px solid rgba(234, 179, 8, 0.3);
        }
        .ws-act-activate:hover {
            background: rgba(234, 179, 8, 0.25);
            color: #fff;
        }
        .ws-act-active-on {
            background: rgba(234, 179, 8, 0.25);
            color: #fff;
            border: 1px solid rgba(234, 179, 8, 0.6);
        }
        .ws-act-active-on:hover {
            background: rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.4);
            color: #fca5a5;
        }
        .ws-act-icon-btn {
            padding: 6px 8px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: rgba(220, 200, 150, 0.8);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            font-size: 12px;
            gap: 4px;
        }
        .ws-act-icon-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
        }
        .ws-act-icon-btn.delete {
            color: rgba(248, 113, 113, 0.8);
            border-color: rgba(239, 68, 68, 0.2);
        }
        .ws-act-icon-btn.delete:hover {
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
        }

        /* 模态框通用层 */
        .ws-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(6px);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
        }
        .ws-modal-overlay.show {
            opacity: 1;
            pointer-events: auto;
        }
        .ws-modal {
            background: linear-gradient(145deg, #1b172a, #13101f);
            border: 1px solid rgba(196, 155, 79, 0.35);
            border-radius: 14px;
            width: 92%;
            max-width: 520px;
            max-height: 88vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8);
            color: #fff;
            transform: translateY(16px);
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            overflow: hidden;
        }
        .ws-modal-overlay.show .ws-modal {
            transform: translateY(0);
        }
        .ws-modal-header {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(196, 155, 79, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0, 0, 0, 0.25);
        }
        .ws-modal-title {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: #fef08a;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .ws-modal-close {
            background: none;
            border: none;
            color: #9ca3af;
            font-size: 18px;
            cursor: pointer;
            padding: 2px 6px;
            transition: color 0.2s;
        }
        .ws-modal-close:hover { color: #fff; }
        .ws-modal-body {
            padding: 14px 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .ws-form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .ws-form-label {
            font-size: 12px;
            color: #d1d5db;
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ws-form-input, .ws-form-select {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(196, 155, 79, 0.25);
            border-radius: 6px;
            padding: 8px 10px;
            color: #fff;
            font-size: 13px;
            outline: none;
            box-sizing: border-box;
            transition: all 0.2s;
        }
        .ws-form-input:focus, .ws-form-select:focus {
            border-color: #eab308;
            box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2);
            background: rgba(0, 0, 0, 0.6);
        }
        .ws-form-select option {
            background: #181524;
            color: #fff;
        }
        .ws-textarea {
            width: 100%;
            height: 180px;
            background: rgba(0, 0, 0, 0.45);
            border: 1px solid rgba(196, 155, 79, 0.25);
            border-radius: 6px;
            color: #e5e7eb;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            resize: vertical;
            box-sizing: border-box;
            line-height: 1.45;
        }
        .ws-textarea:focus {
            border-color: #eab308;
            box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2);
        }

        /* 快捷动机与插槽分类栏 */
        .ws-slot-section {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .ws-slot-category {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
        }
        .ws-slot-cat-title {
            font-size: 11px;
            color: rgba(220, 200, 150, 0.65);
            margin-right: 4px;
            min-width: 65px;
        }
        .ws-slot-btn {
            background: rgba(196, 155, 79, 0.12);
            border: 1px solid rgba(196, 155, 79, 0.25);
            color: #fde047;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10.5px;
            cursor: pointer;
            font-family: monospace;
            transition: all 0.2s;
        }
        .ws-slot-btn:hover {
            background: rgba(196, 155, 79, 0.3);
            color: #fff;
            transform: scale(1.03);
        }

        /* 快捷动机标签池 */
        .ws-quick-tags-pool {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 2px;
        }
        .ws-quick-tag {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(196, 155, 79, 0.2);
            color: rgba(220, 200, 160, 0.85);
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .ws-quick-tag:hover {
            background: rgba(196, 155, 79, 0.2);
            color: #fef08a;
            border-color: rgba(234, 179, 8, 0.4);
        }

        /* 多角色选择标签组 (Speakers 勾选) */
        .ws-checkbox-group {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .ws-check-label {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 5px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            color: #d1d5db;
        }
        .ws-check-label:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        .ws-check-label.checked {
            background: rgba(16, 185, 129, 0.18);
            border-color: rgba(16, 185, 129, 0.5);
            color: #6ee7b7;
            font-weight: 500;
        }

        .ws-modal-footer {
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            background: rgba(0, 0, 0, 0.2);
        }

        /* 自动注入设定提示徽章 */
        .ws-auto-context-tip {
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(196, 155, 79, 0.1);
            border: 1px solid rgba(196, 155, 79, 0.25);
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            color: rgba(220, 200, 160, 0.9);
            line-height: 1.4;
        }

        /* 即时测试与呼叫浮层 */
        .ws-test-toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(40px);
            background: rgba(17, 24, 39, 0.95);
            border: 1px solid #10b981;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
            border-radius: 12px;
            padding: 12px 20px;
            z-index: 100001;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #fff;
            font-size: 13px;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .ws-test-toast.show {
            opacity: 1;
            pointer-events: auto;
            transform: translateX(-50%) translateY(0);
        }
        .ws-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.2);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: ws-spin 0.8s linear infinite;
        }
        @keyframes ws-spin { to { transform: rotate(360deg); } }
    `;
    $('head').append(`<style id="workshop-app-css">${css}</style>`);
};

/**
 * 提取当前角色、已绑定 Speakers、SillyTavern 角色人设与世界书
 */
async function getContextInfo() {
    let charName = "未知角色";
    let context = [];
    let activeSpeakers = [];
    let userName = "用户";
    let characterPersona = "";
    let worldInfo = "";

    // 1. 获取后端已绑定 TTS 模型的 Speaker 列表
    try {
        const apiHost = getApiHost();
        const dataRes = await fetch(`${apiHost}/api/get_data`).then(r => r.json());
        if (dataRes && dataRes.mappings) {
            _boundSpeakersCache = Object.keys(dataRes.mappings);
        }
    } catch (e) {
        console.warn('[Workshop] 获取已绑定 Speaker 失败:', e);
    }

    // 2. 通过标准提取器获取 SillyTavern 角色卡、世界书与轻量化上下文
    const enriched = WorldInfoExtractor.getEnrichedContext({ maxMessages: 12 });

    // 过滤出真正已绑定 TTS 模型的有效 Speakers
    let validBoundSpeakers = _boundSpeakersCache;
    if (validBoundSpeakers.length === 0 && enriched.charName) {
        validBoundSpeakers = [enriched.charName];
    }

    return { 
        charName: enriched.charName, 
        context: enriched.context, 
        activeSpeakers: enriched.speakers, 
        boundSpeakers: validBoundSpeakers, 
        userName: enriched.userName, 
        characterPersona: enriched.characterPersona, 
        worldInfo: enriched.worldInfo 
    };
}

/**
 * 渲染主界面
 */
export async function render(container, createNavbarFunc) {
    injectCSS();
    container.empty();

    // 导航栏解析
    let navFunc = defaultCreateNavbar;
    if (typeof createNavbarFunc === 'function') {
        navFunc = createNavbarFunc;
    } else if (createNavbarFunc && typeof createNavbarFunc.createNavbar === 'function') {
        navFunc = createNavbarFunc.createNavbar;
    }

    const nav = navFunc("剧本工坊");
    container.append(nav);

    const $wsRoot = $(`
        <div class="ws-container">
            <!-- 选项卡 -->
            <div class="ws-tabs-bar">
                <button class="ws-tab-btn ${_currentCategory === 'phone_call' ? 'active' : ''}" data-cat="phone_call">
                    ${SVG.phone} 主动来电剧本
                </button>
                <button class="ws-tab-btn ${_currentCategory === 'eavesdrop' ? 'active' : ''}" data-cat="eavesdrop">
                    ${SVG.ear} 私下窃听剧本
                </button>
            </div>

            <!-- 工具栏：搜索与操作 -->
            <div class="ws-toolbar">
                <div class="ws-tool-row">
                    <div class="ws-search-box">
                        <span class="ws-search-icon">${SVG.search}</span>
                        <input type="text" class="ws-search-input" placeholder="搜索剧本名称或描述..." value="${_searchQuery}">
                    </div>
                    <button class="ws-tool-btn ws-tool-btn-primary" id="ws-btn-new">${SVG.plus} 新建</button>
                    <button class="ws-tool-btn ws-tool-btn-secondary" id="ws-btn-import">${SVG.import} 导入</button>
                </div>
                
                <!-- 批量生效状态与一键快捷栏 -->
                <div class="ws-batch-bar">
                    <div class="ws-batch-status" id="ws-batch-status-text">
                        ${SVG.sparkles} 正在获取生效剧本池...
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="ws-batch-btn" id="ws-btn-select-all" title="全选所有剧本批量生效">全选生效</button>
                        <button class="ws-batch-btn" id="ws-btn-reset-default" title="仅保留出厂默认剧本">恢复默认</button>
                    </div>
                </div>
            </div>

            <!-- 卡片列表容器 -->
            <div class="ws-cards-list" id="ws-cards-container">
                <div style="text-align:center; padding:30px; color:#9ca3af;">正在加载剧本列表...</div>
            </div>

            <!-- 即时测试状态浮层 -->
            <div class="ws-test-toast" id="ws-test-toast">
                <div class="ws-spinner"></div>
                <span id="ws-test-toast-msg">正在准备剧本呼叫...</span>
            </div>
        </div>
    `);

    container.append($wsRoot);

    // 绑定 Tab 切换
    $wsRoot.find('.ws-tab-btn').on('click', function () {
        const cat = $(this).data('cat');
        if (_currentCategory === cat) return;
        _currentCategory = cat;
        $wsRoot.find('.ws-tab-btn').removeClass('active');
        $(this).addClass('active');
        loadPresetsAndRender();
    });

    // 绑定搜索
    $wsRoot.find('.ws-search-input').on('input', function () {
        _searchQuery = $(this).val().trim().toLowerCase();
        renderCardList();
    });

    // 绑定新建与导入
    $wsRoot.find('#ws-btn-new').on('click', () => openEditModal(null));
    $wsRoot.find('#ws-btn-import').on('click', openImportModal);

    // 绑定全选与恢复默认
    $wsRoot.find('#ws-btn-select-all').on('click', async () => {
        const allIds = _presets.map(p => p.id);
        await setBatchActivePresets(allIds);
    });

    $wsRoot.find('#ws-btn-reset-default').on('click', async () => {
        const defaultId = _currentCategory === 'phone_call' ? 'standard_call' : 'standard_eavesdrop';
        await setBatchActivePresets([defaultId]);
    });

    // 加载数据
    await loadPresetsAndRender();
}

/**
 * 加载预设与激活状态
 */
async function loadPresetsAndRender() {
    const apiHost = getApiHost();
    const $container = $('#ws-cards-container');

    try {
        const [presetsRes, activeRes] = await Promise.all([
            fetch(`${apiHost}/api/presets?category=${_currentCategory}`).then(r => r.json()),
            fetch(`${apiHost}/api/presets/active`).then(r => r.json())
        ]);

        _presets = (presetsRes && presetsRes.presets) || [];
        if (activeRes && activeRes.active_presets) {
            _activePresets = activeRes.active_presets;
        }

        updateBatchBarStatus();
        renderCardList();
    } catch (e) {
        console.error('[Workshop] 加载预设失败:', e);
        if ($container.length) {
            $container.html(`<div style="text-align:center; padding:30px; color:#ef4444;">加载失败: ${e.message}</div>`);
        }
    }
}

/**
 * 更新批量生效状态栏
 */
function updateBatchBarStatus() {
    const $status = $('#ws-batch-status-text');
    if (!$status.length) return;

    const activeList = getActiveList();
    const count = activeList.length;

    if (count > 1) {
        $status.html(`${SVG.sparkles} 已启用 <span class="ws-batch-highlight">${count}</span> 个剧本 · 后台将根据对话情境<span class="ws-batch-highlight">自动智能匹配</span>`);
    } else {
        const singleId = activeList[0] || '默认';
        const found = _presets.find(p => p.id === singleId);
        const name = found ? found.name : singleId;
        $status.html(`${SVG.check} 当前生效剧本: <span class="ws-batch-highlight">${name}</span>`);
    }
}

function getActiveList() {
    const list = _activePresets[_currentCategory];
    if (Array.isArray(list)) return list;
    if (typeof list === 'string') return [list];
    return [_currentCategory === 'phone_call' ? 'standard_call' : 'standard_eavesdrop'];
}

/**
 * 渲染卡片列表 (极简纯粹：标题、作者ID、描述与操作)
 */
function renderCardList() {
    const $container = $('#ws-cards-container');
    if (!$container.length) return;

    const activeList = getActiveList();

    // 过滤列表
    const filtered = _presets.filter(p => {
        if (_searchQuery) {
            const nameMatch = (p.name || '').toLowerCase().includes(_searchQuery);
            const descMatch = (p.description || '').toLowerCase().includes(_searchQuery);
            const authorMatch = (p.author || '').toLowerCase().includes(_searchQuery);
            if (!nameMatch && !descMatch && !authorMatch) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        $container.html(`<div style="text-align:center; padding:40px; color:#9ca3af;">未找到相关剧本预设</div>`);
        return;
    }

    $container.empty();

    filtered.forEach(preset => {
        const isActive = activeList.includes(preset.id);
        const isBuiltin = !!preset.is_builtin;

        const $card = $(`
            <div class="ws-preset-card ${isActive ? 'is-active' : ''}">
                <div class="ws-card-header">
                    <div class="ws-card-title-row">
                        <h4 class="ws-card-title">${preset.name || preset.id}</h4>
                        <span class="ws-card-author">@${preset.author || '官方'}</span>
                    </div>
                    ${isActive ? `<span class="ws-active-badge">${SVG.star} 已生效</span>` : ''}
                </div>

                <p class="ws-card-desc">${preset.description || '暂无场景描述'}</p>

                <div class="ws-card-actions">
                    <button class="ws-act-btn ws-act-directed" title="选择说话人与动机并立即发起交互">
                        ${_currentCategory === 'phone_call' ? SVG.directCall : SVG.ear} ${_currentCategory === 'phone_call' ? '发起呼叫' : '定向侦听'}
                    </button>
                    
                    <button class="ws-act-btn ${isActive ? 'ws-act-active-on' : 'ws-act-activate'}" title="${isActive ? '点击取消生效' : '点击加入生效池'}">
                        ${isActive ? `${SVG.check} 已启用` : `${SVG.plus} 设为生效`}
                    </button>

                    <button class="ws-act-icon-btn ws-act-edit" title="编辑剧本 Prompt">
                        ${SVG.edit} 编辑
                    </button>
                    <button class="ws-act-icon-btn ws-act-export" title="导出 JSON">
                        ${SVG.export} 导出
                    </button>
                    ${!isBuiltin ? `<button class="ws-act-icon-btn delete ws-act-delete" title="删除剧本">
                        ${SVG.trash}
                    </button>` : ''}
                </div>
            </div>
        `);

        // 切换生效/取消生效
        $card.find('.ws-act-activate, .ws-act-active-on').on('click', async () => {
            await togglePresetActive(preset.id);
        });

        // 定向主动呼叫 / 测试
        $card.find('.ws-act-directed').on('click', () => {
            openDirectedCallModal(preset);
        });

        // 编辑
        $card.find('.ws-act-edit').on('click', () => {
            openEditModal(preset);
        });

        // 导出
        $card.find('.ws-act-export').on('click', () => {
            const apiHost = getApiHost();
            window.open(`${apiHost}/api/presets/${_currentCategory}/${preset.id}/export`, '_blank');
        });

        // 删除
        $card.find('.ws-act-delete').on('click', async () => {
            if (!confirm(`确定要删除剧本 "${preset.name || preset.id}" 吗？此操作无法撤销。`)) return;
            const apiHost = getApiHost();
            try {
                const res = await fetch(`${apiHost}/api/presets/${_currentCategory}/${preset.id}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast('剧本已成功删除');
                    loadPresetsAndRender();
                } else {
                    const err = await res.json();
                    alert(`删除失败: ${err.detail || '未知错误'}`);
                }
            } catch (e) {
                alert(`删除失败: ${e.message}`);
            }
        });

        $container.append($card);
    });
}

/**
 * 切换单个剧本生效状态
 */
async function togglePresetActive(presetId) {
    const apiHost = getApiHost();
    try {
        const res = await fetch(`${apiHost}/api/presets/active`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: _currentCategory,
                toggle_preset_id: presetId
            })
        });
        if (res.ok) {
            const data = await res.json();
            _activePresets = data.active_presets;
            updateBatchBarStatus();
            renderCardList();
            showToast('生效剧本池已更新');
        } else {
            const err = await res.json();
            alert(`操作失败: ${err.detail || '未知错误'}`);
        }
    } catch (e) {
        alert(`操作失败: ${e.message}`);
    }
}

/**
 * 批量设置生效剧本池
 */
async function setBatchActivePresets(presetIds) {
    const apiHost = getApiHost();
    try {
        const res = await fetch(`${apiHost}/api/presets/active`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: _currentCategory,
                preset_ids: presetIds
            })
        });
        if (res.ok) {
            const data = await res.json();
            _activePresets = data.active_presets;
            updateBatchBarStatus();
            renderCardList();
            showToast(`已成功批量启用 ${presetIds.length} 个剧本`);
        } else {
            const err = await res.json();
            alert(`批量设置失败: ${err.detail || '未知错误'}`);
        }
    } catch (e) {
        alert(`批量设置失败: ${e.message}`);
    }
}

/**
 * 弹出「定向呼叫 / 侦听控制台」模态框
 */
async function openDirectedCallModal(preset) {
    $('#ws-directed-modal-overlay').remove();
    const ctxInfo = await getContextInfo();

    const isPhone = _currentCategory === 'phone_call';
    
    // 1. 发起人严格限制为已绑定 TTS 模型的 Speaker
    const availableSpeakers = ctxInfo.boundSpeakers.length > 0 ? ctxInfo.boundSpeakers : [ctxInfo.charName];
    const defaultSpeaker = availableSpeakers.includes(ctxInfo.charName) ? ctxInfo.charName : availableSpeakers[0];

    const callerOptions = availableSpeakers.map(s => `<option value="${s}" ${s === defaultSpeaker ? 'selected' : ''}>🎙️ 说话人: ${s}</option>`).join('');

    // 常用动机快捷标签
    const phoneQuickMotivations = ["深夜想念与挂念", "突发险情与紧急示警", "日常分享与问候", "吃醋试探与质问", "秘密商量与约定", "生病求助与探望"];
    const eavesdropQuickMotivations = ["商议秘密行动与情报", "暗中争执与彼此试探", "讨论当前局势与隐患", "私下交流吐槽"];

    const quickMotivations = isPhone ? phoneQuickMotivations : eavesdropQuickMotivations;
    const quickTagsHtml = quickMotivations.map(m => `<span class="ws-quick-tag" data-val="${m}">${m}</span>`).join('');

    // 窃听模式下的多 Speaker 勾选组 (至少勾选2位)
    const speakersCheckboxes = availableSpeakers.map((s, i) => `
        <label class="ws-check-label ${i < 2 ? 'checked' : ''}">
            <input type="checkbox" name="ws_speakers" value="${s}" ${i < 2 ? 'checked' : ''} style="display:none;">
            <span>🎙️ ${s}</span>
        </label>
    `).join('');

    const defaultReason = preset.description || (isPhone ? "想与你通电话聊聊近况" : "私下商讨重要事宜");

    const modalHtml = `
        <div class="ws-modal-overlay show" id="ws-directed-modal-overlay">
            <div class="ws-modal">
                <div class="ws-modal-header">
                    <h3 class="ws-modal-title">
                        ${isPhone ? SVG.directCall : SVG.ear} 
                        ${isPhone ? '主动呼叫控制台' : '私下密谈侦听台'} · ${preset.name}
                    </h3>
                    <button class="ws-modal-close" id="ws-directed-close-btn">✕</button>
                </div>
                
                <div class="ws-modal-body">
                    <!-- 自动人设与世界书注入说明 -->
                    <div class="ws-auto-context-tip">
                        ${SVG.sparkles} 系统已自动从酒馆当前角色卡提取【性格/人设】并挂载【世界书设定与聊天历史】，无需重复填写。
                    </div>

                    ${isPhone ? `
                        <!-- 电话发起人与接听人配置 (Speaker -> 任意 Target) -->
                        <div style="display:flex; gap:10px;">
                            <div class="ws-form-group" style="flex:1;">
                                <label class="ws-form-label">📞 呼叫发起人 (已绑定语音的Speaker):</label>
                                <select class="ws-form-select" id="ws-direct-caller">
                                    ${callerOptions}
                                </select>
                            </div>
                            <div class="ws-form-group" style="flex:1;">
                                <label class="ws-form-label">🎯 通话接听人 (可随意指定):</label>
                                <input type="text" class="ws-form-input" id="ws-direct-target" placeholder="如: ${ctxInfo.userName} / 警官 / 某角色..." value="${ctxInfo.userName}">
                            </div>
                        </div>
                    ` : `
                        <!-- 窃听多 Speaker 交互组 (围绕主题展开，无需 Target) -->
                        <div class="ws-form-group">
                            <label class="ws-form-label">🎭 参与窃听对话的 Speaker (必须已绑定语音，至少2位):</label>
                            <div class="ws-checkbox-group" id="ws-direct-speakers-group">
                                ${speakersCheckboxes}
                            </div>
                        </div>
                    `}

                    <!-- 通话事由 / 密谈主题 -->
                    <div class="ws-form-group">
                        <label class="ws-form-label">
                            <span>${isPhone ? '💬 通话事由 / 动机 (Call Reason):' : '📜 密谈主题 (Theme):'}</span>
                            <span style="font-size:11px; color:#9ca3af;">点选快捷标签快速填入</span>
                        </label>
                        <input type="text" class="ws-form-input" id="ws-direct-reason" value="${defaultReason}">
                        <div class="ws-quick-tags-pool">
                            ${quickTagsHtml}
                        </div>
                    </div>

                    <!-- 情绪氛围/语气基调 -->
                    <div class="ws-form-group">
                        <label class="ws-form-label">🎭 情绪氛围 / 语气基调 (Tone, 可选):</label>
                        <input type="text" class="ws-form-input" id="ws-direct-tone" placeholder="如: 温柔深情、急促紧张、傲娇质问、严肃警惕..." value="">
                    </div>
                </div>

                <div class="ws-modal-footer">
                    <button class="ws-tool-btn ws-tool-btn-secondary" id="ws-directed-quick-btn" title="直接以默认参数快速呼叫">
                        ⚡ 快捷直拨
                    </button>
                    <button class="ws-tool-btn ws-tool-btn-primary" id="ws-directed-launch-btn">
                        🚀 ${isPhone ? '立即拨出通话' : '立即发起侦听'}
                    </button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    const closeModal = () => $('#ws-directed-modal-overlay').remove();
    $('#ws-directed-close-btn').on('click', closeModal);

    // 快捷标签点选
    $('#ws-directed-modal-overlay .ws-quick-tag').on('click', function () {
        const val = $(this).data('val');
        $('#ws-direct-reason').val(val);
    });

    // 窃听角色多选切换
    $('#ws-direct-speakers-group .ws-check-label').on('click', function (e) {
        if (e.target.tagName !== 'INPUT') {
            const $chk = $(this).find('input');
            $chk.prop('checked', !$chk.prop('checked'));
        }
        $(this).toggleClass('checked', $(this).find('input').prop('checked'));
    });

    // 快捷直拨
    $('#ws-directed-quick-btn').on('click', async () => {
        closeModal();
        await executeDirectedAction(preset, { isQuick: true });
    });

    // 定向发起
    $('#ws-directed-launch-btn').on('click', async () => {
        const caller = $('#ws-direct-caller').val() || defaultSpeaker;
        const target = $('#ws-direct-target').val() ? $('#ws-direct-target').val().trim() : ctxInfo.userName;
        const reason = $('#ws-direct-reason').val().trim() || defaultReason;
        const tone = $('#ws-direct-tone').val().trim();

        let selectedSpeakers = [];
        if (!isPhone) {
            $('#ws-direct-speakers-group input:checked').each(function () {
                selectedSpeakers.push($(this).val());
            });
            if (selectedSpeakers.length < 2) {
                alert('私下窃听至少需要 2 位已绑定语音的 Speaker 参与交流');
                return;
            }
        }

        closeModal();
        await executeDirectedAction(preset, {
            caller,
            target,
            reason,
            tone,
            speakers: selectedSpeakers,
            isQuick: false
        });
    });
}

/**
 * 弹出编辑/新建 Modal (结构化插槽分类体系)
 */
function openEditModal(preset) {
    const isNew = !preset;
    const isBuiltin = preset && !!preset.is_builtin;

    $('#ws-edit-modal-overlay').remove();

    const initialData = preset || {
        id: `custom_${Date.now().toString(36)}`,
        name: '',
        category: _currentCategory,
        author: '用户',
        version: '1.0.0',
        description: '',
        prompt_template: _currentCategory === 'phone_call' 
            ? '你是一个沉浸式剧情编剧。角色 {{caller}} 正在主动拨打电话给 {{target}}。\n\n**呼叫背景与动机**:\n- 发起角色: {{caller}}\n- 接听对象: {{target}}\n- 通话事由: {{call_reason}}\n- 情绪基调: {{call_tone}}\n\n**角色卡人设与世界书设定**:\n- 人设背景: {{character_persona}}\n- 世界观设定: {{world_info}}\n\n**可用角色与情绪:**\n{{speakers_emotions}}\n\n**近期对话上下文:**\n{{context}}\n\n**创作要求:**\n1. 真实还原打电话的口语质感与呼吸感，围绕「{{call_reason}}」展开。\n2. speaker 字段必须为 {{caller}}。\n\n**⚠️ 纯语音输出铁律 (TTS 规范)**:\ntext 字段只能包含纯台词，严禁包含任何动作描述与括号心理。\n\n**输出格式 (严格 JSON)**:\n```json\n{\n  "speaker": "{{caller}}",\n  "segments": [\n    {\n      "emotion": "emotion_tag",\n      "text": "纯对话内容，**必须使用{{lang_display}}**",\n      "translation": "中文翻译 (必填)",\n      "pause_after": 0.4,\n      "speed": 1.0,\n      "filler_word": null\n    }\n  ]\n}\n```\n\n生成 10-15 个片段。'
            : '你是一个创意编剧，正在编写参与角色 {{speakers}} 之间的私下对话。\n\n**剧情主题与基调**:\n- 讨论主题: {{theme}}\n- 剧情起因: {{call_reason}}\n- 氛围张力: {{call_tone}}\n\n**角色卡与世界书背景**:\n- 角色人设: {{character_persona}}\n- 世界书背景: {{world_info}}\n\n**参与角色及其可用情绪**:\n{{speakers_emotions}}\n\n**对话历史参考**:\n{{context}}\n\n**创作要求:**\n1. 紧扣主题「{{theme}}」，生成自然交替的多人对话。\n2. 每个角色的说话风格严格符合其性格与世界观。\n\n**⚠️ 纯语音输出铁律 (TTS 规范)**:\ntext 字段只能包含纯台词，严禁任何动作与心理括号。\n\n**输出格式 (严格 JSON)**:\n```json\n{\n  "scene_description": "场景描述",\n  "segments": [\n    {\n      "speaker": "角色名",\n      "emotion": "情绪标签",\n      "text": "纯对话内容，**必须使用{{lang_display}}**",\n      "translation": "中文翻译 (必填)",\n      "pause_after": 0.5\n    }\n  ]\n}\n```\n\n生成 10-25 个对话片段。',
        recommended_params: { temperature: 0.8, speed: 1.0 }
    };

    // 结构化插槽分类定义
    const slotCategories = _currentCategory === 'phone_call' ? [
        { title: "【身份与角色】", slots: ["{{caller}}", "{{target}}", "{{receiver}}", "{{speakers}}", "{{speakers_emotions}}"] },
        { title: "【剧情与动机】", slots: ["{{call_reason}}", "{{call_tone}}"] },
        { title: "【人设与世界书】", slots: ["{{character_persona}}", "{{world_info}}", "{{story_summary}}"] },
        { title: "【系统与上下文】", slots: ["{{context}}", "{{lang_display}}", "{{last_call_summary}}", "{{followup_call_instructions}}"] }
    ] : [
        { title: "【角色组】", slots: ["{{speakers}}", "{{speakers_emotions}}"] },
        { title: "【主题与张力】", slots: ["{{theme}}", "{{call_reason}}", "{{call_tone}}"] },
        { title: "【人设与世界书】", slots: ["{{character_persona}}", "{{world_info}}", "{{story_summary}}"] },
        { title: "【系统与上下文】", slots: ["{{context}}", "{{lang_display}}", "{{max_context_messages}}"] }
    ];

    const slotSectionHtml = slotCategories.map(cat => `
        <div class="ws-slot-category">
            <span class="ws-slot-cat-title">${cat.title}</span>
            ${cat.slots.map(s => `<button type="button" class="ws-slot-btn" data-slot="${s}">${s}</button>`).join('')}
        </div>
    `).join('');

    const modalHtml = `
        <div class="ws-modal-overlay show" id="ws-edit-modal-overlay">
            <div class="ws-modal">
                <div class="ws-modal-header">
                    <h3 class="ws-modal-title">
                        ${SVG.edit} ${isNew ? '新建剧本预设' : (isBuiltin ? '查看出厂剧本 (另存为自定义)' : '编辑剧本预设')}
                    </h3>
                    <button class="ws-modal-close" id="ws-modal-close-btn">✕</button>
                </div>
                <div class="ws-modal-body">
                    <div class="ws-form-group">
                        <label class="ws-form-label">剧本标识 (ID):</label>
                        <input type="text" class="ws-form-input" id="ws-input-id" value="${initialData.id}" ${(!isNew && !isBuiltin) ? 'readonly' : ''}>
                    </div>
                    <div class="ws-form-group">
                        <label class="ws-form-label">剧本名称:</label>
                        <input type="text" class="ws-form-input" id="ws-input-name" placeholder="如: 午夜私语、紧急求援..." value="${initialData.name}">
                    </div>
                    <div class="ws-form-group">
                        <label class="ws-form-label">作者 ID / 署名:</label>
                        <input type="text" class="ws-form-input" id="ws-input-author" placeholder="作者名" value="${initialData.author || '用户'}">
                    </div>
                    <div class="ws-form-group">
                        <label class="ws-form-label">场景描述:</label>
                        <input type="text" class="ws-form-input" id="ws-input-desc" placeholder="简要描述触发场景与互动风格..." value="${initialData.description}">
                    </div>
                    <div class="ws-form-group">
                        <label class="ws-form-label">Prompt 模板体系:</label>
                        <textarea class="ws-textarea" id="ws-input-prompt">${initialData.prompt_template}</textarea>
                        <div class="ws-slot-section">
                            <div style="font-size:11px; color:#fef08a; font-weight:600; margin-bottom:2px;">✨ 快捷动态插槽 (点击插入至光标处):</div>
                            ${slotSectionHtml}
                        </div>
                    </div>
                </div>
                <div class="ws-modal-footer">
                    <button class="ws-tool-btn ws-tool-btn-secondary" id="ws-modal-cancel-btn">取消</button>
                    <button class="ws-tool-btn ws-tool-btn-primary" id="ws-modal-save-btn">保存剧本</button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    // 插槽点击插入
    $('#ws-edit-modal-overlay .ws-slot-btn').on('click', function () {
        const slot = $(this).data('slot');
        const $textarea = $('#ws-input-prompt');
        const dom = $textarea[0];
        const start = dom.selectionStart;
        const end = dom.selectionEnd;
        const text = $textarea.val();
        $textarea.val(text.substring(0, start) + slot + text.substring(end));
        dom.selectionStart = dom.selectionEnd = start + slot.length;
        $textarea.focus();
    });

    const closeModal = () => $('#ws-edit-modal-overlay').remove();
    $('#ws-modal-close-btn, #ws-modal-cancel-btn').on('click', closeModal);

    // 保存
    $('#ws-modal-save-btn').on('click', async () => {
        let idVal = $('#ws-input-id').val().trim();
        const nameVal = $('#ws-input-name').val().trim();
        const authorVal = $('#ws-input-author').val().trim() || '用户';
        const descVal = $('#ws-input-desc').val().trim();
        const promptVal = $('#ws-input-prompt').val().trim();

        if (!nameVal) {
            alert('请输入剧本名称');
            return;
        }
        if (!promptVal) {
            alert('Prompt 模板不能为空');
            return;
        }

        if (isBuiltin && idVal === preset.id) {
            idVal = `${idVal}_copy_${Date.now().toString(36)}`;
        }

        const payload = {
            id: idVal,
            name: nameVal,
            category: _currentCategory,
            author: authorVal,
            version: initialData.version || '1.0.0',
            description: descVal,
            prompt_template: promptVal,
            recommended_params: initialData.recommended_params || { temperature: 0.8 }
        };

        const apiHost = getApiHost();
        try {
            const res = await fetch(`${apiHost}/api/presets/${_currentCategory}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast(`剧本「${nameVal}」保存成功`);
                closeModal();
                loadPresetsAndRender();
            } else {
                const err = await res.json();
                alert(`保存失败: ${err.detail || '未知错误'}`);
            }
        } catch (e) {
            alert(`保存失败: ${e.message}`);
        }
    });
}

/**
 * 弹出导入 Modal
 */
function openImportModal() {
    $('#ws-import-modal-overlay').remove();

    const modalHtml = `
        <div class="ws-modal-overlay show" id="ws-import-modal-overlay">
            <div class="ws-modal">
                <div class="ws-modal-header">
                    <h3 class="ws-modal-title">${SVG.import} 导入剧本 (.json)</h3>
                    <button class="ws-modal-close" id="ws-import-close-btn">✕</button>
                </div>
                <div class="ws-modal-body">
                    <div class="ws-form-group">
                        <label class="ws-form-label">方式 1: 选择本地 JSON 文件</label>
                        <input type="file" id="ws-file-input" accept=".json" style="margin-top:4px; font-size:12px;">
                    </div>
                    <div class="ws-form-group" style="margin-top:10px;">
                        <label class="ws-form-label">方式 2: 直接粘贴 JSON 文本</label>
                        <textarea class="ws-textarea" id="ws-json-textarea" placeholder="在此粘贴完整的预设 JSON 对象..." style="height:140px;"></textarea>
                    </div>
                </div>
                <div class="ws-modal-footer">
                    <button class="ws-tool-btn ws-tool-btn-secondary" id="ws-import-cancel-btn">取消</button>
                    <button class="ws-tool-btn ws-tool-btn-primary" id="ws-import-confirm-btn">开始导入</button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    const closeModal = () => $('#ws-import-modal-overlay').remove();
    $('#ws-import-close-btn, #ws-import-cancel-btn').on('click', closeModal);

    $('#ws-file-input').on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            $('#ws-json-textarea').val(evt.target.result);
        };
        reader.readAsText(file);
    });

    $('#ws-import-confirm-btn').on('click', async () => {
        const jsonStr = $('#ws-json-textarea').val().trim();
        if (!jsonStr) {
            alert('请选择文件或粘贴 JSON 内容');
            return;
        }

        const apiHost = getApiHost();
        try {
            const res = await fetch(`${apiHost}/api/presets/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: _currentCategory,
                    raw_json: jsonStr
                })
            });

            if (res.ok) {
                const data = await res.json();
                showToast(`成功导入剧本: ${data.preset?.name || '未知'}`);
                closeModal();
                loadPresetsAndRender();
            } else {
                const err = await res.json();
                alert(`导入失败: ${err.detail || '未知错误'}`);
            }
        } catch (e) {
            alert(`导入失败: ${e.message}`);
        }
    });
}

/**
 * 执行定向呼叫 / 侦听引擎核心链路 (自动注入人设与世界书)
 */
async function executeDirectedAction(preset, options = {}) {
    const apiHost = getApiHost();
    const ctxInfo = await getContextInfo();

    if (!window.LLM_Client || typeof window.LLM_Client.callLLM !== 'function') {
        alert('LLM_Client 未就绪，无法驱动大模型生成，请确认配置。');
        return;
    }

    const isPhone = _currentCategory === 'phone_call';
    const defaultSpeaker = ctxInfo.boundSpeakers[0] || ctxInfo.charName;
    const caller = options.caller || defaultSpeaker;
    const target = options.target || ctxInfo.userName;
    const reason = options.reason || preset.description || (isPhone ? "电话问候" : "私下密谈");
    const tone = options.tone || "";

    showToast(`[1/3] 正在构建「${preset.name}」提示词...`, true);

    try {
        if (isPhone) {
            // 1. 构建定向电话提示词 (Caller 必须为绑定 Speaker，Target 任意，携带自动提取的人设与世界书)
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
                world_info: ctxInfo.worldInfo
            };

            const buildRes = await fetch(`${apiHost}/api/phone_call/build_prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload)
            });

            if (!buildRes.ok) {
                const err = await buildRes.text();
                throw new Error(`构建提示词失败: ${err}`);
            }
            const buildData = await buildRes.json();

            // 2. 调用 LLM
            showToast(`[2/3] 大模型思考生成中... (${caller} → ${target})`, true);
            const llmConfig = {
                api_url: buildData.llm_config.api_url,
                api_key: buildData.llm_config.api_key,
                model: buildData.llm_config.model,
                temperature: preset.recommended_params?.temperature || buildData.llm_config.temperature || 0.8,
                max_tokens: buildData.llm_config.max_tokens || 4000,
                prompt: buildData.prompt
            };

            const llmResponse = await window.LLM_Client.callLLM(llmConfig);

            // 3. TTS 合成 (使用真实绑定的 Speaker 模型合成)
            showToast(`[3/3] 正在合成 ${caller} 的专属语音并拉起通话...`, true);
            const parseRes = await fetch(`${apiHost}/api/phone_call/parse_and_generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    char_name: caller,
                    llm_response: llmResponse,
                    generate_audio: true
                })
            });

            if (!parseRes.ok) {
                const err = await parseRes.text();
                throw new Error(`TTS 合成失败: ${err}`);
            }
            const parseData = await parseRes.json();

            hideToast();

            // 4. 调用 NotificationHandler 拉起沉浸界面
            await NotificationHandler.handlePhoneCallReady({
                call_id: `directed_${Date.now()}`,
                char_name: caller,
                selected_speaker: caller,
                target_user: target,
                segments: parseData.segments || [],
                audio_url: parseData.audio_url || (parseData.audio ? `data:audio/wav;base64,${parseData.audio}` : null)
            });

        } else {
            // ================= 窃听定向生成 (围绕主题的多 Speaker 交互，无需 Target) =================
            const speakers = (options.speakers && options.speakers.length >= 2) 
                ? options.speakers 
                : (ctxInfo.boundSpeakers.length >= 2 ? ctxInfo.boundSpeakers.slice(0, 2) : [caller, "神秘人"]);

            const buildPayload = {
                context: ctxInfo.context,
                speakers: speakers,
                user_name: ctxInfo.userName,
                chat_branch: ctxInfo.chatBranch,
                text_lang: 'zh',
                preset_id: preset.id,
                theme: reason,
                call_reason: reason,
                call_tone: tone,
                character_persona: ctxInfo.characterPersona,
                world_info: ctxInfo.worldInfo
            };

            const buildRes = await fetch(`${apiHost}/api/eavesdrop/build_prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload)
            });

            if (!buildRes.ok) {
                const err = await buildRes.text();
                throw new Error(`构建窃听提示词失败: ${err}`);
            }
            const buildData = await buildRes.json();

            // 2. 调用 LLM
            showToast(`[2/3] 大模型编织密谈中... (${speakers.join(' & ')})`, true);
            const llmConfig = {
                api_url: buildData.llm_config.api_url,
                api_key: buildData.llm_config.api_key,
                model: buildData.llm_config.model,
                temperature: preset.recommended_params?.temperature || buildData.llm_config.temperature || 0.8,
                max_tokens: buildData.llm_config.max_tokens || 4000,
                prompt: buildData.prompt
            };

            const llmResponse = await window.LLM_Client.callLLM(llmConfig);

            // 3. TTS 合成 (多 Speaker 分别合成)
            showToast(`[3/3] 正在合成多角色语音并准备拉起...`, true);
            const parseRes = await fetch(`${apiHost}/api/eavesdrop/parse_and_generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    llm_response: llmResponse,
                    speakers: speakers,
                    text_lang: 'zh'
                })
            });

            if (!parseRes.ok) {
                const err = await parseRes.text();
                throw new Error(`窃听 TTS 合成失败: ${err}`);
            }
            const parseData = await parseRes.json();

            hideToast();

            // 4. 调用 NotificationHandler 拉起窃听界面
            await NotificationHandler.handleEavesdropReady({
                record_id: `directed_${Date.now()}`,
                speakers: speakers,
                segments: parseData.segments || [],
                audio_url: parseData.audio_url,
                scene_description: `[${preset.name}] ${reason}`,
                notification_text: `检测到 ${speakers.join(' 与 ')} 的密谈`
            });
        }
    } catch (e) {
        hideToast();
        console.error('[Workshop] 剧本呼叫失败:', e);
        alert(`剧本呼叫失败:\n${e.message}`);
    }
}

let _toastTimer = null;
function showToast(msg, isSticky = false) {
    const $toast = $('#ws-test-toast');
    const $msg = $('#ws-test-toast-msg');
    if (!$toast.length) return;

    $msg.text(msg);
    $toast.addClass('show');

    if (_toastTimer) clearTimeout(_toastTimer);
    if (!isSticky) {
        _toastTimer = setTimeout(() => {
            $toast.removeClass('show');
        }, 3000);
    }
}

function hideToast() {
    if (_toastTimer) clearTimeout(_toastTimer);
    $('#ws-test-toast').removeClass('show');
}

/**
 * 清理函数
 */
export function cleanup() {
    hideToast();
    $('#ws-edit-modal-overlay').remove();
    $('#ws-import-modal-overlay').remove();
    $('#ws-directed-modal-overlay').remove();
}
