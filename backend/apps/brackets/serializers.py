from rest_framework import serializers

from apps.matches.models import Match, PoolType


class BracketGenerateSerializer(serializers.Serializer):
    tournament_id = serializers.IntegerField()


class BracketLockSerializer(serializers.Serializer):
    tournament_id = serializers.IntegerField()
    locked = serializers.BooleanField()


class ManualMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = [
            "id",
            "tournament",
            "team_a",
            "team_b",
            "match_type",
            "stage",
            "pool_type",
            "manual_match",
            "bracket_locked",
            "scheduled_time",
            "court",
            "court_name",
            "status",
            "score_a",
            "score_b",
            "winner_team",
            "next_match",
            "group",
        ]

    def validate(self, attrs):
        attrs.setdefault("match_type", "knockout")
        attrs.setdefault("manual_match", True)
        pool_type = attrs.get("pool_type", PoolType.NONE)
        if pool_type not in [PoolType.NONE, PoolType.PREMIUM, PoolType.STAR]:
            raise serializers.ValidationError("Invalid pool type")
        return attrs
