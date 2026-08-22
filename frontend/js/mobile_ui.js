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
 * - themes/default/index.js (默认主题)
 */

import { ThemeEngine } from './theme_engine.js';
import DefaultTheme from './themes/default/index.js';
import DeathlyHallowsTheme from './themes/deathly_hallows/index.js';

// ==================== 全局 SDK 挂载 ====================
// 引入共享库
import { ParticleEngine } from './themes/particle_engine.js';
import * as theme_utils from './themes/theme_utils.js';

window.TTS_Libs = {
    ParticleEngine,
    theme_utils,
};

// 引入原生 App 模块
import * as SettingsApp from './mobile_apps/settings_app.js';
import * as FavoritesApp from './mobile_apps/favorites_app.js';
import * as LlmTestApp from './mobile_apps/llm_test_app.js';
import * as PhoneCallApp from './mobile_apps/phone_call_app.js';
import * as EavesdropApp from './mobile_apps/eavesdrop_app.js';
import * as IncomingCallApp from './mobile_apps/incoming_call_app.js';
import * as ThemeStoreApp from './mobile_apps/theme_store_app.js';
import * as WorkshopApp from './mobile_apps/workshop_app.js';

window.TTS_Apps = {
    settings: SettingsApp,
    favorites: FavoritesApp,
    llm_test: LlmTestApp,
    phone_call: PhoneCallApp,
    eavesdrop: EavesdropApp,
    incoming_call: PhoneCallApp,
    theme_store: ThemeStoreApp,
    workshop: WorkshopApp,
};

// ==================== 注册全局应用 ====================
ThemeEngine.registerApp({ id: 'incoming_call', defaultName: '来电', defaultIcon: '📞', sceneId: 'incoming_call' });
ThemeEngine.registerApp({ id: 'eavesdrop', defaultName: '对话追踪', defaultIcon: '🎧', sceneId: 'eavesdrop' });
ThemeEngine.registerApp({ id: 'favorites', defaultName: '收藏夹', defaultIcon: '❤️', sceneId: 'favorites' });
ThemeEngine.registerApp({ id: 'workshop', defaultName: '剧本工坊', defaultIcon: '📜', sceneId: 'workshop' });
ThemeEngine.registerApp({ id: 'theme_store', defaultName: '主题工坊', defaultIcon: '🎨', sceneId: 'theme_store' });
ThemeEngine.registerApp({ id: 'settings', defaultName: '系统设置', defaultIcon: '⚙️', sceneId: 'settings' });
ThemeEngine.registerApp({ id: 'phone_call', defaultName: '主动拨号', defaultIcon: '📞', sceneId: 'phone_call', hidden: true });
ThemeEngine.registerApp({ id: 'llm_test', defaultName: 'LLM测试', defaultIcon: '🤖', sceneId: 'llm_test', hidden: true });

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
