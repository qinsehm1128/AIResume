from tortoise import Tortoise
from tortoise.backends.sqlite.client import SqliteClient
from app.config import settings
import os


TORTOISE_ORM = {
    "connections": {"default": settings.DATABASE_URL},
    "apps": {
        "models": {
            "models": ["app.models.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}


async def migrate_database():
    """手动迁移数据库，添加缺失的列"""
    conn = Tortoise.get_connection("default")

    # 定义需要检查/添加的列
    migrations = [
        ("resumes", "template_ast", "TEXT DEFAULT '{}'"),
        ("resumes", "template_id", "INTEGER REFERENCES templates(id)"),
        # LLM 配置多 API 支持
        ("llm_configs", "name", "VARCHAR(100) DEFAULT '默认配置'"),
        ("llm_configs", "available_models", "TEXT DEFAULT '[]'"),
        ("llm_configs", "is_active", "INTEGER DEFAULT 0"),
    ]

    for table, column, column_def in migrations:
        try:
            # 检查列是否存在
            result = await conn.execute_query(
                f"SELECT * FROM pragma_table_info('{table}') WHERE name='{column}'"
            )
            if not result[1]:  # 列不存在
                await conn.execute_query(
                    f"ALTER TABLE {table} ADD COLUMN {column} {column_def}"
                )
                print(f"Added column {column} to {table}")
        except Exception as e:
            print(f"Migration warning for {table}.{column}: {e}")


async def init_db():
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)

    await Tortoise.init(config=TORTOISE_ORM)
    await Tortoise.generate_schemas()

    # 运行迁移
    await migrate_database()


async def close_db():
    await Tortoise.close_connections()
