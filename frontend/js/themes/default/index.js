import { state } from './state.js';
import { scenes } from './scenes.js';
import * as ui from './ui.js';
import * as PhoneCallApp from '../../mobile_apps/phone_call_app.js';

const DefaultTheme = {
    id: 'default',
    name: '📱 经典手机',
    description: '模拟手机界面，经典体验',
    version: '1.0.1',

    // ===== 生命周期 =====
    init(engine) {
        state.engine = engine;
        ui.renderShell();
        ui.bindShellEvents();
        ui.fixMobilePosition();

        // 添加 viewport meta（兼容）
        if ($('meta[name="viewport"]').length === 0) {
            $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">');
        }

        console.log('[DefaultTheme] ✅ 初始化完成');
    },

    destroy() {
        // 解绑事件
        $(document).off('.defaultTheme');
        ui.destroyShell();
        state.engine = null;
        console.log('[DefaultTheme] 已销毁');
    },

    // ===== 触发器 =====
    renderTrigger() {
        ui.bindDragEvents();
    },

    destroyTrigger() {
        $('#tts-mobile-trigger').remove();
    },

    // ===== 面板开关 =====
    onOpen(engine) {
        $('#tts-mobile-root').removeClass('minimized');
        $('#tts-mobile-trigger').fadeOut();
    },

    onClose(engine) {
        // 清理主动电话 App 资源
        if (PhoneCallApp.cleanup) {
            PhoneCallApp.cleanup();
        }
        $('#tts-mobile-root').addClass('minimized');
        $('#tts-mobile-trigger').fadeIn();
    },

    // ===== 场景容器 =====
    getSceneContainer() {
        return $('#mobile-screen-content');
    },

    // ===== 场景注册表 =====
    scenes: scenes,

    // ===== 通知处理 =====
    onNotification(type, data, engine) {
        switch (type) {
            case 'incoming_call':
                ui.triggerFloatingBallAnimation('incoming-call', `${data.char_name || '未知'} 来电中...`);
                return true;

            case 'eavesdrop_ready':
                ui.triggerFloatingBallAnimation('eavesdrop-available',
                    data.notification_text || `${(data.speakers || []).join(' 和 ')} 正在私聊...`);
                return true;

            case 'call_ended':
                // 移除动画类
                $('#tts-mobile-trigger').removeClass('incoming-call eavesdrop-available');
                $('#tts-manager-btn').removeClass('incoming-call eavesdrop-available');
                return true;

            default:
                return false; // 未处理，让引擎执行默认行为
        }
    },

    // ===== 标签文案 =====
    getLabel(key) {
        const labels = {
            'incoming_call': '来电',
            'eavesdrop': '对话追踪',
            'favorites': '收藏夹',
            'settings': '系统设置',
            'call_history': '通话记录',
            'eavesdrop_history': '追踪记录',
        };
        return labels[key] || null;
    },
};

export default DefaultTheme;
