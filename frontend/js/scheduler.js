// static/js/scheduler.js
import { ProviderManager } from './providers/provider_manager.js';

export const TTS_Scheduler = {
    queue: [],
    isRunning: false,
    waiters: new Map(),
    cloudActive: 0,
    localActive: false,
    lastLocalModel: null,
    prioritySequence: 0,

    isLocalCharacter(charName) {
        return ProviderManager.getProviderForCharacter(charName).name === 'GPT-SoVITS';
    },

    requestAudio(segment, signal, { batch = false, deferRun = false } = {}) {
        const CACHE = window.TTS_State.CACHE;
        const key = segment.key || JSON.stringify(['reading', segment.charName, segment.text, segment.emotion,
            CACHE.mappings[segment.charName], CACHE.settings.default_lang,
            window.TTS_PromptInjector?.getModelSpeed(segment.charName)]);
        if (signal.aborted) return Promise.reject(new DOMException('已停止', 'AbortError'));
        if (CACHE.audioMemory[key]) return Promise.resolve({ key, audioUrl: CACHE.audioMemory[key] });
        return new Promise((resolve, reject) => {
            const entry = { resolve, reject, cleanup: () => signal.removeEventListener('abort', abort) };
            const abort = () => {
                this.waiters.get(key)?.delete(entry);
                if (!this.waiters.get(key)?.size) this.waiters.delete(key);
                // 只撤销朗读专属且尚未发出的请求，不误删普通气泡的后台预生成。
                const index = this.queue.findIndex(task => task.key === key && task.readingOnly && !this.waiters.has(key));
                if (index >= 0) {
                    this.queue.splice(index, 1);
                    CACHE.pendingTasks.delete(key);
                }
                reject(new DOMException('已停止', 'AbortError'));
            };
            if (!this.waiters.has(key)) this.waiters.set(key, new Set());
            this.waiters.get(key).add(entry);
            signal.addEventListener('abort', abort, { once: true });
            const $btn = $('<span>').attr({ 'data-status': 'waiting', 'data-key': key })
                .data({ 'voice-name': segment.charName, text: segment.text,
                    'voice-emotion': segment.emotion || 'default', 'generation-key': key, 'reading-only': true, 'force-regenerate': !!segment.forceRegenerate });
            this.addToQueue($btn);
            const queued = this.queue.find(task => task.key === key);
            if (queued && !batch && !queued.priority) queued.priority = ++this.prioritySequence;
            if (!deferRun) this.run();
        });
    },

    settleWaiters(key, error, audioUrl) {
        for (const entry of this.waiters.get(key) || []) {
            entry.cleanup();
            if (error) entry.reject(error);
            else entry.resolve({ key, audioUrl });
        }
        this.waiters.delete(key);
    },

    updateStatus($btn, status) {
        $btn.attr('data-status', status).removeClass('playing loading error');

        if (status === 'queued' || status === 'generating') {
            $btn.addClass('loading');
        }
        else if (status === 'error') {
            this.settleWaiters($btn.attr('data-key'), new Error('语音生成失败，请检查角色音色与后端配置后重新朗读。'));
            $btn.addClass('error');
            $btn.css('opacity', '');
        }

        if (status === 'ready') {
            $btn.css('opacity', '');
        }
    },

    getTaskKey(charName, text) {
        return `${charName}_${text}`;
    },

    validateModel(modelName, config) {
        const provider = ProviderManager.getCurrentProvider();
        if (typeof provider.validateModel === 'function') {
            return provider.validateModel(modelName, config);
        }
        return true;
    },

    scanAndSchedule() {
        const settings = window.TTS_State.CACHE.settings;
        const mappings = window.TTS_State.CACHE.mappings;

        if (settings.enabled === false) return;

        const $lastMessage = $('.mes_text').last();
        $lastMessage.find('.voice-bubble[data-status="waiting"]').each((_, btn) => {
            const charName = $(btn).data('voice-name');
            if (mappings[charName]) {
                this.addToQueue($(btn));
            }
        });
        if (!this.isRunning && this.queue.length > 0) this.run();
    },

    addToQueue($btn) {
        if ($btn.attr('data-status') !== 'waiting') return;

        const CACHE = window.TTS_State.CACHE;
        const charName = $btn.data('voice-name');
        const text = $btn.data('text');
        const key = $btn.data('generation-key') || this.getTaskKey(charName, text);
        $btn.attr('data-key', key);

        // 【修复】规范化情绪参数：空字符串、null、undefined 统一转为 'default'
        const rawEmotion = $btn.data('voice-emotion');
        const normalizedEmotion = (rawEmotion && rawEmotion.trim() !== '') ? rawEmotion : 'default';

        // 一级缓存
        if (CACHE.audioMemory[key]) {
            $btn.data('audio-url', CACHE.audioMemory[key]);
            this.updateStatus($btn, 'ready');
            return;
        }
        if (CACHE.pendingTasks.has(key)) {
            this.updateStatus($btn, 'queued');
            return;
        }

        this.updateStatus($btn, 'queued');
        CACHE.pendingTasks.add(key);
        this.queue.push({ charName, emotion: normalizedEmotion, text, key, $btn, readingOnly: !!$btn.data('reading-only'), forceRegenerate: !!$btn.data('force-regenerate') });
    },

    // 云端共享两个并发槽；本地切权重与合成占用同一个串行槽。
    // 每次完成重新取队列，允许前台朗读优先于尚未开始的后台任务。
    run() {
        const CACHE = window.TTS_State.CACHE;
        if (CACHE.settings.enabled === false) {
            for (const task of this.queue.splice(0)) {
                this.updateStatus(task.$btn, 'error');
                CACHE.pendingTasks.delete(task.key);
            }
        }
        while (this.queue.length) {
            const candidates = this.queue.filter(task =>
                this.isLocalCharacter(task.charName) ? !this.localActive : this.cloudActive < 2);
            if (!candidates.length) break;
            const priority = candidates.filter(task => task.priority).sort((a, b) => a.priority - b.priority);
            // 没有前台顺序要求时，本地尽量连续使用相同模型。
            const task = priority[0] || candidates.find(task => this.isLocalCharacter(task.charName) &&
                CACHE.mappings[task.charName] === this.lastLocalModel) || candidates[0];
            this.queue.splice(this.queue.indexOf(task), 1);
            const local = this.isLocalCharacter(task.charName);
            if (local) this.localActive = true;
            else this.cloudActive++;
            this.isRunning = true;
            this.executeTask(task, local).catch(error => {
                console.error('[TTS] 调度失败:', error);
                this.updateStatus(task.$btn, 'error');
                CACHE.pendingTasks.delete(task.key);
            }).finally(() => {
                if (local) this.localActive = false;
                else this.cloudActive--;
                this.isRunning = this.localActive || this.cloudActive > 0;
                this.run();
            });
        }
        this.isRunning = this.localActive || this.cloudActive > 0;
    },

    async executeTask(task, local) {
        const CACHE = window.TTS_State.CACHE;
        if (CACHE.audioMemory[task.key]) {
            this.finishTask(task.key, CACHE.audioMemory[task.key]);
            return;
        }
        const modelName = CACHE.mappings[task.charName];
        if (!modelName) throw new Error('角色尚未绑定音色');
        const provider = ProviderManager.getProviderForCharacter(task.charName);
        const config = local ? CACHE.models[modelName] : {};
        if (local && (!config || !provider.validateModel(modelName, config))) throw new Error('本地模型配置不完整');
        if (typeof provider.selectRefAudio === 'function') task.selectedRef = provider.selectRefAudio(task, config);
        this.updateStatus(task.$btn, 'generating');
        const cached = task.forceRegenerate ? null : await this.checkCache(task, config);
        if (local) {
            if (!cached?.cached) await provider.switchModel(config);
            this.lastLocalModel = modelName;
        }
        await this.processSingleTask(task, config);
    },

    finishTask(key, audioUrl) {
        const CACHE = window.TTS_State.CACHE;
        CACHE.audioMemory[key] = audioUrl;
        CACHE.pendingTasks.delete(key);
        this.settleWaiters(key, null, audioUrl);

        if (window.TTS_Parser && window.TTS_Parser.updateState) {
            window.TTS_Parser.updateState();
        }
    },

    async checkCache(task, modelConfig) {
        try {
            const provider = ProviderManager.getProviderForCharacter(task.charName);
            return await provider.checkCache(task, modelConfig);
        } catch { return { cached: false }; }
    },

    async switchModel(config) {
        const provider = ProviderManager.getCurrentProvider();
        if (typeof provider.switchModel === 'function') {
            await provider.switchModel(config);
        }
    },

    async processSingleTask(task, modelConfig) {
        const { key, $btn } = task;
        const CACHE = window.TTS_State.CACHE;

        try {
            const provider = ProviderManager.getProviderForCharacter(task.charName);
            const { blob, audioUrl, filename } = await provider.generateAudio(task, modelConfig);
            
            if (filename) {
                $btn.attr('data-server-filename', filename);
                console.log(`[TTS] 文件名已记录: ${filename}`);
            }

            if (!audioUrl) throw new Error('供应商未返回音频');
            if (audioUrl) {
                $btn.attr('data-audio-url', audioUrl);
                $btn.attr('data-key', key);
                this.finishTask(key, audioUrl);
            }
            this.updateStatus($btn, 'ready');

        } catch (e) {
            console.error("生成失败:", e);
            const provider = ProviderManager.getProviderForCharacter(task.charName);
            const errorMsg = provider.getErrorMessage ? provider.getErrorMessage(e) : e.message;
            window.TTS_Utils.showNotification(`❌ ${errorMsg}`, 'error');
            this.updateStatus($btn, 'error');
            CACHE.pendingTasks.delete(key);
        }
    },

    selectRefAudio(task, modelConfig) {
        const provider = ProviderManager.getCurrentProvider();
        if (typeof provider.selectRefAudio === 'function') {
            return provider.selectRefAudio(task, modelConfig);
        }
        return null;
    },

    init() {
        console.log("✅[Scheduler] 调度器已加载");
    }
};
