from decimal import Decimal

from django.db import transaction

from apps.matches.models import Match, MatchStatus, MatchType, PoolType
from apps.standings.models import Standing
from apps.teams.models import Team


def _safe_nrr(scored: int, given: int) -> Decimal:
    if scored == 0 and given == 0:
        return Decimal("0")
    return Decimal(scored - given) / Decimal(max(scored + given, 1))


@transaction.atomic
def recalculate_tournament_standings(tournament_id: int) -> None:
    teams = Team.objects.filter(tournament_id=tournament_id)
    Standing.objects.filter(tournament_id=tournament_id, pool_type__isnull=True).delete()

    rows = {}
    for team in teams:
        rows[team.id] = {
            "team": team,
            "wins": 0,
            "losses": 0,
            "points_scored": 0,
            "points_given": 0,
        }

    completed = Match.objects.filter(
        tournament_id=tournament_id,
        match_type=MatchType.LEAGUE,
        status=MatchStatus.COMPLETED,
    )

    for match in completed:
        if not match.team_a_id or not match.team_b_id:
            continue

        a = rows[match.team_a_id]
        b = rows[match.team_b_id]

        a["points_scored"] += match.score_a
        a["points_given"] += match.score_b
        b["points_scored"] += match.score_b
        b["points_given"] += match.score_a

        if match.score_a > match.score_b:
            a["wins"] += 1
            b["losses"] += 1
        else:
            b["wins"] += 1
            a["losses"] += 1

    sorted_rows = sorted(
        rows.values(),
        key=lambda r: (
            r["wins"],
            _safe_nrr(r["points_scored"], r["points_given"]),
            r["points_scored"],
        ),
        reverse=True,
    )

    standing_objs = []
    for idx, row in enumerate(sorted_rows, start=1):
        standing_objs.append(
            Standing(
                tournament_id=tournament_id,
                team=row["team"],
                wins=row["wins"],
                losses=row["losses"],
                points_scored=row["points_scored"],
                points_given=row["points_given"],
                net_run_rate=_safe_nrr(row["points_scored"], row["points_given"]),
                rank=idx,
                pool_type=None,
            )
        )

    Standing.objects.bulk_create(standing_objs)


def league_completed(tournament_id: int) -> bool:
    league = Match.objects.filter(tournament_id=tournament_id, match_type=MatchType.LEAGUE)
    if not league.exists():
        return False
    return not league.exclude(status=MatchStatus.COMPLETED).exists()


def split_pool_standings(tournament_id: int) -> None:
    base = list(Standing.objects.filter(tournament_id=tournament_id, pool_type__isnull=True).order_by("rank"))
    if len(base) < 16:
        return

    Standing.objects.filter(tournament_id=tournament_id).exclude(pool_type__isnull=True).delete()

    premium = base[:8]
    star = base[8:16]

    clone_rows = []
    for idx, row in enumerate(premium, start=1):
        clone_rows.append(
            Standing(
                tournament_id=tournament_id,
                team=row.team,
                wins=row.wins,
                losses=row.losses,
                points_scored=row.points_scored,
                points_given=row.points_given,
                net_run_rate=row.net_run_rate,
                rank=idx,
                pool_type=PoolType.PREMIUM,
            )
        )
    for idx, row in enumerate(star, start=1):
        clone_rows.append(
            Standing(
                tournament_id=tournament_id,
                team=row.team,
                wins=row.wins,
                losses=row.losses,
                points_scored=row.points_scored,
                points_given=row.points_given,
                net_run_rate=row.net_run_rate,
                rank=idx,
                pool_type=PoolType.STAR,
            )
        )

    Standing.objects.bulk_create(clone_rows)
