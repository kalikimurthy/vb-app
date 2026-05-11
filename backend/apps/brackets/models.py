from django.db import models

from apps.common.models import TimeStampedModel


class BracketConfig(TimeStampedModel):
    tournament = models.OneToOneField("tournaments.Tournament", on_delete=models.CASCADE, related_name="bracket_config")
    is_locked = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"BracketConfig({self.tournament.name}, locked={self.is_locked})"
