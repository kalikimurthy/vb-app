from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import TimeStampedModel


class Team(TimeStampedModel):
    tournament = models.ForeignKey("tournaments.Tournament", on_delete=models.CASCADE, related_name="teams")
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["tournament", "name"], name="uniq_team_name_per_tournament")]

    def __str__(self) -> str:
        return self.name


class TeamPlayer(models.Model):
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE, related_name="team_players")
    player = models.ForeignKey("players.Player", on_delete=models.CASCADE, related_name="team_links")
    tournament = models.ForeignKey("tournaments.Tournament", on_delete=models.CASCADE, related_name="team_players")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["team", "player", "tournament"], name="uniq_team_player_in_tournament"),
        ]

    def clean(self) -> None:
        if self.team.tournament_id != self.tournament_id:
            raise ValidationError("Team tournament and assignment tournament must match.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.player} - {self.team}"
