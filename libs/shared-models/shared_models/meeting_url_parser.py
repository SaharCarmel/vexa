"""Extract meeting URLs from Google Calendar event data.

Checks three sources in priority order:
1. conferenceData.entryPoints[].uri  (structured, most reliable for Google Meet)
2. Event location field (plain text)
3. Event description field (regex scan through HTML/text)

Returns (platform, native_meeting_id, meeting_url, passcode) or None.
"""

import re
from typing import Optional, Tuple

# Platform constants matching shared_models.schemas.Platform values
GOOGLE_MEET = "google_meet"
ZOOM = "zoom"
TEAMS = "teams"

# Regex patterns aligned with existing validation in schemas.py
PATTERNS = [
    # Google Meet: meet.google.com/abc-defg-hij
    (
        GOOGLE_MEET,
        re.compile(r"https?://meet\.google\.com/([a-z]{3}-[a-z]{4}-[a-z]{3})"),
    ),
    # Zoom: *.zoom.us/j/1234567890?pwd=...
    (
        ZOOM,
        re.compile(
            r"https?://[a-z0-9]+\.zoom\.us/j/(\d{9,11})(?:\?pwd=([A-Za-z0-9_-]+))?"
        ),
    ),
    # Teams: teams.live.com/meet/1234567890?p=... or teams.microsoft.com/meet/...
    (
        TEAMS,
        re.compile(
            r"https?://teams\.(?:live|microsoft)\.com/meet/(\d{10,15})(?:\?p=([A-Za-z0-9]+))?"
        ),
    ),
]


MeetingInfo = Tuple[str, str, str, Optional[str]]  # (platform, native_id, url, passcode)


def _search_text(text: str) -> Optional[MeetingInfo]:
    """Search a text string for meeting URLs using regex patterns."""
    if not text:
        return None
    for platform, pattern in PATTERNS:
        match = pattern.search(text)
        if match:
            native_id = match.group(1)
            passcode = match.group(2) if match.lastindex and match.lastindex >= 2 else None
            meeting_url = match.group(0)
            return (platform, native_id, meeting_url, passcode)
    return None


def extract_meeting_info(event: dict) -> Optional[MeetingInfo]:
    """Extract meeting info from a Google Calendar event dict.

    Args:
        event: A Google Calendar API event resource dict.

    Returns:
        Tuple of (platform, native_meeting_id, meeting_url, passcode) or None
        if no meeting link is found.
    """
    # 1. Check conferenceData.entryPoints (most reliable for Google Meet)
    conference_data = event.get("conferenceData")
    if conference_data:
        for entry_point in conference_data.get("entryPoints", []):
            if entry_point.get("entryPointType") == "video":
                uri = entry_point.get("uri", "")
                result = _search_text(uri)
                if result:
                    return result

    # 2. Check event location field
    location = event.get("location", "")
    result = _search_text(location)
    if result:
        return result

    # 3. Check event description field (may contain HTML)
    description = event.get("description", "")
    result = _search_text(description)
    if result:
        return result

    return None
