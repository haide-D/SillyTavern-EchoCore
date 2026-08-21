import { createNavbar, createFallbackRenderer } from '../themes/theme_utils.js';

export const id = 'theme_store';
export const defaultName = '主题工坊';
export const defaultIcon = '🎨';
export const sceneId = 'theme_store';
export const hidden = false;

// 注入样式
const injectCSS = () => {
    if ($('#theme-store-css').length) return;
    const css = `
        .theme-store-container { padding: 16px; color: #fff; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; font-family: sans-serif; overflow-y: auto; }
        .ts-header-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 20px; }
        .ts-btn { padding: 12px 8px; text-align: center; border-radius: 8px; cursor: pointer; font-weight: 600; border: none; color: #fff; transition: all 0.2s; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; }
        .ts-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .ts-btn-upload { background: linear-gradient(135deg, #10b981, #059669); margin: 0; }
        .ts-btn-import { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .ts-btn-prompt { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
        
        .ts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; padding-bottom: 20px; }
        .ts-card { background: rgba(20, 20, 30, 0.7); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; display: flex; flex-direction: column; transition: all 0.3s; position: relative; backdrop-filter: blur(8px); }
        .ts-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.2); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .ts-card.active-theme { border-color: rgba(34, 197, 94, 0.6); box-shadow: 0 0 15px rgba(34, 197, 94, 0.2); }
        .ts-card-cover { height: 100px; width: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
        .ts-active-badge { position: absolute; top: 10px; right: 10px; background: rgba(34, 197, 94, 0.9); color: #fff; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .ts-builtin-badge { position: absolute; top: 10px; left: 10px; background: rgba(0, 0, 0, 0.4); color: rgba(255,255,255,0.8); font-size: 11px; padding: 2px 6px; border-radius: 4px; backdrop-filter: blur(4px); }
        .ts-cover-icon { font-size: 40px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
        
        .ts-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; }
        .ts-card-title { margin: 0 0 4px 0; font-size: 18px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .ts-card-version { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: normal; }
        .ts-card-desc { font-size: 13px; color: rgba(255,255,255,0.6); margin: 0 0 16px 0; line-height: 1.4; flex: 1; }
        
        .ts-card-actions { display: flex; gap: 8px; }
        .ts-action-btn { flex: 1; padding: 8px 0; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; color: #fff; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .ts-action-use { background: rgba(255,255,255,0.1); }
        .ts-action-use:hover { background: rgba(255,255,255,0.2); }
        .ts-action-export { background: rgba(75, 85, 99, 0.5); }
        .ts-action-export:hover { background: rgba(75, 85, 99, 0.8); }
        .ts-action-delete { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
        .ts-action-delete:hover { background: rgba(239, 68, 68, 0.4); color: #fff; }
        
        .ts-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 100000; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
        .ts-modal-overlay.show { opacity: 1; pointer-events: auto; }
        .ts-modal { background: #1e1e24; border-radius: 16px; width: 90%; max-width: 600px; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.5); transform: translateY(20px); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .ts-modal-overlay.show .ts-modal { transform: translateY(0); }
        .ts-modal-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
        .ts-modal-title { margin: 0; font-size: 18px; font-weight: 600; color: #fff; }
        .ts-modal-close { background: none; border: none; color: #aaa; cursor: pointer; font-size: 20px; transition: color 0.2s; }
        .ts-modal-close:hover { color: #fff; }
        .ts-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .ts-textarea { width: 100%; height: 250px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e5e7eb; padding: 12px; font-family: monospace; font-size: 13px; resize: vertical; box-sizing: border-box; }
        .ts-textarea:focus { outline: none; border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
        .ts-modal-footer { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; align-items: center; gap: 12px; }
        .ts-btn-cancel { padding: 10px 16px; background: transparent; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #ccc; cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .ts-btn-cancel:hover { background: rgba(255,255,255,0.05); color: #fff; }
        .ts-btn-confirm { padding: 10px 20px; background: #3b82f6; border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 600; transition: background 0.2s; }
        .ts-btn-confirm:hover { background: #2563eb; }
        .ts-btn-confirm:disabled { background: #4b5563; cursor: not-allowed; color: #9ca3af; }
        .ts-status-text { flex: 1; font-size: 13px; color: #aaa; margin: 0; }
    `;
    $('head').append(`<style id="theme-store-css">${css}</style>`);
};

// 简单的 hash 函数生成封面颜色
const hashColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${h}, 40%, 30%), hsl(${(h + 40) % 360}, 50%, 15%))`;
};

// 渲染主题列表项
function renderThemeItem(theme, engine, $container) {
    const isCurrent = engine.getCurrentTheme()?.id === theme.id;
    const isBuiltin = !theme.type || theme.type === 'builtin';
    const bg = hashColor(theme.id || 'default');
    const defaultCoverSvg = `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 4.42 3.58 8 8 8 1 0 1.5-.5 1.5-1.2 0-.4-.2-.8-.2-1.3 0-1.7 1.3-3 3-3h1.7c3.3 0 6-2.7 6-6 0-3.6-4.5-6.5-10-6.5z"/><circle cx="6.5" cy="8.5" r="1" fill="currentColor"/><circle cx="10" cy="5.5" r="1" fill="currentColor"/><circle cx="6.5" cy="13" r="1" fill="currentColor"/><path d="M16 16l5-5M19.5 9.5l1.5 1.5M14 18l1.5-1.5"/></svg>`;
    
    const $item = $(`
        <div class="ts-card ${isCurrent ? 'active-theme' : ''}">
            <div class="ts-card-cover" style="background: ${bg}">
                ${isCurrent ? '<div class="ts-active-badge">Active</div>' : ''}
                <div class="ts-builtin-badge">${isBuiltin ? '内置' : '外部导入'}</div>
                <div class="ts-cover-icon">${theme.iconSvg || defaultCoverSvg}</div>
            </div>
            <div class="ts-card-body">
                <h3 class="ts-card-title">
                    ${theme.name || theme.id}
                    <span class="ts-card-version">v${theme.version || '1.0'}</span>
                </h3>
                <p class="ts-card-desc">${theme.description || '无描述'}</p>
                <div class="ts-card-actions">
                    ${!isCurrent ? `<button class="ts-action-btn ts-action-use">应用</button>` : ''}
                    ${!isBuiltin ? `<button class="ts-action-btn ts-action-export" title="导出">导出</button>` : ''}
                    ${!isBuiltin ? `<button class="ts-action-btn ts-action-delete" title="删除">删除</button>` : ''}
                </div>
            </div>
        </div>
    `);

    $item.find('.ts-action-use').on('click', () => {
        engine.switchTheme(theme.id);
        engine.showScene('theme_store'); // Refresh
    });

    $item.find('.ts-action-export').on('click', () => {
        const url = `${engine.getApiHost()}/api/themes/export/${theme.id}`;
        window.open(url, '_blank');
    });

    $item.find('.ts-action-delete').on('click', async () => {
        if (!confirm(`确定要删除主题 "${theme.name}" 吗？`)) return;
        try {
            const res = await fetch(`${engine.getApiHost()}/api/themes/${theme.id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('删除成功，即将刷新。');
                location.reload();
            } else {
                alert('删除失败');
            }
        } catch (e) {
            console.error(e);
            alert('删除发生错误');
        }
    });

    $container.append($item);
}

export const render = function ($container, createNavbarOrCtx, possibleCtx) {
    let navbarFn = createNavbar;
    let ctx = possibleCtx || {};
    if (typeof createNavbarOrCtx === 'function') {
        navbarFn = createNavbarOrCtx;
    } else if (createNavbarOrCtx && createNavbarOrCtx.createNavbar) {
        navbarFn = createNavbarOrCtx.createNavbar;
        ctx = createNavbarOrCtx;
    } else if (createNavbarOrCtx && createNavbarOrCtx.engine) {
        ctx = createNavbarOrCtx;
    }
    if (ctx.createNavbar) navbarFn = ctx.createNavbar;

    injectCSS();
    const title = ctx.engine && typeof ctx.engine.getLabel === 'function' ? ctx.engine.getLabel('theme_store', '变幻工坊') : '变幻工坊';
    const navbar = navbarFn(title, () => ctx.engine ? ctx.engine.showScene('home') : null);
    
    // AI Import Modal DOM
    const $importModal = $(`
        <div class="ts-modal-overlay" id="ts-import-modal">
            <div class="ts-modal">
                <div class="ts-modal-header">
                    <h3 class="ts-modal-title">导入 AI 生成的主题代码</h3>
                    <button class="ts-modal-close">&times;</button>
                </div>
                <div class="ts-modal-body">
                    <p style="margin:0; font-size:13px; color:#aaa;">请将大模型生成的包含文件名的 Markdown 代码块完整粘贴至下方：</p>
                    <textarea class="ts-textarea" placeholder="### manifest.json\n\`\`\`json\n...\n\`\`\`"></textarea>
                </div>
                <div class="ts-modal-footer">
                    <p class="ts-status-text" id="ts-import-status"></p>
                    <button class="ts-btn-cancel">取消</button>
                    <button class="ts-btn-confirm">安装主题</button>
                </div>
            </div>
        </div>
    `);

    const $content = $(`
        <div class="theme-store-container">
            <div class="ts-header-actions">
                <label class="ts-btn ts-btn-upload">
                    上传主题 (ZIP)
                    <input type="file" id="theme-upload-input" accept=".zip,.sttheme" style="display:none;">
                </label>
                <button class="ts-btn ts-btn-import" id="btn-import-ai">导入 AI 代码</button>
                <button class="ts-btn ts-btn-prompt" id="btn-copy-prompt">复制 AI 提示词</button>
            </div>
            <div class="ts-grid" id="theme-list-container">
                <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #aaa;">加载中...</div>
            </div>
        </div>
    `);

    // Append everything
    $container.empty().append(navbar).append($content).append($importModal);

    // 获取并渲染主题列表
    const loadThemes = () => {
        const $list = $content.find('#theme-list-container').empty();
        const registeredThemes = ctx.engine.getRegisteredThemes ? ctx.engine.getRegisteredThemes() : [];
        
        if (registeredThemes.length === 0) {
            $list.append('<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #aaa;">暂无主题</div>');
            return;
        }

        registeredThemes.forEach(theme => {
            if (!theme.type) theme.type = 'builtin';
            renderThemeItem(theme, ctx.engine, $list);
        });
    };

    // 绑定上传
    $content.find('#theme-upload-input').on('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            $content.find('#theme-list-container').html('<div style="grid-column:1/-1; text-align:center; padding: 20px; color: #aaa;">正在安装...</div>');
            const res = await fetch(`${ctx.engine.getApiHost()}/api/themes/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (res.ok) {
                alert('主题安装成功，即将刷新页面加载新主题。');
                location.reload();
            } else {
                const data = await res.json();
                alert(`安装失败: ${data.detail || '未知错误'}`);
                loadThemes();
            }
        } catch (err) {
            console.error(err);
            alert('上传发生错误');
            loadThemes();
        }
    });

    // Modal Events
    const closeModal = () => {
        $importModal.removeClass('show');
        $importModal.find('.ts-textarea').val('');
        $importModal.find('#ts-import-status').text('');
    };

    $content.find('#btn-import-ai').on('click', () => $importModal.addClass('show'));
    $importModal.find('.ts-modal-close, .ts-btn-cancel').on('click', closeModal);
    $importModal.on('click', (e) => {
        if ($(e.target).is('.ts-modal-overlay')) closeModal();
    });

    // 绑定导入 AI 代码 (Modal)
    $importModal.find('.ts-btn-confirm').on('click', async () => {
        const text = $importModal.find('.ts-textarea').val();
        if (!text.trim()) return;
        
        const $status = $importModal.find('#ts-import-status');
        const $btn = $importModal.find('.ts-btn-confirm');
        
        $status.text('正在解析代码...');
        $btn.prop('disabled', true);
        
        // 正则提取 ### 文件名\n```[lang]\n[内容]\n```
        const regex = /(?:###|##|\*\*)\s*([a-zA-Z0-9_\-\.\/]+)\s*[\r\n]+```[a-zA-Z]*\s*([\s\S]*?)```/g;
        let match;
        const files = {};
        while ((match = regex.exec(text)) !== null) {
            const filename = match[1].trim();
            const content = match[2].trim();
            files[filename] = content;
        }
        
        if (!files['manifest.json']) {
            $status.text('解析失败：未找到 manifest.json').css('color', '#ef4444');
            $btn.prop('disabled', false);
            return;
        }
        
        $status.text(`解析成功，找到 ${Object.keys(files).length} 个文件。正在安装...`).css('color', '#10b981');
        
        try {
            const res = await fetch(`${ctx.engine.getApiHost()}/api/themes/install_text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files })
            });
            
            if (res.ok) {
                $status.text('安装成功！即将刷新...');
                setTimeout(() => location.reload(), 800);
            } else {
                const data = await res.json();
                $status.text(`安装失败: ${data.detail || '未知错误'}`).css('color', '#ef4444');
                $btn.prop('disabled', false);
            }
        } catch (err) {
            console.error(err);
            $status.text('请求失败，请检查控制台').css('color', '#ef4444');
            $btn.prop('disabled', false);
        }
    });

    // 绑定复制 AI 提示词
    $content.find('#btn-copy-prompt').on('click', () => {
        const apps = ctx.engine.getRegisteredApps ? ctx.engine.getRegisteredApps() : [];
        const appListText = apps.map(a =>
            `  - id: '${a.id}', 默认名称: '${a.defaultName}', sceneId: '${a.sceneId}', hidden: ${a.hidden}`
        ).join('\n');

        // ── 1. 角色定位 ──────────────────────────────────────────
        const PROMPT_SYSTEM_ROLE = `你是一个经验丰富的高级前端开发专家，现在需要为 SillyTavern TTS 插件编写一个完整可用的主题插件。
你的输出将作为独立代码直接运行，因此必须完整、自洽、不依赖任何外部文档。
本提示词已包含你需要知道的所有接口、数据结构与约束，请仔细阅读后按规范实现。`;

        // ── 2. 运行环境说明 ──────────────────────────────────────
        const PROMPT_ENVIRONMENT = `# 运行环境说明
- 宿主页面：SillyTavern（浏览器端），已全局注入 **jQuery**（可直接使用 \`$\`）。
- 主题代码以 **ES Module** 格式由浏览器动态 \`import()\` 加载，支持 \`import\` / \`export\`。
- 全局变量 \`window.TTS_ThemeEngine\` 是引擎单例，可在任何地方访问。
- 主题的 CSS 由引擎通过 \`<link>\` 标签自动注入（你只需在 manifest 声明 entry_css 即可）。`;

        // ── 3. 文件结构与输出格式 ────────────────────────────────
        const PROMPT_ARCHITECTURE = `# 文件结构与输出格式规范
1. 必须输出以下核心文件：\`manifest.json\`、\`index.js\`、\`style.css\`。如有大量 SVG 常量，请独立为 \`assets.js\` 并 import。
2. 每个文件单独一个代码块，代码块上方用三级标题（\`###\`）精确标注文件名：

### manifest.json
\`\`\`json
{
  "id": "your_theme_id",
  "name": "主题名称",
  "version": "1.0.0",
  "entry_js": "index.js",
  "entry_css": "style.css"
}
\`\`\`

3. 必须输出完整代码，绝不能用注释省略（如"// 此处省略"、"// 同上"等）。
4. **跨场景共享函数**：scenes 内的 render 函数若需复用逻辑，请将共享函数定义在 \`index.js\` 顶层（\`export default\` 外部），然后直接调用，不要挂载在 engine 或 this 上，避免 \`Cannot read properties of undefined\` 报错。`;

        // ── 4. 完整 Engine API 参考 ──────────────────────────────
        const PROMPT_ENGINE_API = `# ThemeEngine API 完整参考
主题在 \`index.js\` 中可使用 \`engine\` 参数（由引擎传入）或全局 \`window.TTS_ThemeEngine\` 访问以下方法：

## 面板控制
- \`engine.open()\` — 打开主面板（调用主题的 onOpen，然后自动跳到 home 场景）
- \`engine.close()\` — 关闭主面板（调用当前场景 cleanup，然后调用主题的 onClose）
- \`engine.toggle()\` — 智能切换：若有来电/窃听数据则优先打开对应页面，否则 open/close
- \`engine.isOpen()\` — 返回 boolean，面板是否打开

## 场景路由
- \`engine.showScene(sceneId)\` — 切换到指定场景（自动 empty 容器并调用场景 render）
- \`engine.goHome()\` — 快捷跳回 home 场景
- \`engine.getCurrentScene()\` — 返回当前场景 ID 字符串

## App 注册表
- \`engine.getRegisteredApps()\` — 返回 Array<{id, defaultName, defaultIcon, sceneId, hidden}>
  - home 场景必须遍历此列表动态渲染 App 图标，不得硬编码

## 主题工具
- \`engine.getLabel(key, fallback)\` — 获取当前主题对 key 的文案覆盖（如无覆盖返回 fallback）
- \`engine.getApiHost()\` — 返回后端 API 地址字符串（如 'http://localhost:7771'）

## 通知
- \`engine.notify(type, data)\` — 向主题分发通知（主要用于主题内部调用，如结束通话时通知引擎）
  - 常用：\`engine.notify('call_ended', {})\` 通知引擎通话结束

## 场景上下文 ctx
- 场景 render 函数签名：\`render($container, ctx)\`
- \`ctx.engine\` — ThemeEngine 实例
- \`ctx.data\` — 场景数据（showScene 的第二参数，通常为空对象）
- \`ctx.createNavbar(title, onBack)\` — 创建通用导航栏 jQuery 对象`;

        // ── 5. 主题对象接口 ──────────────────────────────────────
        const PROMPT_THEME_INTERFACE = `# index.js 主题对象完整接口
export default {
    id: 'your_theme_id',   // 必须与 manifest.json 的 id 一致
    name: '主题名称',

    // ① 初始化：在 body 中注入所有主题 DOM（模态框结构 + 场景挂载点）。此时悬浮球尚未渲染。
    init(engine) { },

    // ② 销毁：移除所有注入的 DOM 和全局事件监听器，停止动画循环
    destroy() { },

    // ③ 渲染悬浮球(FAB)：在 body 中注入悬浮球 DOM，绑定拖拽与点击逻辑
    renderTrigger(engine) { },

    // ④ 销毁悬浮球：移除悬浮球 DOM
    destroyTrigger() { },

    // ⑤ 面板开启钩子：做入场动画，校准位置等
    onOpen(engine) { },

    // ⑥ 面板关闭钩子：做退场动画，重置悬浮球状态等
    onClose(engine) { },

    // ⑦ 【必须实现】提供场景挂载点：返回一个 jQuery 对象，引擎会把各场景内容 empty 后渲染进去
    getSceneContainer() {
        return $('#your-scene-container');
    },

    // ⑧ 文案覆盖（可选）：return 字符串覆盖指定 key 的 UI 文案，return null 使用默认值
    getLabel(key) {
        // key 可能的值：'settings', 'favorites', 'theme_store', 'incoming_call', 'eavesdrop', 'phone_call', 'llm_test'
        return null;
    },

    // ⑨ 通知监听：引擎分发事件时调用，return true 拦截默认弹窗，return false 走默认行为
    onNotification(type, data, engine) {
        // type 值: 'incoming_call' | 'eavesdrop_ready' | 'call_ended'
        if (type === 'incoming_call' || type === 'eavesdrop_ready') {
            // 在此改变悬浮球状态，存储 data 备用
            return true;
        }
        return false;
    },

    scenes: {
        // 核心场景（必须实现）
        home: { render($container, ctx) { }, cleanup() { } },
        incoming_call: { render($container, ctx) { }, cleanup() { } },
        eavesdrop: { render($container, ctx) { }, cleanup() { } },
        // 可选覆盖（否则引擎使用内置 App 渲染）
        // settings, favorites, theme_store, phone_call, llm_test
    }
}`;

        // ── 6. 全局数据结构 ──────────────────────────────────────
        const PROMPT_DATA_SCHEMAS = `# 全局状态数据结构
## 来电数据：window.TTS_IncomingCall
当引擎触发 incoming_call 通知时，该全局变量即可用。
\`\`\`javascript
window.TTS_IncomingCall = {
    char_name: "角色名",         // 来电方名称
    avatar_url: "url_or_null",   // 头像 URL（可为 null，需兜底）
    audio_url: "...",            // 音频文件 URL（传给 AudioPlayer）
    call_id: "uuid",             // 通话唯一 ID
    segments: [                  // 字幕段落数据
        {
            text: "你好",
            speaker: "角色名",
            start_time: 0,       // 相对音频开始时间（秒）
            audio_duration: 2.5  // 本段时长（秒）
        }
    ]
}
\`\`\`

## 窃听数据：window.TTS_EavesdropReady / window.TTS_EavesdropData
\`\`\`javascript
window.TTS_EavesdropReady = {
    speakers: ["神秘人", "另一人"],     // 说话者名称列表
    notification_text: "听到了什么...", // 通知文案
    audio_url: "...",                   // 音频文件 URL
    segments: [ /* 同上格式 */ ]
}
\`\`\`

**重要**：在 incoming_call / eavesdrop 场景的 render 中，通过读取以上全局变量获取数据。
通话/窃听结束时，必须执行：
\`\`\`javascript
delete window.TTS_IncomingCall;   // 或 delete window.TTS_EavesdropReady / TTS_EavesdropData
engine.notify('call_ended', {});
engine.showScene('home');
\`\`\``;

        // ── 7. 音频播放器 ────────────────────────────────────────
        const PROMPT_AUDIO_PLAYER = `# 音频播放（AudioPlayer 模块）
实现通话/窃听播放时，请使用内置共享音频播放器模块，它负责播放、进度更新与字幕同步。

**重要规则**：由于外部主题通过网络动态加载，绝对禁止使用 \`import\` 导入本地路径的播放器。引擎已在全局挂载了音频组件，请直接从 \`window.TTS_Audio\` 解构使用：

\`\`\`javascript
const { AudioPlayer, setGlobalPlayer, cleanupGlobalPlayer } = window.TTS_Audio;

const player = new AudioPlayer({
    $container: $yourCallContainer,   // 包含字幕区域的 jQuery 容器
    segments: callData.segments,      // 传入 segments 数组以启用字幕同步
    showSpeaker: false,               // 是否显示说话人名称
    onEnd: () => { /* 播放结束后调用 endCall() */ },
    onError: (err) => { /* 错误处理后调用 endCall() */ }
});
setGlobalPlayer(player);             // 注册为全局，确保引擎可统一管理
player.play(callData.audio_url);     // 开始播放

// 结束时：
player.stop();
cleanupGlobalPlayer();
\`\`\`

字幕自动同步依赖 container 内存在特定的 DOM 结构。请直接在你的 HTML 中原样包含以下字幕结构：

\`\`\`html
<!-- 字幕区域 (来电用 call-subtitle-area，窃听用 listening-subtitle-area) -->
<div class="call-subtitle-area">
    <div class="subtitle-line">
        <span class="subtitle-speaker" style="display:none;"></span>
        <span class="subtitle-text"></span>
    </div>
</div>

<!-- 进度条与时间显示（可选但推荐） -->
<div class="progress-bar-fill"></div>
<span class="current-time">00:00</span> / <span class="total-time">00:00</span>
<span class="call-duration">00:00</span>
\`\`\``;

        // ── 8. 悬浮球设计规范 ────────────────────────────────────
        const PROMPT_FLOATING_BALL = `# UI 悬浮球 (FAB) 创作规范
## 位置初始化
使用 visualViewport 计算右下角安全坐标：
\`\`\`javascript
const vW = window.visualViewport?.width ?? window.innerWidth;
const vH = window.visualViewport?.height ?? window.innerHeight;
const btnSize = 60; // 悬浮球尺寸
trigger.style.left = Math.min(vW - btnSize - 16, vW * 0.8) + 'px';
trigger.style.top  = Math.min(vH - btnSize - 24, vH * 0.85) + 'px';
\`\`\`

## 拖拽与点击防冲突（必须实现 hasMoved 标志位）
\`\`\`javascript
let isDragging = false, hasMoved = false, startX, startY, initLeft, initTop;
trigger.addEventListener('pointerdown', e => {
    isDragging = true; hasMoved = false;
    startX = e.clientX; startY = e.clientY;
    initLeft = parseInt(trigger.style.left); initTop = parseInt(trigger.style.top);
    trigger.setPointerCapture(e.pointerId);
});
trigger.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
    if (hasMoved) { trigger.style.left = (initLeft + dx) + 'px'; trigger.style.top = (initTop + dy) + 'px'; }
});
trigger.addEventListener('pointerup', e => {
    isDragging = false;
    trigger.releasePointerCapture(e.pointerId);
    if (!hasMoved) { /* 执行点击逻辑 */ }
});
\`\`\`

## 三种视觉状态
1. **待机**：符合主题的静止动画（呼吸/微光/旋转等 CSS keyframes）
2. **通知激活**：收到来电/窃听后强烈特效（急速闪烁、波纹扩散、颜色切换），并应显示悬浮通知气泡
3. **点击后**：带入场动画过渡到"接听选择页面"（不能直接生硬切换）`;

        // ── 9. 来电/窃听页面规范 ─────────────────────────────────
        const PROMPT_CALL_UI = `# 来电与窃听页面规范
## 完整流程
收到通知 → 悬浮球变为激活态 → 用户点击悬浮球 → 展示"接听/拒绝选择页面" → 用户接听 → 进入通话/窃听界面 → 音频播放结束或挂断 → 清理并回 home

## 接听选择页面
- 展示来电方名称、头像（若 avatar_url 为 null 需用 SVG 占位）
- 包含接听和拒绝两个按钮，带明显的视觉动画特效
- 拒绝：直接 \`engine.close()\`，清除全局来电变量

## 接通后通话界面（全屏沉浸式）
- **此界面必须全屏或高度沉浸**，用 \`position: fixed; inset: 0; z-index: 999999\` 覆盖全屏
- 包含：角色名/头像、波形动画、字幕区（class 参见 AudioPlayer 节）、挂断按钮
- 波形动画建议用 CSS animation 驱动多个竖条高度变化，营造音频律动感
- 挂断时执行完整结束流程（见"全局状态数据结构"节末尾）

## 窃听复用逻辑
窃听（eavesdrop）与来电（incoming_call）界面结构完全相同，仅颜色/文案不同。
将渲染逻辑封装为顶层函数，通过参数 \`mode: 'call' | 'eavesdrop'\` 区分：
\`\`\`javascript
// 顶层函数，在 export default 外部定义
function renderCallScreen($container, data, mode, ctx) {
    const isCall = mode === 'call';
    const accentColor = isCall ? '#f0c040' : '#9b59b6'; // 金色 vs 紫色
    const title = isCall ? '来电' : '截获的信号';
    // ... 构建 DOM ...
}
\`\`\``;

        // ── 10. Home 页面规范 ─────────────────────────────────────
        const PROMPT_HOME_APP_UI = `# Home 页面与 App 图标规范
## 动态 App 列表
必须遍历 \`ctx.engine.getRegisteredApps()\`，不得硬编码 App 列表：
\`\`\`javascript
const apps = ctx.engine.getRegisteredApps().filter(a => !a.hidden);
apps.forEach(app => {
    const name = ctx.engine.getLabel(app.id) || app.defaultName;
    // 使用 app.id 匹配已知图标；对未知 App 生成风格一致的默认 SVG 占位图标
    const iconSvg = YOUR_ICON_MAP[app.id] || generateDefaultSvgIcon(app.defaultName);
    // 点击：ctx.engine.showScene(app.sceneId)
});
\`\`\`

## 图标规范
- **绝对禁止**使用 Emoji 作为图标（包括 app.defaultIcon 字段的 Emoji）
- 必须使用内联 SVG 或纯 CSS 绘制的高质量图标，风格须与主题一致
- 对完全未知的 App，可通过取名称首字母生成风格化 SVG 文字图标作为兜底

## 视觉设计
- Home 主界面需要有强烈的设计感和沉浸感，契合主题氛围
- 推荐使用网格布局（CSS Grid）排列 App 图标，响应式兼容不同屏幕尺寸
- App 卡片点击需有过渡动画（如缩放/发光/波纹等）`;

        // ── 11. CSS 与样式隔离 ────────────────────────────────────
        const PROMPT_CSS_RULES = `# CSS 与样式隔离规范
1. **命名空间**：所有 CSS 类名必须加主题 ID 前缀（如 \`.cyberpunk_neon_edge-modal\`），防止污染 SillyTavern 全局样式。
2. **全屏层级**：来电/窃听全屏特效使用 \`position: fixed; inset: 0; z-index: 999999\`，确保覆盖所有元素。
3. **移动端模态框**：主面板若为弹窗形式，禁用纯 CSS 居中（\`top:50%; transform:translate(-50%,-50%)\`）。改为在 \`onOpen\` 钩子里用 JS 动态计算：
\`\`\`javascript
const vw = window.visualViewport?.width ?? window.innerWidth;
const vh = window.visualViewport?.height ?? window.innerHeight;
const w = Math.min(380, vw * 0.92);
const h = Math.min(650, vh - 40);
const top  = (window.visualViewport?.pageTop ?? 0)  + Math.max(20, (vh - h) / 2);
const left = (window.visualViewport?.pageLeft ?? 0) + (vw - w) / 2;
$modal.css({ top, left, width: w, height: h, transform: 'none' });
\`\`\`
4. **事件清理**：在 \`destroy()\` 或 \`cleanup()\` 中必须移除所有 \`document\`/\`window\` 级别的事件监听器。`;

        // ── 12. App 列表（动态生成）──────────────────────────────
        const PROMPT_APP_LIST = `# 当前系统已注册的 App 列表
以下是运行时动态获取的 App 信息，home 场景应优先为这些已知 App 设计专属 SVG 图标：
${appListText}
对于列表以外的未来新增 App，必须能优雅兼容（生成风格一致的默认图标）。`;

        // ── 13. 任务 ─────────────────────────────────────────────
        const PROMPT_TASK = `# 任务说明
请根据我补充的定制需求，完整输出所有主题文件（Markdown 标题 + 代码块格式，纯文本，不要打包）。
代码必须功能完整、可直接运行，不得有任何占位注释。

我的主题定制需求是：`;

        // 组装
        const promptText = [
            PROMPT_SYSTEM_ROLE,
            PROMPT_ENVIRONMENT,
            PROMPT_ARCHITECTURE,
            PROMPT_ENGINE_API,
            PROMPT_THEME_INTERFACE,
            PROMPT_DATA_SCHEMAS,
            PROMPT_AUDIO_PLAYER,
            PROMPT_FLOATING_BALL,
            PROMPT_CALL_UI,
            PROMPT_HOME_APP_UI,
            PROMPT_CSS_RULES,
            PROMPT_APP_LIST,
            PROMPT_TASK
        ].join('\n\n---\n\n');

        navigator.clipboard.writeText(promptText).then(() => {
            alert('已复制 AI 提示词！将它粘贴给大模型并补充创意需求即可。');
        }).catch(err => {
            console.error('复制失败:', err);
            prompt("复制失败，请手动复制:", promptText);
        });
    });

    // 执行加载
    loadThemes();
};
