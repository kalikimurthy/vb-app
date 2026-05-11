from datetime import timedelta

from django.db.models import Q

from apps.matches.models import Match


MATCH_BUFFER_MINUTES = 90


def has_court_conflict(*, match: Match) -> bool:
    if not match.court_id or not match.scheduled_time:
        return False

    window_start = match.scheduled_time - timedelta(minutes=MATCH_BUFFER_MINUTES)
    window_end = match.scheduled_time + timedelta(minutes=MATCH_BUFFER_MINUTES)

    conflicts = Match.objects.filter(
        court_id=match.court_id,
        scheduled_time__gte=window_start,
        scheduled_time__lte=window_end,
    ).exclude(id=match.id)

    return conflicts.filter(~Q(status="Completed")).exists()
