/**
 * 主题管理器 (ThemeManager)
 * 
 * 统一管理待机态 UI 主题的注册、切换和 API 代理。
 * 所有外部模块通过 themeManager.xxx() 调用，不直接引用具体主题。
 * 
 * 主题接口规范（每个主题必须实现）:
 *   init(options)              - 初始化，options.onClick 为点击回调
 *   show()                     - 显示待机元素
 *   hide()                     - 隐藏待机元素
 *   setIncomingCall(active)    - 来电状态视觉反馈
 *   setEavesdropAvailable(active) - 低语感应视觉反馈
 *   destroy()                  - 销毁并清理 DOM
 */

const STORAGE_KEY = 'tts_idle_theme';
const DEFAULT_THEME = 'default';

class ThemeManager {
    constructor() {
        /** @type {Map<string, {module: object, cssUrl?: string}>} */
        this._registry = new Map();
        /** @type {object|null} 当前激活的主题实例 */
        this._current = null;
        /** @type {string} 当前主题名 */
        this._currentName = '';
        /** @type {object} 传给 init 的选项（切换时需重新传入） */
        this._initOptions = {};
    }

    // ==================== 注册 ====================

    /**
     * 注册一个主题
     * @param {string} name - 主题标识 (如 'default', 'harry_potter')
     * @param {object} themeModule - 主题模块，需有 init/show/hide/setIncomingCall/setEavesdropAvailable/destroy
     * @param {object} [meta] - 元信息
     * @param {string} [meta.label] - 显示名称
     * @param {string} [meta.cssUrl] - 主题 CSS URL（按需加载）
     */
    register(name, themeModule, meta = {}) {
        this._registry.set(name, {
            module: themeModule,
            label: meta.label || name,
            cssUrl: meta.cssUrl || null,
            cssLoaded: false
        });
        console.log(`🎨 [ThemeManager] 已注册主题: ${name} (${meta.label || name})`);
    }

    // ==================== 获取信息 ====================

    /** 获取所有已注册主题 [{name, label}] */
    getThemes() {
        const list = [];
        for (const [name, entry] of this._registry) {
            list.push({ name, label: entry.label });
        }
        return list;
    }

    /** 获取当前激活主题名 */
    getCurrentThemeName() {
        return this._currentName;
    }

    /** 获取持久化存储的主题名（或默认值） */
    getSavedThemeName() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    }

    // ==================== 初始化 & 切换 ====================

    /**
     * 初始化主题管理器，读取 localStorage 并激活主题
     * @param {object} options - 传给主题 init 的选项
     */
    init(options = {}) {
        this._initOptions = options;
        const savedName = this.getSavedThemeName();
        const targetName = this._registry.has(savedName) ? savedName : DEFAULT_THEME;
        this._activateTheme(targetName);
    }

    /**
     * 切换主题
     * @param {string} name - 目标主题名
     */
    async setTheme(name) {
        if (!this._registry.has(name)) {
            console.warn(`[ThemeManager] 主题 "${name}" 未注册`);
            return;
        }
        if (name === this._currentName) return;

        // 销毁当前
        if (this._current && this._current.destroy) {
            this._current.destroy();
        }

        // 持久化
        localStorage.setItem(STORAGE_KEY, name);

        // 激活新主题
        await this._activateTheme(name);
        console.log(`🎨 [ThemeManager] 已切换到主题: ${name}`);
    }

    /** @private */
    async _activateTheme(name) {
        const entry = this._registry.get(name);
        if (!entry) {
            console.error(`[ThemeManager] 无法找到主题: ${name}`);
            return;
        }

        // 按需加载 CSS
        if (entry.cssUrl && !entry.cssLoaded) {
            await this._loadCSS(name, entry.cssUrl);
            entry.cssLoaded = true;
        }

        this._current = entry.module;
        this._currentName = name;

        if (this._current.init) {
            this._current.init(this._initOptions);
        }
    }

    /** @private 动态加载主题 CSS */
    async _loadCSS(name, url) {
        const styleId = `tts-theme-css-${name}`;
        if (document.getElementById(styleId)) return;

        try {
            const resp = await fetch(url);
            const cssText = await resp.text();
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = cssText;
            document.head.appendChild(style);
            console.log(`✨ [ThemeManager] 主题 CSS 已加载: ${name}`);
        } catch (err) {
            console.error(`[ThemeManager] 加载主题 CSS 失败 (${name}):`, err);
        }
    }

    // ==================== 代理 API ====================
    // 所有外部模块通过这些方法操作当前主题

    show() {
        if (this._current?.show) this._current.show();
    }

    hide() {
        if (this._current?.hide) this._current.hide();
    }

    setIncomingCall(active) {
        if (this._current?.setIncomingCall) this._current.setIncomingCall(active);
    }

    setEavesdropAvailable(active) {
        if (this._current?.setEavesdropAvailable) this._current.setEavesdropAvailable(active);
    }

    destroy() {
        if (this._current?.destroy) this._current.destroy();
        this._current = null;
        this._currentName = '';
    }
}

export const themeManager = new ThemeManager();
