# ST-Direct-TTS 远端盲盒分发与匿名 DAU 统计微服务

本服务设计用于部署在作者自有的**海外 VPS 服务器**上，提供**每日盲盒预设分发**、**匿名设备 DAU 统计**与**Web 数据看板**。

---

## 🌟 核心特性

1. **极简架构 (KISS)**：单文件 FastAPI + SQLite (WAL 模式)，内存占用 < 30MB，支持高并发。
2. **绝对安全与隐私合规**：
   - 绝不采集任何私密对话、角色卡与 API Key；
   - 仅记录随机匿名 UUID、插件版本号与请求日期；
   - 预设一键安装仅限制在 `presets/custom/*.json` 目录。
3. **管理后台可视化**：
   - 访问 `/admin/stats?key=YOUR_KEY` 实时查看今日 DAU、历史趋势、热门剧本榜单与版本分布。
4. **自动化生产**：
   - 内置 `scripts/generate_pool.py`，支持每周调用 AI 或内置模板一键批量扩充盲盒池。

---

## 🚀 VPS 快速部署指南

### 1. 准备运行环境 (Python 3.10+)

```bash
# 进入部署目录
cd /opt/st-direct-tts-server

# 安装轻量依赖
pip install fastapi uvicorn pydantic
```

### 2. 配置 Systemd 后台服务

创建配置文件 `/etc/systemd/system/tts-stats.service`：

```ini
[Unit]
Description=ST-Direct-TTS Remote Stats & Egg Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/st-direct-tts-server
Environment=ADMIN_SECRET_KEY=你的管理密码
Environment=PORT=8090
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启动并设置开机自启：
```bash
systemctl daemon-reload
systemctl enable tts-stats
systemctl start tts-stats
systemctl status tts-stats
```

### 3. 配置 Nginx 反向代理 (带 SSL)

```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    # ssl_certificate ...
    # ssl_certificate_key ...
}
```

---

## 📋 社区发帖强制披露声明（直接复制到首楼）

当你在社区发布插件时，请将以下内容贴在**发布帖首楼最顶部**，完全符合社区《工具发布规范》：

```markdown
### 📢 第三方网络请求与隐私声明（完全公开透明）

本插件遵守社区工具发布与安全防范规范，相关外部请求与本地文件操作披露如下：

1. **第三方网络请求披露**：
   - **请求地址**：`https://api.yourdomain.com`（作者 VPS 盲盒服务）
   - **请求目的**：获取每日盲盒 RP 剧本预设，并进行匿名日活（DAU）统计以评估维护动力。
   - **采集字段**：仅采集本地随机生成的匿名设备 UUID、插件版本号与请求日期（**绝不采集任何聊天记录、角色卡内容、API Key 或本地私密配置**）。
   - **请求频次**：每天启动或打开设置时仅请求 1 次。
   - **关闭方式**：插件设置面板提供**【每日彩蛋与活跃统计】独立开关**，关闭后将彻底停止所有外部请求。
2. **本地文件写入声明**：
   - **操作类型**：写入（Write）
   - **操作对象**：`extensions/st-direct-tts/presets/custom/` 目录
   - **用途说明**：当用户在界面上主动点击“一键安装彩蛋预设”时，将预设 JSON 保存至插件自定义预设目录。
3. **源代码与安全性**：
   - 本插件前后端代码完全明文开源、无混淆、无加密、无动态执行远程代码行为。
```

---

## 🎲 每周批量造池操作

在 VPS 或本地直接运行：

```bash
# 使用内置精品模板批量补充 10 个预设
python scripts/generate_pool.py --count 10

# 或使用 AI 大模型自动脑洞生成 20 个
export OPENAI_API_KEY="sk-xxxx"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"
export MODEL_NAME="deepseek-chat"
python scripts/generate_pool.py --count 20
```
