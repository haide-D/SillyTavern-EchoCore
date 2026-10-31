# EchoCore v3.4.3

- 系统设置新增可选的「GPT-SoVITS 端模型目录」，支持 EchoCore 与 GPT-SoVITS 使用不同的文件路径。
- 自动映射 GPT / SoVITS 权重及普通朗读、V2 朗读、电话语音的主辅参考音频路径，支持 Windows、Linux 和 UNC 共享路径。
- 留空沿用原有路径；模型扫描、上传和管理仍使用 EchoCore 模型目录。
- 模型加载和语音合成失败时保留 GPT-SoVITS 返回的错误详情。

## NAS Docker → Windows 示例

系统设置中，模型目录填写 `/app/MyCharacters`，GPT-SoVITS 端模型目录填写 `Z:\MyCharacters`（或该进程可访问的 UNC 共享目录）。两端需访问同一份文件或目录结构一致的副本。保存后刷新聊天页面。

例如 `/app/MyCharacters/Rain/Rain.ckpt` 会在请求时转换为 `Z:\MyCharacters\Rain\Rain.ckpt`。参考音频同样转换，无需调整角色绑定。
