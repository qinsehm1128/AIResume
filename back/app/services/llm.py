from langchain_openai import ChatOpenAI
from app.models import LLMConfig
from app.config import settings
from typing import Optional


def normalize_base_url(url: Optional[str]) -> Optional[str]:
    """Normalize the base URL for OpenAI-compatible APIs"""
    if not url:
        return None

    # Remove trailing slashes
    url = url.rstrip("/")

    # Some APIs need /v1, some don't - let the user decide
    # Just ensure the URL is clean
    return url


async def get_llm_client() -> Optional[ChatOpenAI]:
    """Get LLM client with current configuration"""
    config = await LLMConfig.first()

    api_key = config.api_key if config else settings.LLM_API_KEY
    base_url = config.base_url if config else settings.LLM_BASE_URL
    model_name = config.model_name if config else settings.LLM_MODEL_NAME

    if not api_key:
        return None

    # Normalize the base URL
    normalized_url = normalize_base_url(base_url)

    return ChatOpenAI(
        api_key=api_key,
        base_url=normalized_url,
        model=model_name,
        temperature=0.7,
        max_tokens=8192,  # 确保有足够的 token 生成完整的 JSON
    )
