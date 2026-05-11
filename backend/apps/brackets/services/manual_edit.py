from django.core.exceptions import ValidationError
from django.db import transaction

from apps.matches.models import Match


@transaction.atomic
def update_match_slots(match: Match, *, team_a_id: int | None, team_b_id: int | None, stage: str | None, pool_type: str | None):
    if match.bracket_locked:
        raise ValidationError("Bracket is locked for this match.")

    match.team_a_id = team_a_id
    match.team_b_id = team_b_id
    if stage:
        match.stage = stage
    if pool_type:
        match.pool_type = pool_type
    match.manual_match = True
    match.save()
    return match


def set_bracket_lock(tournament_id: int, locked: bool):
    Match.objects.filter(tournament_id=tournament_id, match_type="knockout").update(bracket_locked=locked)
