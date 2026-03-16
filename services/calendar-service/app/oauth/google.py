"""Google OAuth2 flow for Calendar API access."""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from google_auth_oauthlib.flow import Flow

from app.config import (
    GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET,
    GOOGLE_CALENDAR_REDIRECT_URI,
    GOOGLE_CALENDAR_SCOPES,
)

logger = logging.getLogger(__name__)

# Client config dict (avoids needing a JSON file)
_CLIENT_CONFIG = {
    "web": {
        "client_id": GOOGLE_CALENDAR_CLIENT_ID,
        "client_secret": GOOGLE_CALENDAR_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [GOOGLE_CALENDAR_REDIRECT_URI],
    }
}


def build_authorization_url(state: Optional[str] = None) -> tuple[str, str]:
    """Build Google OAuth authorization URL.

    Returns:
        Tuple of (authorization_url, state_token).
    """
    flow = Flow.from_client_config(
        _CLIENT_CONFIG,
        scopes=GOOGLE_CALENDAR_SCOPES,
        redirect_uri=GOOGLE_CALENDAR_REDIRECT_URI,
    )
    if state is None:
        state = secrets.token_urlsafe(32)

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
        code_challenge_method=None,  # Disable PKCE — server-side flow with client_secret
    )
    return authorization_url, state


def exchange_code_for_tokens(code: str) -> dict:
    """Exchange authorization code for OAuth tokens.

    Returns:
        Dict with keys: access_token, refresh_token, expires_at, scopes, id_info.
    """
    flow = Flow.from_client_config(
        _CLIENT_CONFIG,
        scopes=GOOGLE_CALENDAR_SCOPES,
        redirect_uri=GOOGLE_CALENDAR_REDIRECT_URI,
    )
    flow.fetch_token(code=code)

    credentials = flow.credentials
    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "expires_at": credentials.expiry,
        "scopes": " ".join(credentials.scopes or GOOGLE_CALENDAR_SCOPES),
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
