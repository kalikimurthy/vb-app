from django.contrib import admin

from apps.standings.models import Standing


@admin.register(Standing)
class StandingAdmin(admin.ModelAdmin):
    list_display = ("tournament", "team", "pool_type", "rank", "wins", "losses", "net_run_rate")
    list_filter = ("tournament", "pool_type")
