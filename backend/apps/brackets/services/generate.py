from django.db import transaction

from apps.matches.models import Match, MatchStatus, MatchType, PoolType
from apps.standings.models import Standing
from apps.tournaments.models import TournamentFormat


def _create_match(tournament_id: int, team_a_id: int | None, team_b_id: int | None, stage: str, pool_type: str = PoolType.NONE):
    return Match.objects.create(
        tournament_id=tournament_id,
        team_a_id=team_a_id,
        team_b_id=team_b_id,
        match_type=MatchType.KNOCKOUT,
        stage=stage,
        pool_type=pool_type,
        status=MatchStatus.SCHEDULED,
        manual_match=False,
    )


@transaction.atomic
def generate_bracket_for_tournament(tournament) -> list[Match]:
    standings = list(Standing.objects.filter(tournament=tournament, pool_type__isnull=True).order_by("rank"))
    created = []

    Match.objects.filter(tournament=tournament, match_type=MatchType.KNOCKOUT).delete()

    if tournament.format == TournamentFormat.TOP4 and len(standings) >= 4:
        created.append(_create_match(tournament.id, standings[0].team_id, standings[3].team_id, "semi_final"))
        created.append(_create_match(tournament.id, standings[1].team_id, standings[2].team_id, "semi_final"))
        created.append(_create_match(tournament.id, None, None, "final"))

    elif tournament.format == TournamentFormat.TOP8 and len(standings) >= 8:
        pairs = [(0, 7), (1, 6), (2, 5), (3, 4)]
        for a, b in pairs:
            created.append(_create_match(tournament.id, standings[a].team_id, standings[b].team_id, "quarter_final"))
        created.append(_create_match(tournament.id, None, None, "semi_final"))
        created.append(_create_match(tournament.id, None, None, "semi_final"))
        created.append(_create_match(tournament.id, None, None, "final"))

    elif tournament.format == TournamentFormat.PREMIUM_STAR and len(standings) >= 16:
        premium = standings[:8]
        star = standings[8:16]

        for pool_type, teams in ((PoolType.PREMIUM, premium), (PoolType.STAR, star)):
            pairs = [(0, 7), (1, 6), (2, 5), (3, 4)]
            for a, b in pairs:
                created.append(_create_match(tournament.id, teams[a].team_id, teams[b].team_id, "quarter_final", pool_type))
            created.append(_create_match(tournament.id, None, None, "semi_final", pool_type))
            created.append(_create_match(tournament.id, None, None, "semi_final", pool_type))
            created.append(_create_match(tournament.id, None, None, "final", pool_type))

    return created
