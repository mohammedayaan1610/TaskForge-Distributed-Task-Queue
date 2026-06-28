import redis
from dotenv import load_dotenv
import os

# override=False ensures Docker-injected env vars take priority over the .env file.
load_dotenv(override=False)

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

# Note: inside Docker, always connect on port 6379 (the container-internal port).
# Port 6380 is only the host-side mapping defined in docker-compose.yml.
r = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True
)