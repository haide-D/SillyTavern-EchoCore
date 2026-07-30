# ST-Direct-TTS Theme API Reference

本文档为 ST-Direct-TTS 扩展的主题开发指南。主题系统采用模块化设计，通过 `ThemeEngine` 挂载独立的主题生命周期与场景路由。

## 1. 目录结构约定

新建主题请在 `frontend/js/themes/` 下创建独立目录，通常包含：
- `index.js` - 主题入口（必须默认导出主题配置对象）
- `ui.js` - DOM 注入与 CSS 加载逻辑
- `scenes/` - 场景渲染拆分模块
- `assets.js` - SVG 或静态资源常量

## 2. 主题配置对象 (Theme Config)

入口文件必须 `export default` 一个符合以下接口的对象：

```javascript
export default {
    id: 'your_theme_id',      // 唯一标识
    name: 'Your Theme Name',  // UI 显示名称

    /**
     * 生命周期：初始化
     * @param {ThemeEngine} engine - 引擎实例，注入全局状态或绑定事件
     */
    init(engine) { },

    /**
     * 生命周期：销毁
     * 清理 DOM、移除监听器、停止动画循环等
     */
    destroy() { },

    /**
     * UI：渲染悬浮入口 / 触发器
     * @param {jQuery} $container - 默认容器（通常可忽略，直接向 body 注入 absolute DOM）
     */
    renderTrigger($container) { },

    /**
     * 场景路由映射 (Scene Routers)
     * 必须实现至少包含核心场景，未实现的场景会自动 fallback 到内置通用 UI。
     */
    scenes: {
        home: {
            render($container, ctx) { },
            cleanup() { } // 可选
        },
        incoming_call: {
            render($container, ctx) { }
            // 依赖全局变量: window.TTS_IncomingCall
        },
        eavesdrop: {
            render($container, ctx) { }
            // 依赖全局变量: window.TTS_EavesdropReady
        },
        // 其他内置通用 App 映射 (可选覆盖)
        favorites: { render($container, ctx) {} },
        settings: { render($container, ctx) {} },
        llm_test: { render($container, ctx) {} },
        phone_call: { render($container, ctx) {} }
    },

    /**
     * i18n / 标签重写 (可选)
     * @param {string} key - 内部标识符
     * @returns {string|null} - 覆盖的显示文本
     */
    getLabel(key) { return null; }
};
```

## 3. ThemeEngine (CTX) 上下文

场景的 `render($container, ctx)` 会接收 `ctx` 对象，核心暴露的方法和属性包括：
- `ctx.engine.showScene(sceneId)`: 切换到指定场景
- `ctx.engine.goHome()`: 快捷路由到 `home` 场景
- `ctx.engine.toggle()`: 显隐主题主窗口/模态框
- `ctx.engine.close()`: 强制关闭主题主窗口
- `ctx.engine.currentScene`: 当前场景 ID

## 4. 回退机制与通用组件

对于无需深度定制的子场景（如 Settings, Favorites 等），可直接引入原生 Mobile App 并重写 CSS 达成：
```javascript
import * as SettingsApp from '../../mobile_apps/settings_app.js';
// ...
settings: {
    render($container, ctx) {
        // 构建带有独立命名空间 class 的 wrapper，利用 CSS 覆盖底层样式
        const $appContainer = $('<div class="your-theme-app-container" style="..."></div>');
        // 可使用自定义 Navbar 函数覆盖默认 Navbar
        SettingsApp.render($appContainer, customCreateNavbar); 
        $container.empty().append($appContainer);
    }
}
```
*注：可通过 `import { createNavbar, createFallbackRenderer } from '../theme_utils.js'` 引入基础辅助函数。*

## 5. 开发建议

1. **样式隔离**：所有的 CSS 注入务必加上您的 `#主题特定的ModalID` 前缀，防止污染 SillyTavern 全局样式。
2. **事件清理**：如果在场景或 trigger 中绑定了全局 `document` 或 `window` 事件，请务必在 `cleanup()` 或 `destroy()` 钩子中解绑（`off()`）。
3. **音频播放上下文**：自定义通话/窃听界面时，请使用 `import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../mobile_apps/shared/audio_player.js'` 管理全局音频资源，确保切出应用时能正常销毁。
