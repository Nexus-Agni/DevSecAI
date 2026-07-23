import os
import redis
import json
from datetime import datetime

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
try:
    r = redis.from_url(REDIS_URL)
except Exception as e:
    r = None
    print(f"Failed to connect to redis for logging: {e}")

def log_to_redis(report_id: str, level: str, message: str):
    if not r:
        print(f"[{level}] {message}")
        return
        
    try:
        log_entry = json.dumps({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "ENGINE",
            "level": level,
            "message": message
        })
        r.rpush(f"report_logs:{report_id}", log_entry)
        print(f"[{level}] {message}")
    except Exception as e:
        print(f"Failed to log to redis: {e} | Original message: [{level}] {message}")
