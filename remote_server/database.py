"""
Database Module for Remote Stats and Preset Blind Box Server (SQLite + WAL)
"""

import sqlite3
import json
import hashlib
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

DB_PATH = Path(__file__).parent / "stats.db"

# 北京时间 (UTC+8)
BEIJING_TZ = timezone(timedelta(hours=8))

def get_current_beijing_date() -> str:
    """获取当前北京时间 YYYY-MM-DD"""
    return datetime.now(BEIJING_TZ).strftime("%Y-%m-%d")

def hash_ip(ip: str) -> str:
    """对 IP 进行匿名哈希处理，不保存原始 IP"""
    if not ip:
        return "anonymous"
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()[:16]

class Database:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def init_db(self):
        """初始化数据表与索引"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. 匿名访问/心跳日志表
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                ip_hash TEXT NOT NULL,
                version TEXT NOT NULL,
                os TEXT NOT NULL,
                request_type TEXT NOT NULL,
                date TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_date ON telemetry_logs (date);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_client_date ON telemetry_logs (client_id, date);")

            # 2. 每日抽卡配额表 (client_id + date 联合唯一)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_draw_quota (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                date TEXT NOT NULL,
                draw_count INTEGER DEFAULT 0,
                drawn_preset_ids TEXT DEFAULT '[]',
                updated_at INTEGER NOT NULL,
                UNIQUE(client_id, date)
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_draw_quota_date ON daily_draw_quota (date);")

            # 3. 预设盲盒池表
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS preset_pool (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL DEFAULT 'phone_call',
                title TEXT NOT NULL,
                author TEXT DEFAULT 'haide',
                is_nsfw INTEGER DEFAULT 0,
                tags TEXT DEFAULT '[]',
                summary TEXT NOT NULL,
                preview_dialogue TEXT DEFAULT '[]',
                preset_data TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                is_featured INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                times_drawn INTEGER DEFAULT 0,
                times_installed INTEGER DEFAULT 0
            );
            """)
            conn.commit()

    def record_visit(self, client_id: str, version: str, os_name: str, ip: str, req_type: str = "heartbeat") -> bool:
        """记录访问打点 (按 client_id + date 去重，每日只记一条有效日活)"""
        today = get_current_beijing_date()
        ip_h = hash_ip(ip)
        now_ts = int(time.time())

        with self.get_connection() as conn:
            cursor = conn.cursor()
            # 检查今日是否已打点
            cursor.execute(
                "SELECT id FROM telemetry_logs WHERE client_id = ? AND date = ? LIMIT 1",
                (client_id, today)
            )
            exists = cursor.fetchone()
            if not exists:
                cursor.execute("""
                INSERT INTO telemetry_logs (client_id, ip_hash, version, os, request_type, date, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (client_id, ip_h, version, os_name, req_type, today, now_ts))
                conn.commit()
                return True
        return False

    def get_today_featured_preset(self, date_str: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """获取今日默认首发展示的盲盒预设 (固定精选或日期轮播)"""
        date = date_str or get_current_beijing_date()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. 优先获取被人工标记为置顶 featured 的预设
            cursor.execute(
                "SELECT * FROM preset_pool WHERE is_active = 1 AND is_featured = 1 ORDER BY created_at DESC LIMIT 1"
            )
            row = cursor.fetchone()
            
            # 2. 若无置顶，则根据日期 hash 轮播
            if not row:
                cursor.execute("SELECT * FROM preset_pool WHERE is_active = 1 ORDER BY id ASC")
                all_active = cursor.fetchall()
                if all_active:
                    date_hash = int(hashlib.md5(date.encode('utf-8')).hexdigest(), 16)
                    idx = date_hash % len(all_active)
                    row = all_active[idx]

            if row:
                return self._format_preset_row(row)
        return None

    def get_daily_draw_status(self, client_id: str, date_str: Optional[str] = None, max_draws: int = 3) -> Dict[str, Any]:
        """获取用户今日抽卡状态与已抽预设详情"""
        date = date_str or get_current_beijing_date()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT draw_count, drawn_preset_ids FROM daily_draw_quota WHERE client_id = ? AND date = ?",
                (client_id, date)
            )
            row = cursor.fetchone()
            
            if row:
                draw_count = row["draw_count"]
                drawn_ids = json.loads(row["drawn_preset_ids"] or "[]")
            else:
                draw_count = 0
                drawn_ids = []

            # 填充已抽到的预设卡片信息
            drawn_presets = []
            if drawn_ids:
                placeholders = ",".join("?" for _ in drawn_ids)
                cursor.execute(f"SELECT * FROM preset_pool WHERE id IN ({placeholders})", drawn_ids)
                rows = {r["id"]: self._format_preset_row(r) for r in cursor.fetchall()}
                for pid in drawn_ids:
                    if pid in rows:
                        drawn_presets.append(rows[pid])

            # 如果从未抽过，确保今日首发已在列表中
            if draw_count == 0 and not drawn_presets:
                featured = self.get_today_featured_preset(date)
                if featured:
                    drawn_presets.append(featured)
                    drawn_ids.append(featured["id"])
                    # 初始化第一抽
                    now_ts = int(time.time())
                    cursor.execute("""
                    INSERT OR REPLACE INTO daily_draw_quota (client_id, date, draw_count, drawn_preset_ids, updated_at)
                    VALUES (?, ?, 1, ?, ?)
                    """, (client_id, date, json.dumps(drawn_ids), now_ts))
                    conn.commit()
                    draw_count = 1

            return {
                "date": date,
                "draw_count": draw_count,
                "max_draws": max_draws,
                "remaining_draws": max(0, max_draws - draw_count),
                "drawn_presets": drawn_presets,
                "current_preset": drawn_presets[-1] if drawn_presets else None
            }

    def draw_preset(self, client_id: str, date_str: Optional[str] = None, max_draws: int = 3) -> Tuple[bool, Optional[Dict[str, Any]], Dict[str, Any], str]:
        """执行抽卡（换一批）操作"""
        date = date_str or get_current_beijing_date()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 读取当前配额
            cursor.execute(
                "SELECT draw_count, drawn_preset_ids FROM daily_draw_quota WHERE client_id = ? AND date = ?",
                (client_id, date)
            )
            row = cursor.fetchone()
            draw_count = row["draw_count"] if row else 0
            drawn_ids = json.loads(row["drawn_preset_ids"] or "[]") if row else []

            if draw_count >= max_draws:
                status = self.get_daily_draw_status(client_id, date, max_draws)
                return False, None, status, "今日抽卡次数已用尽（每日限 3 次）"

            # 从池中选一个今日未抽过的有效预设
            if drawn_ids:
                placeholders = ",".join("?" for _ in drawn_ids)
                cursor.execute(
                    f"SELECT * FROM preset_pool WHERE is_active = 1 AND id NOT IN ({placeholders}) ORDER BY RANDOM() LIMIT 1",
                    drawn_ids
                )
            else:
                cursor.execute("SELECT * FROM preset_pool WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1")
            
            new_row = cursor.fetchone()
            if not new_row:
                # 池子抽空了，循环随机
                cursor.execute("SELECT * FROM preset_pool WHERE is_active = 1 ORDER BY RANDOM() LIMIT 1")
                new_row = cursor.fetchone()

            if not new_row:
                status = self.get_daily_draw_status(client_id, date, max_draws)
                return False, None, status, "预设盲盒池暂无可用剧本"

            drawn_preset = self._format_preset_row(new_row)
            drawn_ids.append(drawn_preset["id"])
            new_draw_count = draw_count + 1
            now_ts = int(time.time())

            cursor.execute("""
            INSERT INTO daily_draw_quota (client_id, date, draw_count, drawn_preset_ids, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(client_id, date) DO UPDATE SET
                draw_count = excluded.draw_count,
                drawn_preset_ids = excluded.drawn_preset_ids,
                updated_at = excluded.updated_at
            """, (client_id, date, new_draw_count, json.dumps(drawn_ids), now_ts))

            # 增加抽取计数
            cursor.execute("UPDATE preset_pool SET times_drawn = times_drawn + 1 WHERE id = ?", (drawn_preset["id"],))
            conn.commit()

            status = self.get_daily_draw_status(client_id, date, max_draws)
            return True, drawn_preset, status, "抽取成功"

    def record_preset_installed(self, preset_id: str):
        """记录预设被用户本地安装次数"""
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE preset_pool SET times_installed = times_installed + 1 WHERE id = ?",
                (preset_id,)
            )
            conn.commit()

    def import_presets(self, presets: List[Dict[str, Any]]) -> int:
        """批量导入或更新预设池"""
        count = 0
        now_str = datetime.now(BEIJING_TZ).strftime("%Y-%m-%d %H:%M:%S")
        with self.get_connection() as conn:
            cursor = conn.cursor()
            for p in presets:
                pid = p.get("id") or hashlib.md5(p.get("title", "").encode("utf-8")).hexdigest()[:12]
                title = p.get("title", "未命名剧本")
                author = p.get("author", "haide")
                is_nsfw = 1 if p.get("is_nsfw") else 0
                tags = json.dumps(p.get("tags", []), ensure_ascii=False)
                summary = p.get("summary", "")
                preview_dialogue = json.dumps(p.get("preview_dialogue", []), ensure_ascii=False)
                preset_data = json.dumps(p.get("preset_data", {}), ensure_ascii=False)
                category = p.get("category", "phone_call")
                is_featured = 1 if p.get("is_featured") else 0

                cursor.execute("""
                INSERT INTO preset_pool (id, category, title, author, is_nsfw, tags, summary, preview_dialogue, preset_data, is_active, is_featured, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    category = excluded.category,
                    title = excluded.title,
                    author = excluded.author,
                    is_nsfw = excluded.is_nsfw,
                    tags = excluded.tags,
                    summary = excluded.summary,
                    preview_dialogue = excluded.preview_dialogue,
                    preset_data = excluded.preset_data,
                    is_featured = excluded.is_featured
                """, (pid, category, title, author, is_nsfw, tags, summary, preview_dialogue, preset_data, is_featured, now_str))
                count += 1
            conn.commit()
        return count

    def get_dashboard_stats(self) -> Dict[str, Any]:
        """获取管理员看板的核心聚合统计数据"""
        today = get_current_beijing_date()
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. 今日 DAU
            cursor.execute("SELECT COUNT(DISTINCT client_id) FROM telemetry_logs WHERE date = ?", (today,))
            dau_today = cursor.fetchone()[0]

            # 2. 昨日 DAU
            yesterday = (datetime.now(BEIJING_TZ) - timedelta(days=1)).strftime("%Y-%m-%d")
            cursor.execute("SELECT COUNT(DISTINCT client_id) FROM telemetry_logs WHERE date = ?", (yesterday,))
            dau_yesterday = cursor.fetchone()[0]

            # 3. 历史累计独立设备数
            cursor.execute("SELECT COUNT(DISTINCT client_id) FROM telemetry_logs")
            total_unique_devices = cursor.fetchone()[0]

            # 4. 近 30 天 DAU 趋势
            cursor.execute("""
            SELECT date, COUNT(DISTINCT client_id) as dau
            FROM telemetry_logs
            GROUP BY date
            ORDER BY date DESC
            LIMIT 30
            """)
            dau_trend = [{"date": r["date"], "dau": r["dau"]} for r in cursor.fetchall()]
            dau_trend.reverse()

            # 5. 插件版本占比
            cursor.execute("""
            SELECT version, COUNT(DISTINCT client_id) as count
            FROM telemetry_logs
            GROUP BY version
            ORDER BY count DESC
            """)
            version_stats = [{"version": r["version"], "count": r["count"]} for r in cursor.fetchall()]

            # 6. 今日抽卡总次数
            cursor.execute("SELECT SUM(draw_count) FROM daily_draw_quota WHERE date = ?", (today,))
            sum_draws = cursor.fetchone()[0] or 0

            # 7. 热门盲盒 Top 10
            cursor.execute("""
            SELECT id, title, author, is_nsfw, times_drawn, times_installed
            FROM preset_pool
            ORDER BY times_drawn DESC
            LIMIT 10
            """)
            top_presets = [dict(r) for r in cursor.fetchall()]

            # 8. 预设池总量
            cursor.execute("SELECT COUNT(*) FROM preset_pool WHERE is_active = 1")
            pool_total = cursor.fetchone()[0]

            return {
                "dau_today": dau_today,
                "dau_yesterday": dau_yesterday,
                "total_unique_devices": total_unique_devices,
                "dau_trend": dau_trend,
                "version_stats": version_stats,
                "today_total_draws": sum_draws,
                "pool_total": pool_total,
                "top_presets": top_presets
            }

    def _format_preset_row(self, row: sqlite3.Row) -> Dict[str, Any]:
        """将数据库行转换为清晰的标准 JSON 结构"""
        return {
            "id": row["id"],
            "category": row["category"],
            "title": row["title"],
            "author": row["author"],
            "is_nsfw": bool(row["is_nsfw"]),
            "tags": json.loads(row["tags"] or "[]"),
            "summary": row["summary"],
            "preview_dialogue": json.loads(row["preview_dialogue"] or "[]"),
            "preset_data": json.loads(row["preset_data"] or "{}"),
            "created_at": row["created_at"],
            "times_drawn": row["times_drawn"],
            "times_installed": row["times_installed"]
        }
