from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas import LLMConfigRequest, LLMConfigResponse, LLMConfigUpdate, SetActiveModelRequest
from app.models import LLMConfig

router = APIRouter(prefix="/api/llm-config", tags=["llm-config"])


@router.get("", response_model=List[LLMConfigResponse])
async def list_llm_configs():
    """Get all LLM configurations"""
    configs = await LLMConfig.all().order_by("-is_active", "-updated_at")
    return [
        LLMConfigResponse(
            id=c.id,
            name=c.name,
            base_url=c.base_url,
            model_name=c.model_name,
            available_models=c.available_models or [],
            is_active=c.is_active,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in configs
    ]


@router.get("/active", response_model=LLMConfigResponse | None)
async def get_active_config():
    """Get the currently active LLM configuration"""
    config = await LLMConfig.filter(is_active=True).first()
    if not config:
        # 如果没有激活的配置，返回第一个配置
        config = await LLMConfig.first()
    if not config:
        return None
    return LLMConfigResponse(
        id=config.id,
        name=config.name,
        base_url=config.base_url,
        model_name=config.model_name,
        available_models=config.available_models or [],
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.get("/{config_id}", response_model=LLMConfigResponse)
async def get_llm_config(config_id: int):
    """Get a specific LLM configuration"""
    config = await LLMConfig.get_or_none(id=config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return LLMConfigResponse(
        id=config.id,
        name=config.name,
        base_url=config.base_url,
        model_name=config.model_name,
        available_models=config.available_models or [],
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("", response_model=LLMConfigResponse)
async def create_llm_config(request: LLMConfigRequest):
    """Create a new LLM configuration"""
    # 如果设置为激活，先取消其他配置的激活状态
    if request.is_active:
        await LLMConfig.all().update(is_active=False)

    # 如果是第一个配置，自动设为激活
    count = await LLMConfig.all().count()
    is_active = request.is_active or count == 0

    config = await LLMConfig.create(
        name=request.name,
        base_url=request.base_url,
        api_key=request.api_key,
        model_name=request.model_name,
        available_models=request.available_models,
        is_active=is_active,
    )
    return LLMConfigResponse(
        id=config.id,
        name=config.name,
        base_url=config.base_url,
        model_name=config.model_name,
        available_models=config.available_models or [],
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.put("/{config_id}", response_model=LLMConfigResponse)
async def update_llm_config(config_id: int, request: LLMConfigUpdate):
    """Update an existing LLM configuration"""
    config = await LLMConfig.get_or_none(id=config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    # 如果设置为激活，先取消其他配置的激活状态
    if request.is_active:
        await LLMConfig.all().update(is_active=False)

    # 更新字段
    if request.name is not None:
        config.name = request.name
    if request.base_url is not None:
        config.base_url = request.base_url
    if request.api_key is not None:
        config.api_key = request.api_key
    if request.model_name is not None:
        config.model_name = request.model_name
    if request.available_models is not None:
        config.available_models = request.available_models
    if request.is_active is not None:
        config.is_active = request.is_active

    await config.save()

    return LLMConfigResponse(
        id=config.id,
        name=config.name,
        base_url=config.base_url,
        model_name=config.model_name,
        available_models=config.available_models or [],
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.delete("/{config_id}")
async def delete_llm_config(config_id: int):
    """Delete an LLM configuration"""
    config = await LLMConfig.get_or_none(id=config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    was_active = config.is_active
    await config.delete()

    # 如果删除的是激活的配置，激活第一个可用的配置
    if was_active:
        first_config = await LLMConfig.first()
        if first_config:
            first_config.is_active = True
            await first_config.save()

    return {"message": "Configuration deleted"}


@router.post("/{config_id}/activate", response_model=LLMConfigResponse)
async def activate_config(config_id: int):
    """Set a configuration as active"""
    config = await LLMConfig.get_or_none(id=config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    # 取消其他配置的激活状态
    await LLMConfig.all().update(is_active=False)

    # 激活当前配置
    config.is_active = True
    await config.save()

    return LLMConfigResponse(
        id=config.id,
        name=config.name,
        base_url=config.base_url,
        model_name=config.model_name,
        available_models=config.available_models or [],
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("/set-model", response_model=LLMConfigResponse)
async def set_active_model(request: SetActiveModelRequest):
    """Set the active model for a configuration"""
    config = await LLMConfig.get_or_none(id=request.config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    config.model_name = request.model_name
    await config.save()

    return LLMConfigResponse(
        id=config.id,
        name=config.name,
        base_url=config.base_url,
        model_name=config.model_name,
        available_models=config.available_models or [],
        is_active=config.is_active,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )
