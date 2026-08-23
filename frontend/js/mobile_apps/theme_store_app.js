import { createNavbar, createFallbackRenderer } from '../themes/theme_utils.js';
import { getAuthHeaders } from './shared/utils.js';

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
            const res = await fetch(`${engine.getApiHost()}/api/themes/${theme.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
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
    let engine = (window.TTS_Libs && window.TTS_Libs.ThemeEngine) || window.TTS_ThemeEngine;
    let ctx = {};

    if (createNavbarOrCtx) {
        if (typeof createNavbarOrCtx === 'function') {
            navbarFn = createNavbarOrCtx;
            if (createNavbarOrCtx.engine) {
                engine = createNavbarOrCtx.engine;
                ctx = createNavbarOrCtx;
            }
        } else if (createNavbarOrCtx.engine) {
            engine = createNavbarOrCtx.engine;
            ctx = createNavbarOrCtx;
        }
        if (createNavbarOrCtx.createNavbar) {
            navbarFn = createNavbarOrCtx.createNavbar;
        }
    }
    if (possibleCtx) {
        if (possibleCtx.engine) engine = possibleCtx.engine;
        ctx = { ...ctx, ...possibleCtx };
    }
    ctx.engine = engine;
    if (!ctx.createNavbar) ctx.createNavbar = navbarFn;

    injectCSS();
    const title = engine && typeof engine.getLabel === 'function' ? engine.getLabel('theme_store', '变幻工坊') : '变幻工坊';
    const navbar = navbarFn(title, () => {
        if (engine) {
            if (typeof engine.goHome === 'function') {
                engine.goHome();
            } else if (typeof engine.showScene === 'function') {
                engine.showScene('home');
            }
        }
    });
    
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
                <!-- [TODO/暂时不考虑] 复制 AI 提示词功能暂时停用，未来视需求再开启
                <button class="ts-btn ts-btn-prompt" id="btn-copy-prompt">复制 AI 提示词</button>
                -->
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
        const registeredThemes = engine && typeof engine.getRegisteredThemes === 'function' ? engine.getRegisteredThemes() : [];
        
        if (registeredThemes.length === 0) {
            $list.append('<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: #aaa;">暂无可用主题</div>');
            return;
        }

        registeredThemes.forEach(theme => {
            if (!theme.type) theme.type = 'builtin';
            renderThemeItem(theme, engine, $list);
        });
    };

    // 立即初始化渲染主题列表
    loadThemes();

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
                headers: getAuthHeaders(),
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
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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

    // [TODO/暂时不考虑] 复制 AI 提示词功能暂时停用，未来视需求再开启
    /*
    $content.find('#btn-copy-prompt').on('click', () => {
        // 提示词生成逻辑可直接参考 frontend/js/themes/README.md
    });
    */

    // 执行加载
    loadThemes();
};
