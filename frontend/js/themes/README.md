# ST-Direct-TTS 主题开发与定制规范指南

本文档为 ST-Direct-TTS 扩展的主题开发权威指南。主题系统采用模块化与场景驱动设计，通过 `ThemeEngine` 统一调度主题的生命周期、面板显隐、场景路由与事件通知。

---

## 1. 目录结构与打包规范

### 1.1 文件目录结构
新建主题可在 `frontend/js/themes/{your_theme_id}/` 下创建独立目录（内置主题），或由用户通过 ZIP / 纯文本导入（外部主题 `data/themes/{your_theme_id}/`）。标准主题结构包含：

```text
your_theme_id/
├── manifest.json       # [必选] 主题元数据声明文件
├── index.js            # [必选] 主题逻辑入口 (ES Module 格式，默认导出主题对象)
├── style.css           # [必选] 主题核心样式表 (包含悬浮球、模态框、各场景样式)
└── assets.js           # [可选] SVG 图标常量或静态数据
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

### 4.2 音频播放与字幕同步 (`window.TTS_Audio`)

主题在播放通话或窃听音频时，必须从 `window.TTS_Audio` 解构使用标准播放器：

```javascript
const { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } = window.TTS_Audio;

// 1. 实例化播放器
const player = new AudioPlayer({
    $container: $callSceneContainer, // 包含字幕 DOM 的容器
    segments: callData.segments,      // 传入字幕分段以启用逐句高亮与同步
    showSpeaker: false,               // 单人来电设为 false，多人窃听可设为 true
    onEnd: () => {
        // 播放正常结束，执行挂断收尾流程
        endCall();
    },
    onError: (err) => {
        console.error('音频播放出错:', err);
        endCall();
    }
});

// 2. 注册为全局活跃播放器（使系统能在切出或关闭时统一管理）
setGlobalPlayer(player);

// 3. 开始播放
player.play(callData.audio_url);

// 4. 结束与挂断流程 (End Call Flow)
function endCall() {
    if (player) {
        player.stop();
        cleanupGlobalPlayer();
    }
    delete window.TTS_IncomingCall;
    delete window.TTS_EavesdropReady;
    delete window.TTS_EavesdropData;
    
    // 通知引擎与恢复主界面
    ctx.engine.notify('call_ended', {});
    ctx.engine.showScene('home');
}
```

### 4.3 字幕容器 DOM 结构规范
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

### 5.1 悬浮球 (FAB) 坐标与拖拽防误触规范

在手机端和不同分辨率屏幕上，必须使用 `visualViewport` 计算安全坐标，并处理 PointerCapture 拖拽防误触：

```javascript
// 1. 初始化安全坐标（右下角）
const vW = window.visualViewport?.width ?? window.innerWidth;
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

### 5.2 模态框居中计算：严禁纯 CSS `translate(-50%, -50%)`

- **问题原因**：手机端浏览器拥有动态顶栏与虚拟键盘，纯 CSS 的 `top: 50%; transform: translate(-50%, -50%)` 当高度超出可视区时会将顶部标题栏和关闭按钮推到屏幕上方不可视区域，导致用户无法关闭或滚动。
- **解决方案**：在 `onOpen(engine)` 钩子中使用 JS 动态计算坐标：

```javascript
onOpen(engine) {
    const $modal = $('#tts-mytheme-modal');
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const modalW = Math.min(380, vw * 0.92);
    const modalH = Math.min(640, vh - 32);
    const top  = (window.visualViewport?.pageTop ?? 0)  + Math.max(16, (vh - modalH) / 2);
    const left = (window.visualViewport?.pageLeft ?? 0) + (vw - modalW) / 2;

    $modal.css({
        top: top + 'px',
        left: left + 'px',
        width: modalW + 'px',
        height: modalH + 'px',
        transform: 'none' // 彻底禁用 CSS transform
    }).fadeIn(200);
}
```

---

## 6. 剧本工坊与全局弹窗样式定制 (Workshop Modals)

剧本工坊（新建/编辑剧本、剧本导入、定向呼叫、剧本详情）采用全局全屏遮罩 `.ws-modal-overlay` 挂载，系统会自动附带当前主题类名 `.ws-theme-{your_theme_id}` 与 `.ws-theme-custom`：

1. **专属弹窗深度定制**：在你的 `style.css` 中声明 `.ws-theme-your_theme_id .ws-modal { ... }` 即可实现 100% 独立的弹窗视觉风格与动画。
2. **优雅保底**：若未编写专属弹窗类，系统会自动通过 `.ws-theme-custom` 读取你的 CSS 根变量（`--theme-bg`, `--theme-text`, `--theme-primary` 等）进行保底渲染。

---

## 7. AI 辅助开发标准工作流 (AI Prompt & Generation)

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

# 关键技术规范与避坑原则
1. 严禁使用纯 CSS top:50%/translate(-50%,-50%) 居中模态框，必须在 onOpen 中使用 visualViewport 动态计算像素坐标。
2. 悬浮球 (FAB) 必须支持拖拽并使用 hasMoved 标志位区分点击与拖拽。
3. Home 场景必须动态读取 ctx.engine.getRegisteredApps() 渲染应用，严禁写死。禁止使用 Emoji 作为图标，必须使用内联 SVG 或 CSS 绘制高质量图标。
4. 来电与窃听场景使用 window.TTS_Audio 的 AudioPlayer，并规范包含 .call-subtitle-area 字幕结构。通话结束必须 delete window.TTS_IncomingCall 并触发 engine.notify('call_ended', {})。
5. 样式必须通过 .my_cyber_theme-xxx 隔离，防止污染宿主环境。

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

- **官方沉浸式主题范例**：`frontend/js/themes/deathly_hallows/`（死亡圣器主题，展示了多场景拆分、粒子动效引擎 `particle_engine.js`、高质量 SVG `assets.js`、状态管理与独立弹窗覆盖）。
- **极简主题范例**：`frontend/js/themes/default/`（默认主题，展示了单文件轻量实现）。
