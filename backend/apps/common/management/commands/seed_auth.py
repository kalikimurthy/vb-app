from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

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


class Command(BaseCommand):
    help = "Seed the official local TANA Atlanta Volleyball 2026 demo tournament"

    @transaction.atomic
    def handle(self, *args, **options):
        
        self._create_demo_admin()

    def _create_demo_admin(self):
        User = get_user_model()
        user, _created = User.objects.get_or_create(username="admin", defaults={"email": "admin@example.com"})
        user.email = "admin@example.com"
        user.is_staff = True
        user.is_superuser = True
        user.set_password("vbadmin!!")
        user.save()
