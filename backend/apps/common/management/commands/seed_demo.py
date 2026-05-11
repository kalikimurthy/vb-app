from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.courts.models import Court
from apps.groups.models import Group, GroupTeam
from apps.matches.models import Match, MatchType
from apps.players.models import Player
from apps.teams.models import Team, TeamPlayer
from apps.tournaments.models import Tournament, TournamentFormat


class Command(BaseCommand):
    help = "Seed demo volleyball tournament data"

    def handle(self, *args, **options):
        tournament, _ = Tournament.objects.get_or_create(
            name="City Volleyball Open",
            defaults={"date": date.today() + timedelta(days=7), "format": TournamentFormat.TOP8, "status": "Draft"},
        )

        courts = []
        for idx in range(1, 5):
            court, _ = Court.objects.get_or_create(name=f"Court {idx}", defaults={"location": f"Block {idx}"})
            courts.append(court)

        groups = []
        for g in ["A", "B"]:
            group, _ = Group.objects.get_or_create(tournament=tournament, name=f"Group {g}")
            groups.append(group)

        for i in range(1, 17):
            team, _ = Team.objects.get_or_create(tournament=tournament, name=f"Team {i}")
            group = groups[0] if i <= 8 else groups[1]
            GroupTeam.objects.get_or_create(group=group, team=team)
            for p in range(1, 3):
                player, _ = Player.objects.get_or_create(name=f"Player {i}-{p}")
                TeamPlayer.objects.get_or_create(team=team, player=player, tournament=tournament)

        teams = list(Team.objects.filter(tournament=tournament).order_by("id"))
        now = timezone.now()
        for i in range(0, len(teams), 2):
            Match.objects.get_or_create(
                tournament=tournament,
                match_type=MatchType.LEAGUE,
                team_a=teams[i],
                team_b=teams[i + 1],
                defaults={
                    "group": groups[0] if i < 8 else groups[1],
                    "court": courts[(i // 2) % len(courts)],
                    "court_name": courts[(i // 2) % len(courts)].name,
                    "stage": "league",
                    "scheduled_time": now + timedelta(hours=i),
                },
            )

        self.stdout.write(self.style.SUCCESS("Demo seed data loaded."))
