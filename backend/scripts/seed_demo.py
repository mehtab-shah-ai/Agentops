"""
Demo Dataset Seeding Script
Populates test users, API keys, and multi-step trace execution trees into the database.
Run: python scripts/seed_demo.py
"""

import os
import sys
import asyncio
import logging

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import AsyncSessionLocal, init_db
from app.models import User, ApiKey
from app.auth.jwt_handler import hash_password, generate_api_key
from app.traces.seed import seed_user_starter_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agentops.seed_demo")


async def main():
    logger.info("Initializing tables...")
    await init_db()

    async with AsyncSessionLocal() as session:
        # Create a default demo admin user if not exists
        from sqlalchemy import select
        for demo_email in ["demo@agentops.dev", "demo@agentguard.dev"]:
            result = await session.execute(select(User).where(User.email == demo_email))
            user = result.scalar_one_or_none()

            if not user:
                logger.info(f"Creating default demo user: {demo_email} / Demo12345!")
                user = User(
                    email=demo_email,
                    hashed_password=hash_password("Demo12345!"),
                    organization_name="AI Agent Labs",
                    is_active=True,
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)

                # Create default API key
                raw_key, hashed_key, prefix = generate_api_key()
                api_key = ApiKey(
                    user_id=user.id,
                    name="Default Production SDK Key",
                    key_hash=hashed_key,
                    key_prefix=prefix,
                    is_active=True,
                )
                session.add(api_key)
                await session.commit()

                print("\n" + "=" * 60)
                print(f"[+] DEMO USER & API KEY CREATED: {demo_email}")
                print(f"    Email:    {demo_email}")
                print(f"    Password: Demo12345!")
                print(f"    SDK Key:  {raw_key}")
                print("=" * 60 + "\n")
            else:
                print("\n" + "=" * 60)
                print(f"[i] Demo user exists: {user.email}")
                print("=" * 60 + "\n")

            # Seed sample traces
            await seed_user_starter_data(session, user.id)
        logger.info("Demo data seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
