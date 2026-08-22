/**
 * 通知处理器
 * 
 * 职责:
 * - 处理来电通知
 * - 处理对话追踪通知
 * - 控制悬浮球动画
 * - 显示 toastr 通知
 * - 存储来电/对话追踪数据
 */

import { PhoneCallAPIClient } from './phone_call_api_client.js';

export class NotificationHandler {
    /**
     * 处理来电通知
     * 
     * @param {Object} data - 来电通知数据
     * @param {string} data.call_id - 来电ID
     * @param {string} data.char_name - 角色卡名 (用于 WebSocket 路由)
     * @param {string} data.selected_speaker - 实际打电话人
     * @param {Array} data.segments - 对话片段
     * @param {string} data.audio_path - 音频路径 (旧)
     * @param {string} data.audio_url - 音频URL (新)
     */
    static async handlePhoneCallReady(data) {
        console.log('[NotificationHandler] 📞 收到来电通知:', data);

        const { call_id, char_name, selected_speaker, segments, audio_path, audio_url } = data;

        // selected_speaker 是 LLM 选择的实际打电话人
        const actualCaller = selected_speaker || char_name;

        // 将相对路径转换为完整 API URL (防止对 data: 或已包含 http 的 URL 重复拼接)
        const apiHost = PhoneCallAPIClient.getApiHost();
        const resolveUrl = (rawUrl) => {
            if (!rawUrl) return null;
            if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
                return rawUrl;
            }
            return `${apiHost}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
        };

        const fullAudioUrl = resolveUrl(audio_url) || resolveUrl(audio_path);

        console.log('[NotificationHandler] 🎵 音频 URL 转换:');
        console.log('  - 原始 audio_url:', audio_url);
        console.log('  - 完整 URL:', fullAudioUrl);
        console.log('  - 实际打电话人 (selected_speaker):', actualCaller);

        // 获取角色头像 URL
        const avatarUrl = this.getCharacterAvatar(actualCaller, char_name);

        // 存储来电数据
        window.TTS_IncomingCall = {
            call_id,
            char_name: actualCaller,  // 使用实际打电话人
            selected_speaker: actualCaller,
            target_user: data.target_user,
            call_reason: data.call_reason,
            preset_id: data.preset_id,
            segments,
            audio_path,
            audio_url: fullAudioUrl,
            avatar_url: avatarUrl
        };

        console.log('[NotificationHandler] ✅ 来电数据已存储到 window.TTS_IncomingCall:', window.TTS_IncomingCall);

        // 统一触发悬浮球动效（保障 DOM 元素直接呈现动画）
        this.triggerFloatingBallAnimation('incoming-call', `${actualCaller} 来电中...`);

        // 通过 ThemeEngine 分发通知（由当前主题决定视觉表现与粒子/法阵状态）
        if (window.TTS_ThemeEngine && window.TTS_ThemeEngine.notify) {
            window.TTS_ThemeEngine.notify('incoming_call', window.TTS_IncomingCall);
        }

        // 显示通知
        this.showNotification(`📞 ${actualCaller} 来电!`, 'info');
    }

    /**
     * 处理对话追踪通知
     * 
     * @param {Object} data - 对话追踪通知数据
     * @param {string} data.record_id - 记录ID
     * @param {Array} data.speakers - 说话人列表
     * @param {Array} data.segments - 对话片段
     * @param {string} data.audio_url - 音频URL
     * @param {string} data.scene_description - 场景描述
     * @param {string} data.notification_text - 通知文本
     */
    static async handleEavesdropReady(data) {
        console.log('[NotificationHandler] 🎧 收到对话追踪通知:', data);

        const { record_id, speakers, segments, audio_url, scene_description, notification_text } = data;

        // 将相对路径转换为完整 API URL
        const apiHost = PhoneCallAPIClient.getApiHost();
        const resolveUrl = (rawUrl) => {
            if (!rawUrl) return null;
            if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
                return rawUrl;
            }
            return `${apiHost}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
        };
        const fullAudioUrl = resolveUrl(audio_url);

        // 存储对话追踪数据 (双变量兼容各主题读取)
        window.TTS_EavesdropData = {
            record_id,
            speakers,
            segments,
            audio_url: fullAudioUrl,
            scene_description,
            notification_text: notification_text || `检测到 ${(speakers || []).join(' 和 ')} 的密谈`,
            preset_id: data.preset_id
        };
        window.TTS_EavesdropReady = window.TTS_EavesdropData;

        console.log('[NotificationHandler] ✅ 对话追踪数据已存储到 window.TTS_EavesdropData');

        // 统一触发悬浮球动效
        this.triggerFloatingBallAnimation(
            'eavesdrop-available',
            notification_text || `${(speakers || []).join(' 和 ')} 正在私聊...`
        );

        // 通过 ThemeEngine 分发通知（由当前主题决定视觉表现）
        if (window.TTS_ThemeEngine && window.TTS_ThemeEngine.notify) {
            window.TTS_ThemeEngine.notify('eavesdrop_ready', window.TTS_EavesdropData);
        }

        // 显示通知
        this.showNotification(notification_text || `🎧 检测到 ${(speakers || []).join(' 和 ')} 正在私聊`, 'info');
    }

    /**
     * 获取角色头像 URL
     * 
     * @param {string} actualCaller - 实际打电话人
     * @param {string} charName - 角色卡名
     * @returns {string|null} - 头像 URL
     */
    static getCharacterAvatar(actualCaller, charName) {
        try {
            const context = window.SillyTavern?.getContext?.();
            if (!context) {
                return null;
            }

            const { characters, characterId } = context;

            // 优先按实际打电话人查找,再按角色卡名查找,最后按 characterId 查找
            const char = characters?.find(c => c.name === actualCaller) ||
                characters?.find(c => c.name === charName) ||
                characters?.find(c => c.avatar === characterId);

            if (char?.avatar) {
                // SillyTavern 角色头像路径格式: /characters/{avatar}
                const avatarUrl = `/characters/${char.avatar}`;
                console.log('[NotificationHandler] 🖼️ 头像 URL:', avatarUrl);
                return avatarUrl;
            }

        } catch (e) {
            console.warn('[NotificationHandler] ⚠️ 获取头像失败:', e);
        }

        return null;
    }

    /**
     * 触发悬浮球动画
     * 
     * @param {string} animationClass - 动画 CSS 类名
     * @param {string} tooltipText - 提示文本
     */
    static triggerFloatingBallAnimation(animationClass, tooltipText) {
        const $managerBtn = $('#tts-manager-btn');  // 桌面版
        const $mobileTrigger = $('#tts-mobile-trigger');  // 移动版

        console.log('[NotificationHandler] 🔍 查找悬浮球元素:');
        console.log('  - 桌面版 (#tts-manager-btn):', $managerBtn.length);
        console.log('  - 移动版 (#tts-mobile-trigger):', $mobileTrigger.length);

        let triggered = false;

        // 桌面版悬浮球
        if ($managerBtn.length) {
            $managerBtn.addClass(animationClass);
            $managerBtn.attr('title', tooltipText);
            console.log('[NotificationHandler] ✅ 桌面版悬浮球动画已触发, 当前class:', $managerBtn.attr('class'));
            triggered = true;
        }

        // 移动版悬浮球
        if ($mobileTrigger.length) {
            // 移除拖动时可能残留的内联样式,确保动画正常
            $mobileTrigger[0].style.removeProperty('animation');
            $mobileTrigger[0].style.removeProperty('transform');
            $mobileTrigger.addClass(animationClass);
            $mobileTrigger.attr('title', tooltipText);
            console.log('[NotificationHandler] ✅ 移动版悬浮球动画已触发, 当前class:', $mobileTrigger.attr('class'));
            triggered = true;
        }

        if (!triggered) {
            console.warn('[NotificationHandler] ⚠️ 悬浮球元素不存在,无法触发动画');
            console.warn('[NotificationHandler] 💡 提示:请确保 TTS_UI 已初始化并创建了悬浮球');
        }
    }

    /**
     * 显示通知
     * 
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (info/success/error)
     */
    static showNotification(message, type = 'info') {
        console.log(`[NotificationHandler] [${type}] ${message}`);

        // 如果有 toastr,使用它
        if (window.toastr) {
            window.toastr[type](message);
        }

        // 触发自定义事件
        if (window.TTS_Events && window.TTS_Events.emit) {
            window.TTS_Events.emit('notification', {
                message: message,
                type: type
            });
        }
    }
}

export default NotificationHandler;
