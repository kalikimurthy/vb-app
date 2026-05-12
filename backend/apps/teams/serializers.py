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

    def validate(self, attrs):
        team = attrs.get("team") or getattr(self.instance, "team", None)
        tournament = attrs.get("tournament") or getattr(self.instance, "tournament", None)

        if team and tournament and team.tournament_id != tournament.id:
            raise serializers.ValidationError(
                {"tournament": "Team tournament and assignment tournament must match."}
            )

        return attrs
