from django.contrib import admin

from apps.courts.models import Court


@admin.register(Court)
class CourtAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "location")
