from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.courts.models import Court
from apps.groups.models import Group, GroupTeam
from apps.matches.models import Match, MatchStatus, MatchType, PoolType
from apps.standings.models import Standing
from apps.standings.services.recalculate import recalculate_tournament_standings
from apps.teams.models import Team
from apps.tournaments.models import Tournament, TournamentFormat, TournamentStatus


DEMO_TOURNAMENT_NAME = "TANA Atlanta Volleyball 2026 Demo"

GROUP_TEAMS = {
    "Group 1": [
        ("Set Panrom", "Manickam Ramanathan"),
        ("VIKINGS", "Pratap"),
        ("TNT", "Ramjee"),
        ("eZPass 2", "Balki Ramasubbu"),
    ],
    "Group 2": [
        ("Firefighters", "Chandu"),
        ("eZpass", "Virgil Raj"),
        ("LakeHaven Smashers", "Bhanu Kiran Thota"),
        ("KALAKEYAS", "VISHNU"),
    ],
    "Group 3": [
        ("CloudQ Alpharetta", "One / Magesh Kumar"),
        ("Volleyball Agents", "Ravi Pobba"),
        ("Punjab", "Trilok"),
        ("Whistle Squad", "Lakshmanan Arunachalam"),
    ],
    "Group 4": [
        ("TVK", "Manikandan"),
        ("Chattanooga Chargers", "Praneeth"),
        ("Hitmen", "Karthik Gummadi"),
        ("Team Strikers", "Pardhu Badipati"),
    ],
    "Group 5": [
        ("Growing Giants", "Chetan Arnoori"),
        ("Atlanta Spikers", "Jacob"),
        ("Gadde Capitals", "MATHAN"),
        ("Fieldstone", "Aravind"),
    ],
}

GROUP_SCORE_PLANS = {
    "Group 1": [(21, 12), (21, 15), (21, 16), (21, 18), (21, 17), (20, 21)],
    "Group 2": [(21, 13), (21, 16), (21, 17), (21, 19), (21, 18), (19, 21)],
    "Group 3": [(21, 14), (21, 17), (21, 18), (21, 16), (21, 19), (18, 21)],
    "Group 4": [(21, 15), (21, 18), (21, 19), (21, 17), (21, 20), (17, 21)],
    "Group 5": [(21, 11), (21, 14), (21, 16), (21, 15), (21, 18), (16, 21)],
}

ROUND_PAIRINGS = [
    [(0, 3), (1, 2)],
    [(0, 2), (3, 1)],
    [(0, 1), (2, 3)],
]


class Command(BaseCommand):
    help = "Seed the official local TANA Atlanta Volleyball 2026 demo tournament"

    @transaction.atomic
    def handle(self, *args, **options):
        Tournament.objects.filter(name=DEMO_TOURNAMENT_NAME).delete()

        tournament_date = timezone.localdate() + timedelta(days=30)
        tournament = Tournament.objects.create(
            name=DEMO_TOURNAMENT_NAME,
            date=tournament_date,
            format=TournamentFormat.PREMIUM_STAR,
            status=TournamentStatus.LIVE,
        )

        courts = [
            Court.objects.update_or_create(
                name=f"Court {index}",
                defaults={
                    "location": "TANA Atlanta demo venue",
                    "description": "Official demo court for local development.",
                    "is_active": True,
                },
            )[0]
            for index in range(1, 3)
        ]

        groups = {}
        teams_by_group = {}
        for group_name, team_rows in GROUP_TEAMS.items():
            group = Group.objects.create(tournament=tournament, name=group_name)
            groups[group_name] = group
            teams_by_group[group_name] = []

            for team_name, captain in team_rows:
                team = Team.objects.create(tournament=tournament, name=team_name)
                GroupTeam.objects.create(group=group, team=team)
                teams_by_group[group_name].append(team)
                self.stdout.write(f"Team seeded: {team_name} (captain/contact: {captain})")

        day_start = timezone.make_aware(datetime.combine(tournament_date, time(hour=9)))
        match_slots = [day_start + timedelta(minutes=30 * slot) for slot in range(15)]
        match_count = 0

        for round_pairings in ROUND_PAIRINGS:
            for group_name, teams in teams_by_group.items():
                group = groups[group_name]
                score_plan = GROUP_SCORE_PLANS[group_name]

                for first_index, second_index in round_pairings:
                    matchup_index = self._matchup_index(first_index, second_index)
                    score_a, score_b = score_plan[matchup_index]
                    if first_index > second_index:
                        score_a, score_b = score_b, score_a

                    scheduled_time = match_slots[match_count // len(courts)]
                    court = courts[match_count % len(courts)]

                    Match.objects.create(
                        tournament=tournament,
                        group=group,
                        court=court,
                        court_name=court.name,
                        team_a=teams[first_index],
                        team_b=teams[second_index],
                        match_type=MatchType.LEAGUE,
                        stage="pool_stage",
                        pool_type=PoolType.NONE,
                        manual_match=True,
                        bracket_locked=False,
                        scheduled_time=scheduled_time,
                        status=MatchStatus.COMPLETED,
                        score_a=score_a,
                        score_b=score_b,
                    )
                    match_count += 1

        recalculate_tournament_standings(tournament.id)
        self._create_demo_admin()

        standings = list(Standing.objects.filter(tournament=tournament, pool_type__isnull=True).order_by("rank"))
        champions = standings[:8]
        premier = standings[8:16]
        eliminated = standings[16:20]

        self.stdout.write(self.style.SUCCESS("Official TANA demo tournament seeded."))
        self.stdout.write(f"Tournament ID: {tournament.id}")
        self.stdout.write(f"Groups: {len(groups)}")
        self.stdout.write(f"Teams: {sum(len(teams) for teams in teams_by_group.values())}")
        self.stdout.write(f"Courts: {len(courts)}")
        self.stdout.write(f"Pool matches: {match_count}")
        self.stdout.write("Standings recalculated: yes")
        self.stdout.write("Champions League seeds: " + ", ".join(f"{row.rank}. {row.team.name}" for row in champions))
        self.stdout.write("Premier League seeds: " + ", ".join(f"{idx}. {row.team.name}" for idx, row in enumerate(premier, 1)))
        self.stdout.write("Eliminated teams: " + ", ".join(row.team.name for row in eliminated))
        self.stdout.write("Demo admin user: admin / admin123 (local development only)")

    def _create_demo_admin(self):
        User = get_user_model()
        user, _created = User.objects.get_or_create(username="admin", defaults={"email": "admin@example.com"})
        user.email = "admin@example.com"
        user.is_staff = True
        user.is_superuser = True
        user.set_password("admin123")
        user.save()

    def _matchup_index(self, first_index, second_index):
        return {
            (0, 1): 0,
            (0, 2): 1,
            (0, 3): 2,
            (1, 2): 3,
            (1, 3): 4,
            (2, 3): 5,
        }[tuple(sorted((first_index, second_index)))]
