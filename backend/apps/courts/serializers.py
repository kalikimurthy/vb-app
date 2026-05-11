from rest_framework import serializers

from apps.courts.models import Court


class CourtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Court
        fields = "__all__"
