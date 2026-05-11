from rest_framework import serializers

from apps.tournaments.models import Tournament


class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = "__all__"
