from rest_framework import serializers

from apps.standings.models import Standing


class StandingSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = Standing
        fields = "__all__"
