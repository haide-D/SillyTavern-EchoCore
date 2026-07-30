/**
 * 主题引擎引导程序
 *
 * 原「模拟手机 UI 核心框架」，现已重构为 ThemeEngine 的引导程序。
 * 职责仅剩:
 * 1. 导入并注册 DefaultTheme
 * 2. 暴露 TTS_Mobile 全局接口（向后兼容）
 * 3. 初始化 ThemeEngine
 *
 * 所有 UI 渲染、拖拽、场景路由逻辑已迁移到:
 * - theme_engine.js (核心引擎)
 * - themes/default/theme.js (默认主题)
 */

import { ThemeEngine } from './theme_engine.js';
import DefaultTheme from './themes/default/theme.js';
import DeathlyHallowsTheme from './themes/deathly_hallows/index.js';

// ==================== 注册默认主题 ====================
ThemeEngine.registerTheme(DefaultTheme);
ThemeEngine.registerTheme(DeathlyHallowsTheme);

// ==================== 向后兼容 ====================
// 保持 window.TTS_Mobile 接口不变，代理到 ThemeEngine

if (!window.TTS_Mobile) {
    window.TTS_Mobile = {};
}

export const TTS_Mobile = window.TTS_Mobile;

(function (scope) {

    /**
     * 初始化
     * 由 index.js 调用，启动主题引擎
     */
    scope.init = async function () {
        // API 地址从 TTS_State 获取
        const apiHost = (window.TTS_State && window.TTS_State.CACHE && window.TTS_State.CACHE.API_URL)
            || 'http://127.0.0.1:3000';

        console.log('[Mobile] 🚀 启动主题引擎...');
        await ThemeEngine.init(apiHost);
    };

    /**
     * 打开指定 App（向后兼容）
     * 代理到 ThemeEngine.showScene
     */
    scope.openApp = function (appKey) {
        if (!ThemeEngine.isOpen()) {
            ThemeEngine.open();
        } else {
            ThemeEngine.showScene(appKey);
        }
    };

})(window.TTS_Mobile);
