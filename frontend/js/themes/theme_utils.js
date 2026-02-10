/**
 * 主题工具函数
 *
 * 提供:
 * - Fallback 场景渲染器（主题未实现某场景时的降级 UI）
 * - 通用导航栏组件
 * - 主题校验工具
 */

// ==================== 通用导航栏 ====================

/**
 * 创建通用导航栏
 * @param {string} title - 标题
 * @param {Function} onBack - 返回回调（默认调用 engine.goHome）
 * @returns {jQuery} 导航栏 jQuery 对象
 */
export function createNavbar(title, onBack) {
    const $nav = $(`
        <div class="mobile-app-navbar">
            <div class="nav-left" style="display:flex; align-items:center;">
                <span style="font-size:20px; margin-right:5px;">←</span> 返回
            </div>
            <div class="nav-title">${title}</div>
            <div class="nav-right" style="width:40px;"></div>
        </div>
    `);

    $nav.find('.nav-left').click(() => {
        if (onBack) {
            onBack();
        } else if (window.TTS_ThemeEngine) {
            window.TTS_ThemeEngine.goHome();
        }
    });

    return $nav;
}

// ==================== Fallback 渲染器 ====================

/**
 * 场景名称映射（用于 Fallback UI 的标题）
 */
const SCENE_LABELS = {
    home: '主菜单',
    incoming_call: '来电',
    active_call: '通话中',
    eavesdrop: '对话追踪',
    call_history: '来电记录',
    eavesdrop_history: '对话追踪历史',
    favorites: '收藏夹',
    settings: '系统设置',
};

/**
 * 创建 Fallback 场景渲染器
 * 当主题没有实现某个场景时，引擎使用此渲染器提供基础 UI
 *
 * @param {string} sceneId - 场景 ID
 * @returns {Object} { render(container, ctx) }
 */
export function createFallbackRenderer(sceneId) {
    return {
        render($container, ctx) {
            const label = SCENE_LABELS[sceneId] || sceneId;

            const $content = $(`
                <div style="
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    align-items: center;
                    justify-content: center;
                    color: #888;
                    text-align: center;
                    padding: 20px;
                ">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎭</div>
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">
                        ${label}
                    </div>
                    <div style="font-size: 13px; color: #aaa;">
                        当前主题暂未实现此场景
                    </div>
                </div>
            `);

            $container.append($content);
        }
    };
}

// ==================== 主题校验 ====================

/**
 * 校验主题配置完整性
 * @param {Object} themeConfig - 主题配置
 * @returns {Object} { valid: boolean, warnings: string[] }
 */
export function validateTheme(themeConfig) {
    const warnings = [];

    if (!themeConfig.id) warnings.push('缺少 id');
    if (!themeConfig.name) warnings.push('缺少 name');
    if (!themeConfig.init) warnings.push('缺少 init()');
    if (!themeConfig.destroy) warnings.push('缺少 destroy()');
    if (!themeConfig.renderTrigger) warnings.push('缺少 renderTrigger()');

    // 检查核心场景覆盖率
    const coreScenes = ['home', 'incoming_call', 'eavesdrop'];
    const implementedScenes = themeConfig.scenes ? Object.keys(themeConfig.scenes) : [];
    const missingScenes = coreScenes.filter(s => !implementedScenes.includes(s));

    if (missingScenes.length > 0) {
        warnings.push(`核心场景未实现（将使用 Fallback）: ${missingScenes.join(', ')}`);
    }

    return {
        valid: !warnings.some(w => w.startsWith('缺少')),
        warnings
    };
}
