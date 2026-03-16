"""Sync events from Google Calendar API into the database."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared_models.models import CalendarConnection, CalendarEvent, ScheduledJoin
from shared_models.meeting_url_parser import extract_meeting_info

from app.crypto import decrypt_token, encrypt_token
from app.oauth.google import refresh_access_token
from app.config import DEFAULT_LEAD_TIME_MINUTES

logger = logging.getLogger(__name__)


async def _ensure_valid_token(connection: CalendarConnection, db: AsyncSession) -> str:
    """Return a valid access token, refreshing if necessary."""
    now = datetime.utcnow()
    # Proactive refresh: refresh if expires in less than 5 minutes
    if connection.token_expires_at and connection.token_expires_at > now + timedelta(minutes=5):
        return decrypt_token(connection.access_token_enc)

    # Need to refresh
    refresh_token = decrypt_token(connection.refresh_token_enc)
    result = await refresh_access_token(refresh_token)

    # Update stored tokens
    connection.access_token_enc = encrypt_token(result["access_token"])
    connection.token_expires_at = result["expires_at"]
    await db.commit()

    return result["access_token"]


def _fetch_events_from_google(access_token: str, calendar_id: str = "primary") -> list[dict]:
    """Fetch upcoming events from Google Calendar API (next 24h).

    Uses the synchronous google-api-python-client (run in executor for async).
    """
    credentials = Credentials(token=access_token)
    service = build("calendar", "v3", credentials=credentials, cache_discovery=False)

    now = datetime.utcnow()
    time_min = now.isoformat()
    time_max = (now + timedelta(hours=24)).isoformat()

    events_result = service.events().list(
        calendarId=calendar_id,
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    return events_result.get("items", [])


async def sync_connection(connection: CalendarConnection, db: AsyncSession) -> int:
    """Sync a single calendar connection. Returns number of events processed."""
    try:
        access_token = await _ensure_valid_token(connection, db)
    except Exception as e:
        logger.error("Failed to get valid token for connection %d: %s", connection.id, e)
        connection.status = "error"
        connection.last_error = str(e)
        await db.commit()
        return 0

    try:
        import asyncio
        loop = asyncio.get_event_loop()
        google_events = await loop.run_in_executor(
            None, _fetch_events_from_google, access_token
        )
    except Exception as e:
        logger.error("Failed to fetch events for connection %d: %s", connection.id, e)
        connection.last_error = str(e)
        await db.commit()
        return 0

    # Track which external IDs we saw (to detect cancellations)
    seen_event_ids = set()
    processed = 0
    lead_time = (connection.settings or {}).get("lead_time_minutes", DEFAULT_LEAD_TIME_MINUTES)
    auto_join_enabled = (connection.settings or {}).get("auto_join_enabled", True)

    for g_event in google_events:
        external_id = g_event.get("id")
        if not external_id:
            continue
        seen_event_ids.add(external_id)

        # Parse start/end times
        start_raw = g_event.get("start", {})
        end_raw = g_event.get("end", {})
        start_str = start_raw.get("dateTime") or start_raw.get("date")
        end_str = end_raw.get("dateTime") or end_raw.get("date")
        if not start_str or not end_str:
            continue

        start_time = datetime.fromisoformat(start_str)
        end_time = datetime.fromisoformat(end_str)

        # Extract meeting info
        meeting_info = extract_meeting_info(g_event)

        # Upsert calendar_event
        stmt = select(CalendarEvent).where(
            CalendarEvent.connection_id == connection.id,
            CalendarEvent.external_event_id == external_id,
        )
        result = await db.execute(stmt)
        cal_event = result.scalar_one_or_none()

        if cal_event is None:
            cal_event = CalendarEvent(
                connection_id=connection.id,
                external_event_id=external_id,
            )
            db.add(cal_event)

        cal_event.title = g_event.get("summary", "")
        cal_event.start_time = start_time
        cal_event.end_time = end_time
        cal_event.is_recurring = bool(g_event.get("recurringEventId"))
        cal_event.is_cancelled = g_event.get("status") == "cancelled"

        if meeting_info:
            platform, native_id, url, passcode = meeting_info
            cal_event.meeting_platform = platform
            cal_event.meeting_native_id = native_id
            cal_event.meeting_url = url
            cal_event.meeting_passcode = passcode
        else:
            cal_event.meeting_platform = None
            cal_event.meeting_native_id = None
            cal_event.meeting_url = None
            cal_event.meeting_passcode = None

        await db.flush()

        # Upsert scheduled_join if meeting has a URL and auto-join is enabled
        if meeting_info and auto_join_enabled and not cal_event.is_cancelled:
            trigger_at = start_time - timedelta(minutes=lead_time)
            join_stmt = select(ScheduledJoin).where(
                ScheduledJoin.calendar_event_id == cal_event.id,
                ScheduledJoin.user_id == connection.user_id,
            )
            join_result = await db.execute(join_stmt)
            sj = join_result.scalar_one_or_none()

            if sj is None:
                sj = ScheduledJoin(
                    calendar_event_id=cal_event.id,
                    user_id=connection.user_id,
                    platform=meeting_info[0],
                    native_meeting_id=meeting_info[1],
                    meeting_url=meeting_info[2],
                    passcode=meeting_info[3],
                    trigger_at=trigger_at,
                    status="pending",
                )
                db.add(sj)
            elif sj.status == "pending":
                # Update trigger time if event time changed
                sj.trigger_at = trigger_at
                sj.platform = meeting_info[0]
                sj.native_meeting_id = meeting_info[1]
                sj.meeting_url = meeting_info[2]
                sj.passcode = meeting_info[3]

        # Cancel scheduled joins for cancelled events
        if cal_event.is_cancelled:
            cancel_stmt = select(ScheduledJoin).where(
                ScheduledJoin.calendar_event_id == cal_event.id,
                ScheduledJoin.status == "pending",
            )
            cancel_result = await db.execute(cancel_stmt)
            for sj in cancel_result.scalars():
                sj.status = "cancelled"

        processed += 1

    # Mark events not in API response as cancelled
    existing_stmt = select(CalendarEvent).where(
        CalendarEvent.connection_id == connection.id,
        CalendarEvent.is_cancelled == False,
        CalendarEvent.start_time >= datetime.utcnow(),
        CalendarEvent.start_time <= datetime.utcnow() + timedelta(hours=24),
    )
    existing_result = await db.execute(existing_stmt)
    for existing_event in existing_result.scalars():
        if existing_event.external_event_id not in seen_event_ids:
            existing_event.is_cancelled = True
            # Cancel pending joins
            cancel_stmt = select(ScheduledJoin).where(
                ScheduledJoin.calendar_event_id == existing_event.id,
                ScheduledJoin.status == "pending",
            )
            cancel_result = await db.execute(cancel_stmt)
            for sj in cancel_result.scalars():
                sj.status = "cancelled"

    connection.last_sync_at = datetime.utcnow()
    connection.last_error = None
    await db.commit()

    logger.info("Synced %d events for connection %d", processed, connection.id)
    return processed
