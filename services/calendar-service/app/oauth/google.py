"""Google OAuth2 flow for Calendar API access.

Uses direct HTTP calls instead of google_auth_oauthlib to avoid PKCE issues
with the Flow class (code_verifier is lost between auth URL generation and
token exchange since they happen in separate requests).
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.config import (
    GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET,
    GOOGLE_CALENDAR_REDIRECT_URI,
    GOOGLE_CALENDAR_SCOPES,
)

logger = logging.getLogger(__name__)

_AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
_TOKEN_URI = "https://oauth2.googleapis.com/token"


def build_authorization_url(state: Optional[str] = None) -> tuple[str, str]:
    """Build Google OAuth authorization URL.

    Returns:
        Tuple of (authorization_url, state_token).
    """
    if state is None:
        state = secrets.token_urlsafe(32)

    params = {
        "client_id": GOOGLE_CALENDAR_CLIENT_ID,
        "redirect_uri": GOOGLE_CALENDAR_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GOOGLE_CALENDAR_SCOPES),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": state,
    }
    authorization_url = f"{_AUTH_URI}?{urlencode(params)}"
    return authorization_url, state


def exchange_code_for_tokens(code: str) -> dict:
    """Exchange authorization code for OAuth tokens.

    Returns:
        Dict with keys: access_token, refresh_token, expires_at, scopes.
    """
    with httpx.Client(timeout=15.0) as client:
        resp = client.post(
            _TOKEN_URI,
            data={
                "client_id": GOOGLE_CALENDAR_CLIENT_ID,
                "client_secret": GOOGLE_CALENDAR_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_CALENDAR_REDIRECT_URI,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    expires_in = data.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "expires_at": expires_at,
        "scopes": data.get("scope", " ".join(GOOGLE_CALENDAR_SCOPES)),
    }


async def refresh_access_token(refresh_token: str) -> dict:
    """Refresh an expired Google OAuth access token.

    Follows the same pattern as services/bot-manager/app/zoom_obf.py.

    Returns:
        Dict with keys: access_token, expires_at.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CALENDAR_CLIENT_ID,
                "client_secret": GOOGLE_CALENDAR_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    expires_in = data.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    return {
        "access_token": data["access_token"],
        "expires_at": expires_at,
    }


async def get_user_email(access_token: str) -> str:
    """Fetch the authenticated user's email via the Google userinfo endpoint."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()["email"]
