/**
 * 说话人管理器
 * 
 * 职责:
 * - 从对话消息中提取说话人列表
 * - 管理说话人数据的缓存和持久化
 * - 提供统一的更新接口
 * 
 * 设计原则:
 * - 单一职责: 专注于说话人数据管理
 * - 防抖机制: 避免短时间内重复更新
 * - 缓存机制: 避免重复提交相同数据
 * - 静默失败: 不影响主流程
 */

export const SpeakerManager = {
    // 缓存最后一次更新的数据,避免重复提交
    lastUpdate: {
        chatBranch: null,
        speakers: [],
        mesid: -1
    },

    // 防抖定时器
    updateTimer: null,

    /**
     * 更新说话人列表 (带防抖)
     * @param {Object} context - SillyTavern 上下文
     * @param {string} chatBranch - 对话分支 ID
     * @param {number} debounceMs - 防抖延迟(毫秒)
     */
    async updateSpeakers(context, chatBranch, debounceMs = 500) {
        // 清除之前的定时器
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }

        // 防抖执行
        this.updateTimer = setTimeout(async () => {
            await this._doUpdate(context, chatBranch);
        }, debounceMs);
    },

    /**
     * 立即更新说话人列表 (不防抖)
     * @param {Object} context - SillyTavern 上下文
     * @param {string} chatBranch - 对话分支 ID
     */
    async updateSpeakersImmediate(context, chatBranch) {
        await this._doUpdate(context, chatBranch);
    },

    /**
     * 内部更新逻辑
     * @private
     */
    async _doUpdate(context, chatBranch) {
        try {
            // 检查依赖
            if (!window.TTS_Utils || !window.TTS_API) {
                console.warn('[SpeakerManager] ⚠️ 依赖未就绪');
                return;
            }

            if (!context || !context.chat) {
                console.warn('[SpeakerManager] ⚠️ 无效的上下文');
                return;
            }

            // 提取对话中所有说话人
            const extractedSpeakers = window.TTS_Utils.extractAllSpeakers(context.chat);
            const speakerSet = new Set(extractedSpeakers);

            // 补充当前选中的主角色卡名称 (若有)
            if (context.characters && context.characterId !== undefined) {
                const charObj = context.characters[context.characterId];
                if (charObj && charObj.name && charObj.name.trim()) {
                    speakerSet.add(charObj.name.trim());
                }
            }

            const speakers = Array.from(speakerSet);
            const mesid = context.chat.length - 1;

            // 检查是否需要更新 (数据未变化则跳过)
            if (this._isSameAsLast(chatBranch, speakers, mesid)) {
                console.log('[SpeakerManager] ℹ️ 数据未变化,跳过更新');
                return;
            }

            // 如果没有说话人,跳过
            if (speakers.length === 0) {
                console.log('[SpeakerManager] ℹ️ 当前对话无说话人');
                return;
            }

            // 持久化到数据库
            await window.TTS_API.updateSpeakers({
                chat_branch: chatBranch,
                speakers: speakers,
                mesid: mesid
            });

            // 更新缓存
            this.lastUpdate = { chatBranch, speakers, mesid };

            console.log(`[SpeakerManager] ✅ 已更新说话人列表 (${speakers.length}): ${speakers.join(', ')}`);

        } catch (error) {
            console.warn('[SpeakerManager] ⚠️ 更新失败:', error);
        }
    },

    /**
     * 检查数据是否与上次相同
     * @private
     */
    _isSameAsLast(chatBranch, speakers, mesid) {
        if (this.lastUpdate.chatBranch !== chatBranch) return false;
        if (this.lastUpdate.mesid !== mesid) return false;

        const lastSpeakers = this.lastUpdate.speakers;
        if (lastSpeakers.length !== speakers.length) return false;

        // 比较数组内容
        const sortedLast = [...lastSpeakers].sort();
        const sortedNew = [...speakers].sort();
        return sortedLast.every((s, i) => s === sortedNew[i]);
    },

    /**
     * 清除缓存 (用于切换对话时)
     */
    clearCache() {
        this.lastUpdate = {
            chatBranch: null,
            speakers: [],
            mesid: -1
        };
        console.log('[SpeakerManager] 🗑️ 缓存已清除');
    }
};

// 挂载到全局
window.TTS_SpeakerManager = SpeakerManager;

console.log('[SpeakerManager] 📦 模块已加载');

export default SpeakerManager;
