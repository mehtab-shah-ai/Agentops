"""
AgentGuard Backend Entrypoint Script
Run development or production server easily:
    python run.py [--port 8000] [--reload] [--workers 1]
"""

import argparse
import uvicorn
from app.config import settings


def main():
    parser = argparse.ArgumentParser(description="AgentGuard Observability Backend Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host address to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    parser.add_argument("--reload", action="store_true", default=settings.DEBUG, help="Enable auto-reload")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker processes")

    args = parser.parse_args()

    print("=" * 60)
    print(f"Starting {settings.APP_NAME} Backend")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"API Docs:    http://localhost:{args.port}/docs")
    print(f"WebSocket:   ws://localhost:{args.port}/ws/dashboard")
    print("=" * 60)

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers if not args.reload else None,
        log_level=settings.LOG_LEVEL.lower(),
    )


if __name__ == "__main__":
    main()
