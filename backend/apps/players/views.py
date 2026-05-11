from rest_framework.viewsets import ModelViewSet

from apps.players.models import Player
from apps.players.serializers import PlayerSerializer


class PlayerViewSet(ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
