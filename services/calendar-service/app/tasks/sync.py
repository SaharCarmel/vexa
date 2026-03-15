"""Celery periodic tasks for calendar sync and bot triggering."""

import asyncio
import logging
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, delete

from shared_models.models import CalendarConnection, CalendarEvent, ScheduledJoin
from shared_models.database import async_session_local

from ..services.calendar_sync import sync_connection
from ..services.bot_trigger import trigger_bot_join
from .celery_app import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Helper to run async code from sync Celery tasks."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task
def sync_all_calendars():
    """Iterate active calendar connections and sync each one."""
    _run_async(_sync_all_calendars_async())


async def _sync_all_calendars_async():
    async with async_session_local() as db:
        stmt = select(CalendarConnection).where(CalendarConnection.status == "active")
        result = await db.execute(stmt)
        connections = result.scalars().all()

        logger.info("Syncing %d active calendar connections", len(connections))

        for connection in connections:
            # Add jitter (0-30s) to avoid thundering herd
            jitter = random.uniform(0, 30)
            await asyncio.sleep(jitter)
            try:
                count = await sync_connection(connection, db)
                logger.info("Connection %d: synced %d events", connection.id, count)
            except Exception:
                logger.exception("Error syncing connection %d", connection.id)


@celery_app.task
def process_scheduled_joins():
    """Find pending joins whose trigger_at has passed and trigger bots."""
    _run_async(_process_scheduled_joins_async())


async def _process_scheduled_joins_async():
    now = datetime.now(timezone.utc)
    async with async_session_local() as db:
        stmt = select(ScheduledJoin).where(
            ScheduledJoin.status == "pending",
            ScheduledJoin.trigger_at <= now,
        )
        result = await db.execute(stmt)
        pending_joins = result.scalars().all()

        logger.info("Processing %d pending scheduled joins", len(pending_joins))

        for sj in pending_joins:
            try:
                await trigger_bot_join(sj, db)
            except Exception:
                logger.exception("Error triggering bot for scheduled_join %d", sj.id)


@celery_app.task
def cleanup_stale_events():
    """Remove events and joins older than 7 days."""
    _run_async(_cleanup_stale_events_async())


async def _cleanup_stale_events_async():
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    async with async_session_local() as db:
        # Delete old scheduled_joins via their calendar_events
        old_events_stmt = select(CalendarEvent.id).where(CalendarEvent.end_time < cutoff)
        old_event_ids = (await db.execute(old_events_stmt)).scalars().all()

        if old_event_ids:
            await db.execute(
                delete(ScheduledJoin).where(ScheduledJoin.calendar_event_id.in_(old_event_ids))
            )
            await db.execute(
                delete(CalendarEvent).where(CalendarEvent.id.in_(old_event_ids))
            )
            await db.commit()
            logger.info("Cleaned up %d stale calendar events", len(old_event_ids))
