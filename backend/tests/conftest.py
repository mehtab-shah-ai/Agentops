import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from app.database import Base, engine, init_db
from app.main import app


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_clean_database():
    """Drop and recreate all database tables before every test function."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
