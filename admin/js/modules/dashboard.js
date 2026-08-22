// ==========================================================================
// ST-Direct-TTS Admin Module: Dashboard
// ==========================================================================

import { API_BASE } from '../core/api.js';
import { showNotification } from '../core/ui.js';
import { checkVersion } from './services.js';

/**
 * 加载系统仪表盘状态
 */
export async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();

        // GPT-SoVITS 服务检测
        if (data.sovits_service) {
            const sovits = data.sovits_service;
            const statusEl = document.getElementById('sovits-status');
            const stateEl = document.getElementById('sovits-state');

            if (statusEl && stateEl) {
                if (sovits.accessible) {
                    statusEl.textContent = '运行中';
                    statusEl.className = 'status-badge status-success';
                    stateEl.textContent = '服务可访问 (OK)';
                } else {
                    statusEl.textContent = '未运行';
                    statusEl.className = 'status-badge status-error';
                    stateEl.textContent = sovits.error || '无法连接';
                }
            }
            const sovitsUrlEl = document.getElementById('sovits-url');
            if (sovitsUrlEl) {
                sovitsUrlEl.textContent = sovits.url;
            }
        }

        // 检查版本更新
        checkVersion();
    } catch (error) {
        console.error('加载仪表盘失败:', error);
    }
}

/**
 * 刷新系统仪表盘状态
 */
export function refreshStatus() {
    showNotification('正在刷新系统状态...', 'info');
    loadDashboard();
}
