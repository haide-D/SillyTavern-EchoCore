/**
 * 对话追踪 / 剧场 App 独立样式模块 (Eavesdrop Styles)
 */

export function injectCSS() {
    if ($('#eavesdrop-app-css').length) return;
    const css = `
        .ed-app-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: transparent;
            color: #e5e7eb;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow-x: hidden;
            overflow-y: hidden;
            box-sizing: border-box;
            position: relative;
        }

        /* 多角色头像胶囊栈 */
        .ed-avatar-stack {
            display: flex;
            align-items: center;
        }
        .ed-avatar-stack-item {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid #181224;
            margin-left: -8px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            flex-shrink: 0;
        }
        .ed-avatar-stack-item:first-child {
            margin-left: 0;
        }
        .ed-avatar-stack-item.speaking {
            transform: scale(1.2);
            border-color: #f59e0b;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
            z-index: 20 !important;
        }
        .ed-avatar-stack-item.dimmed {
            opacity: 0.45;
            filter: grayscale(40%);
        }

        /* 顶部三子列表导航切换栏 */
        .ed-nav-tabs {
            display: flex !important;
            flex-direction: row !important;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(196, 155, 79, 0.2);
            padding: 8px 10px;
            gap: 6px;
            flex-shrink: 0;
            box-sizing: border-box;
            width: 100% !important;
        }
        .ed-nav-tab-btn {
            flex: 1;
            padding: 7px 6px;
            border-radius: 8px;
            border: 1px solid transparent;
            background: transparent;
            color: rgba(220, 200, 150, 0.7);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            white-space: nowrap;
        }
        .ed-nav-tab-btn:hover {
            color: rgba(220, 200, 150, 0.95);
            background: rgba(255, 255, 255, 0.04);
        }
        .ed-nav-tab-btn.active {
            background: rgba(217, 119, 6, 0.2);
            border-color: rgba(217, 119, 6, 0.5);
            color: #fde047;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(217, 119, 6, 0.2);
        }

        /* 历史列表视图容器 */
        .ed-history-scroll {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-sizing: border-box;
            width: 100%;
        }

        /* 搜索框 */
        .ed-search-row {
            display: flex;
            align-items: center;
            position: relative;
            margin-bottom: 4px;
            width: 100%;
            box-sizing: border-box;
        }
        .ed-search-input {
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
        .ed-search-input:focus {
            border-color: #f59e0b;
            background: rgba(255, 255, 255, 0.08);
        }
        .ed-search-icon {
            position: absolute;
            left: 10px;
            color: rgba(196, 155, 79, 0.6);
            pointer-events: none;
            display: flex;
        }

        /* 密谈记录卡片 */
        .ed-card {
            background: rgba(24, 18, 36, 0.75);
            border: 1px solid rgba(196, 155, 79, 0.2);
            border-radius: 10px;
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 7px;
            backdrop-filter: blur(8px);
            transition: all 0.25s ease;
            box-sizing: border-box;
            width: 100%;
            position: relative;
        }
        .ed-card:hover {
            border-color: rgba(196, 155, 79, 0.45);
            background: rgba(30, 22, 45, 0.85);
        }
        .ed-card.highlight {
            border-color: #f59e0b;
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.2);
            background: linear-gradient(135deg, rgba(40, 30, 20, 0.8), rgba(25, 18, 12, 0.9));
        }
        .ed-card.is-playing {
            border-color: #f59e0b !important;
            box-shadow: 0 0 18px rgba(245, 158, 11, 0.28) !important;
            background: linear-gradient(135deg, rgba(38, 28, 18, 0.92), rgba(28, 20, 26, 0.95)) !important;
        }
        .ed-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .ed-speakers-tag {
            font-size: 13px;
            font-weight: 600;
            color: #fef08a;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .ed-time-wrap {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .ed-time {
            font-size: 11px;
            color: rgba(220, 200, 160, 0.6);
        }
        .ed-time-playback {
            font-size: 11px;
            color: #fde047;
            font-family: monospace, -apple-system, sans-serif;
            font-weight: 600;
        }
        .ed-theme {
            font-size: 11.5px;
            color: rgba(220, 200, 160, 0.9);
            background: rgba(0, 0, 0, 0.3);
            padding: 4px 8px;
            border-radius: 5px;
            border-left: 2px solid #f59e0b;
        }
        .ed-dialog-preview {
            font-size: 11.5px;
            color: #d1d5db;
            line-height: 1.45;
            max-height: 85px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.25);
            padding: 5px 8px;
            border-radius: 5px;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .ed-dialog-preview div.ed-segment-line {
            transition: all 0.2s ease;
            padding: 1px 0;
            border-radius: 3px;
        }
        .ed-dialog-preview div.ed-segment-line.active-segment {
            color: #fde047 !important;
            font-weight: 600;
            text-shadow: 0 0 8px rgba(245, 158, 11, 0.35);
            padding-left: 5px;
            border-left: 2px solid #f59e0b;
            background: rgba(245, 158, 11, 0.08);
        }
        .ed-audio-progress-wrap {
            width: 100%;
            height: 3px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
            margin: 2px 0;
            display: none;
            position: relative;
        }
        .ed-audio-progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
            transition: width 0.1s linear;
        }
        .ed-card-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 3px;
            flex-wrap: wrap;
        }
        .ed-action-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #e5e7eb;
            border-radius: 5px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }
        .ed-action-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }
        .ed-action-btn.play {
            background: rgba(217, 119, 6, 0.2);
            border-color: rgba(217, 119, 6, 0.4);
            color: #fde047;
        }
        .ed-action-btn.play:hover {
            background: rgba(217, 119, 6, 0.35);
        }
        .ed-action-btn.inject {
            background: rgba(16, 185, 129, 0.15);
            border-color: rgba(16, 185, 129, 0.35);
            color: #6ee7b7;
        }
        .ed-action-btn.inject:hover {
            background: rgba(16, 185, 129, 0.3);
        }
        .ed-action-btn.immersive {
            background: rgba(139, 92, 246, 0.15);
            border-color: rgba(139, 92, 246, 0.35);
            color: #c4b5fd;
            margin-left: auto;
        }
        .ed-action-btn.immersive:hover {
            background: rgba(139, 92, 246, 0.3);
            border-color: rgba(139, 92, 246, 0.6);
            color: #ede9fe;
        }

        /* 内嵌式开启密谈控制台面板 */
        .ed-dial-panel {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-sizing: border-box;
            width: 100%;
        }
        .ed-system-hint {
            background: rgba(196, 155, 79, 0.08);
            border: 1px solid rgba(196, 155, 79, 0.2);
            padding: 7px 10px;
            border-radius: 7px;
            font-size: 11px;
            color: rgba(220, 200, 160, 0.85);
            line-height: 1.4;
            display: flex;
            align-items: center;
            gap: 6px;
            box-sizing: border-box;
            width: 100%;
        }
        .ed-form-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            width: 100%;
            box-sizing: border-box;
        }
        .ed-form-label {
            font-size: 11.5px;
            color: rgba(220, 200, 160, 0.9);
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ed-form-input, .ed-form-select {
            width: 100%;
            max-width: 100%;
            background: rgba(0, 0, 0, 0.45);
            border: 1px solid rgba(196, 155, 79, 0.25);
            border-radius: 7px;
            padding: 7px 10px;
            color: #fff;
            font-size: 12px;
            outline: none;
            box-sizing: border-box;
            transition: all 0.2s;
        }
        .ed-form-input:focus, .ed-form-select:focus {
            border-color: #f59e0b;
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
            background: rgba(0, 0, 0, 0.65);
        }
        .ed-form-select option {
            background: #181524;
            color: #fff;
        }

        /* 动态添加说话人按钮 */
        .ed-add-speaker-btn {
            background: rgba(245, 158, 11, 0.08);
            border: 1px dashed rgba(245, 158, 11, 0.35);
            color: #fde047;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }
        .ed-add-speaker-btn:hover {
            background: rgba(245, 158, 11, 0.2);
            border-color: #f59e0b;
            color: #fff;
        }

        .ed-quick-tag {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(196, 155, 79, 0.2);
            color: rgba(220, 200, 160, 0.85);
            padding: 3px 7px;
            border-radius: 10px;
            font-size: 10.5px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .ed-quick-tag:hover {
            background: rgba(245, 158, 11, 0.2);
            border-color: rgba(245, 158, 11, 0.5);
            color: #fde047;
        }
        .ed-main-btn {
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
            color: #fff;
            border: 1px solid rgba(245, 158, 11, 0.4);
            border-radius: 8px;
            padding: 9px 14px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-shadow: 0 3px 10px rgba(217, 119, 6, 0.25);
            transition: all 0.2s ease;
            width: 100%;
            box-sizing: border-box;
            margin-top: 4px;
        }
        .ed-main-btn:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
        }
        .ed-main-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        /* 监听待接听界面 */
        .ed-prompt-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 24px;
            text-align: center;
            gap: 16px;
        }
        .ed-prompt-icon {
            font-size: 48px;
            animation: ed-pulse 2s infinite ease-in-out;
        }
        @keyframes ed-pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 10px #f59e0b); }
        }
    `;
    $('head').append(`<style id="eavesdrop-app-css">${css}</style>`);
}
