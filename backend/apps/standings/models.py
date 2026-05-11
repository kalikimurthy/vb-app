from django.db import models

from apps.common.models import TimeStampedModel
from apps.matches.models import PoolType


class Standing(TimeStampedModel):
    tournament = models.ForeignKey("tournaments.Tournament", on_delete=models.CASCADE, related_name="standings")
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="standings")
    wins = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    points_scored = models.PositiveIntegerField(default=0)
    points_given = models.PositiveIntegerField(default=0)
    net_run_rate = models.DecimalField(max_digits=8, decimal_places=3, default=0)
    rank = models.PositiveIntegerField(default=0)
    pool_type = models.CharField(max_length=10, choices=PoolType.choices, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["tournament", "team", "pool_type"], name="uniq_team_standing_per_tournament_pool")
        ]
        ordering = ["rank", "-wins", "-net_run_rate", "-points_scored"]

    def __str__(self) -> str:
        return f"{self.team.name} #{self.rank}"
