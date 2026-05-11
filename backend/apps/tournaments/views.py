from rest_framework.viewsets import ModelViewSet

from apps.tournaments.models import Tournament
from apps.tournaments.serializers import TournamentSerializer


class TournamentViewSet(ModelViewSet):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    search_fields = ["name", "format", "status"]
    filterset_fields = ["format", "status", "date"]
    ordering_fields = ["date", "name", "created_at"]
