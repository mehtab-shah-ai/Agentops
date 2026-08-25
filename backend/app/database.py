import logging
from typing import AsyncGenerator
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base
from app.config import settings

logger = logging.getLogger("agentops.database")

Base = declarative_base()

# Connection engine configuration
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args["timeout"] = 30.0
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
)

# Enable SQLite Write-Ahead Logging (WAL) and memory optimization pragmas for high concurrency & speed
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA busy_timeout = 30000")
            cursor.execute("PRAGMA journal_mode = WAL")
            cursor.execute("PRAGMA synchronous = NORMAL")
            cursor.execute("PRAGMA foreign_keys = ON")
            cursor.execute("PRAGMA cache_size = -64000")  # 64MB Cache
            cursor.execute("PRAGMA temp_store = MEMORY")
            cursor.execute("PRAGMA mmap_size = 268435456")  # 256MB Memory-mapped I/O
        except Exception as e:
            logger.warning(f"Failed to set SQLite PRAGMA: {e}")
        finally:
            cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Initialize database tables."""
    import app.models  # noqa: F401 - ensure models are registered in Base.metadata
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully with WAL & Memory-mapped cache.")
    except Exception as e:
        logger.warning(f"Database tables already present or initialized: {e}")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
