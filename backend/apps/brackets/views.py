from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.brackets.serializers import BracketGenerateSerializer, BracketLockSerializer, ManualMatchSerializer
from apps.brackets.services.generate import generate_bracket_for_tournament
from apps.brackets.services.manual_edit import set_bracket_lock, update_match_slots
from apps.matches.models import Match
from apps.tournaments.models import Tournament


class BracketViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["post"])
    def generate(self, request):
        serializer = BracketGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tournament = Tournament.objects.get(id=serializer.validated_data["tournament_id"])
        matches = generate_bracket_for_tournament(tournament)
        return Response(ManualMatchSerializer(matches, many=True).data)

    @action(detail=False, methods=["post"])
    def manual_match(self, request):
        serializer = ManualMatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        match = serializer.save(match_type="knockout", manual_match=True)
        return Response(ManualMatchSerializer(match).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["patch"])
    def update_slots(self, request):
        match = Match.objects.get(id=request.data.get("match_id"))
        updated = update_match_slots(
            match,
            team_a_id=request.data.get("team_a"),
            team_b_id=request.data.get("team_b"),
            stage=request.data.get("stage"),
            pool_type=request.data.get("pool_type"),
        )
        return Response(ManualMatchSerializer(updated).data)

    @action(detail=False, methods=["post"])
    def lock(self, request):
        serializer = BracketLockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        set_bracket_lock(serializer.validated_data["tournament_id"], serializer.validated_data["locked"])
        return Response({"detail": "Bracket lock updated."})

    @action(detail=False, methods=["post"])
    def assign_court(self, request):
        match = Match.objects.get(id=request.data.get("match_id"))
        match.court_id = request.data.get("court_id")
        if match.court:
            match.court_name = match.court.name
        match.save()
        return Response(ManualMatchSerializer(match).data)
