from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import TimeStampedModel


class MatchType(models.TextChoices):
    LEAGUE = "league", "League"
    KNOCKOUT = "knockout", "Knockout"


class MatchStatus(models.TextChoices):
    SCHEDULED = "Scheduled", "Scheduled"
    LIVE = "Live", "Live"
    COMPLETED = "Completed", "Completed"


class PoolType(models.TextChoices):
    NONE = "none", "None"
    PREMIUM = "premium", "Premium"
    STAR = "star", "Star"


class Match(TimeStampedModel):
    tournament = models.ForeignKey("tournaments.Tournament", on_delete=models.CASCADE, related_name="matches")
    group = models.ForeignKey("groups.Group", on_delete=models.SET_NULL, null=True, blank=True, related_name="matches")
    court = models.ForeignKey("courts.Court", on_delete=models.SET_NULL, null=True, blank=True, related_name="matches")
    team_a = models.ForeignKey("teams.Team", on_delete=models.SET_NULL, null=True, blank=True, related_name="home_matches")
    team_b = models.ForeignKey("teams.Team", on_delete=models.SET_NULL, null=True, blank=True, related_name="away_matches")
    winner_team = models.ForeignKey(
        "teams.Team", on_delete=models.SET_NULL, null=True, blank=True, related_name="won_matches"
    )
    next_match = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True)
    match_type = models.CharField(max_length=10, choices=MatchType.choices)
    stage = models.CharField(max_length=64, default="league")
    pool_type = models.CharField(max_length=10, choices=PoolType.choices, default=PoolType.NONE)
    manual_match = models.BooleanField(default=False)
    bracket_locked = models.BooleanField(default=False)
    court_name = models.CharField(max_length=120, blank=True)
    referee_name = models.CharField(max_length=160, blank=True)
    scheduled_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=MatchStatus.choices, default=MatchStatus.SCHEDULED)
    score_a = models.PositiveIntegerField(default=0)
    score_b = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["scheduled_time", "id"]

    def clean(self) -> None:
        if self.team_a_id and self.team_b_id and self.team_a_id == self.team_b_id:
            raise ValidationError("A match cannot have the same team on both sides.")
        if self.group_id and self.match_type != MatchType.LEAGUE:
            raise ValidationError("Group can only be set for league matches.")
        if self.group_id and self.group.tournament_id != self.tournament_id:
            raise ValidationError("Group must belong to same tournament as match.")

        for team in [self.team_a, self.team_b, self.winner_team]:
            if team and team.tournament_id != self.tournament_id:
                raise ValidationError("Teams in a match must belong to same tournament.")

        if self.match_type == MatchType.LEAGUE and self.pool_type != PoolType.NONE:
            raise ValidationError("League match cannot have pool type.")

        if self.status == MatchStatus.COMPLETED:
            if not self.team_a_id or not self.team_b_id:
                raise ValidationError("Completed match must have both teams.")
            if self.score_a == self.score_b:
                raise ValidationError("Completed volleyball match cannot end in a tie.")

    def save(self, *args, **kwargs):
        if self.court and not self.court_name:
            self.court_name = self.court.name
        if self.status == MatchStatus.COMPLETED and not self.winner_team_id and self.team_a_id and self.team_b_id:
            self.winner_team = self.team_a if self.score_a > self.score_b else self.team_b
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tournament.name} {self.stage}"
