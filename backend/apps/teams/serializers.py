from rest_framework import serializers

from apps.teams.models import Team, TeamPlayer


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = "__all__"


class TeamPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamPlayer
        fields = "__all__"
