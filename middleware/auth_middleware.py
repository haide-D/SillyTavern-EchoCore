"""
安全鉴权中间件 (AuthMiddleware)
用于保护公网暴露环境下的 API 与管理控制台，防止未授权访问与盗刷 API 额度。
"""

from urllib.parse import unquote
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from config import get_security_settings, verify_auth_token


class AuthMiddleware(BaseHTTPMiddleware):
    """
    全局安全鉴权拦截中间件
    """

    # 免鉴权的静态与公开路径前缀
    EXEMPT_PREFIXES = (
        "/static",
        "/frontend",
        "/admin",
        "/docs",
        "/openapi.json",
        "/favicon.ico",
        "/auto_call_audio",
        "/api/audio/eavesdrop",
        "/avatars",
        "/favorites",
        "/api/themes/assets"
    )

    # 免鉴权的公开 API / 页面
    EXEMPT_PATHS = {
        "/admin",
        "/admin/",
        "/admin/index.html",
        "/api/auth/status",
        "/api/auth/login",
    }

    async def dispatch(self, request: Request, call_next):
        # 1. 预检请求 (CORS OPTIONS) 直接放行交给 CORSMiddleware 处理
        if request.method == "OPTIONS":
            return await call_next(request)

        path = unquote(request.url.path)

        # 2. 检查是否为静态资源或登录相关公开接口
        if path in self.EXEMPT_PATHS or any(path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES):
            return await call_next(request)

        # 3. 检查系统是否启用了安全防护
        sec = get_security_settings()
        if not sec["enabled"] and not sec["admin_password"] and not sec["api_token"]:
            return await call_next(request)

        # 4. 提取客户端提供的凭据 Token
        token = ""

        # A. 从 Authorization: Bearer <token> 提取
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

        # B. 从 X-Api-Token 自定义请求头提取
        if not token:
            token = request.headers.get("x-api-token", "").strip()

        # C. 从 URL Query 参数 (?token=xxx) 提取 (适配浏览器原生 <audio> 请求)
        if not token:
            token = request.query_params.get("token", "").strip()

        # 5. 校验 Token
        if not verify_auth_token(token):
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Unauthorized: 访问受限，请提供正确的 API Token 或管理员登录密码",
                    "code": 401,
                    "auth_required": True
                }
            )

        return await call_next(request)
