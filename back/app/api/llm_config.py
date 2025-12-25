from fastapi import APIRouter, HTTPException
from app.schemas import LLMConfigRequest, LLMConfigResponse
from app.models import LLMConfig

router = APIRouter(prefix="/api/llm-config", tags=["llm-config"])


@router.get("", response_model=LLMConfigResponse | None)
async def get_llm_config():
    """Get current LLM configuration"""
    config = await LLMConfig.first()
    if not config:
        return None
    return LLMConfigResponse(
        id=config.id,
        base_url=config.base_url,
        model_name=config.model_name,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("", response_model=LLMConfigResponse)
async def save_llm_config(request: LLMConfigRequest):
    """Save or update LLM configuration"""
    config = await LLMConfig.first()
    if config:
        config.base_url = request.base_url
        config.api_key = request.api_key
        config.model_name = request.model_name
        await config.save()
    else:
        config = await LLMConfig.create(
            base_url=request.base_url,
            api_key=request.api_key,
            model_name=request.model_name,
        )
    return LLMConfigResponse(
        id=config.id,
        base_url=config.base_url,
        model_name=config.model_name,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.delete("")
async def delete_llm_config():
    """Delete LLM configuration"""
    await LLMConfig.all().delete()
    return {"message": "LLM configuration deleted"}
