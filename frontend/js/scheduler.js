// static/js/scheduler.js
import { ProviderManager } from './providers/provider_manager.js';

export const TTS_Scheduler = {
    queue: [],
    isRunning: false,

    updateStatus($btn, status) {
        $btn.attr('data-status', status).removeClass('playing loading error');

        if (status === 'queued' || status === 'generating') {
            $btn.addClass('loading');
        }
        else if (status === 'error') {
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
        const key = this.getTaskKey(charName, text);

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
        this.queue.push({ charName, emotion: normalizedEmotion, text, key, $btn });
    },

    async run() {
        const CACHE = window.TTS_State.CACHE;

        if (CACHE.settings.enabled === false) {
            this.isRunning = false;
            this.queue = [];
            return;
        }

        this.isRunning = true;
        let groups = {};
        let unboundTasks = [];

        const provider = ProviderManager.getCurrentProvider();
        const isLocalGPT = provider.name === 'GPT-SoVITS';

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (CACHE.audioMemory[task.key]) {
                this.finishTask(task.key, CACHE.audioMemory[task.key]);
                continue;
            }
            
            let mName = "default_cloud_model";
            if (isLocalGPT) {
                mName = CACHE.mappings[task.charName];
                if (!mName) { unboundTasks.push(task); continue; }
            }
            
            if (!groups[mName]) groups[mName] = [];
            groups[mName].push(task);
        }

        unboundTasks.forEach(t => {
            this.updateStatus(t.$btn, 'error');
            CACHE.pendingTasks.delete(t.key);
        });

        for (const modelName of Object.keys(groups)) {
            const tasks = groups[modelName];
            const modelConfig = CACHE.models[modelName];

            const provider = ProviderManager.getCurrentProvider();

            if (isLocalGPT && (!modelConfig || !this.validateModel(modelName, modelConfig))) {
                console.warn(`[TTS] Model ${modelName} is missing files. Skipping generation.`);
                tasks.forEach(t => {
                    this.updateStatus(t.$btn, 'error');
                    CACHE.pendingTasks.delete(t.key);
                });
                continue;
            }

            if (typeof provider.selectRefAudio === 'function') {
                tasks.forEach(task => {
                    task.selectedRef = provider.selectRefAudio(task, modelConfig || {});
                });
            }

            const checkPromises = tasks.map(async (task) => {
                if (CACHE.audioMemory[task.key]) return { task, cached: true };
                const result = await this.checkCache(task, modelConfig);
                return { task, cached: result && result.cached === true };
            });

            const results = await Promise.all(checkPromises);
            const tasksToGenerate = [];

            for (const res of results) {
                if (res.cached) await this.processSingleTask(res.task, modelConfig);
                else tasksToGenerate.push(res.task);
            }

            if (tasksToGenerate.length > 0) {
                try {
                    await this.switchModel(modelConfig);
                    for (const task of tasksToGenerate) await this.processSingleTask(task, modelConfig);
                } catch (e) {
                    console.error("模型切换或生成失败:", e);
                    const errorMsg = e.message || "未知错误";
                    window.TTS_Utils.showNotification(`❌ 模型切换失败: ${errorMsg}`, 'error');
                    tasksToGenerate.forEach(t => {
                        this.updateStatus(t.$btn, 'error');
                        CACHE.pendingTasks.delete(t.key);
                    });
                }
            }
        }
        this.isRunning = false;
        if (this.queue.length > 0) this.run();
    },

    finishTask(key, audioUrl) {
        const CACHE = window.TTS_State.CACHE;
        CACHE.audioMemory[key] = audioUrl;
        CACHE.pendingTasks.delete(key);

        if (window.TTS_Parser && window.TTS_Parser.updateState) {
            window.TTS_Parser.updateState();
        }
    },

    async checkCache(task, modelConfig) {
        try {
            const provider = ProviderManager.getCurrentProvider();
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
            const provider = ProviderManager.getCurrentProvider();
            const { blob, audioUrl, filename } = await provider.generateAudio(task, modelConfig);
            
            if (filename) {
                $btn.attr('data-server-filename', filename);
                console.log(`[TTS] 文件名已记录: ${filename}`);
            }

            if (audioUrl) {
                $btn.attr('data-audio-url', audioUrl);
                $btn.attr('data-key', key);
                this.finishTask(key, audioUrl);
            }
            this.updateStatus($btn, 'ready');

        } catch (e) {
            console.error("生成失败:", e);
            const provider = ProviderManager.getCurrentProvider();
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
