/**
 * WebSocket 消息路由器
 * 
 * 职责:
 * - 注册消息处理器 (策略模式)
 * - 根据消息类型分发到对应 handler
 * 
 * 设计模式: 策略模式 / 命令模式
 */

export class WebSocketMessageRouter {
    constructor() {
        // 消息类型 -> 处理器的映射
        this.handlers = new Map();

        console.log('[WebSocketMessageRouter] 📨 初始化消息路由器');
    }

    /**
     * 注册消息处理器
     * 
     * @param {string} messageType - 消息类型
     * @param {Function} handler - 处理器函数 (async function(data) => {})
     */
    registerHandler(messageType, handler) {
        if (typeof handler !== 'function') {
            console.error('[WebSocketMessageRouter] ❌ Handler 必须是函数:', messageType);
            return;
        }

        this.handlers.set(messageType, handler);
        console.log(`[WebSocketMessageRouter] ✅ 注册处理器: ${messageType}`);
    }

    /**
     * 移除消息处理器
     * 
     * @param {string} messageType - 消息类型
     */
    unregisterHandler(messageType) {
        if (this.handlers.has(messageType)) {
            this.handlers.delete(messageType);
            console.log(`[WebSocketMessageRouter] 🗑️ 移除处理器: ${messageType}`);
        }
    }

    /**
     * 路由消息到对应的处理器
     * 
     * @param {Object} message - WebSocket 消息
     * @param {string} message.type - 消息类型
     */
    async route(message) {
        if (!message || !message.type) {
            console.warn('[WebSocketMessageRouter] ⚠️ 消息格式无效,缺少 type 字段');
            return;
        }

        const handler = this.handlers.get(message.type);

        if (!handler) {
            // 系统级连接/握手通知无需告警
            if (['connected', 'pong', 'heartbeat'].includes(message.type)) {
                return;
            }
            console.warn(`[WebSocketMessageRouter] ⚠️ 未找到处理器: ${message.type}`);
            return;
        }

        try {
            console.log(`[WebSocketMessageRouter] 🔀 路由消息: ${message.type}`);
            await handler(message);
        } catch (error) {
            console.error(`[WebSocketMessageRouter] ❌ 处理消息失败 (${message.type}):`, error);
        }
    }

    /**
     * 获取已注册的消息类型列表
     * 
     * @returns {Array<string>} - 消息类型列表
     */
    getRegisteredTypes() {
        return Array.from(this.handlers.keys());
    }

    /**
     * 检查是否已注册某个消息类型
     * 
     * @param {string} messageType - 消息类型
     * @returns {boolean}
     */
    hasHandler(messageType) {
        return this.handlers.has(messageType);
    }
}

export default WebSocketMessageRouter;
