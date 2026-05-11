from rest_framework.viewsets import ModelViewSet

from apps.groups.models import Group, GroupTeam
from apps.groups.serializers import GroupSerializer, GroupTeamSerializer


class GroupViewSet(ModelViewSet):
    queryset = Group.objects.select_related("tournament").all()
    serializer_class = GroupSerializer
    filterset_fields = ["tournament"]
    search_fields = ["name"]


class GroupTeamViewSet(ModelViewSet):
    queryset = GroupTeam.objects.select_related("group", "team").all()
    serializer_class = GroupTeamSerializer
    filterset_fields = ["group", "team", "group__tournament"]
