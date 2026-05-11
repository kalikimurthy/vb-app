from django.contrib import admin

from apps.brackets.models import BracketConfig


@admin.register(BracketConfig)
class BracketConfigAdmin(admin.ModelAdmin):
    list_display = ("tournament", "is_locked", "updated_at")
