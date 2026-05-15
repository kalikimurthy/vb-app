from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.matches.models import Match, MatchStatus, MatchType, PoolType
from apps.matches.serializers import MatchSerializer
from apps.standings.models import Standing
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
        self._sync_knockout_progression(match)
        return Response(self.get_serializer(match).data)

    @action(detail=False, methods=["post"])
    def generate_knockout(self, request):
        tournament_id = request.data.get("tournament")
        if not tournament_id:
            return Response({"detail": "Tournament is required."}, status=status.HTTP_400_BAD_REQUEST)

        standings = list(
            Standing.objects.filter(tournament_id=tournament_id, pool_type__isnull=True)
            .select_related("team")
            .order_by("rank")
        )
        if len(standings) < 16:
            return Response(
                {"detail": "At least 16 ranked teams are required to generate knockout matches."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = 0
        created += self._generate_division_knockout(tournament_id, PoolType.PREMIUM, standings[:8])
        created += self._generate_division_knockout(tournament_id, PoolType.STAR, standings[8:16])

        return Response({"created": created, "detail": "Official knockout matches are ready."})

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

    def _generate_division_knockout(self, tournament_id: int, pool_type: str, standings: list[Standing]) -> int:
        seeds = [standing.team for standing in standings[:8]]
        qf_pairings = [
            ("quarter_final_1", seeds[0], seeds[7]),
            ("quarter_final_2", seeds[1], seeds[6]),
            ("quarter_final_3", seeds[2], seeds[5]),
            ("quarter_final_4", seeds[3], seeds[4]),
        ]

        created = 0
        for stage, team_a, team_b in qf_pairings:
            _match, was_created = Match.objects.get_or_create(
                tournament_id=tournament_id,
                match_type=MatchType.KNOCKOUT,
                pool_type=pool_type,
                stage=stage,
                defaults={
                    "team_a": team_a,
                    "team_b": team_b,
                    "status": MatchStatus.SCHEDULED,
                    "score_a": 0,
                    "score_b": 0,
                    "manual_match": True,
                    "bracket_locked": False,
                },
            )
            created += int(was_created)

        for stage in ["semi_final_1", "semi_final_2", "third_place", "final"]:
            _match, was_created = Match.objects.get_or_create(
                tournament_id=tournament_id,
                match_type=MatchType.KNOCKOUT,
                pool_type=pool_type,
                stage=stage,
                defaults={
                    "status": MatchStatus.SCHEDULED,
                    "score_a": 0,
                    "score_b": 0,
                    "manual_match": True,
                    "bracket_locked": False,
                },
            )
            created += int(was_created)

        return created

    def _sync_knockout_progression(self, match: Match) -> None:
        if match.match_type != MatchType.KNOCKOUT or match.status != MatchStatus.COMPLETED:
            return
        if not match.team_a_id or not match.team_b_id or match.score_a == match.score_b:
            return

        winner = match.team_a if match.score_a > match.score_b else match.team_b
        loser = match.team_b if winner.id == match.team_a_id else match.team_a
        if match.winner_team_id != winner.id:
            Match.objects.filter(id=match.id).update(winner_team=winner)

        stage = match.stage
        if stage in {"quarter_final_1", "quarter_final_2"}:
            self._assign_next_slot(match, "semi_final_1", winner, "a" if stage == "quarter_final_1" else "b")
        elif stage in {"quarter_final_3", "quarter_final_4"}:
            self._assign_next_slot(match, "semi_final_2", winner, "a" if stage == "quarter_final_3" else "b")
        elif stage == "semi_final_1":
            self._assign_next_slot(match, "final", winner, "a")
            self._assign_next_slot(match, "third_place", loser, "a")
        elif stage == "semi_final_2":
            self._assign_next_slot(match, "final", winner, "b")
            self._assign_next_slot(match, "third_place", loser, "b")

    def _assign_next_slot(self, source_match: Match, target_stage: str, team, slot: str) -> None:
        target, _created = Match.objects.get_or_create(
            tournament_id=source_match.tournament_id,
            match_type=MatchType.KNOCKOUT,
            pool_type=source_match.pool_type,
            stage=target_stage,
            defaults={
                "status": MatchStatus.SCHEDULED,
                "score_a": 0,
                "score_b": 0,
                "manual_match": True,
                "bracket_locked": False,
            },
        )

        if slot == "a":
            target.team_a = team
        else:
            target.team_b = team
        target.save()
