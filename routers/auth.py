"""
认证与安全路由 (Auth Router)
提供控制台登录校验与鉴权状态查询接口
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from config import get_security_settings, verify_auth_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    password: str


@router.get("/status")
async def get_auth_status(request: Request):
    """
    查询当前系统的安全防护状态及当前请求是否已通过认证
    """
    sec = get_security_settings()
    auth_required = sec["enabled"] or bool(sec["admin_password"] or sec["api_token"])

    # 检查当前请求头是否已携带有效凭证
    auth_header = request.headers.get("authorization", "")
    token = auth_header[7:].strip() if auth_header.lower().startswith("bearer ") else request.headers.get("x-api-token", "").strip()
    is_authenticated = verify_auth_token(token) if auth_required else True

    return {
        "auth_required": auth_required,
        "is_authenticated": is_authenticated,
        "has_password": bool(sec["admin_password"]),
        "has_token": bool(sec["api_token"])
    }


@router.post("/login")
async def login(req: LoginRequest):
    """
    管理员密码登录验证
    """
    sec = get_security_settings()
    admin_pass = sec["admin_password"].strip()

    if not admin_pass:
        # 如果未设置管理员密码但设置了 API Token，允许使用 API Token 登录
        if sec["api_token"] and req.password.strip() == sec["api_token"].strip():
            return {
                "success": True,
                "token": sec["api_token"].strip(),
                "message": "登录成功"
            }
        # 如果均未设置，直接成功
        return {
            "success": True,
            "token": "open",
            "message": "未启用密码保护"
        }

    if req.password.strip() == admin_pass:
        return {
            "success": True,
            "token": admin_pass,
            "message": "管理员认证成功"
        }

    raise HTTPException(status_code=401, detail="密码错误，请重新输入")
