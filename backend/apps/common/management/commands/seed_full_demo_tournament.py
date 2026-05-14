from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
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

# Extracted 1:1 from TANA_Volleyball_Schedules (1).xlsx, sheet "Schedules".
OFFICIAL_EXCEL_SCHEDULE = [
    ("Group 1", "Match1", "7:00AM", "TNT", "eZPass 2", "Set Panrom", "Court1"),
    ("Group 1", "Match2", "7:20AM", "Vikings", "Set Panrom", "eZPass 2", "Court1"),
    ("Group 1", "Match3", "8:00AM", "eZPass 2", "Vikings", "Set Panrom", "Court1"),
    ("Group 1", "Match4", "8:20AM", "Set Panrom", "TNT", "Vikings", "Court1"),
    ("Group 1", "Match5", "8:40AM", "eZPass 2", "Set Panrom", "TNT", "Court1"),
    ("Group 1", "Match6", "9:20AM", "Vikings", "TNT", "eZPass 2", "Court1"),
    ("Group 2", "Match1", "7:00AM", "LakeHaven Smashers", "KALAKEYAS", "Firefighters", "Court2"),
    ("Group 2", "Match2", "7:20AM", "eZpass", "Firefighters", "KALAKEYAS", "Court2"),
    ("Group 2", "Match3", "8:00AM", "KALAKEYAS", "eZpass", "Firefighters", "Court2"),
    ("Group 2", "Match4", "8:40AM", "Firefighters", "LakeHaven Smashers", "eZpass", "Court2"),
    ("Group 2", "Match5", "9:20AM", "KALAKEYAS", "Firefighters", "LakeHaven Smashers", "Court2"),
    ("Group 2", "Match6", "9:40AM", "eZpass", "LakeHaven Smashers", "KALAKEYAS", "Court2"),
    ("Group 3", "Match1", "10:00AM", "Punjab", "Whistle Squad", "CloudQ Alpharetta One", "Court2"),
    ("Group 3", "Match2", "10:20AM", "Volleyball Agents", "CloudQ Alpharetta One", "Whistle Squad", "Court2"),
    ("Group 3", "Match3", "10:40AM", "Whistle Squad", "Volleyball Agents", "CloudQ Alpharetta One", "Court2"),
    ("Group 3", "Match4", "11:00AM", "CloudQ Alpharetta One", "Punjab", "Volleyball Agents", "Court2"),
    ("Group 3", "Match5", "11:20AM", "Whistle Squad", "CloudQ Alpharetta One", "Punjab", "Court2"),
    ("Group 3", "Match6", "11:40AM", "Volleyball Agents", "Punjab", "Whistle Squad", "Court2"),
    ("Group 4", "Match1", "10:20AM", "Hitmen", "Team Strikers", "TVK", "Court1"),
    ("Group 4", "Match2", "10:40AM", "Chattanooga Chargers", "TVK", "Team Strikers", "Court1"),
    ("Group 4", "Match3", "11:00AM", "Team Strikers", "Chattanooga Chargers", "TVK", "Court1"),
    ("Group 4", "Match4", "11:20AM", "TVK", "Hitmen", "Chattanooga Chargers", "Court1"),
    ("Group 4", "Match5", "11:40AM", "Team Strikers", "TVK", "Hitmen", "Court1"),
    ("Group 4", "Match6", "12:00PM", "Chattanooga Chargers", "Hitmen", "Team Strikers", "Court1"),
    ("Group 5", "Match1", "7:40AM", "Gadde Capitals", "Fieldstone", "Growing Giants", "Court1"),
    ("Group 5", "Match2", "8:20AM", "Atlanta Spikers", "Growing Giants", "Fieldstone", "Court2"),
    ("Group 5", "Match3", "9:00AM", "Fieldstone", "Atlanta Spikers", "Growing Giants", "Court1"),
    ("Group 5", "Match4", "9:00AM", "Growing Giants", "Gadde Capitals", "Atlanta Spikers", "Court2"),
    ("Group 5", "Match5", "9:40AM", "Fieldstone", "Growing Giants", "Gadde Capitals", "Court1"),
    ("Group 5", "Match6", "10:00AM", "Atlanta Spikers", "Gadde Capitals", "Fieldstone", "Court1"),
]

SCORES_BY_GROUP = {
    "Group 1": [(18, 21), (17, 21), (19, 21), (21, 12), (16, 21), (21, 15)],
    "Group 2": [(21, 18), (18, 21), (17, 21), (21, 16), (15, 21), (21, 19)],
    "Group 3": [(17, 21), (21, 18), (19, 21), (21, 14), (16, 21), (21, 15)],
    "Group 4": [(16, 21), (18, 21), (21, 17), (21, 15), (18, 21), (21, 14)],
    "Group 5": [(18, 21), (15, 21), (21, 19), (21, 14), (16, 21), (21, 17)],
}

TEAM_ALIASES = {
    "vikings": "VIKINGS",
    "cloudq alpharetta one": "CloudQ Alpharetta",
}


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

        courts = {
            f"Court{index}": Court.objects.update_or_create(
                name=f"Court {index}",
                defaults={
                    "location": "TANA Atlanta demo venue",
                    "description": "Official demo court for local development.",
                    "is_active": True,
                },
            )[0]
            for index in range(1, 3)
        }

        groups = {}
        teams_by_name = {}
        for group_name, team_rows in GROUP_TEAMS.items():
            group = Group.objects.create(tournament=tournament, name=group_name)
            groups[group_name] = group

            for team_name, captain in team_rows:
                team = Team.objects.create(tournament=tournament, name=team_name)
                GroupTeam.objects.create(group=group, team=team)
                teams_by_name[self._normalize_team(team_name)] = team
                self.stdout.write(f"Team seeded: {team_name} (captain/contact: {captain})")

        schedule_errors = self._validate_schedule_rows(groups, teams_by_name, courts)
        if schedule_errors:
            raise CommandError("Official Excel schedule could not be seeded:\n" + "\n".join(schedule_errors))

        match_count = 0
        for group_name, match_number, time_label, team_a_name, team_b_name, referee_name, court_label in OFFICIAL_EXCEL_SCHEDULE:
            group_match_index = int(match_number.replace("Match", "")) - 1
            score_a, score_b = SCORES_BY_GROUP[group_name][group_match_index]
            court = courts[court_label]

            Match.objects.create(
                tournament=tournament,
                group=groups[group_name],
                court=court,
                court_name=court.name,
                referee_name=referee_name,
                team_a=teams_by_name[self._normalize_team(team_a_name)],
                team_b=teams_by_name[self._normalize_team(team_b_name)],
                match_type=MatchType.LEAGUE,
                stage="pool_stage",
                pool_type=PoolType.NONE,
                manual_match=True,
                bracket_locked=False,
                scheduled_time=self._scheduled_datetime(tournament_date, time_label),
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

        self.stdout.write(self.style.SUCCESS("Official TANA demo tournament seeded from Excel schedule rows."))
        self.stdout.write(f"Tournament ID: {tournament.id}")
        self.stdout.write(f"Groups: {len(groups)}")
        self.stdout.write(f"Teams: {len(teams_by_name)}")
        self.stdout.write(f"Courts: {len(courts)}")
        self.stdout.write(f"Pool matches: {match_count}")
        self.stdout.write("Unparsed/unmatched Excel rows: 0")
        self.stdout.write("Standings recalculated: yes")
        self.stdout.write("Champions League seeds: " + ", ".join(f"{row.rank}. {row.team.name}" for row in champions))
        self.stdout.write("Premier League seeds: " + ", ".join(f"{idx}. {row.team.name}" for idx, row in enumerate(premier, 1)))
        self.stdout.write("Eliminated teams: " + ", ".join(row.team.name for row in eliminated))
        self.stdout.write("Demo admin user: admin / admin123 (local development only)")

    def _validate_schedule_rows(self, groups, teams_by_name, courts):
        errors = []
        if len(OFFICIAL_EXCEL_SCHEDULE) != 30:
            errors.append(f"Expected 30 schedule rows, found {len(OFFICIAL_EXCEL_SCHEDULE)}.")

        for row in OFFICIAL_EXCEL_SCHEDULE:
            group_name, match_number, _time_label, team_a_name, team_b_name, referee_name, court_label = row
            if group_name not in groups:
                errors.append(f"{match_number}: unknown group {group_name}.")
            if court_label not in courts:
                errors.append(f"{match_number}: unknown court {court_label}.")
            for role, team_name in [("team A", team_a_name), ("team B", team_b_name), ("referee", referee_name)]:
                if self._normalize_team(team_name) not in teams_by_name:
                    errors.append(f"{group_name} {match_number}: could not match {role} '{team_name}'.")

        return errors

    def _scheduled_datetime(self, tournament_date, time_label):
        parsed_time = datetime.strptime(time_label, "%I:%M%p").time()
        return timezone.make_aware(datetime.combine(tournament_date, parsed_time))

    def _normalize_team(self, value):
        key = " ".join(value.strip().lower().split())
        return TEAM_ALIASES.get(key, value.strip())

    def _create_demo_admin(self):
        User = get_user_model()
        user, _created = User.objects.get_or_create(username="admin", defaults={"email": "admin@example.com"})
        user.email = "admin@example.com"
        user.is_staff = True
        user.is_superuser = True
        user.set_password("vbadmin!!")
        user.save()
