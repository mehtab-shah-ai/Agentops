import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.auth.jwt_handler import decode_access_token
from app.auth.router import router as auth_router
from app.config import settings
from app.dashboard.router import router as dashboard_router
from app.database import init_db
from app.traces.router import router as traces_router
from app.websocket import ws_manager

# Logging setup
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agentops.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database
    logger.info("Initializing database...")
    await init_db()
    logger.info("AgentOps Backend started successfully.")
    yield
    # Shutdown
    logger.info("AgentOps Backend shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Production-grade AI-Agent Reliability, Evaluation & Cost-Observability Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Sub-Routers
app.include_router(auth_router)
app.include_router(traces_router)
app.include_router(dashboard_router)


# ------------------------------------------------------------------------------
# WebSocket Live Dashboard Endpoint
# ------------------------------------------------------------------------------
@app.websocket("/ws/dashboard")
async def websocket_dashboard_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    Live WebSocket feed for streaming trace events, failure alerts, and latency stats.
    Requires a valid JWT token via query parameter: `/ws/dashboard?token=<JWT>`.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload["sub"]
    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            # Keep-alive loop
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"event":"pong"}')
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.warning(f"WebSocket error for user {user_id}: {e}")
        await ws_manager.disconnect(websocket, user_id)


# ------------------------------------------------------------------------------
# Health Check & Root Endpoints
# ------------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "online",
    }
