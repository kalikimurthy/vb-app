from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.standings.models import Standing
from apps.standings.serializers import StandingSerializer
from apps.standings.services.recalculate import recalculate_tournament_standings, split_pool_standings


class StandingViewSet(ReadOnlyModelViewSet):
    queryset = Standing.objects.select_related("tournament", "team").all()
    serializer_class = StandingSerializer
    filterset_fields = ["tournament", "pool_type", "team"]
    ordering_fields = ["rank", "wins", "net_run_rate", "points_scored"]

    @action(detail=False, methods=["post"])
    def recalculate(self, request):
        tournament_id = request.data.get("tournament")
        recalculate_tournament_standings(tournament_id)
        return Response({"detail": "Standings recalculated."})

    @action(detail=False, methods=["post"])
    def split_pools(self, request):
        tournament_id = request.data.get("tournament")
        split_pool_standings(tournament_id)
        return Response({"detail": "Premium/Star pool standings prepared."})
