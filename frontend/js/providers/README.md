# TTS Provider 接入指南

本目录 (`frontend/js/providers/`) 采用**前端策略模式 (Strategy Pattern)**，用于管理所有的 TTS 供应商接口。

所有的 TTS 供应商调用（例如请求第三方云 API 或本地大模型服务）应当完全在前端实现，避免不必要的本地后端中转（本地服务除外）。

## 架构说明

- `base_provider.js`：定义了统一的适配层和接口规范 `BaseTTSProvider`。
- `provider_manager.js`：单例工厂，根据酒馆原生设置 (`extensionSettings.st_direct_tts`) 自动实例化当前选中的供应商。
- `{name}_provider.js`：具体的供应商实现。

## 如何新增一个 TTS 供应商

1. **新建文件**：在 `providers/` 目录下新建 `{供应商名称}_provider.js`，例如 `azure_provider.js`。
2. **继承基类**：
   ```javascript
   import { BaseTTSProvider } from './base_provider.js';

   export class AzureProvider extends BaseTTSProvider {
       constructor(config) {
           super(config);
           this.name = 'Azure';
       }

       // 验证配置是否完整（如 API Key 是否存在）
       validateConfig() {
           if (!this.config.api_key) {
               throw new Error('Azure API Key is missing');
           }
       }

       // 检查是否已有缓存（云端 TTS 若无专门缓存库，通常返回 false）
       async checkCache(task, modelConfig) {
           return { cached: false };
       }

       // 核心生成方法，必须返回可播放的 Audio URL 或 Blob
       async generateAudio(task, modelConfig) {
           this.validateConfig();
           const { text, emotion } = task;

           // 1. 发起实际的 API 请求
           // const response = await fetch('https://azure.api/...');
           // const blob = await response.blob();
           
           // 2. 将结果包装返回
           // return { blob, audioUrl: URL.createObjectURL(blob), filename: "azure_voice.wav" };
           
           // （占位实现）
           console.log(`[Azure TTS] Requesting audio for text: ${text}`);
           throw new Error("Azure TTS Not Implemented Yet");
       }
   }
   ```
3. **注册到管理器**：在 `provider_manager.js` 中引入新写的类，并在 `getProvider` 方法中添加对应分支。
4. **添加前端 UI 设置**：在 `frontend/settings.html` 和 `frontend/js/settings_ui.js` 中新增该供应商的专属配置界面（如 API Key 输入框）。
