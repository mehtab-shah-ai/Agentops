"""
Database Initialization Script
Run: python scripts/init_db.py
"""

import os
import sys
import asyncio
import logging

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import init_db
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agentguard.init_db")


async def main():
    logger.info(f"Initializing database at: {settings.DATABASE_URL}")
    await init_db()
    logger.info("Database schema initialized and WAL mode activated successfully.")


if __name__ == "__main__":
    asyncio.run(main())
