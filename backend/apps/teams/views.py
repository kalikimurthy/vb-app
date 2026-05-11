from rest_framework.viewsets import ModelViewSet

from apps.teams.models import Team, TeamPlayer
from apps.teams.serializers import TeamSerializer, TeamPlayerSerializer


class TeamViewSet(ModelViewSet):
    queryset = Team.objects.select_related("tournament").all()
    serializer_class = TeamSerializer
    filterset_fields = ["tournament"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]


class TeamPlayerViewSet(ModelViewSet):
    queryset = TeamPlayer.objects.select_related("team", "player", "tournament").all()
    serializer_class = TeamPlayerSerializer
    filterset_fields = ["team", "player", "tournament"]
    ordering_fields = ["created_at"]
