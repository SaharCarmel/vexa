"""Celery periodic tasks for calendar sync and bot triggering."""

import asyncio
import logging
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from shared_models.models import CalendarConnection, CalendarEvent, ScheduledJoin
from shared_models.database import DATABASE_URL

from app.services.calendar_sync import sync_connection
from app.services.bot_trigger import trigger_bot_join
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Helper to run async code from sync Celery tasks.

    Creates a fresh event loop per invocation — safe because each call also
    gets its own engine/session (see _make_session) so there is no shared
    asyncpg state across loops.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _make_engine_and_session():
    """Create a per-task async engine and session factory.

    Each Celery task runs in its own event loop (via _run_async), so we must
    NOT reuse the global async engine from shared_models — asyncpg pools are
    bound to the loop that created them.  A fresh engine per task avoids the
    'another operation is in progress' InterfaceError.
    """
    import os
    import ssl as _ssl

    db_ssl_mode = os.environ.get("DB_SSL_MODE", "prefer")
    connect_args = {"statement_cache_size": 0}
    if db_ssl_mode and db_ssl_mode.lower() in ("require", "prefer"):
        ctx = _ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = _ssl.CERT_NONE
        connect_args["ssl"] = ctx

    eng = create_async_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_size=2,
        max_overflow=3,
    )
    session_factory = sessionmaker(bind=eng, class_=AsyncSession, expire_on_commit=False)
    return eng, session_factory


@celery_app.task
def sync_all_calendars():
    """Iterate active calendar connections and sync each one."""
    _run_async(_sync_all_calendars_async())


async def _sync_all_calendars_async():
    engine, Session = _make_engine_and_session()
    try:
        async with Session() as db:
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
    finally:
        await engine.dispose()


@celery_app.task
def process_scheduled_joins():
    """Find pending joins whose trigger_at has passed and trigger bots."""
    _run_async(_process_scheduled_joins_async())


async def _process_scheduled_joins_async():
    engine, Session = _make_engine_and_session()
    try:
        now = datetime.utcnow()
        async with Session() as db:
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
    finally:
        await engine.dispose()


@celery_app.task
def cleanup_stale_events():
    """Remove events and joins older than 7 days."""
    _run_async(_cleanup_stale_events_async())


async def _cleanup_stale_events_async():
    engine, Session = _make_engine_and_session()
    try:
        cutoff = datetime.utcnow() - timedelta(days=7)
        async with Session() as db:
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
    finally:
        await engine.dispose()
