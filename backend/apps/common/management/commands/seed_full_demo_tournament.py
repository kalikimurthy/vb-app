from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.courts.models import Court
from apps.groups.models import Group, GroupTeam
from apps.matches.models import Match, MatchStatus, MatchType, PoolType
from apps.standings.services.recalculate import recalculate_tournament_standings
from apps.teams.models import Team
from apps.tournaments.models import Tournament, TournamentFormat, TournamentStatus


DEMO_TOURNAMENT_NAME = "Demo Premier Star Cup"

GROUP_TEAMS = {
    "Group A": ["Aces VC", "Block Party", "Net Ninjas", "Setters United", "Spike Squad"],
    "Group B": ["Blue Thunder", "Court Kings", "Dig Masters", "Float Serve", "Rally Point"],
    "Group C": ["City Spikers", "Jump Serve", "Power Tips", "Quick Sets", "Sideout Crew"],
    "Group D": ["Beach Hawks", "Cross Court", "Deep Corners", "Free Ballers", "Line Shots"],
}

SCORE_PATTERNS = {
    1: [(25, 18), (25, 19), (25, 20), (25, 21)],
    2: [(25, 22), (25, 21), (26, 24), (25, 23)],
    3: [(25, 23), (27, 25), (25, 22), (26, 24)],
    4: [(25, 20), (25, 22), (26, 24), (25, 18)],
}


class Command(BaseCommand):
    help = "Seed a full 20-team Premier/Star demo tournament"

    @transaction.atomic
    def handle(self, *args, **options):
        Tournament.objects.filter(name=DEMO_TOURNAMENT_NAME).delete()

        tournament_date = timezone.localdate() + timedelta(days=14)
        tournament = Tournament.objects.create(
            name=DEMO_TOURNAMENT_NAME,
            date=tournament_date,
            format=TournamentFormat.PREMIUM_STAR,
            status=TournamentStatus.LIVE,
        )

        courts = [
            Court.objects.update_or_create(
                name=f"Court {index}",
                defaults={"location": f"Demo venue court {index}", "is_active": True},
            )[0]
            for index in range(1, 5)
        ]

        groups = {}
        teams_by_group = {}
        for group_name, team_names in GROUP_TEAMS.items():
            group = Group.objects.create(tournament=tournament, name=group_name)
            groups[group_name] = group
            teams_by_group[group_name] = []

            for team_name in team_names:
                team = Team.objects.create(tournament=tournament, name=team_name)
                GroupTeam.objects.create(group=group, team=team)
                teams_by_group[group_name].append(team)

        match_count = 0
        day_start = timezone.make_aware(datetime.combine(tournament_date, time(hour=9)))

        for group_index, (group_name, teams) in enumerate(teams_by_group.items(), start=1):
            group = groups[group_name]
            score_pattern = SCORE_PATTERNS[group_index]

            for first_index in range(len(teams)):
                for second_index in range(first_index + 1, len(teams)):
                    winner_score, loser_score = score_pattern[second_index - first_index - 1]
                    team_a = teams[first_index]
                    team_b = teams[second_index]
                    scheduled_time = day_start + timedelta(minutes=30 * (match_count // len(courts)))
                    court = courts[match_count % len(courts)]

                    Match.objects.create(
                        tournament=tournament,
                        group=group,
                        court=court,
                        court_name=court.name,
                        team_a=team_a,
                        team_b=team_b,
                        match_type=MatchType.LEAGUE,
                        stage="group_stage",
                        pool_type=PoolType.NONE,
                        manual_match=True,
                        bracket_locked=False,
                        scheduled_time=scheduled_time,
                        status=MatchStatus.COMPLETED,
                        score_a=winner_score,
                        score_b=loser_score,
                    )
                    match_count += 1

        recalculate_tournament_standings(tournament.id)

        self.stdout.write(self.style.SUCCESS("Full demo tournament seeded."))
        self.stdout.write(f"Tournament ID: {tournament.id}")
        self.stdout.write(f"Groups: {len(groups)}")
        self.stdout.write(f"Teams: {sum(len(teams) for teams in teams_by_group.values())}")
        self.stdout.write(f"Matches: {match_count}")
