from django.contrib import admin

from apps.groups.models import Group, GroupTeam


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "tournament")
    list_filter = ("tournament",)


@admin.register(GroupTeam)
class GroupTeamAdmin(admin.ModelAdmin):
    list_display = ("group", "team", "created_at")
