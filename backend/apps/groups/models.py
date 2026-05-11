from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import TimeStampedModel


class Group(TimeStampedModel):
    tournament = models.ForeignKey("tournaments.Tournament", on_delete=models.CASCADE, related_name="groups")
    name = models.CharField(max_length=50)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["tournament", "name"], name="uniq_group_name_per_tournament")]
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.tournament.name} - {self.name}"


class GroupTeam(models.Model):
    group = models.ForeignKey("groups.Group", on_delete=models.CASCADE, related_name="group_teams")
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="group_links")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["group", "team"], name="uniq_team_per_group"),
        ]

    def clean(self) -> None:
        if self.group.tournament_id != self.team.tournament_id:
            raise ValidationError("Group and team must belong to the same tournament.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
