from rest_framework.viewsets import ModelViewSet

from apps.courts.models import Court
from apps.courts.serializers import CourtSerializer


class CourtViewSet(ModelViewSet):
    queryset = Court.objects.all()
    serializer_class = CourtSerializer
    filterset_fields = ["is_active"]
    search_fields = ["name", "location"]
    ordering_fields = ["name", "created_at"]
