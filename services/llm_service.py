import asyncio
import httpx
from typing import Dict, List, Optional, Any

# 全局 LLM 请求配置: 6 分钟超时 (360s)，连接超时 30s
DEFAULT_TIMEOUT = httpx.Timeout(360.0, connect=30.0)
RETRYABLE_STATUS_CODES = {429, 503, 529}


class LLMService:
    """LLM 交互与服务端中转代理服务"""

    @staticmethod
    async def fetch_models(api_url: str, api_key: str = "", max_retries: int = 2) -> Dict[str, Any]:
        """
        通过服务端代理获取远程 LLM 模型的可用列表 (规避浏览器跨域 CORS 拦截并兼容 404 无 /models 接口的代理网关)
        """
        if not api_url:
            raise ValueError("缺少 API 地址")

        # 提取 Base URL
        base_url = api_url.strip().replace("/chat/completions", "").rstrip("/")
        
        # 针对不同格式的代理网关准备候选模型路径列表
        candidate_urls = [
            f"{base_url}/models",
        ]
        if "/api/v1" in base_url:
            candidate_urls.append(f"{base_url.replace('/api/v1', '/v1')}/models")
            candidate_urls.append(f"{base_url.replace('/api/v1', '')}/v1/models")
            candidate_urls.append(f"{base_url.replace('/api/v1', '')}/models")
        elif "/v1" in base_url:
            candidate_urls.append(f"{base_url.replace('/v1', '')}/models")
        else:
            candidate_urls.append(f"{base_url}/v1/models")

        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        last_error = ""
        for attempt in range(1, max(1, max_retries) + 1):
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                for models_url in candidate_urls:
                    try:
                        print(f"[LLMService] 尝试服务端代理拉取模型 (第 {attempt} 轮): {models_url}")
                        resp = await client.get(models_url, headers=headers)
                        if resp.status_code == 200:
                            data = resp.json()
                            models = []
                            if isinstance(data, dict):
                                if "data" in data and isinstance(data["data"], list):
                                    models = [m.get("id") or m.get("name") if isinstance(m, dict) else str(m) for m in data["data"]]
                                elif "models" in data and isinstance(data["models"], list):
                                    models = [m.get("id") or m.get("name") if isinstance(m, dict) else str(m) for m in data["models"]]
                                elif "id" in data:
                                    models = [data["id"]]
                            elif isinstance(data, list):
                                models = [m.get("id") or m.get("name") if isinstance(m, dict) else str(m) for m in data]

                            seen = set()
                            deduped = []
                            for m in models:
                                if m and m not in seen:
                                    seen.add(m)
                                    deduped.append(m)

                            if deduped:
                                print(f"[LLMService] [OK] 成功拉取到 {len(deduped)} 个可用模型 ({models_url})")
                                return {
                                    "success": True,
                                    "models": deduped,
                                    "total": len(deduped),
                                    "is_fallback": False
                                }
                        else:
                            last_error = f"HTTP {resp.status_code}"
                    except Exception as e:
                        last_error = str(e)
            if attempt < max_retries:
                await asyncio.sleep(1.0)

        # 若远程接口未提供 /models 列表接口（如 api.cline.bot 等纯 Chat 代理服务返回 404）
        print(f"[LLMService] [INFO] 远程 API 未开放 /models 接口 ({last_error})，允许用户自由输入模型名称")
        return {
            "success": True,
            "models": [],
            "total": 0,
            "is_fallback": True,
            "message": f"远程服务未开放 /models 查询接口 ({last_error})，请直接在模型输入框中填写您要使用的模型名称（如 cline-pass/deepseek-v4-pro）"
        }


    @staticmethod
    async def call(config: Dict, prompt: str, max_retries: Optional[int] = None) -> str:
        """
        调用 LLM API 并返回响应文本 (6分钟全局超时；仅当遇到 429/503/529 等限流状态码时才重试，超时直接终止不重试)
        """
        api_url = config.get("api_url")
        api_key = config.get("api_key", "")
        model = config.get("model", "gpt-3.5-turbo")
        temperature = config.get("temperature", 0.7)
        max_tokens = config.get("max_tokens")

        retries = max_retries if max_retries is not None else config.get("max_retries", 2)
        try:
            retries = min(max(1, int(retries)), 3)
        except (ValueError, TypeError):
            retries = 2

        if not api_url:
            raise ValueError("缺少必要的 LLM 配置: api_url")

        if "/chat/completions" not in api_url:
            api_url = api_url.rstrip("/") + "/chat/completions"

        request_body = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "stream": False
        }
        if max_tokens:
            request_body["max_tokens"] = max_tokens

        headers = {
            "Content-Type": "application/json"
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        print(f"[LLMService] [REQUEST] 发起请求 -> URL: {api_url}, 模型: {model}, 限流重试上限: {retries}")

        last_error = ""
        for attempt in range(1, retries + 1):
            should_retry = False
            try:
                # 6 分钟单次超时 (360s)，给超大 RP 上下文和慢速生成充分的时间
                async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
                    resp = await client.post(api_url, headers=headers, json=request_body)
                    if resp.status_code == 200:
                        data = resp.json()
                        parsed = LLMService.parse_response(data)
                        if attempt > 1:
                            print(f"[LLMService] [OK] 第 {attempt} 次重试成功获取响应")
                        return parsed

                    error_text = resp.text[:400]
                    # 仅限流/暂时不可用状态码允许重试，其余错误直接抛出
                    if resp.status_code in RETRYABLE_STATUS_CODES:
                        should_retry = True
                        last_error = f"HTTP {resp.status_code} (上游限流/繁忙): {error_text}"
                    else:
                        raise Exception(f"HTTP {resp.status_code}: {error_text}")

            except httpx.TimeoutException as e:
                # 超时不重试，直接抛出异常
                print(f"[LLMService] [TIMEOUT] 远程 LLM 请求超时 (>360s): {str(e)}")
                raise Exception(f"远程 LLM 请求超时 (>360s): 模型生成耗时超过 6 分钟，已终止请求 ({type(e).__name__})")
            except httpx.RequestError as e:
                # 网络连接类异常直接抛出
                raise Exception(f"网络连接异常 ({type(e).__name__}): {str(e)}")
            except Exception as e:
                if not should_retry:
                    raise
                last_error = str(e)

            if should_retry and attempt < retries:
                delay = 2.0 * attempt
                print(f"[LLMService] [WARN] 第 {attempt}/{retries} 次调用触发限流 ({last_error})，将在 {delay:.1f}s 后进行第 {attempt + 1} 次重试...")
                await asyncio.sleep(delay)
            else:
                break

        raise Exception(f"LLM API 调用失败: 已尝试 {retries} 次 (最后错误: {last_error})")

    @staticmethod
    async def chat_completion(
        api_url: str,
        api_key: str = "",
        model: str = "gpt-3.5-turbo",
        messages: List[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        extra_body: Optional[Dict[str, Any]] = None,
        max_retries: int = 2
    ) -> Dict[str, Any]:
        """
        通用 Chat Completion 服务端代理转发 (6分钟超时；仅429/503/529限流时重试，超时直接终止不重试)
        """
        if not api_url:
            raise ValueError("缺少必要的 LLM 配置: api_url")

        if "/chat/completions" not in api_url:
            api_url = api_url.rstrip("/") + "/chat/completions"

        request_body = {
            "model": model,
            "messages": messages or [{"role": "user", "content": "Hi"}],
            "temperature": temperature,
            "stream": False
        }
        if max_tokens:
            request_body["max_tokens"] = max_tokens
        if extra_body:
            request_body.update(extra_body)

        headers = {
            "Content-Type": "application/json"
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        try:
            retries = min(max(1, int(max_retries or 2)), 3)
        except (ValueError, TypeError):
            retries = 2

        print(f"[LLMService] [REQUEST] 代理转发 -> URL: {api_url}, 模型: {model}, 限流重试上限: {retries}")

        last_error = ""
        for attempt in range(1, retries + 1):
            should_retry = False
            try:
                # 6 分钟单次超时 (360s)，超时直接抛出不进行二次盲等重试
                async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
                    resp = await client.post(api_url, headers=headers, json=request_body)
                    if resp.status_code == 200:
                        if attempt > 1:
                            print(f"[LLMService] [OK] 代理转发第 {attempt} 次重试成功")
                        return resp.json()

                    error_text = resp.text[:400]
                    # 仅限流/暂时不可用状态码允许重试
                    if resp.status_code in RETRYABLE_STATUS_CODES:
                        should_retry = True
                        last_error = f"HTTP {resp.status_code} (上游限流/繁忙): {error_text}"
                    else:
                        raise Exception(f"HTTP {resp.status_code}: {error_text}")

            except httpx.TimeoutException as e:
                # 超时不重试，直接抛出
                print(f"[LLMService] [TIMEOUT] 远程 LLM 代理转发超时 (>360s): {str(e)}")
                raise Exception(f"远程 LLM 响应超时 (>360s): 上游模型生成耗时超过 6 分钟，已终止请求 ({type(e).__name__})")
            except httpx.RequestError as e:
                raise Exception(f"代理请求网络异常 ({type(e).__name__}): {str(e)}")
            except Exception as e:
                if not should_retry:
                    raise
                last_error = str(e)

            if should_retry and attempt < retries:
                delay = 2.0 * attempt
                print(f"[LLMService] [WARN] 代理转发第 {attempt}/{retries} 次触发限流 ({last_error})，将在 {delay:.1f}s 后进行第 {attempt + 1} 次重试...")
                await asyncio.sleep(delay)
            else:
                break

        raise Exception(f"LLM 代理请求失败: 已尝试 {retries} 次 (最后错误: {last_error})")

    @staticmethod
    def parse_response(data: Any) -> str:
        """
        解析多种格式的 LLM 响应 (向下兼容 OpenAI、Claude、Gemini、Ollama 及各类二次包装中转网关)
        """
        if not data:
            raise ValueError("LLM 响应为空")

        if isinstance(data, str):
            trimmed = data.strip()
            if trimmed:
                return trimmed

        # 智能解包外层包装 (兼容 {"success": True, "data": {...}} 或 {"result": {...}} 等网关格式)
        target = data
        if isinstance(target, dict):
            if isinstance(target.get("data"), dict):
                inner = target["data"]
                if any(k in inner for k in ("choices", "content", "output", "response", "candidates", "message")):
                    target = inner
            elif isinstance(target.get("result"), dict):
                inner = target["result"]
                if any(k in inner for k in ("choices", "content", "output", "response", "candidates", "message")):
                    target = inner

        content = None

        if isinstance(target, dict):
            # 1. 标准 OpenAI 格式: choices[0].message.content
            choices = target.get("choices")
            if isinstance(choices, list) and len(choices) > 0 and isinstance(choices[0], dict):
                message = choices[0].get("message", {})
                if isinstance(message, dict):
                    if message.get("content"):
                        content = str(message["content"]).strip()
                    elif message.get("reasoning_content"):
                        content = str(message["reasoning_content"]).strip()
                if not content and choices[0].get("text"):
                    content = str(choices[0]["text"]).strip()

            # 2. Gemini 原生格式: candidates[0].content.parts[0].text
            if not content:
                candidates = target.get("candidates")
                if isinstance(candidates, list) and len(candidates) > 0 and isinstance(candidates[0], dict):
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if isinstance(parts, list) and len(parts) > 0 and isinstance(parts[0], dict):
                        if parts[0].get("text"):
                            content = str(parts[0]["text"]).strip()

            # 3. Claude 原生格式 或 直接 content 字段
            if not content and target.get("content"):
                raw_content = target["content"]
                if isinstance(raw_content, list):
                    texts = [str(item.get("text", "")) for item in raw_content if isinstance(item, dict) and item.get("text")]
                    if texts:
                        content = "\n".join(texts).strip()
                elif isinstance(raw_content, str):
                    content = raw_content.strip()

            # 4. Ollama chat: message.content
            if not content and isinstance(target.get("message"), dict) and target["message"].get("content"):
                content = str(target["message"]["content"]).strip()

            # 5. 通用 output 字段
            if not content and target.get("output"):
                raw_output = target["output"]
                if isinstance(raw_output, str):
                    content = raw_output.strip()
                elif isinstance(raw_output, dict) and raw_output.get("text"):
                    content = str(raw_output["text"]).strip()

            # 6. 通用 response 字段 (Ollama generate 模式)
            if not content and isinstance(target.get("response"), str):
                content = target["response"].strip()

            # 7. 通用 result 字段
            if not content and target.get("result"):
                raw_result = target["result"]
                content = raw_result.strip() if isinstance(raw_result, str) else str(raw_result)

        if not content:
            raise ValueError(f"无法解析 LLM 响应 (响应格式不兼容): {str(data)[:200]}")

        return content

    @staticmethod
    async def test_connection(config: Dict) -> Dict:
        """
        测试 LLM 连通性
        """
        test_prompt = config.get("test_prompt", "你好，请回复“连接成功”。")

        try:
            response = await LLMService.call(config, test_prompt)
            return {
                "status": "success",
                "message": "LLM 连接测试成功！",
                "config": {
                    "api_url": config.get("api_url"),
                    "model": config.get("model")
                },
                "response": response[:100]
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"LLM 连接测试失败: {str(e)}",
                "config": {
                    "api_url": config.get("api_url"),
                    "model": config.get("model")
                },
                "error_detail": str(e)
            }

