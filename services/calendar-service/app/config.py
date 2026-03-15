import os
from dotenv import load_dotenv

load_dotenv()

# Google OAuth
GOOGLE_CALENDAR_CLIENT_ID = os.getenv("GOOGLE_CALENDAR_CLIENT_ID", "")
GOOGLE_CALENDAR_CLIENT_SECRET = os.getenv("GOOGLE_CALENDAR_CLIENT_SECRET", "")
GOOGLE_CALENDAR_REDIRECT_URI = os.getenv("GOOGLE_CALENDAR_REDIRECT_URI", "")
GOOGLE_CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
]

# Token encryption
CALENDAR_ENCRYPTION_KEY = os.getenv("CALENDAR_ENCRYPTION_KEY", "")

# Service connectivity
BOT_MANAGER_URL = os.getenv("BOT_MANAGER_URL", "http://bot-manager:8080")

# Database
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "vexa")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_SSL_MODE = os.getenv("DB_SSL_MODE", "disable")

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Tuning
DEFAULT_LEAD_TIME_MINUTES = int(os.getenv("DEFAULT_LEAD_TIME_MINUTES", "2"))
CALENDAR_SYNC_INTERVAL_SECONDS = int(os.getenv("CALENDAR_SYNC_INTERVAL_SECONDS", "300"))
JOIN_CHECK_INTERVAL_SECONDS = int(os.getenv("JOIN_CHECK_INTERVAL_SECONDS", "60"))

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
