from django.contrib import admin

from apps.tournaments.models import Tournament


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ("name", "date", "format", "status")
    list_filter = ("format", "status")
    search_fields = ("name",)
