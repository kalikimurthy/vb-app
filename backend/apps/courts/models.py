from django.db import models

from apps.common.models import TimeStampedModel


class Court(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
