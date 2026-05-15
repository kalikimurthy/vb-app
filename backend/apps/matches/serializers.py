from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.matches.models import Match
from apps.matches.services.court_conflicts import has_court_conflict


class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = "__all__"

    def validate(self, attrs):
        instance = self.instance
        current = instance or Match()

        for key, value in attrs.items():
            setattr(current, key, value)

        if current.bracket_locked and self.instance and any(
            k in attrs
            for k in ["team_a", "team_b", "stage", "pool_type", "best_of", "scheduled_time", "court", "manual_match"]
        ):
            raise serializers.ValidationError("Bracket is locked. Only score/status updates are allowed.")

        if has_court_conflict(match=current):
            raise serializers.ValidationError("Court scheduling conflict detected within configured buffer.")

        try:
            current.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else str(exc)) from exc

        return attrs
