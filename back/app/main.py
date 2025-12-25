from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, close_db
from app.api import (
    auth_router,
    llm_config_router,
    resume_router,
    chat_router,
    upload_router,
    export_router,
    template_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title="AI Resume Generator",
    description="AI-powered resume editor with LangGraph",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(llm_config_router)
app.include_router(resume_router)
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(export_router)
app.include_router(template_router)


@app.get("/")
async def root():
    return {"message": "AI Resume Generator API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
