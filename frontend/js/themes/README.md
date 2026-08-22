# ST-Direct-TTS 主题开发与定制规范指南

本文档为 ST-Direct-TTS 扩展的主题开发权威指南。主题系统采用模块化与场景驱动设计，通过 `ThemeEngine` 统一调度主题的生命周期、面板显隐、场景路由与事件通知。

---

## 0. 核心美学铁律：SVG-First 矢量架构设计 (以《死亡圣器》为标杆)

> ⚠️ **核心准则**：严禁采用粗糙单调的传统 HTML 方块（简单的 `div border` 堆叠在现代 UI 中体验极差）。
> ST-Direct-TTS 新一代主题必须以 **《死亡圣器》(deathly_hallows)** 为标杆设计模板，全面采用 **SVG-First 矢量几何美学** 与 **Canvas 粒子物理系统**：
>
> 1. **悬浮入口拟物化 (不局限于圆球！)**：悬浮入口（Trigger / FAB）形态必须与主题世界观深度匹配！仙侠可以是**直立悬浮的飞剑灵器/古玉符印**，赛博朋克可以是**战术能量芯片/HUD核心**，魔幻可以是**灵能力场法阵**，严禁千篇一律的纯圆球。
> 2. **模态框矢量框架 (SVG Frame)**：模态框背景必须内嵌矢量 `<svg>` 框架层（包含渐变遮罩、`<filter>` 光晕滤镜、非对称/多边形切角边框、几何符文线、装饰角点与顶部导轨），与内部 DOM 形成精妙的层叠透光质感。
> 3. **主菜单场景深度定制 (Home Scene - 严禁无脑照搬)**：主页 (`home`) 场景必须契合主题世界观独立定制（如仙侠主题做成**仙门古风长卷/折页玉简**，赛博主题做成**战术 HUD 矩阵**，魔幻主题做成**能量连线交错阵列**），也可在方案阶段与用户沟通确认。
> 4. **主题内必须独立实现场景细节 (`scenes/`)**：每个主题必须在 `scenes/` 目录下完整实现自己的 `home.js`、`incoming_call.js` (专属沉浸式通话)、`eavesdrop.js` (专属沉浸式窃听)，严禁只挂一个通用的 fallback 占位。
> 5. **Canvas 粒子与物理系统深度集成**：悬浮入口周围与全屏背景必须集成 Canvas 粒子物理系统，实时驱动光尘流转、微事件爆发与交互反馈，且必须在 `destroy()` 时彻底释放。
> 6. **🚫 严禁使用 Emoji 表情，强制使用高精矢量 SVG**：**严禁在选项卡、按钮、标题与界面文案中直接使用 Emoji 表情（如 💬, 📜, ⚔️, 📞, 👁️, ⚡）！** Emoji 在不同操作系统（Windows、macOS、Android）中渲染风格极度割裂且像素模糊，无法随主题滤镜变色。**必须全部使用内联高精 `<svg>` 矢量结构或从 `STATUS_SVGS` / `assets.js` 导入的矢量图标，配合 `currentColor` 实现与主题色完美共鸣！**
> 7. **🚫 严禁实心色块贴图感，必须采用 3D 几何线条与动态流轨 (Geometric Line Art & Flow Paths)**：**严禁将悬浮入口画成死板的 2D 平面贴纸（使用大面积实心 `fill` 填色拼合出来的平面图标极度廉价且无质感）！** 高级质感的法阵/灵器必须采用**分层几何工笔线条（虚实结合的 `stroke`） + 双层反向自转轨道（Orbit Rings） + 沿路径流动的灵气光轨（`stroke-dasharray` / `stroke-dashoffset` 线性流光） + 带有独立多频呼吸脉动的微光阵眼灵核 + `perspective: 800px` 3D 空间倾斜悬浮**。以《死亡圣器》与《仙途凌霄》为标准范式。

---

## 1. 目录结构与打包规范 (严格对齐死亡圣器分层标准)

### 1.1 文件目录结构
新建主题可在 `frontend/js/themes/{your_theme_id}/` 下创建独立目录（内置主题），或由用户通过 ZIP / 纯文本导入（外部主题 `data/themes/{your_theme_id}/`）。标准工程结构包含：

#### 1.1.1 JS 逻辑与场景目录 (`frontend/js/themes/{your_theme_id}/`)
```text
frontend/js/themes/{your_theme_id}/
├── manifest.json       # [必选] 主题元数据声明文件
├── index.js            # [必选] 主题逻辑入口 (ES Module 格式，默认导出主题对象)
├── state.js            # [必选] 主题内部状态与全局引擎引用
├── ui.js               # [必选] 专属悬浮入口、模态框 DOM 注入、拖拽交互与视口校准
├── assets.js           # [必选] 专属 SVG 矢量资产 (Trigger SVG、Frame SVG、App Icons、Watermark)
├── particles.js        # [可选/高品质标配] 专属 Canvas 粒子物理系统
└── scenes/             # [必选] 专属场景实现目录
    ├── home.js         # 专属主页场景 (深度契合世界观的艺术化布局)
    ├── incoming_call.js # 专属全屏沉浸式通话场景 (含接听/挂断/波形/字幕)
    ├── eavesdrop.js    # 专属全屏沉浸式窃听/监听场景 (含播放/暂停/波形)
    └── shared.js       # 专属应用名称映射、定制导航栏、全屏构建器
```

#### 1.1.2 专属 CSS 样式目录 (`frontend/css/themes/{your_theme_id}/`)
内置主题的 CSS 样式必须严格对齐《死亡圣器》规范，放置在 `frontend/css/themes/` 目录下进行模块化分层管理：
```text
frontend/css/themes/
├── {your_theme_id}.css        # 主题样式入口 (@import './{your_theme_id}/index.css';)
└── {your_theme_id}/           # 模块化样式子目录
    ├── index.css              # 聚合入口 (@import './trigger.css'; @import './modal.css'; ...)
    ├── trigger.css            # 悬浮入口 (飞剑/法阵/芯片)、粒子发光与呼吸浮动动效
    ├── modal.css              # 模态框 SVG 框架、长卷/玉简卡片、主页场景与工坊覆盖样式
    └── fullscreen_call.css    # 全屏沉浸式通话与神识窃听场景样式 (含波形、光环头像、水印)
```

### 1.2 `manifest.json` 元数据规范
```json
{
  "id": "your_theme_id",
  "name": "主题中文/英文展示名称",
  "version": "1.0.0",
  "author": "开发者名称",
  "description": "主题特色简述",
  "entry_js": "index.js",
  "entry_css": "style.css"
}
```
> **注意**：`id` 必须为纯英文小写加下划线（如 `deathly_hallows`、`cyberpunk_neon`），且必须与 `index.js` 中的 `id` 严格保持一致。

---

## 2. 主题配置对象 (Theme Config 接口规范)

`index.js` 必须 `export default` 一个符合以下接口规范的主题配置对象：

```javascript
export default {
    id: 'your_theme_id',          // 必须与 manifest.json 的 id 一致
    name: '主题展示名称',

    /**
     * 1. 生命周期：初始化 (Theme Init)
     * 在 body 中注入主题专属 DOM（如主模态框结构、遮罩层、场景挂载容器）。
     * 此时悬浮球 (FAB) 尚未渲染。
     * @param {ThemeEngine} engine - 全局主题引擎实例
     */
    async init(engine) {
        // 示例：注入模态框结构
        // $('body').append('<div id="tts-mytheme-modal" style="display:none;"><div id="tts-mytheme-scene-container"></div></div>');
    },

    /**
     * 2. 生命周期：销毁 (Theme Destroy)
     * 切换到其他主题时调用。必须清理所有注入的 DOM、解绑全局事件、停止定时器/动画。
     */
    destroy() {
        $('#tts-mytheme-modal').remove();
        $(window).off('.mytheme');
        $(document).off('.mytheme');
    },

    /**
     * 3. 渲染悬浮入口 / 悬浮球 (FAB Trigger)
     * 在 body 中注入悬浮球 DOM，绑定拖拽 (PointerCapture) 与点击展开逻辑。
     * @param {ThemeEngine} engine
     */
    renderTrigger(engine) {
        // 创建并挂载悬浮球，支持拖拽与点击展开
    },

    /**
     * 4. 销毁悬浮球 (Destroy Trigger)
     * 移除悬浮球 DOM 及相关全局事件
     */
    destroyTrigger() {
        $('#tts-mytheme-fab').remove();
    },

    /**
     * 5. 面板打开钩子 (Modal Open)
     * 当用户点击悬浮球或调用 engine.open() 时触发。
     * 负责执行面板入场动画、使用 visualViewport 动态校准模态框在移动端/PC端的位置。
     * @param {ThemeEngine} engine
     */
    onOpen(engine) {
        // 显示模态框并执行入场动效
    },

    /**
     * 6. 面板关闭钩子 (Modal Close)
     * 当调用 engine.close() 或用户点击关闭按钮时触发。
     * 负责执行面板退场动画、隐藏模态框、重置悬浮球状态。
     * @param {ThemeEngine} engine
     */
    onClose(engine) {
        // 隐藏模态框并执行退场动效
    },

    /**
     * 7. 获取场景挂载容器 [必须实现]
     * 引擎在切换场景时会清空 ($container.empty()) 该容器并渲染场景内容。
     * @returns {jQuery} 场景挂载容器的 jQuery 对象
     */
    getSceneContainer() {
        return $('#tts-mytheme-scene-container');
    },

    /**
     * 8. 场景路由映射 (Scene Handlers)
     * 核心场景必须实现，未实现的场景会自动 fallback 到内置通用 UI。
     */
    scenes: {
        /**
         * 主菜单场景 (Home Scene) [必须实现]
         * 必须遍历 ctx.engine.getRegisteredApps() 动态渲染 App 图标网格，严禁硬编码。
         */
        home: {
            render($container, ctx) {
                // ctx.engine.getRegisteredApps().forEach(...)
            },
            cleanup() {
                // 场景离开时的清理逻辑（可选）
            }
        },

        /**
         * 来电界面 (Incoming Call Scene) [必须实现]
         * 依赖全局变量 window.TTS_IncomingCall 与 window.TTS_Audio
         */
        incoming_call: {
            render($container, ctx) {
                // 渲染沉浸式通话界面，使用 window.TTS_Audio 播放音频与同步字幕
            },
            cleanup() {
                // 清理音频播放器与定时器
            }
        },

        /**
         * 窃听/截获信号界面 (Eavesdrop Scene) [必须实现]
         * 依赖全局变量 window.TTS_EavesdropReady 或 window.TTS_EavesdropData
         */
        eavesdrop: {
            render($container, ctx) {
                // 渲染窃听播放界面
            },
            cleanup() { }
        },

        // 可选覆盖内置 App 场景（如未覆盖，引擎会自动使用原生 Mobile App 渲染）：
        // favorites: { render($container, ctx) {}, cleanup() {} },
        // workshop: { render($container, ctx) {}, cleanup() {} },
        // settings: { render($container, ctx) {}, cleanup() {} },
        // theme_store: { render($container, ctx) {}, cleanup() {} },
        // phone_call: { render($container, ctx) {}, cleanup() {} },
        // llm_test: { render($container, ctx) {}, cleanup() {} }
    },

    /**
     * 9. 事件与通知监听 (Notification Handler) [可选]
     * 引擎收到来电、偷听就绪等事件时分发给当前主题。
     * @param {string} type - 'incoming_call' | 'eavesdrop_ready' | 'call_ended'
     * @param {Object} data - 通知附带的数据
     * @param {ThemeEngine} engine
     * @returns {boolean} 返回 true 表示主题已完全接管通知；返回 false 走系统默认 toastr 提示
     */
    onNotification(type, data, engine) {
        if (type === 'incoming_call' || type === 'eavesdrop_ready') {
            // 改变悬浮球状态（如闪烁/脉冲/气泡提示），由主题完全接管
            return true;
        }
        return false;
    },

    /**
     * 10. 文案与国际化标签覆盖 (Label Override) [可选]
     * @param {string} key - 应用标识符（如 'settings', 'favorites', 'theme_store', 'workshop' 等）
     * @param {string} fallback - 默认备用名称
     * @returns {string|null} 覆盖后的文本，返回 null 则使用系统默认名称
     */
    getLabel(key, fallback) {
        // 示例：将 'workshop' 改为 '剧本魔盒'
        return null;
    }
};
```

---

## 3. ThemeEngine API 与上下文 (`ctx`)

在主题的各方法及场景 `render($container, ctx)` 中，可直接通过 `engine` 参数或 `ctx.engine` 访问引擎能力：

### 3.1 面板控制
- `engine.open()`: 打开主模态框面板（先触发 `onOpen`，随后切换到 `home` 场景）。
- `engine.close()`: 关闭主面板（先触发当前场景的 `cleanup`，随后触发 `onClose`）。
- `engine.toggle()`: 智能显隐（若有待接听的来电/窃听数据则优先打开对应界面，否则在 open / close 间切换）。
- `engine.isOpen()`: 返回 `boolean`，当前主面板是否处于打开状态。

### 3.2 场景路由
- `engine.showScene(sceneId, data = {})`: 切换到指定场景 ID。自动清空场景容器并调用对应场景的 `render($container, ctx)`。
- `engine.goHome()`: 快捷路由回到 `home` 主菜单场景。
- `engine.getCurrentScene()`: 获取当前活跃的场景 ID 字符串（如 `'home'`, `'incoming_call'`, `'workshop'`）。

### 3.3 应用注册表 (App Registry)
- `engine.getRegisteredApps()`: 获取当前系统已注册的所有 App 列表数组：
  ```javascript
  [
    { id: 'favorites', defaultName: '收藏夹', defaultIcon: '⭐', sceneId: 'favorites', hidden: false },
    { id: 'workshop', defaultName: '剧本工坊', defaultIcon: '🎬', sceneId: 'workshop', hidden: false },
    { id: 'theme_store', defaultName: '主题工坊', defaultIcon: '🎨', sceneId: 'theme_store', hidden: false },
    { id: 'settings', defaultName: '高级设置', defaultIcon: '⚙️', sceneId: 'settings', hidden: false },
    { id: 'phone_call', defaultName: '通话记录', defaultIcon: '📞', sceneId: 'phone_call', hidden: false },
    { id: 'llm_test', defaultName: 'AI测试', defaultIcon: '🧪', sceneId: 'llm_test', hidden: true }
  ]
  ```
  > **规范要求**：`home` 场景**必须**调用 `engine.getRegisteredApps().filter(a => !a.hidden)` 动态渲染图标，严禁硬编码应用列表！

### 3.4 工具与环境
- `engine.getApiHost()`: 获取后端中间件的基础 URL 字符串（如 `http://localhost:7771`）。
- `engine.getLabel(key, fallback)`: 获取指定 App 或场景的显示文本覆盖。
- `engine.notify(type, data)`: 向主题派发通知事件（例如在挂断电话时调用 `engine.notify('call_ended', {})`）。
- `ctx.createNavbar(title, onBack)`: 创建标准风格的通用顶部导航栏 jQuery DOM 对象。

---

## 4. 全局状态与音频播放器规范 (`AudioPlayer`)

在外部主题加载环境下，所有核心工具类和全局状态均已注入到全局对象，严禁使用相对路径 `import` 本地音频模块。

### 4.1 全局来电与窃听数据结构

#### 来电数据：`window.TTS_IncomingCall`
```javascript
window.TTS_IncomingCall = {
    char_name: "爱丽丝",         // 来电角色名
    avatar_url: "url_or_null",   // 头像 URL（为 null 时需用主题内置 SVG 兜底）
    audio_url: "http://...",     // 音频文件 URL
    call_id: "uuid-xxxx",        // 通话唯一 ID
    segments: [                  // 字幕与时间戳段落
        {
            text: "喂，听得到我说话吗？",
            speaker: "爱丽丝",
            start_time: 0.0,       // 相对音频开始的时间（秒）
            audio_duration: 2.3    // 本段时长（秒）
        }
    ]
};
```

#### 窃听/截获数据：`window.TTS_EavesdropReady` / `window.TTS_EavesdropData`
```javascript
window.TTS_EavesdropReady = {
    speakers: ["角色A", "角色B"],
    notification_text: "截获了新的加密通信...",
    audio_url: "http://...",
    segments: [ /* 同上格式 */ ]
};
```

### 4.2 音频播放与字幕同步机制 (`AudioPlayer`)
> 📍 **核心代码索引**：[frontend/js/mobile_apps/shared/audio_player.js](file:///g:/Ai/SillyTavern/data/default-user/extensions/st-direct-tts/frontend/js/mobile_apps/shared/audio_player.js)

主题在播放通话或窃听音频时，必须使用系统的 `AudioPlayer` 并传入正确的 `$container` 引用以驱动字幕与声波：

```javascript
import { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } from '../../../mobile_apps/shared/audio_player.js';

// 1. 实例化播放器 (⚠️ 注意：参数名为 $container，必须带有 $ 符号)
const player = new AudioPlayer({
    $container: $content,             // 必须传入包含 .call-subtitle-area 的 jQuery 对象
    segments: callData.segments || [], // 传入台词分段以驱动逐句高亮
    showSpeaker: false,               // 单人通话设为 false，多人窃听设为 true
    onEnd: () => {
        playNextOrEnd();
    },
    onError: (err) => {
        console.error('音频播放出错:', err);
        playNextOrEnd();
    }
});

// 2. 注册为全局活跃播放器（使系统能在切出或关闭时统一管理）
setGlobalPlayer(player);

// 3. 开始播放 (传入音频直链)
if (callData.audio_url) {
    player.play(callData.audio_url);
} else {
    playNextOrEnd();
}
```

### 4.3 聊天上下文注入机制 (`ChatInjector`)
> 📍 **核心代码索引**：[frontend/js/chat_injector.js](file:///g:/Ai/SillyTavern/data/default-user/extensions/st-direct-tts/frontend/js/chat_injector.js)

所有沉浸式通话与窃听界面**必须提供「📝 注入聊天」操作按键**，让用户能随时将当前通话的角色、原因、台词与音频直链无缝写入 SillyTavern 的当前聊天流中：

```javascript
import { ChatInjector } from '../../../chat_injector.js';

let hasInjected = false;
$content.find('#btn-inject-chat').click(async function () {
    if (hasInjected) return;
    const $btn = $(this);
    const $lbl = $('#inject-label');
    $lbl.text('注入中...');
    
    try {
        await ChatInjector.appendToLastAIMessage({
            type: 'phone_call', // 或 'eavesdrop'
            segments: callData.segments || [],
            callerName: callData.char_name || callData.selected_speaker || '神秘角色',
            target: callData.target_user || '你',
            callReason: callData.call_reason || '主动致电',
            callId: callData.call_id,
            audioUrl: callData.audio_url
        });
        hasInjected = true;
        $btn.text('✓').addClass('injected');
        $lbl.text('已注入仙卷');
    } catch (e) {
        console.error('手动注入聊天失败:', e);
        $lbl.text('重试注入');
    }
});
```

### 4.4 字幕容器 DOM 结构规范
为了使 `AudioPlayer` 能自动执行精准的字幕与进度联动，请在通话界面的 HTML 中包含以下标准类名结构：

```html
<!-- 字幕容器：来电使用 call-subtitle-area，窃听使用 listening-subtitle-area -->
<div class="call-subtitle-area">
    <div class="subtitle-line">
        <span class="subtitle-speaker" style="display:none;"></span>
        <span class="subtitle-text">等待接听...</span>
    </div>
</div>

<!-- 进度条与时间显示（可选但推荐） -->
<div class="progress-bar-fill"></div>
<span class="current-time">00:00</span> / <span class="total-time">00:00</span>
<span class="call-duration">00:00</span>
```

---

## 5. 移动端 UI 适配与避坑指南 (Mobile UI Best Practices)

### 5.1 悬浮球点击统一调用 `engine.toggle()` 铁律 (来电/窃听直达接听)
> 📍 **核心代码索引**：[frontend/js/theme_engine.js](file:///g:/Ai/SillyTavern/data/default-user/extensions/st-direct-tts/frontend/js/theme_engine.js#L422-L460)

- **避坑痛点**：若在悬浮入口的点击事件中写 `engine.open()`，由于 `open()` 内部硬编码了 `showScene('home')`，会导致在收到来电或监听时，点击悬浮球直接被强制拉回主菜单，**无法进入接听/挂断全屏界面**！
- **铁律要求**：悬浮球点击后**必须调用 `engine.toggle()`**！`engine.toggle()` 内部会自动按优先级检测：
  1. 若有待接来电 (`window.TTS_IncomingCall`) -> 自动进入 `incoming_call` 场景；
  2. 若有未听偷听 (`window.TTS_EavesdropData`) -> 自动进入 `eavesdrop` 场景；
  3. 若无任何推送 -> 正常开关主菜单 (`home`)。

```javascript
// ui.js 中点击悬浮入口的标准写法
if (!ThemeState.drag.hasMoved) {
    if (ThemeState.engine) {
        ThemeState.engine.toggle(); // 必须使用 toggle() 确保来电/窃听直达！
    }
}
```
const vH = window.visualViewport?.height ?? window.innerHeight;
const btnSize = 60;
$fab.css({
    left: Math.min(vW - btnSize - 16, vW * 0.8) + 'px',
    top:  Math.min(vH - btnSize - 24, vH * 0.85) + 'px'
});

// 2. Pointer 拖拽与防点击误触 (hasMoved 标志位)
let isDragging = false, hasMoved = false, startX = 0, startY = 0, initLeft = 0, initTop = 0;
const el = $fab[0];

el.addEventListener('pointerdown', (e) => {
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    initLeft = parseInt($fab.css('left')) || 0;
    initTop = parseInt($fab.css('top')) || 0;
    el.setPointerCapture(e.pointerId);
});

el.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        hasMoved = true;
    }
    if (hasMoved) {
        $fab.css({
            left: Math.max(0, Math.min(window.innerWidth - btnSize, initLeft + dx)) + 'px',
            top:  Math.max(0, Math.min(window.innerHeight - btnSize, initTop + dy)) + 'px'
        });
    }
});

el.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch(err) {}
    
    // 只有在未移动（纯点击）时才触发打开面板
    if (!hasMoved) {
        engine.toggle();
    }
});
```

### 5.3 粒子系统物理坐标绝对跟随避坑 (Local-Canvas Architecture)

- **痛点场景**：如果在 `body` 创建全屏 Canvas，但粒子发射源计算采用固定坐标，当悬浮入口被用户拖拽到右下角时，粒子仍停留在屏幕左上角 (0, 0)，造成**粒子与 UI 严重脱节**。
- **推荐解法 (Local-Canvas 局部子节点模式)**：
  - 将 `<canvas>` 直接作为悬浮入口 DOM（`#tts-{theme_id}-trigger`）的子节点追加（`position: absolute; pointer-events: none;`）。
  - Canvas 宽高设为 `triggerWidth + padding * 2`，通过 `left: -padding; top: -padding` 居中包裹。
  - 粒子发射源直接以 `canvasW / 2, canvasH / 2` 为中心。
  - **优势**：无论用户如何拖拽移动悬浮物、窗口如何缩放，Canvas 与粒子天然 100% 绝对物理跟随，永远不发生错位！

```javascript
// Local-Canvas 标准实现范式
const canvas = document.createElement('canvas');
canvas.id = 'themeParticleCanvas';
canvas.style.position = 'absolute';
canvas.style.pointerEvents = 'none';
canvas.style.left = '-30px';
canvas.style.top = '-30px';
canvas.width = (triggerWidth + 60) * dpr;
canvas.height = (triggerHeight + 60) * dpr;
triggerElement.appendChild(canvas);
```

### 5.4 场景双态路由与生命周期规范

- **痛点场景**：用户在 Home 菜单点击「对话追踪/神识探查」时点击无反应或黑屏；或者窃听触发时点击悬浮球直接开始强行播放，缺少让用户「无视/拒绝」的缓冲阶段。
- **核心逻辑**：`incoming_call` 与 `eavesdrop` 必须清晰区分两种进入路径：
  1. **被动推送态 (Push Streaming)**：系统检测到待听音频流（`callData.audio_url` 存在），此时隐藏模态框，全屏拉起专属沉浸式通话/窃听界面；
  2. **主动点击态 (Active List View)**：用户从主菜单点击进入，此时无待听音频，**必须在当前模态框容器中直接渲染历史记录列表**（调用原生 App 的 `render($container, createNavbarForApps)`），严禁在无数据时强行挂载全屏遮罩！

#### 5.4.1 窃听场景被动触发的标准双阶段流转 (2-Stage Eavesdrop Flow)
> ⚠️ **严禁直接跳过确认界面强行播放音频！** 窃听被动触发后必须包含两个独立子阶段：
> 1. **阶段 1：神识感应确认态 (`renderEavesdropPrompt`)**：
>    - 展示多角色交叠头像（`avatarStackHtml`）与待听队列数量；
>    - 底部提供 **「无视 / 跳过」**（清除并放行队列）与 **「探查 / 探知」** 两个按键；
> 2. **阶段 2：正式探听播放态 (`showActiveEavesdropUI`)**：
>    - 用户点击「探查」后才开始加载并播放音频；
>    - 激活水墨/声波动画、实时字幕，并提供 **「铭刻仙卷 (上下文注入)」** 与 **「收神 (挂断)」** 按键。

```javascript
// scenes/eavesdrop.js 标准路由范式
export const eavesdropScene = {
    render($container, ctx) {
        const eavesdropData = (ctx && ctx.data && ctx.data.audio_url) 
            ? ctx.data 
            : (window.TTS_EavesdropData || window.TTS_EavesdropReady);

        if (eavesdropData && eavesdropData.audio_url) {
            // 路径 1: 全屏沉浸式窃听 (进入阶段 1 确认界面)
            renderCustomEavesdropPrompt($container, eavesdropData, ctx);
        } else {
            // 路径 2: 模态框内历史记录列表 (无数据时正常浏览)
            $('#tts-modal').show();
            EavesdropApp.render($container, createNavbarForApps);
        }
    },
    cleanup() {
        $('#custom-fullscreen-eavesdrop').remove();
        cleanupGlobalPlayer();
        if (EavesdropApp.cleanup) EavesdropApp.cleanup();
    }
};
```

### 5.5 全屏通话与窃听界面设计原则 (拒绝千篇一律，深度契合世界观)

- **严禁无脑照搬**：全屏接听与通话界面不得直接硬套死亡圣器的圆形头像和三段居中布局。
- **世界观深度融合示例**：
  - **仙侠修真**：飞剑插于中央水墨道台，周围环绕金丝灵符，操作按键设计为古朴青玉符牌「引剑纳书 / 归鞘断念」，音频波形为灵脉跳动；
  - **赛博朋克**：战术 HUD 危险警报切角线框、显像管 CRT 扫描线抖动、神经连线方波示波器与芯片插槽；
  - **优雅/少女**：手账信笺拆封立体动效、柔光心动涟漪与落樱共鸣光环。

---

## 6. 子应用内部全景深度定制规范 (Deep App Theming & Sub-view Overrides)

> ⚠️ **核心铁律：严禁只做主页外壳！**
> 主题进入各子 App（剧本工坊、系统设置、收藏夹、主题工坊、对话追踪）后，如果内部依然保留原生的白底表单、方块按钮和浅色导航栏，会导致极其严重的**视觉割裂感**。
> 高品质主题必须在 `modal.css` 中对 `#tts-{theme_id}-modal` 内部的所有原生 App 类名进行全面的暗色/水墨/霓虹深度覆写。

### 6.1 统一导航栏继承 (`createNavbar`)
主题可在 `index.js` 中导出 `createNavbar` 方法（如 `createNavbar: createNavbarForApps`），引擎在渲染所有子 App 时将自动传递主题专属的导航栏构造器，实现顶部「归返 / 标题」风格与世界观 100% 统一。

### 6.2 核心内置子应用类名深度覆写速查表 (Class Override Cheat Sheet)

| 目标子应用 / 组件 | 核心 CSS 选择器 (需加 `#tts-{theme_id}-modal` 前缀) | 深度定制要素 |
| :--- | :--- | :--- |
| **顶部导航栏 (NavBar)** | `.default-navbar`, `.nav-title`, `.nav-left`, `.navbar-btn-back` | 统一背景渐变、金丝/暗色下边框、字体光晕与悬浮微移 |
| **选项卡栏 (Tabs)** | `.ws-tabs-bar`, `.pc-nav-tabs`, `.ed-nav-tabs`, `.fav-tabs`, `.fav-tab` | 消除原生白底，改为半透毛玻璃背景与主题高亮边框 |
| **主题工坊操作键 (Theme Store)**| `.ts-header-actions`, `.ts-btn-upload`, `.ts-btn-import`, `.ts-card` | 彻底消除原生刺眼方块色块，改为契合世界观的药丸玉牌与画卷灵镜 |
| **收藏夹列表项 (Favorites)**| `.fav-item`, `.fav-play-bubble`, `.fav-context-box`, `.fav-download-btn` | 玉简/信笺背景、流光音波气泡与微光操作键 |
| **搜索与输入框 (Inputs)** | `.ws-search-input`, `.pc-search-input`, `.ed-search-input`, `input[type="text"]` | 暗色/水墨半透背景、主题强调色 Focus 发光边框与内阴影 |
| **功能卡片 (Cards)** | `.ws-preset-card`, `.pc-card`, `.ed-card`, `.fav-item`, `.ts-card`, `.tts-card` | 采用主题世界观质感（如玉简、芯片、羊皮纸）、侧边金线与 Hover 浮雕抬升 |
| **卡片操作按钮组 (Buttons)**| `.ws-card-action-btn`, `.ws-action-btn`, `.ts-action-btn`, `.fav-download-btn` | **严禁纯白底方块**！必须覆写为半透深色微发光按键或渐变药丸键 |
| **主操作高亮键 (Primary)** | `.ws-btn-call`, `.ws-btn-create`, `.ws-btn-primary`, `.ts-action-use` | 主题高饱和强调色渐变 + 外发光呼吸效果 |
| **系统设置表单 (Settings)** | `.tts-card-title`, `.tts-input-label`, `.tts-custom-select`, `.select-options` | 统一深色下拉面板、高光滑块与复选框勾选质感 |
| **专属空状态 (Empty States)**| `.pc-empty-state`, `.ed-empty-state`, `.ws-empty-state`, `.fav-empty-state` | **必须全屏居中**（`align-items: center; text-align: center;`），图标放大发光、按钮拟物化 |

### 6.3 专属空状态 (Empty State) 居中排版与主题化规范

各子 App 在无数据时会展示空状态容器（如 `主动电话` / `对话追踪` 的暂无记录提示）。**严禁保留默认偏左、粗糙的方块按键！**
主题必须在 `modal.css` 中将其定制为**水平垂直居中、带微发光呼吸图标与拟物化操作按键**的艺术化界面：

```css
/* 标准空状态居中与主题化范式 */
#tts-{theme_id}-modal .pc-empty-state,
#tts-{theme_id}-modal .ed-empty-state {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    padding: 40px 16px !important;
    margin: auto 0 !important;
    width: 100% !important;
    box-sizing: border-box !important;
}

/* 空状态中央大图标 */
#tts-{theme_id}-modal .pc-empty-state svg,
#tts-{theme_id}-modal .ed-empty-state svg {
    width: 48px !important;
    height: 48px !important;
    color: var(--theme-primary) !important;
    filter: drop-shadow(0 0 14px var(--theme-glow)) !important;
    margin: 0 auto 14px auto !important;
}

/* 空状态拟物化操作按钮 (消灭蓝色默认按钮) */
#tts-{theme_id}-modal .pc-empty-btn,
#tts-{theme_id}-modal .ed-empty-btn {
    background: var(--theme-btn-gradient) !important;
    border: 1px solid var(--theme-accent) !important;
    color: var(--theme-text-light) !important;
    padding: 8px 22px !important;
    border-radius: 20px !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 auto !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
}
```

### 6.4 主题感知沉浸式文案与专属 SVG 图标池规范
> 📍 **核心代码索引**：[frontend/js/themes/theme_status_helper.js](file:///g:/Ai/SillyTavern/data/default-user/extensions/st-direct-tts/frontend/js/themes/theme_status_helper.js)

为了避免死板现代的技术词汇（如“电话”、“正在接通通讯链路”、“立即直拨”）破坏主题沉浸感，系统通过 `theme_status_helper.js` 统一分发各主题专属的拟物化文案与 SVG 视觉：

| 字段名 | 仙途凌霄 (`immortal_sword`) | 死亡圣器 (`deathly_hallows`) | 默认现代通讯 |
| :--- | :--- | :--- | :--- |
| `tabCurrent` | `${STATUS_SVGS.chat} 当下前尘` | `${STATUS_SVGS.chat} 当前对话` | `${STATUS_SVGS.chat} 当前对话` |
| `tabAll` | `${STATUS_SVGS.scroll} 乾坤总录` | `${STATUS_SVGS.history} 总历史` | `${STATUS_SVGS.history} 总历史` |
| `tabDial / tabLaunch` | `${STATUS_SVGS.sword} 祭剑传书 / ${STATUS_SVGS.divineEye} 释放神识` | `${STATUS_SVGS.wand} 魔法传讯 / ${STATUS_SVGS.ear} 伸缩耳探听` | `${STATUS_SVGS.callOut} 主动呼叫 / ${STATUS_SVGS.theater} 开启密谈` |
| `btnIdle` | `${STATUS_SVGS.sword} 祭出飞剑传书` | `${STATUS_SVGS.wand} 施展魔法传讯` | `${STATUS_SVGS.callOut} 立即呼出电话` |
| `emptyIcon` | 仙门飞剑 / 八卦灵印 SVG | 魔法魔杖 / 伸缩耳 SVG | 现代电话 / 耳机 SVG |
| `emptyCurrentTitle` | `当前卷轴暂无飞剑传讯` | `当前对话暂无魔法传讯` | `当前对话暂无通话记录` |
| `emptyBtnText` | `${STATUS_SVGS.scroll} 翻阅乾坤总录` | `${STATUS_SVGS.history} 查看总历史记录` | `${STATUS_SVGS.history} 查看总历史记录` |

> ⚠️ **强制规范**：所有 `tabXxx` 与 `emptyBtnText` 必须使用 `<svg>` 矢量图标（如 `${STATUS_SVGS.scroll}`）与文字组合，**严禁嵌入任何操作系统原生 Emoji 表情**！

#### 外部/导入主题动态注册共有 API
外部导入的主题可通过全局 `window.TTS_ThemeStatusHelper.registerThemeStatusTexts()` 自由注册专属文案：
```javascript
// 在主题 index.js 中注册专属文案 (严禁 Emoji，必须使用 SVG)
if (window.TTS_ThemeStatusHelper) {
    const { STATUS_SVGS } = window.TTS_ThemeStatusHelper;
    window.TTS_ThemeStatusHelper.registerThemeStatusTexts('my_cyber_theme', {
        call: {
            tabCurrent: `${STATUS_SVGS.chat} 链路信道`,
            tabAll: `${STATUS_SVGS.history} 呼叫日志`,
            tabDial: `${STATUS_SVGS.dial} 战术直连`,
            emptyIcon: `<svg viewBox="0 0 24 24">...</svg>`,
            emptyCurrentTitle: '信道中暂无通讯频段',
            emptySub: '点击上方【战术直连】接入神经通讯',
            emptyBtnText: `${STATUS_SVGS.history} 检索全频段日志`
        }
    });
}
```

---

## 7. 剧本工坊与全局全屏弹窗定制 (Workshop Modals)

剧本工坊（新建/编辑剧本、剧本导入、定向呼叫、剧本详情）采用全局全屏遮罩 `.ws-modal-overlay` 挂载，系统会自动附带当前主题类名 `.ws-theme-{your_theme_id}` 与 `.ws-theme-custom`：

1. **专属弹窗深度定制**：在你的 `style.css` (或 `modal.css`) 中声明 `.ws-theme-your_theme_id .ws-modal { ... }` 即可实现 100% 独立的弹窗视觉风格与动画。
2. **优雅保底**：若未编写专属弹窗类，系统会自动通过 `.ws-theme-custom` 读取你的 CSS 根变量（`--theme-bg`, `--theme-text`, `--theme-primary` 等）进行保底渲染。

---

## 8. AI 辅助开发标准工作流 (AI Prompt & Generation)

建议采用**纯文本代码生成模式**，直接将以下标准提示词模板复制到 ChatGPT / Claude / DeepSeek 等大模型中生成，然后在插件界面的「**主题工坊** -> **导入 AI 代码**」中一键粘贴安装即可。

### 7.1 标准 AI 提示词模板 (Prompt Template)

```text
你是一个经验丰富的高级前端开发专家，现在需要为 SillyTavern TTS 插件编写一个完整可用的主题。
你的输出将作为独立代码直接运行，因此必须完整、自洽、不得包含任何占位注释（如"// 此处省略"）。

# 运行环境说明
1. 宿主环境为 SillyTavern 网页端，已全局注入 jQuery ($)。
2. 主题代码以 ES Module 格式动态加载，支持 import / export。
3. 全局对象 window.TTS_ThemeEngine 为引擎实例，window.TTS_Audio 包含音频组件。
4. CSS 样式通过 manifest.json 的 entry_css 自动注入。

# 输出格式规范
请使用 Markdown 格式分别输出每个文件。每个文件的代码块上方必须使用三级标题（###）精确标注文件名：

### manifest.json
```json
{
  "id": "my_cyber_theme",
  "name": "赛博霓虹",
  "version": "1.0.0",
  "author": "AI Architect",
  "description": "具有赛博朋克光效与沉浸式通话的主题",
  "entry_js": "index.js",
  "entry_css": "style.css"
}
```

### index.js
```javascript
export default {
    id: 'my_cyber_theme',
    name: '赛博霓虹',
    init(engine) { /* 注入DOM */ },
    destroy() { /* 清理DOM与事件 */ },
    renderTrigger(engine) { /* 渲染悬浮球 */ },
    destroyTrigger() { /* 移除悬浮球 */ },
    onOpen(engine) { /* 打开面板并用 visualViewport 动态定位 */ },
    onClose(engine) { /* 关闭面板 */ },
    getSceneContainer() { return $('#my_cyber_theme-scene-container'); },
    scenes: {
        home: {
            render($container, ctx) {
                // 遍历 ctx.engine.getRegisteredApps() 渲染 App 图标网格
            }
        },
        incoming_call: {
            render($container, ctx) {
                // 全屏接听/拒接与通话界面，解构 window.TTS_Audio 播放与同步字幕
            }
        },
        eavesdrop: {
            render($container, ctx) {
                // 窃听界面
            }
        }
    }
}
```

### style.css
```css
/* 所有类名必须带有主题 ID 命名空间前缀 */
.my_cyber_theme-fab { ... }
.my_cyber_theme-modal { ... }
```

# 关键技术规范与避坑原则 (SVG-First 美学铁律)
1. **SVG-First 矢量美学框架**：模态框背景严禁使用简陋的纯 CSS div 方块！必须在模态框内嵌入 `<svg>` 矢量框架层（包含渐变遮罩、`<filter>` 滤镜、多边形切角边框、几何符文线、装饰角点与顶部/底部导轨），形成多层透光的现代高级质感。
2. **悬浮球精密复合 SVG**：严禁仅使用简单 emoji 或单层图标。必须构建多层复合 SVG（外圈逆向/顺向旋转符文环、带 `<animate>` 动态发光微节点、双向同心轨迹、中心法阵/核心晶体）。
3. **主菜单艺术化非线性排列**：Home 场景杜绝单调九宫格方块！应采用中央能量轴/光束连线、左右交错排列的艺术化浮动卡片（配合 `@keyframes` 浮动延迟动效与专属线性 SVG 图标）。
4. **全套 Canvas 粒子物理系统**：必须在悬浮球或全屏无缝集成 Canvas 粒子物理系统（光尘、微事件、破空流光），并在 `destroy()` 时彻底释放。
5. **视口计算防溢出**：严禁使用纯 CSS `top:50%/transform:translate(-50%,-50%)`，必须在 `onOpen` 中使用 `visualViewport` 动态计算像素坐标。
6. **悬浮球拖拽**：必须支持 PointerCapture 拖拽并使用 `hasMoved` 标志位精准区分点击与拖拽。
7. **样式隔离**：所有 CSS 类名必须带有主题 ID 专属前缀（如 `.my_theme-xxx`），弹窗支持 `.ws-theme-{theme_id}` 剧本工坊定制。

请根据我的定制需求，直接输出包含上述文件的纯文本 Markdown 代码。
我的主题定制需求是：[在此补充你的主题创意、配色基调与特定动效需求]
```

### 7.2 安装与验证
1. 复制大模型返回的完整回复；
2. 打开 SillyTavern -> 悬浮球展开 -> 进入「**主题工坊** (Theme Store)」；
3. 点击顶部「**导入 AI 代码**」，将大模型回复粘贴到文本框中，点击「**安装主题**」；
4. 系统将自动解析各文件并写入后端，刷新后即可在列表中点击「**应用**」即时生效。

---

## 8. 内置标准主题参考

- **《死亡圣器》(deathly_hallows)**：`frontend/js/themes/deathly_hallows/`（西方奇幻与神秘几何法阵标杆，展示了 3D 空间漂浮透视、多重同心轨道逆旋、多场景拆分、Canvas 粒子物理引擎 `particle_engine.js`、高质量 SVG `assets.js`、状态管理与独立弹窗覆盖）。
- **《仙途凌霄》(immortal_sword)**：`frontend/js/themes/immortal_sword/`（**东方仙侠风骨与 3D 混元法阵标杆**，展示了**拒绝 2D 平面贴纸、采用 3D 工笔白描几何线条法阵**的高阶质感；包含双层反向自转天轨、太极 S 曲线灵气奔流流光 `taiji-flow`、天心本命飞剑破空流芒、玄墨冷玉宋简长卷框架与清冷月白霜华粒子系统）。
- **《极简默认》(default)**：`frontend/js/themes/default/`（默认主题，展示了单文件轻量实现）。

