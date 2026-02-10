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
import { themeManager } from './theme_manager.js';

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

        // 将相对路径转换为完整 API URL
        const apiHost = PhoneCallAPIClient.getApiHost();
        const fullAudioUrl = audio_url ? `${apiHost}${audio_url}` : (audio_path ? `${apiHost}${audio_path}` : null);

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
            segments,
            audio_path,
            audio_url: fullAudioUrl,
            avatar_url: avatarUrl
        };

        console.log('[NotificationHandler] ✅ 来电数据已存储到 window.TTS_IncomingCall:', window.TTS_IncomingCall);

        // 触发悬浮球震动
        this.triggerFloatingBallAnimation('incoming-call', `${actualCaller} 来电中...`);

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
        const fullAudioUrl = audio_url ? `${apiHost}${audio_url}` : null;

        // 存储对话追踪数据
        window.TTS_EavesdropData = {
            record_id,
            speakers,
            segments,
            audio_url: fullAudioUrl,
            scene_description
        };

        console.log('[NotificationHandler] ✅ 对话追踪数据已存储到 window.TTS_EavesdropData');

        // 触发悬浮球闪烁 (使用不同的样式)
        this.triggerFloatingBallAnimation(
            'eavesdrop-available',
            notification_text || `${speakers.join(' 和 ')} 正在私聊...`
        );

        // 显示通知
        this.showNotification(notification_text || `🎧 检测到 ${speakers.join(' 和 ')} 正在私聊`, 'info');
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

        console.log('[NotificationHandler] 🔍 触发通知动画:', animationClass);

        // 桌面版悬浮球
        if ($managerBtn.length) {
            $managerBtn.addClass(animationClass);
            $managerBtn.attr('title', tooltipText);
            console.log('[NotificationHandler] ✅ 桌面版悬浮球动画已触发');
        }

        // ✨ 魔法符文通知
        if (animationClass === 'incoming-call') {
            themeManager.setIncomingCall(true);
            console.log('[NotificationHandler] ✨ 符文已进入来电状态');
        } else if (animationClass === 'eavesdrop-available') {
            themeManager.setEavesdropAvailable(true);
            console.log('[NotificationHandler] ✨ 符文已进入低语感应状态');
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
