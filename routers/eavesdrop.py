"""
对话追踪 API 路由

提供场景分析、Prompt 构建、音频生成等接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional

from services.scene_analyzer import SceneAnalyzer
from services.eavesdrop_service import EavesdropService
from database import DatabaseManager

router = APIRouter()
scene_analyzer = SceneAnalyzer()
eavesdrop_service = EavesdropService()
db = DatabaseManager()


# ==================== 请求模型 ====================

class AnalyzeSceneRequest(BaseModel):
    """场景分析请求"""
    context: List[Dict]       # 对话上下文
    speakers: List[str]       # 可用角色列表
    max_context_messages: int = 10


class BuildEavesdropPromptRequest(BaseModel):
    """构建对话追踪 Prompt 请求"""
    context: List[Dict]       # 对话上下文
    speakers: List[str]       # 参与角色列表
    user_name: str = "用户"
    text_lang: str = "zh"
    max_context_messages: int = 20
    preset_id: Optional[str] = None
    prompt_template: Optional[str] = None
    target: Optional[str] = None
    theme: Optional[str] = None
    call_reason: Optional[str] = None
    call_tone: Optional[str] = None
    character_persona: Optional[str] = None
    world_info: Optional[str] = None
    story_summary: Optional[str] = None
    chat_branch: Optional[str] = None


class ParseEavesdropRequest(BaseModel):
    """解析并生成对话追踪音频请求 (工坊测试用)"""
    llm_response: str
    speakers: List[str]
    text_lang: Optional[str] = "zh"
    chat_branch: Optional[str] = None
    context_fingerprint: Optional[str] = None
    trigger_floor: Optional[int] = None
    scene_description: Optional[str] = None


class CompleteEavesdropRequest(BaseModel):
    """完成对话追踪生成请求"""
    record_id: int            # 记录ID (由 EavesdropScheduler 创建)
    llm_response: str         # LLM 响应
    chat_branch: str          # 对话分支
    speakers: List[str]       # 说话人列表
    char_name: str = None     # 主角色名称
    text_lang: str = "zh"


# ==================== API 端点 ====================

@router.post("/analyze")
async def analyze_scene(req: AnalyzeSceneRequest):
    """
    分析当前场景状态
    
    判断是否有角色离开（适合打电话）或多个角色在场（适合私聊）
    """
    try:
        result = await eavesdrop_service.analyze_scene(
            context=req.context,
            speakers=req.speakers,
            char_name=req.char_name,
            call_history=req.call_history,
            user_name=req.user_name
        )
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/build_prompt")
async def build_eavesdrop_prompt(req: BuildEavesdropPromptRequest):
    """
    构建对话追踪 LLM Prompt
    
    前端拿到 Prompt 后自行调用 LLM 生成，再调 complete_generation
    """
    try:
        from services.emotion_service import EmotionService
        emotion_service = EmotionService()
        speakers_emotions = {}
        for speaker in req.speakers:
            try:
                emotions = emotion_service.get_available_emotions(speaker)
                speakers_emotions[speaker] = emotions
            except Exception as e:
                speakers_emotions[speaker] = ["default", "neutral"]

        result = await eavesdrop_service.build_prompt(
            context=req.context,
            speakers=req.speakers,
            user_name=req.user_name,
            theme=req.call_reason or req.theme,
            preset_id=req.preset_id,
            prompt_template=req.prompt_template,
            target=req.target,
            call_reason=req.call_reason,
            call_tone=req.call_tone,
            character_persona=req.character_persona,
            world_info=req.world_info,
            story_summary=req.story_summary,
            chat_branch=req.chat_branch,
            text_lang=req.text_lang
        )
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse_and_generate")
async def parse_and_generate_eavesdrop(req: ParseEavesdropRequest):
    """
    解析 LLM 响应并即时生成对话追踪多角色音频 (剧本工坊即时测试用)
    """
    try:
        from services.emotion_service import EmotionService
        emotion_service = EmotionService()
        speakers_emotions = {}
        for speaker in req.speakers:
            try:
                emotions = emotion_service.get_available_emotions(speaker)
                speakers_emotions[speaker] = emotions
            except Exception as e:
                speakers_emotions[speaker] = ["default", "neutral"]

        result = await eavesdrop_service.complete_generation(
            llm_response=req.llm_response,
            speakers_emotions=speakers_emotions,
            text_lang=req.text_lang or "zh"
        )

        record_id = None
        if req.chat_branch or req.context_fingerprint:
            import time
            branch = req.chat_branch or "default"
            fp = req.context_fingerprint or f"manual_eavesdrop_{int(time.time())}"
            floor = req.trigger_floor or 1
            try:
                record_id = db.create_eavesdrop(
                    chat_branch=branch,
                    context_fingerprint=fp,
                    speakers=req.speakers,
                    segments=result.get("segments", []),
                    scene_description=req.scene_description or f"私下对话: {', '.join(req.speakers)}",
                    audio_path=result.get("audio_path", ""),
                    audio_url=result.get("audio_url", ""),
                    trigger_floor=floor,
                    status="completed"
                )
                if record_id:
                    print(f"[Eavesdrop API] ✅ 已持久化窃听记录至数据库 ID: {record_id}")
            except Exception as db_err:
                print(f"[Eavesdrop API] ⚠️ 写入窃听记录失败: {db_err}")

        return {
            "status": "success",
            "record_id": record_id,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete_generation")
async def complete_eavesdrop_generation(req: CompleteEavesdropRequest):
    """
    完成对话追踪生成
    
    解析 LLM 响应并生成音频
    """
    record_id = req.record_id
    
    try:
        print(f"[Eavesdrop API] 完成生成: record_id={record_id}, speakers={req.speakers}")
        
        # ✅ 检查 record 状态，防止重复处理
        record = db.get_eavesdrop_record(record_id)
        if record:
            status = record.get("status")
            # 已完成：直接返回已有结果
            if status == "completed":
                print(f"[Eavesdrop API] ⚠️ record_id={record_id} 已完成，跳过重复请求")
                return {
                    "record_id": record_id,
                    "status": "already_completed",
                    "audio_url": record.get("audio_url"),
                    "segments": record.get("segments", [])
                }
            # 正在生成：返回等待状态，不重复处理
            if status == "generating":
                print(f"[Eavesdrop API] ⚠️ record_id={record_id} 正在生成中，跳过重复请求")
                return {
                    "record_id": record_id,
                    "status": "already_generating",
                    "message": "Generation in progress, please wait"
                }
        
        # ✅ 立即更新状态为 generating，防止并发重复
        db.update_eavesdrop_status(record_id=record_id, status="generating")
        
        # 构建 speakers_emotions (每个说话人使用默认情绪列表)
        # TODO: 后续可以从数据库记录中获取更详细的情绪映射
        speakers_emotions = {}
        for speaker in req.speakers:
            try:
                from services.emotion_service import EmotionService
                emotion_service = EmotionService()
                emotions = emotion_service.get_available_emotions(speaker)
                speakers_emotions[speaker] = emotions
            except Exception as e:
                print(f"[Eavesdrop API] ⚠️ 获取 {speaker} 情绪失败: {e}")
                speakers_emotions[speaker] = ["default", "neutral"]
        
        print(f"[Eavesdrop API] speakers_emotions: {speakers_emotions}")
        
        # 生成音频
        result = await eavesdrop_service.complete_generation(
            llm_response=req.llm_response,
            speakers_emotions=speakers_emotions,
            text_lang=req.text_lang
        )
        
        # 更新记录状态
        db.update_eavesdrop_status(
            record_id=record_id,
            status="completed",
            audio_path=result.get("audio_path"),
            audio_url=result.get("audio_url"),
            segments=result.get("segments", [])
        )
        
        print(f"[Eavesdrop API] ✅ 生成完成: record_id={record_id}")
        
        # 通过 WebSocket 通知前端 (触发悬浮球震动和对话效果)
        from services.notification_service import NotificationService
        
        ws_target = req.char_name if req.char_name else (req.speakers[0] if req.speakers else "Unknown")
        print(f"[Eavesdrop API] 📤 通知前端: ws_target={ws_target}")
        
        notification_service = NotificationService()
        await notification_service.notify_eavesdrop_ready(
            char_name=ws_target,
            record_id=record_id,
            speakers=req.speakers,
            segments=result.get("segments", []),
            audio_url=result.get("audio_url"),
            scene_description=None  # 可从记录获取
        )
        
        return {
            "record_id": record_id,
            **result
        }
        
    except Exception as e:
        print(f"[Eavesdrop API] ❌ 生成失败: {e}")
        # 生成失败，更新状态
        db.update_eavesdrop_status(
            record_id=record_id,
            status="failed",
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_eavesdrop_general_history(chat_branch: Optional[str] = None, limit: int = 50):
    """获取对话追踪通用历史记录 (支持分支过滤或全量历史)"""
    try:
        history = db.get_eavesdrop_history(chat_branch, limit)
        return {
            "status": "success",
            "history": history,
            "records": history,
            "count": len(history),
            "total": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{chat_branch}")
async def get_eavesdrop_history(chat_branch: str, limit: int = 50):
    """获取指定分支的对话追踪历史记录"""
    try:
        history = db.get_eavesdrop_history(chat_branch, limit)
        return {
            "status": "success",
            "history": history,
            "records": history,
            "count": len(history),
            "total": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
