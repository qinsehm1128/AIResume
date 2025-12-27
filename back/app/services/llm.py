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


async def get_llm_client(config_id: Optional[int] = None, model_name: Optional[str] = None) -> Optional[ChatOpenAI]:
    """
    Get LLM client with configuration.

    Args:
        config_id: Specific config to use. If None, uses active config.
        model_name: Override model name. If None, uses config's default model.
    """
    config = None

    if config_id:
        config = await LLMConfig.get_or_none(id=config_id)

    if not config:
        # 获取激活的配置
        config = await LLMConfig.filter(is_active=True).first()

    if not config:
        # 没有激活的配置，使用第一个
        config = await LLMConfig.first()

    api_key = config.api_key if config else settings.LLM_API_KEY
    base_url = config.base_url if config else settings.LLM_BASE_URL

    # 使用指定的模型名，或者配置的默认模型
    if model_name:
        used_model = model_name
    elif config:
        used_model = config.model_name
    else:
        used_model = settings.LLM_MODEL_NAME

    if not api_key:
        return None

    # Normalize the base URL
    normalized_url = normalize_base_url(base_url)

    return ChatOpenAI(
        api_key=api_key,
        base_url=normalized_url,
        model=used_model,
        temperature=0.7,
        max_tokens=8192,  # 确保有足够的 token 生成完整的 JSON
    )


async def get_active_config_info() -> Optional[dict]:
    """Get information about the active configuration"""
    config = await LLMConfig.filter(is_active=True).first()
    if not config:
        config = await LLMConfig.first()

    if not config:
        return None

    return {
        "id": config.id,
        "name": config.name,
        "model_name": config.model_name,
        "available_models": config.available_models or [],
    }
