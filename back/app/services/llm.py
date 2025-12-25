from langchain_openai import ChatOpenAI
from app.models import LLMConfig
from app.config import settings
from typing import Optional


async def get_llm_client() -> Optional[ChatOpenAI]:
    """Get LLM client with current configuration"""
    config = await LLMConfig.first()

    api_key = config.api_key if config else settings.LLM_API_KEY
    base_url = config.base_url if config else settings.LLM_BASE_URL
    model_name = config.model_name if config else settings.LLM_MODEL_NAME

    if not api_key:
        return None

    return ChatOpenAI(
        api_key=api_key,
        base_url=base_url,
        model=model_name,
        temperature=0.7,
    )
