"""Celery configuration for calendar-service periodic tasks."""

from celery import Celery
from ..config import REDIS_URL, CALENDAR_SYNC_INTERVAL_SECONDS, JOIN_CHECK_INTERVAL_SECONDS

celery_app = Celery("calendar_service", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.timezone = "UTC"

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    "sync-all-calendars": {
        "task": "app.tasks.sync.sync_all_calendars",
        "schedule": CALENDAR_SYNC_INTERVAL_SECONDS,  # every 5 min by default
    },
    "process-scheduled-joins": {
        "task": "app.tasks.sync.process_scheduled_joins",
        "schedule": JOIN_CHECK_INTERVAL_SECONDS,  # every 60 sec by default
    },
    "cleanup-stale-events": {
        "task": "app.tasks.sync.cleanup_stale_events",
        "schedule": 3600,  # every hour
    },
}
