from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

# override=False ensures Docker-injected env vars take priority over the .env file.
# This prevents stale build-time .env values from shadowing runtime container env.
load_dotenv(override=False)

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise ValueError("DATABASE_URL environment variable not set")

# SQLAlchemy v2 + psycopg2 requires the 'postgresql+psycopg2://' dialect.
# Accept both forms so local dev (without the dialect prefix) still works.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()