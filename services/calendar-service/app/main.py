"""Calendar Service — FastAPI application for Google Calendar integration."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared_models.database import get_db
from shared_models.models import (
    User,
    APIToken,
    CalendarConnection,
    CalendarEvent,
    ScheduledJoin,
)

from app.config import LOG_LEVEL, DEFAULT_LEAD_TIME_MINUTES
from app.crypto import encrypt_token, decrypt_token
from app.oauth.google import (
    build_authorization_url,
    exchange_code_for_tokens,
    get_user_email,
)
from app.services.calendar_sync import sync_connection

logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Vexa Calendar Service",
    description="Google Calendar monitoring and auto-join for Vexa meetings.",
    version="1.0.0",
)

# --- Auth ---

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_user(
    api_key: str = Depends(API_KEY_HEADER),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate X-API-Key and return the User."""
    if not api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing API token")
    result = await db.execute(
        select(APIToken, User)
        .join(User, APIToken.user_id == User.id)
        .where(APIToken.token == api_key)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API token")
    return row[1]


# --- Pydantic schemas ---

class ConnectionSettings(BaseModel):
    lead_time_minutes: Optional[int] = Field(None, ge=0, le=30)
    auto_join_enabled: Optional[bool] = None
    excluded_calendars: Optional[list[str]] = None


class ConnectionResponse(BaseModel):
    id: int
    provider: str
    provider_account_id: Optional[str]
    status: str
    settings: dict
    last_sync_at: Optional[datetime]
    last_error: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class EventResponse(BaseModel):
    id: int
    title: Optional[str]
    start_time: datetime
    end_time: datetime
    is_recurring: bool
    meeting_platform: Optional[str]
    meeting_url: Optional[str]
    is_cancelled: bool
    join_status: Optional[str] = None  # from scheduled_joins

    class Config:
        from_attributes = True


class AuthUrlResponse(BaseModel):
    authorization_url: str
    state: str


class SyncResponse(BaseModel):
    events_processed: int


# --- Endpoints ---

@app.get("/health", tags=["General"])
async def health():
    return {"status": "ok", "service": "calendar-service"}


# --- OAuth ---

@app.get("/connect/google", response_model=AuthUrlResponse, tags=["OAuth"])
async def connect_google(user: User = Depends(get_current_user)):
    """Returns Google OAuth authorization URL to begin the calendar connection flow."""
    state = f"{user.id}"
    authorization_url, state_token = build_authorization_url(state=state)
    return AuthUrlResponse(authorization_url=authorization_url, state=state_token)


@app.get("/callback/google", tags=["OAuth"])
async def callback_google(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback — exchange code for tokens and store connection."""
    # Parse user_id from state
    try:
        user_id = int(state)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Exchange code for tokens
    try:
        tokens = exchange_code_for_tokens(code)
    except Exception as e:
        logger.error("Failed to exchange OAuth code: %s", e)
        raise HTTPException(status_code=400, detail=f"OAuth token exchange failed: {e}")

    # Get the user's Google email
    try:
        email = await get_user_email(tokens["access_token"])
    except Exception as e:
        logger.error("Failed to get user email: %s", e)
        email = None

    # Check for existing connection
    stmt = select(CalendarConnection).where(
        CalendarConnection.user_id == user_id,
        CalendarConnection.provider == "google",
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        connection = CalendarConnection(
            user_id=user_id,
            provider="google",
        )
        db.add(connection)

    connection.provider_account_id = email
    connection.access_token_enc = encrypt_token(tokens["access_token"])
    if tokens.get("refresh_token"):
        connection.refresh_token_enc = encrypt_token(tokens["refresh_token"])
    connection.token_expires_at = tokens.get("expires_at")
    connection.scopes = tokens.get("scopes", "")
    connection.status = "active"
    connection.last_error = None
    connection.settings = connection.settings or {
        "lead_time_minutes": DEFAULT_LEAD_TIME_MINUTES,
        "auto_join_enabled": True,
        "excluded_calendars": [],
    }

    await db.commit()
    await db.refresh(connection)

    return {"status": "connected", "connection_id": connection.id, "email": email}


# --- Connections ---

@app.get("/connections", response_model=list[ConnectionResponse], tags=["Connections"])
async def list_connections(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the user's calendar connections."""
    stmt = select(CalendarConnection).where(CalendarConnection.user_id == user.id)
    result = await db.execute(stmt)
    return result.scalars().all()


@app.delete("/connections/{connection_id}", tags=["Connections"])
async def delete_connection(
    connection_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect a calendar (revoke tokens, mark as revoked)."""
    stmt = select(CalendarConnection).where(
        CalendarConnection.id == connection_id,
        CalendarConnection.user_id == user.id,
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    connection.status = "revoked"
    connection.access_token_enc = None
    connection.refresh_token_enc = None
    await db.commit()

    return {"status": "revoked", "connection_id": connection_id}


@app.patch("/connections/{connection_id}/settings", response_model=ConnectionResponse, tags=["Connections"])
async def update_connection_settings(
    connection_id: int,
    settings: ConnectionSettings,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update lead time, toggle auto-join, or exclude calendars."""
    stmt = select(CalendarConnection).where(
        CalendarConnection.id == connection_id,
        CalendarConnection.user_id == user.id,
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    current = connection.settings or {}
    if settings.lead_time_minutes is not None:
        current["lead_time_minutes"] = settings.lead_time_minutes
    if settings.auto_join_enabled is not None:
        current["auto_join_enabled"] = settings.auto_join_enabled
    if settings.excluded_calendars is not None:
        current["excluded_calendars"] = settings.excluded_calendars
    connection.settings = current

    await db.commit()
    await db.refresh(connection)
    return connection


# --- Events ---

@app.get("/events", response_model=list[EventResponse], tags=["Events"])
async def list_events(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List upcoming synced events with join status."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(CalendarEvent)
        .join(CalendarConnection)
        .where(
            CalendarConnection.user_id == user.id,
            CalendarEvent.end_time >= now,
            CalendarEvent.is_cancelled == False,
        )
        .order_by(CalendarEvent.start_time)
    )
    result = await db.execute(stmt)
    events = result.scalars().all()

    # Fetch join statuses
    event_ids = [e.id for e in events]
    join_stmt = select(ScheduledJoin).where(ScheduledJoin.calendar_event_id.in_(event_ids))
    join_result = await db.execute(join_stmt)
    join_map = {sj.calendar_event_id: sj.status for sj in join_result.scalars()}

    responses = []
    for event in events:
        resp = EventResponse(
            id=event.id,
            title=event.title,
            start_time=event.start_time,
            end_time=event.end_time,
            is_recurring=event.is_recurring,
            meeting_platform=event.meeting_platform,
            meeting_url=event.meeting_url,
            is_cancelled=event.is_cancelled,
            join_status=join_map.get(event.id),
        )
        responses.append(resp)

    return responses


@app.post("/events/{event_id}/skip", tags=["Events"])
async def skip_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Skip auto-join for a specific event."""
    stmt = (
        select(ScheduledJoin)
        .join(CalendarEvent)
        .join(CalendarConnection)
        .where(
            CalendarEvent.id == event_id,
            CalendarConnection.user_id == user.id,
            ScheduledJoin.status == "pending",
        )
    )
    result = await db.execute(stmt)
    sj = result.scalar_one_or_none()
    if not sj:
        raise HTTPException(status_code=404, detail="No pending join found for this event")

    sj.status = "cancelled"
    await db.commit()
    return {"status": "skipped", "event_id": event_id}


@app.post("/events/{event_id}/unskip", tags=["Events"])
async def unskip_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-enable auto-join for a previously skipped event."""
    stmt = (
        select(ScheduledJoin)
        .join(CalendarEvent)
        .join(CalendarConnection)
        .where(
            CalendarEvent.id == event_id,
            CalendarConnection.user_id == user.id,
            ScheduledJoin.status == "cancelled",
        )
    )
    result = await db.execute(stmt)
    sj = result.scalar_one_or_none()
    if not sj:
        raise HTTPException(status_code=404, detail="No cancelled join found for this event")

    sj.status = "pending"
    await db.commit()
    return {"status": "unskipped", "event_id": event_id}


# --- Sync ---

@app.post("/sync/{connection_id}", response_model=SyncResponse, tags=["Sync"])
async def force_sync(
    connection_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Force an immediate sync of a calendar connection."""
    stmt = select(CalendarConnection).where(
        CalendarConnection.id == connection_id,
        CalendarConnection.user_id == user.id,
        CalendarConnection.status == "active",
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Active connection not found")

    count = await sync_connection(connection, db)
    return SyncResponse(events_processed=count)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)
