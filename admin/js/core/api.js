// ==========================================================================
// ST-Direct-TTS Admin Core API & Auth Interceptor
// ==========================================================================

export const API_BASE = '/api/admin';

export function getAuthToken() {
    return localStorage.getItem('st_tts_auth_token') || '';
}

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem('st_tts_auth_token', token);
    } else {
        localStorage.removeItem('st_tts_auth_token');
    }
}

// ==================== 全局 Fetch 自动带鉴权 Token 拦截器 ====================
const originalFetch = window.fetch;
window.fetch = async function (resource, init = {}) {
    const token = getAuthToken();

    // 初始化 headers
    if (!init.headers) {
        init.headers = {};
    }

    // 若有 Token 且未显式指定 Authorization，自动注入
    if (token) {
        if (init.headers instanceof Headers) {
            if (!init.headers.has('Authorization')) {
                init.headers.set('Authorization', `Bearer ${token}`);
            }
        } else if (Array.isArray(init.headers)) {
            const hasAuth = init.headers.some(([k]) => k.toLowerCase() === 'authorization');
            if (!hasAuth) {
                init.headers.push(['Authorization', `Bearer ${token}`]);
            }
        } else if (typeof init.headers === 'object') {
            if (!init.headers['Authorization'] && !init.headers['authorization']) {
                init.headers['Authorization'] = `Bearer ${token}`;
            }
        }
    }

    const response = await originalFetch(resource, init);

    // 如果返回 401 Unauthorized，且当前不在登录请求本身，触发弹出登录框
    if (response.status === 401 && typeof resource === 'string' && !resource.includes('/api/auth/login')) {
        if (typeof window.showAdminLoginModal === 'function') {
            window.showAdminLoginModal();
        }
    }

    return response;
};
