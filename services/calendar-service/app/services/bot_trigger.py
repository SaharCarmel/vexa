"""Trigger bot joins via the bot-manager POST /bots API."""

import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared_models.models import ScheduledJoin, CalendarConnection, APIToken

from app.config import BOT_MANAGER_URL

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


async def trigger_bot_join(
    scheduled_join: ScheduledJoin,
    db: AsyncSession,
) -> bool:
    """Call POST /bots on bot-manager to start a bot for this scheduled join.

    Returns True on success, False on failure.
    """
    # Get the user's API token for authentication
    token_stmt = select(APIToken).where(APIToken.user_id == scheduled_join.user_id).limit(1)
    token_result = await db.execute(token_stmt)
    api_token = token_result.scalar_one_or_none()

    if not api_token:
        logger.error("No API token found for user %d, cannot trigger bot", scheduled_join.user_id)
        scheduled_join.status = "failed"
        scheduled_join.error_message = "No API token found for user"
        await db.commit()
        return False

    payload = {
        "platform": scheduled_join.platform,
        "native_meeting_id": scheduled_join.native_meeting_id,
        "recording_enabled": True,
        "transcribe_enabled": True,
    }
    if scheduled_join.meeting_url:
        payload["meeting_url"] = scheduled_join.meeting_url
    if scheduled_join.passcode:
        payload["passcode"] = scheduled_join.passcode

    headers = {
        "X-API-Key": api_token.token,
        "Content-Type": "application/json",
    }

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{BOT_MANAGER_URL}/bots",
                    json=payload,
                    headers=headers,
                )

            if resp.status_code == 201:
                # Success
                data = resp.json()
                scheduled_join.status = "triggered"
                scheduled_join.meeting_id = data.get("id")
                await db.commit()
                logger.info(
                    "Triggered bot for scheduled_join %d → meeting %d",
                    scheduled_join.id,
                    data.get("id"),
                )
                return True

            if resp.status_code == 409:
                # Bot already exists for this meeting — treat as success
                scheduled_join.status = "triggered"
                await db.commit()
                logger.info(
                    "Bot already exists for scheduled_join %d (409)",
                    scheduled_join.id,
                )
                return True

            last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
            logger.warning(
                "Attempt %d/%d failed for scheduled_join %d: %s",
                attempt, MAX_RETRIES, scheduled_join.id, last_error,
            )

        except httpx.RequestError as e:
            last_error = str(e)
            logger.warning(
                "Attempt %d/%d request error for scheduled_join %d: %s",
                attempt, MAX_RETRIES, scheduled_join.id, last_error,
            )

    # All retries exhausted
    scheduled_join.status = "failed"
    scheduled_join.error_message = last_error
    await db.commit()
    logger.error("Failed to trigger bot for scheduled_join %d after %d attempts", scheduled_join.id, MAX_RETRIES)
    return False
