from django.contrib import admin

from apps.matches.models import Match


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "tournament",
        "match_type",
        "stage",
        "pool_type",
        "team_a",
        "team_b",
        "court",
        "scheduled_time",
        "status",
        "bracket_locked",
    )
    list_filter = ("tournament", "match_type", "stage", "pool_type", "status", "bracket_locked")
    search_fields = ("stage", "court_name")
