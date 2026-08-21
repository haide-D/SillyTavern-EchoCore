// ==========================================================================
// ST-Direct-TTS Admin Core UI & Modal Controls
// ==========================================================================

/**
 * 现代化 Toast 消息通知
 * @param {string} message 提示信息
 * @param {'info'|'success'|'warning'|'error'} type 消息类型
 * @param {number} duration 显示时长 (ms)
 */
export function showNotification(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span style="font-size: 1.1rem; line-height: 1;">${icons[type] || 'ℹ️'}</span>
        <span style="flex: 1;">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, duration);
}

/**
 * 打开指定弹窗对话框
 * @param {string} dialogId 弹窗 DOM ID
 */
export function showDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.style.display = 'flex';
    }
}

/**
 * 关闭指定弹窗对话框
 * @param {string} dialogId 弹窗 DOM ID
 */
export function closeDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) {
        dialog.style.display = 'none';
    }
}
