from django.contrib import admin

from apps.teams.models import Team, TeamPlayer


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "tournament")
    list_filter = ("tournament",)
    search_fields = ("name",)


@admin.register(TeamPlayer)
class TeamPlayerAdmin(admin.ModelAdmin):
    list_display = ("team", "player", "tournament", "created_at")
    list_filter = ("tournament",)
