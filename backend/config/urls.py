from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.tournaments.views import TournamentViewSet
from apps.teams.views import TeamViewSet, TeamPlayerViewSet
from apps.players.views import PlayerViewSet
from apps.courts.views import CourtViewSet
from apps.groups.views import GroupViewSet, GroupTeamViewSet
from apps.matches.views import MatchViewSet
from apps.standings.views import StandingViewSet
from apps.brackets.views import BracketViewSet
from apps.common.auth_views import login_view, logout_view, me_view

router = DefaultRouter()
router.register(r"tournaments", TournamentViewSet, basename="tournament")
router.register(r"teams", TeamViewSet, basename="team")
router.register(r"team-players", TeamPlayerViewSet, basename="team-player")
router.register(r"players", PlayerViewSet, basename="player")
router.register(r"courts", CourtViewSet, basename="court")
router.register(r"groups", GroupViewSet, basename="group")
router.register(r"group-teams", GroupTeamViewSet, basename="group-team")
router.register(r"matches", MatchViewSet, basename="match")
router.register(r"standings", StandingViewSet, basename="standing")
router.register(r"brackets", BracketViewSet, basename="bracket")

urlpatterns = [
    path("", lambda request: JsonResponse({"status": "ok", "service": "vb-backend"})),
    path("admin/", admin.site.urls),
    path("api/auth/login/", login_view),
    path("api/auth/logout/", logout_view),
    path("api/auth/me/", me_view),
    path("api/", include(router.urls)),
]
