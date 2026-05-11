from rest_framework import serializers

from apps.groups.models import Group, GroupTeam


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = "__all__"


class GroupTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupTeam
        fields = "__all__"
