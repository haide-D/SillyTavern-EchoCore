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


## 6. 移动端 UI 适配避坑指南 (Mobile UI Best Practices)

### 6.1 模态框 (Modal) 截断问题与居中方案
在移动端开发主题时，**严禁使用纯 CSS 的 `top: 50%; transform: translate(-50%, -50%)`** 来居中定高（如 `height: 600px`）的模态框。

**问题原因：**
1. 手机端浏览器有动态地址栏和底部导航栏，CSS 的 `100vh` 或 `50%` 计算往往包含被遮挡的区域，导致视觉中点偏低。
2. 当模态框高度超出实际可视高度时，`translateY(-50%)` 会强行将模态框的上半部分推出版心（屏幕顶部之外）。由于屏幕顶部之外的内容是无法通过滚动访问的，这会导致顶部的菜单栏或关闭按钮完全被截断且无法点击。

**修复与预防方案：**
- **取消 CSS 居中**：在 CSS 中仅保留 `position: fixed`，去掉 `top`、`left` 和 `transform`。
- **使用 JS 动态计算**：在主题引擎的 `onOpen()` 钩子中，利用 `window.visualViewport`（针对手机端最精确的可见视口 API）动态计算安全的宽高和坐标：

```javascript
onOpen(engine) {
    const $modal = $('#tts-dh-modal');
    
    // 1. 获取真实可见区域宽高
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    
    // 2. 限制模态框最大宽高，防止超出屏幕
    const modalW = Math.min(360, vw * 0.92);
    const modalH = Math.min(600, vh - 40);
    
    // 3. 计算安全的 Top 和 Left
    const top = (window.visualViewport ? window.visualViewport.pageTop : 0) + Math.max(20, (vh - modalH) / 2);
    const left = (window.visualViewport ? window.visualViewport.pageLeft : 0) + (vw - modalW) / 2;
    
    // 4. 应用坐标
    $modal.css({
        top: top + 'px',
        left: left + 'px',
        width: modalW + 'px',
        height: modalH + 'px',
        transform: 'none', // 彻底禁用 CSS transform
    });
    
    $modal.fadeIn(200);
}
```

### 6.2 悬浮按钮 (FAB) 靠边被截断
如果使用 JS 初始化悬浮按钮的位置，**不要**单纯依赖百分比（如 `left: winW * 0.78`）。由于手机端屏幕较窄，`78%` 的坐标加上元素自身宽度，极易超出右侧边界导致“半截”现象。
**预防方案**：必须计算出明确的像素坐标，并加上安全边界限制：
`initialLeft = Math.max(0, Math.min(winW - btnWidth, initialLeft));`

## 7. AI 辅助开发指南 (AI Generation)

对于希望使用大型语言模型（如 ChatGPT, Claude）生成主题代码的开发者，建议直接采用**纯文本代码生成模式**。

在主题工坊的 UI 中已经集成了“导入 AI 代码”功能，你只需将下述格式粘贴给 AI 并要求它保持这种多文件 Markdown 格式进行回答：

### 推荐的 AI 提示词规范 (Prompt Template)

```text
你是一个经验丰富的前端开发专家，现在需要为 SillyTavern TTS 插件编写一个自定义主题。
请严格遵循以下规范开发：

# 架构与输出格式规范
1. 主题由纯文本代码组成，必须包含 `manifest.json`, `index.js` 和 `style.css` 等核心文件。
2. 请使用 Markdown 格式分别输出每个文件。每个文件的代码块上方必须使用三级标题（###）精确标注文件名。格式必须如下：

### manifest.json
\```json
{
  "id": "你的主题ID(要求纯英文小写下划线)",
  "name": "主题名称",
  "version": "1.0.0",
  "entry_js": "index.js",
  "entry_css": "style.css"
}
\```

### index.js
\```javascript
export default {
    id: '与manifest一致',
    name: '主题名称',
    init(engine) { ... },
    destroy() { ... },
    scenes: { home: { render($container, ctx) { ... } } }
}
\```

### style.css
\```css
.your-theme-id-container { ... }
\```

# 移动端适配与最佳实践
1. 严禁使用纯 CSS 的 `top: 50%; transform: translate(-50%, -50%)` 来居中定高的模态框。若需居中，请在 JS 钩子中使用 `window.visualViewport` 获取精确视口，并基于其动态计算出安全的 `top` 和 `left` 像素坐标赋予模态框。
2. 资源建议使用内置图标库 (如 FontAwesome `<i class="fa-solid fa-house"></i>`) 或使用行内 SVG (导出至单独的 `assets.js` 并在 index.js 中引用)。
3. 在定制通话和监听界面时，善用透明毛玻璃效果 (`backdrop-filter`)。
4. 生命周期与显隐闭环：
   - 模态框容器默认应该是隐藏的（`display: none`）。
   - 在你的悬浮按钮 (FAB) 点击事件中，不仅要执行 `engine.showScene('home')`，还必须显式调用你模态框容器的 `.show()` 或 `.fadeIn()`，确保它显示出来。
   - 在主界面的关闭按钮事件中，调用模态框容器的 `.hide()` 或 `.fadeOut()`。确保这套打开/关闭逻辑闭环无 bug。
5. 拖拽支持 (Draggable) 必选：
   - 悬浮按钮 (FAB) 必须是可随意拖拽的。请使用自己实现的一套 mouse/touch 拖拽逻辑，注意区分拖拽（Drag）和点击（Click），防止拖拽结束后误触打开界面。
   - 主模态框面板 (Modal) 也必须是可拖拽的。如果你的环境支持 jQuery UI，请直接调用 `$container.draggable({ handle: '.你的Header类名' })`，让用户能按住标题栏拖拽整个窗口，或者自己手写拖拽逻辑。

# 任务
请根据我的需求描述，直接按照上述 Markdown 标题 + 代码块格式输出所有的主题文件代码。不要打包，直接输出纯文本代码。
```

当 AI 返回结果后，你只需要复制其整个包含 `### xxx.xx` 以及代码块的 Markdown 回复，到 `主题工坊` -> `导入 AI 代码` 处粘贴即可自动安装。不再需要任何手动 ZIP 打包的流程。
