from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.matches.models import Match
from apps.matches.serializers import MatchSerializer
from apps.standings.services.recalculate import league_completed, recalculate_tournament_standings


class MatchViewSet(ModelViewSet):
    queryset = Match.objects.select_related(
        "tournament", "group", "court", "team_a", "team_b", "winner_team"
    ).all()
    serializer_class = MatchSerializer
    filterset_fields = [
        "tournament",
        "group",
        "court",
        "match_type",
        "stage",
        "pool_type",
        "status",
        "manual_match",
        "bracket_locked",
    ]
    search_fields = ["stage", "court_name"]
    ordering_fields = ["scheduled_time", "stage", "created_at"]

    def perform_create(self, serializer):
        match = serializer.save()
        self._sync_standings(match)

    def perform_update(self, serializer):
        match = serializer.save()
        self._sync_standings(match)

    @action(detail=True, methods=["post"])
    def update_score(self, request, pk=None):
        match = self.get_object()
        serializer = self.get_serializer(match, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        match = serializer.save()
        self._sync_standings(match)
        return Response(self.get_serializer(match).data)

    @action(detail=False, methods=["get"])
    def by_court(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        court_id = request.query_params.get("court")
        if court_id:
            queryset = queryset.filter(court_id=court_id)
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"])
    def by_round(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        stage = request.query_params.get("stage")
        if stage:
            queryset = queryset.filter(stage=stage)
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)

    def _sync_standings(self, match: Match) -> None:
        if match.match_type == "league":
            recalculate_tournament_standings(match.tournament_id)
            if league_completed(match.tournament_id):
                # Keeping extension point explicit for progression workflows.
                pass
