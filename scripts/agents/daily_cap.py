"""
Campus 360 — Daily cap of added offers (decision of 2026-10-20: 20 per day, internships
and jobs together). The day is Cameroon's day: UTC+1 all year, no daylight saving.
Counted in the database (stage_jobs rows of today, published or pending review), so
the cap holds across several runs of the same day.
"""

from datetime import datetime, timedelta, timezone

CAMEROON_TZ = timezone(timedelta(hours=1))


def cameroon_day_start_utc(now: datetime = None) -> datetime:
    """Start of the current Cameroon day, as an aware UTC datetime."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    local = now.astimezone(CAMEROON_TZ)
    start_local = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_local.astimezone(timezone.utc)


def cap_reached(added_today: int, cap: int) -> bool:
    return added_today >= cap
