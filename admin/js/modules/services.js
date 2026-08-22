// ==========================================================================
// ST-Direct-TTS Admin Module: Services & Version Control
// ==========================================================================

import { API_BASE } from '../core/api.js';
import { showNotification } from '../core/ui.js';

/**
 * 检查系统版本更新
 */
export async function checkVersion() {
    try {
        const response = await fetch(`${API_BASE}/version/check`);
        const data = await response.json();

        const currentVerEl = document.getElementById('current-version');
        const latestVerEl = document.getElementById('latest-version');
        const latestVerInfo = document.getElementById('latest-version-info');
        const statusBadge = document.getElementById('version-status');
        const updateActions = document.getElementById('update-actions');
        const updateBadge = document.getElementById('update-badge');
        const navUpdateBadge = document.getElementById('nav-update-badge');

        if (data.current_version && currentVerEl) {
            currentVerEl.textContent = data.current_version;
        }

        if (data.has_update) {
            if (latestVerEl) latestVerEl.textContent = data.latest_version;
            if (latestVerInfo) latestVerInfo.style.display = 'flex';
            if (statusBadge) {
                statusBadge.textContent = '有新版本';
                statusBadge.className = 'status-badge status-warning';
            }
            if (updateActions) updateActions.style.display = 'block';
            if (updateBadge) updateBadge.style.display = 'inline-block';
            if (navUpdateBadge) navUpdateBadge.style.display = 'inline-block';
        } else {
            if (statusBadge) {
                statusBadge.textContent = '已是最新';
                statusBadge.className = 'status-badge status-success';
            }
            if (latestVerInfo) latestVerInfo.style.display = 'none';
            if (updateActions) updateActions.style.display = 'none';
            if (updateBadge) updateBadge.style.display = 'none';
            if (navUpdateBadge) navUpdateBadge.style.display = 'none';
        }
    } catch (error) {
        console.error('检查版本更新失败:', error);
    }
}

/**
 * 执行在线热更新
 */
export async function performUpdate() {
    const updateBtn = document.getElementById('update-btn');
    const updateProgress = document.getElementById('update-progress');
    const updateActions = document.getElementById('update-actions');
    const progressBar = document.getElementById('version-progress-bar');
    const progressText = document.getElementById('version-progress-text');

    if (!updateBtn) return;

    updateBtn.disabled = true;
    if (updateActions) updateActions.style.display = 'none';
    if (updateProgress) updateProgress.style.display = 'block';
    if (progressBar) progressBar.style.width = '30%';
    if (progressText) progressText.textContent = '正在下载更新...';

    try {
        const response = await fetch(`${API_BASE}/version/update`, { method: 'POST' });
        const data = await response.json();

        if (response.ok && data.success) {
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = '更新成功！准备重启服务...';

            setTimeout(() => {
                fetch(`${API_BASE}/restart`, { method: 'POST' }).finally(() => {
                    setTimeout(() => window.location.reload(), 4000);
                });
            }, 1000);
        } else {
            throw new Error(data.error || data.detail || '更新失败');
        }
    } catch (error) {
        console.error('更新失败:', error);
        showNotification(`更新失败: ${error.message}`, 'error');
        updateBtn.disabled = false;
        if (updateProgress) updateProgress.style.display = 'none';
        if (updateActions) updateActions.style.display = 'block';
    }
}

/**
 * 加载 GPT-SoVITS 配置
 */
export async function loadSovitsConfig() {
    try {
        const response = await fetch('/api/sovits/config');
        if (!response.ok) return;

        const data = await response.json();
        const config = data.config;

        const installPathEl = document.getElementById('sovits-install-path');
        if (installPathEl && config.install_path) {
            installPathEl.value = config.install_path;
        }

        if (config.version_type) {
            const radio = document.querySelector(`input[name="gpu-type"][value="${config.version_type}"]`);
            if (radio) radio.checked = true;
        }

        const autoStartEl = document.getElementById('sovits-auto-start');
        if (autoStartEl) {
            autoStartEl.checked = config.auto_start !== false;
        }

        const statusBadge = document.getElementById('sovits-install-status');
        if (statusBadge) {
            if (config.installed && config.install_path) {
                statusBadge.textContent = '已配置';
                statusBadge.className = 'status-badge status-success';
            } else {
                statusBadge.textContent = '未配置';
                statusBadge.className = 'status-badge status-warning';
            }
        }
    } catch (error) {
        console.error('加载 GPT-SoVITS 配置失败:', error);
    }
}

/**
 * 保存 GPT-SoVITS 配置
 */
export async function saveSovitsConfig() {
    const gpuTypeRadio = document.querySelector('input[name="gpu-type"]:checked');
    const installPathEl = document.getElementById('sovits-install-path');
    const autoStartEl = document.getElementById('sovits-auto-start');

    const config = {
        installed: true,
        version_type: gpuTypeRadio ? gpuTypeRadio.value : 'v2',
        install_path: installPathEl ? installPathEl.value.trim() : '',
        auto_start: autoStartEl ? autoStartEl.checked : true,
        api_port: 9880
    };

    if (!config.install_path) {
        showNotification('请填写 GPT-SoVITS 安装路径', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/sovits/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();
        if (response.ok) {
            showNotification('GPT-SoVITS 配置已成功保存', 'success');
            loadSovitsConfig();
        } else {
            showNotification(data.detail || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showNotification('保存配置失败', 'error');
    }
}

/**
 * 启动 GPT-SoVITS 服务
 */
export async function startSovitsService() {
    showNotification('正在启动 GPT-SoVITS 服务...', 'info');

    try {
        const response = await fetch('/api/sovits/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();
        if (response.ok && data.success) {
            showNotification(`GPT-SoVITS 服务已启动 (PID: ${data.pid})`, 'success');
            if (window.loadDashboard) window.loadDashboard();
            loadSovitsStatus();
        } else {
            showNotification(data.detail || data.message || '启动失败', 'error');
        }
    } catch (error) {
        console.error('启动服务失败:', error);
        showNotification('启动服务失败', 'error');
    }
}

/**
 * 停止 GPT-SoVITS 服务
 */
export async function stopSovitsService() {
    showNotification('正在停止 GPT-SoVITS 服务...', 'info');

    try {
        const response = await fetch('/api/sovits/stop', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showNotification('GPT-SoVITS 服务已停止', 'success');
            if (window.loadDashboard) window.loadDashboard();
            loadSovitsStatus();
        } else {
            showNotification(data.message || '停止失败', 'warning');
        }
    } catch (error) {
        console.error('停止服务失败:', error);
        showNotification('停止服务失败', 'error');
    }
}

/**
 * 测试 GPT-SoVITS 连接
 */
export async function testSovitsConnection() {
    showNotification('正在测试 GPT-SoVITS 连接...', 'info');

    try {
        const response = await fetch('/api/sovits/test', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showNotification(`连接成功！端口: ${data.port}`, 'success');
        } else {
            showNotification(data.message || '连接失败', 'error');
        }
    } catch (error) {
        console.error('测试连接失败:', error);
        showNotification('测试连接失败', 'error');
    }
}

/**
 * 加载 GPT-SoVITS 服务状态
 */
export async function loadSovitsStatus() {
    try {
        const response = await fetch('/api/sovits/status');
        if (!response.ok) return;

        const status = await response.json();
        const statusBadge = document.getElementById('sovits-install-status');
        if (statusBadge) {
            if (status.api_reachable) {
                statusBadge.textContent = '运行中';
                statusBadge.className = 'status-badge status-success';
            } else if (status.installed && status.install_path) {
                statusBadge.textContent = '已配置';
                statusBadge.className = 'status-badge status-warning';
            } else {
                statusBadge.textContent = '未配置';
                statusBadge.className = 'status-badge';
            }
        }
    } catch (error) {
        console.error('加载 GPT-SoVITS 状态失败:', error);
    }
}
