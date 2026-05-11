from django.db import models

from apps.common.models import TimeStampedModel


class TournamentFormat(models.TextChoices):
    TOP4 = "Top4", "Top4"
    TOP8 = "Top8", "Top8"
    PREMIUM_STAR = "Premium/Star", "Premium/Star"


class TournamentStatus(models.TextChoices):
    DRAFT = "Draft", "Draft"
    LIVE = "Live", "Live"
    COMPLETED = "Completed", "Completed"


class Tournament(TimeStampedModel):
    name = models.CharField(max_length=255)
    date = models.DateField()
    format = models.CharField(max_length=32, choices=TournamentFormat.choices)
    status = models.CharField(max_length=16, choices=TournamentStatus.choices, default=TournamentStatus.DRAFT)

    class Meta:
        ordering = ["-date", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.format})"
