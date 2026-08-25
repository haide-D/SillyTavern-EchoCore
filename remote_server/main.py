"""
ST-Direct-TTS Remote Stats & Daily Preset Blind Box Server
FastAPI + SQLite + WAL Mode
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Request, HTTPException, Depends, Header, Query, Body
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import Database, get_current_beijing_date

# 配置日志
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("remote_server")

# 环境变量与安全密钥 (VPS 部署时可通过环境变量 ADMIN_SECRET_KEY 覆盖)
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "st_tts_admin_2026")
PORT = int(os.getenv("PORT", 8090))

app = FastAPI(
    title="ST-Direct-TTS Remote Service",
    version="1.0.0",
    description="Daily RP Scenario Egg & Anonymous Telemetry Server"
)

# 允许跨域（供 SillyTavern 前端透明调用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Database()

# 依赖注入：管理鉴权
def verify_admin_key(key: Optional[str] = Query(None), x_admin_key: Optional[str] = Header(None)):
    auth_key = key or x_admin_key
    if not auth_key or auth_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="未授权：管理员凭证错误或缺失")
    return True

# ----------------- 请求模型 -----------------
class DrawRequest(BaseModel):
    client_id: str
    version: Optional[str] = "unknown"
    os: Optional[str] = "unknown"

class InstallRecordRequest(BaseModel):
    preset_id: str
    client_id: Optional[str] = None

class PresetImportRequest(BaseModel):
    presets: List[Dict[str, Any]]

# ----------------- 客户端公开 API -----------------

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "time": get_current_beijing_date()}

@app.get("/api/egg/today")
async def get_today_egg(
    request: Request,
    client_id: str = Query(..., description="匿名设备UUID"),
    v: str = Query("3.1.0", description="插件版本"),
    os: str = Query("unknown", description="操作系统类型")
):
    """
    获取今日盲盒剧本状态 (包含首发预设与剩余抽卡次数)
    同时自动完成一次合规、匿名的日活(DAU)打点
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    # 若有反代头，获取真实 IP
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    # 1. 记录匿名日活
    db.record_visit(client_id=client_id, version=v, os_name=os, ip=client_ip, req_type="today_egg")

    # 2. 查询今日抽卡状态
    status = db.get_daily_draw_status(client_id=client_id)
    return {
        "success": True,
        "data": status
    }

@app.post("/api/egg/draw")
async def draw_egg(
    request: Request,
    payload: DrawRequest
):
    """
    消耗 1 次抽卡机会抽取新盲盒预设 (每日上限 3 次)
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    # 记录打点
    db.record_visit(client_id=payload.client_id, version=payload.version, os_name=payload.os, ip=client_ip, req_type="draw")

    # 执行抽卡
    success, drawn_preset, status, message = db.draw_preset(client_id=payload.client_id, max_draws=3)
    if not success:
        return JSONResponse(status_code=400, content={
            "success": False,
            "message": message,
            "data": status
        })

    return {
        "success": True,
        "message": message,
        "drawn_preset": drawn_preset,
        "data": status
    }

@app.post("/api/egg/installed")
async def mark_preset_installed(payload: InstallRecordRequest):
    """记录预设被本地安装事件"""
    if payload.preset_id:
        db.record_preset_installed(payload.preset_id)
    return {"success": True}

# ----------------- 管理员 API & 可视化仪表盘 -----------------

@app.get("/admin/stats/json")
async def get_stats_json(authorized: bool = Depends(verify_admin_key)):
    """获取聚合统计 JSON 数据"""
    stats = db.get_dashboard_stats()
    return {"success": True, "stats": stats}

@app.post("/admin/pool/import")
async def import_pool_presets(
    payload: PresetImportRequest,
    authorized: bool = Depends(verify_admin_key)
):
    """批量导入/扩充预设盲盒池"""
    imported_count = db.import_presets(payload.presets)
    return {"success": True, "imported_count": imported_count, "message": f"成功导入/更新 {imported_count} 个预设"}

@app.get("/admin/stats", response_class=HTMLResponse)
async def admin_dashboard_page(key: Optional[str] = Query(None)):
    """极简管理控制台与 DAU 可视化看板"""
    if not key or key != ADMIN_SECRET_KEY:
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>ST-Direct-TTS 统计后台</title>
        <style>
            body { background: #121214; color: #eee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1f1f23; padding: 30px; border-radius: 12px; border: 1px solid #333; width: 340px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); text-align: center; }
            input { width: 100%; box-sizing: border-box; padding: 10px; background: #2a2a30; border: 1px solid #444; border-radius: 6px; color: #fff; margin-bottom: 15px; }
            button { width: 100%; padding: 10px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
            button:hover { background: #4f46e5; }
        </style>
        </head>
        <body>
            <div class="card">
                <h2 style="margin-top:0;">🔒 管理员登录</h2>
                <p style="color:#888; font-size:13px;">请输入后台访问密钥 ADMIN_SECRET_KEY</p>
                <form method="get">
                    <input type="password" name="key" placeholder="输入密钥..." autofocus required />
                    <button type="submit">进入看板</button>
                </form>
            </div>
        </body>
        </html>
        """, status_code=401)

    stats = db.get_dashboard_stats()

    # 渲染可视化页面
    trend_labels = [item["date"] for item in stats["dau_trend"]]
    trend_values = [item["dau"] for item in stats["dau_trend"]]
    
    top_presets_html = "".join([
        f"""<tr>
            <td><b>{p['title']}</b></td>
            <td><span class="badge">{'NSFW' if p['is_nsfw'] else '全年龄'}</span></td>
            <td>{p['times_drawn']}</td>
            <td><b style="color:#10b981;">{p['times_installed']}</b></td>
        </tr>""" for p in stats["top_presets"]
    ]) or "<tr><td colspan='4' style='text-align:center; color:#666;'>暂无抽卡记录</td></tr>"

    version_badges = "".join([
        f"<span class='v-badge'>v{v['version']}: <b>{v['count']}</b> 人</span>" for v in stats["version_stats"]
    ]) or "<span style='color:#666;'>无数据</span>"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>ST-Direct-TTS 运营与DAU看板</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            :root {{
                --bg: #0f1117;
                --card-bg: #1a1d26;
                --border: #2d3139;
                --primary: #6366f1;
                --accent: #10b981;
                --text: #f3f4f6;
                --sub: #9ca3af;
            }}
            body {{
                background: var(--bg);
                color: var(--text);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                padding: 24px;
            }}
            .container {{ max-width: 1100px; margin: 0 auto; }}
            .header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }}
            .grid-kpi {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }}
            .kpi-card {{
                background: var(--card-bg);
                border: 1px solid var(--border);
                padding: 20px;
                border-radius: 12px;
            }}
            .kpi-num {{ font-size: 32px; font-weight: 800; color: #fff; margin-top: 8px; }}
            .kpi-label {{ font-size: 13px; color: var(--sub); text-transform: uppercase; letter-spacing: 0.5px; }}
            .card {{
                background: var(--card-bg);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 24px;
            }}
            table {{ width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }}
            th, td {{ padding: 12px; border-bottom: 1px solid var(--border); }}
            th {{ color: var(--sub); font-weight: 600; font-size: 12px; }}
            .badge {{ background: #374151; padding: 3px 8px; border-radius: 6px; font-size: 11px; }}
            .v-badge {{ background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #818cf8; padding: 4px 10px; border-radius: 20px; font-size: 12px; margin-right: 8px; display: inline-block; margin-bottom: 6px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <h1 style="margin:0; font-size:24px;">📊 ST-Direct-TTS 社区运营看板</h1>
                    <div style="font-size:12px; color:var(--sub); margin-top:4px;">实时匿名 DAU 监控与预设盲盒分发中心</div>
                </div>
                <div>
                    <span style="font-size:13px; color:var(--accent);">● 服务正常运行</span>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid-kpi">
                <div class="kpi-card">
                    <div class="kpi-label">今日日活 (DAU)</div>
                    <div class="kpi-num" style="color:#818cf8;">{stats['dau_today']} <span style="font-size:14px; font-weight:normal; color:var(--sub);">人</span></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">昨日日活</div>
                    <div class="kpi-num">{stats['dau_yesterday']} <span style="font-size:14px; font-weight:normal; color:var(--sub);">人</span></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">累计独立设备数</div>
                    <div class="kpi-num" style="color:var(--accent);">{stats['total_unique_devices']} <span style="font-size:14px; font-weight:normal; color:var(--sub);">台</span></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">预设池总量 / 今日抽卡</div>
                    <div class="kpi-num" style="color:#f59e0b;">{stats['pool_total']} <span style="font-size:14px; font-weight:normal; color:var(--sub);">/ {stats['today_total_draws']} 次</span></div>
                </div>
            </div>

            <!-- DAU Trend Chart -->
            <div class="card">
                <h3 style="margin-top:0; font-size:16px;">📈 近 30 天 DAU 活跃趋势</h3>
                <div style="height:260px; width:100%;">
                    <canvas id="dauChart"></canvas>
                </div>
            </div>

            <!-- Version Breakdown -->
            <div class="card">
                <h3 style="margin-top:0; font-size:16px;">🧩 客户端版本活跃分布</h3>
                <div>{version_badges}</div>
            </div>

            <!-- Top Presets Table -->
            <div class="card">
                <h3 style="margin-top:0; font-size:16px;">🔥 热门盲盒剧本榜单</h3>
                <table>
                    <thead>
                        <tr>
                            <th>剧本名称</th>
                            <th>类型</th>
                            <th>被抽中次数</th>
                            <th>本地安装量</th>
                        </tr>
                    </thead>
                    <tbody>
                        {top_presets_html}
                    </tbody>
                </table>
            </div>
        </div>

        <script>
            const ctx = document.getElementById('dauChart').getContext('2d');
            new Chart(ctx, {{
                type: 'line',
                data: {{
                    labels: {json.dumps(trend_labels)},
                    datasets: [{{
                        label: '每日独立活跃用户 (DAU)',
                        data: {json.dumps(trend_values)},
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#818cf8'
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {{
                        y: {{ beginAtZero: true, grid: {{ color: '#2d3139' }}, ticks: {{ color: '#9ca3af', precision: 0 }} }},
                        x: {{ grid: {{ display: false }}, ticks: {{ color: '#9ca3af' }} }}
                    }},
                    plugins: {{
                        legend: {{ display: false }}
                    }}
                }}
            }});
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

if __name__ == "__main__":
    import uvicorn
    # 初始化示例基础盲盒预设池（如果为空）
    if db.get_dashboard_stats()["pool_total"] == 0:
        logger.info("⚡ 预设池为空，正在载入初始示例盲盒...")
        sample_presets = [
            {
                "id": "midnight_whisper_01",
                "category": "phone_call",
                "title": "🌙 深夜被窝偷听·微醺反差",
                "author": "haide",
                "is_nsfw": True,
                "tags": ["微醺", "气声", "短句诱导", "情境电话"],
                "summary": "强化角色在深夜通话时的私密感，限制单句长度以适配断句 TTS。",
                "preview_dialogue": [
                    "（微弱的翻身摩擦声...）",
                    "喂...你那边怎么这么安静？睡不着吗..."
                ],
                "preset_data": {
                    "name": "深夜被窝偷听·微醺反差",
                    "category": "phone_call",
                    "plot_template": "深夜时分，角色因失眠悄悄给你拨通电话。语气带着困倦、轻微微醺的含糊与极强的亲密感。",
                    "system_template": "你正在与用户进行深夜私密通话。请保持轻声细语，多用短句，适度使用微醺与撒娇的情绪。",
                    "prompt_template": "深夜私密通话模式。语气低沉亲昵。"
                }
            },
            {
                "id": "retro_radio_broadcast",
                "category": "eavesdrop",
                "title": "📻 破旧电台·午夜悬疑频段",
                "author": "haide",
                "is_nsfw": False,
                "tags": ["悬疑", "广播剧", "机械杂音", "双人对谈"],
                "summary": "模拟收音机调频偶然截获的一段神秘双人加密通话。",
                "preview_dialogue": [
                    "（沙沙的电流底噪...）",
                    "注意，目标已经进入 3 号观察点，重复一遍，保持静默。"
                ],
                "preset_data": {
                    "name": "破旧电台·午夜悬疑频段",
                    "category": "eavesdrop",
                    "plot_template": "调频电台截获的加密通信，语速紧凑，情绪紧张。",
                    "system_template": "生成两名特工之间的秘密联络对话，充斥暗语与警惕感。",
                    "prompt_template": "秘密电台频段截获对话。"
                }
            },
            {
                "id": "tsundere_jealousy_call",
                "category": "phone_call",
                "title": "💢 傲娇败犬·质问修罗场",
                "author": "haide",
                "is_nsfw": False,
                "tags": ["傲娇", "修罗场", "吃醋质问", "语速忽快忽慢"],
                "summary": "角色在社交媒体看到你和别人的合照后，气冲冲打来的质问电话。",
                "preview_dialogue": [
                    "喂！你刚才发的那张照片是怎么回事？！",
                    "哈？我才没有在吃醋！我只是...顺便问问而已！"
                ],
                "preset_data": {
                    "name": "傲娇败犬·质问修罗场",
                    "category": "phone_call",
                    "plot_template": "角色因为吃醋而打电话质问你，嘴硬但内心极度在意。",
                    "system_template": "保持强烈的情感反差，先大声质问然后慌乱掩饰。",
                    "prompt_template": "吃醋质问场景。"
                }
            }
        ]
        db.import_presets(sample_presets)
        logger.info("✅ 初始盲盒载入完成！")

    logger.info(f"🚀 ST-Direct-TTS 服务端正在启动，监听端口: {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
