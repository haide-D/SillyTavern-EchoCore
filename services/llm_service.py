import httpx
from typing import Dict, List, Optional, Any


class LLMService:
    """LLM 交互与服务端中转代理服务"""

    @staticmethod
    async def fetch_models(api_url: str, api_key: str = "") -> List[str]:
        """
        通过服务端代理获取远程 LLM 模型的可用列表 (规避浏览器跨域 CORS 拦截)
        """
        if not api_url:
            raise ValueError("缺少 API 地址")

        # 提取 Base URL 并构建 /models 路径
        base_url = api_url.strip().replace("/chat/completions", "").rstrip("/")
        models_url = f"{base_url}/models"

        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        print(f"[LLMService] 服务端代理拉取模型: {models_url}")
        async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
            try:
                resp = await client.get(models_url, headers=headers)
                if resp.status_code != 200:
                    error_detail = resp.text[:300]
                    print(f"[LLMService] ❌ 获取模型失败 HTTP {resp.status_code}: {error_detail}")
                    raise Exception(f"远程接口返回 HTTP {resp.status_code}: {error_detail}")

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

                # 过滤并去重
                seen = set()
                deduped = []
                for m in models:
                    if m and m not in seen:
                        seen.add(m)
                        deduped.append(m)

                print(f"[LLMService] ✅ 成功拉取到 {len(deduped)} 个可用模型")
                return deduped

            except httpx.RequestError as e:
                print(f"[LLMService] ❌ 网络连接错误: {str(e)}")
                raise Exception(f"连接远程 API 失败: {str(e)}")

    @staticmethod
    async def call(config: Dict, prompt: str) -> str:
        """
        调用 LLM API 并返回响应文本
        """
        api_url = config.get("api_url")
        api_key = config.get("api_key", "")
        model = config.get("model", "gpt-3.5-turbo")
        temperature = config.get("temperature", 0.7)
        max_tokens = config.get("max_tokens")

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

        print(f"[LLMService] 请求 URL: {api_url}, 模型: {model}")
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            try:
                resp = await client.post(api_url, headers=headers, json=request_body)
                if resp.status_code != 200:
                    error_text = resp.text[:400]
                    raise Exception(f"HTTP {resp.status_code}: {error_text}")

                data = resp.json()
                return LLMService.parse_response(data)

            except httpx.RequestError as e:
                raise Exception(f"请求失败: {str(e)}")

    @staticmethod
    async def chat_completion(
        api_url: str,
        api_key: str = "",
        model: str = "gpt-3.5-turbo",
        messages: List[Dict[str, Any]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        extra_body: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        通用 Chat Completion 服务端代理转发
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

        async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as client:
            try:
                resp = await client.post(api_url, headers=headers, json=request_body)
                if resp.status_code != 200:
                    raise Exception(f"HTTP {resp.status_code}: {resp.text[:400]}")
                return resp.json()
            except httpx.RequestError as e:
                raise Exception(f"代理请求失败: {str(e)}")

    @staticmethod
    def parse_response(data: Dict) -> str:
        """
        解析多种格式的 LLM 响应
        """
        content = None

        if data.get("choices") and len(data["choices"]) > 0:
            message = data["choices"][0].get("message", {})
            if message.get("content"):
                content = message["content"].strip()
            elif message.get("reasoning_content"):
                content = message["reasoning_content"].strip()
            elif data["choices"][0].get("text"):
                content = data["choices"][0]["text"].strip()

        if not content and data.get("content"):
            content = data["content"].strip()

        if not content and data.get("output"):
            content = data["output"].strip()

        if not content and data.get("response"):
            content = data["response"].strip()

        if not content and data.get("result"):
            result = data["result"]
            content = result.strip() if isinstance(result, str) else str(result)

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

