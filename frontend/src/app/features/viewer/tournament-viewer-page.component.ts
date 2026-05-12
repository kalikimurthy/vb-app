import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { Court, Group, Match, Team, Tournament } from '../../core/models';
import {
  formatMatchTime,
  getCourtName,
  getGroupName,
  getTeamName,
} from '../matches/match-display.helpers';

@Component({
  selector: 'app-tournament-viewer-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="viewer-page" *ngIf="tournament; else loading">
      <header class="page-hero viewer-hero">
        <div>
          <p class="kicker">Public scoreboard</p>
          <h2>{{ tournament.name }}</h2>
          <p>{{ tournament.date }} · {{ tournament.format }}</p>
        </div>
        <div class="status-pill">{{ tournament.status || 'Draft' }}</div>
      </header>

      <section class="match-section" *ngIf="liveMatches.length">
        <h3>Live now</h3>
        <div class="match-grid">
          <ng-container *ngFor="let match of liveMatches">
            <ng-container *ngTemplateOutlet="matchCard; context: { $implicit: match }"></ng-container>
          </ng-container>
        </div>
      </section>

      <section class="match-section">
        <h3>Upcoming</h3>
        <div class="match-grid" *ngIf="scheduledMatches.length; else noUpcoming">
          <ng-container *ngFor="let match of scheduledMatches">
            <ng-container *ngTemplateOutlet="matchCard; context: { $implicit: match }"></ng-container>
          </ng-container>
        </div>
        <ng-template #noUpcoming>
          <div class="empty-state">No scheduled matches.</div>
        </ng-template>
      </section>

      <section class="match-section">
        <h3>Completed</h3>
        <div class="match-grid" *ngIf="completedMatches.length; else noCompleted">
          <ng-container *ngFor="let match of completedMatches">
            <ng-container *ngTemplateOutlet="matchCard; context: { $implicit: match }"></ng-container>
          </ng-container>
        </div>
        <ng-template #noCompleted>
          <div class="empty-state">No completed matches yet.</div>
        </ng-template>
      </section>

      <ng-template #matchCard let-match>
        <article class="viewer-card" [class.live]="match.status === 'Live'" [class.completed]="match.status === 'Completed'">
          <div class="card-meta">
            <span class="badge">{{ match.status === 'Live' ? 'LIVE' : match.status === 'Completed' ? 'FINAL' : 'Scheduled' }}</span>
            <span>{{ formatMatchTime(match.scheduled_time) }}</span>
            <span>{{ getCourtName(match) }}</span>
            <span *ngIf="getGroupName(match.group)">{{ getGroupName(match.group) }}</span>
          </div>

          <div class="team-line">
            <strong>{{ getTeamName(match.team_a) }}</strong>
            <span>{{ match.score_a }}</span>
          </div>
          <div class="team-line">
            <strong>{{ getTeamName(match.team_b) }}</strong>
            <span>{{ match.score_b }}</span>
          </div>
        </article>
      </ng-template>
    </article>

    <ng-template #loading>
      <article class="viewer-page">
        <div class="panel empty-state">Loading tournament scoreboard...</div>
      </article>
    </ng-template>
  `,
  styles: [
    `
      .viewer-page {
        display: grid;
        gap: 1rem;
      }

      .viewer-hero h2 {
        margin-top: 0.25rem;
        font-size: clamp(1.55rem, 4vw, 2.5rem);
      }

      .match-section {
        display: grid;
        gap: 0.7rem;
      }

      .match-section h3 {
        margin: 0;
        color: var(--ink);
        font-size: 1rem;
      }

      .match-grid {
        display: grid;
        gap: 0.72rem;
      }

      .viewer-card {
        display: grid;
        gap: 0.65rem;
        padding: 0.9rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: rgba(30, 41, 59, 0.88);
      }

      .viewer-card.live {
        border-color: rgba(245, 158, 11, 0.38);
        box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.12);
      }

      .viewer-card.completed {
        opacity: 0.86;
      }

      .card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 800;
      }

      .card-meta span {
        padding: 0.24rem 0.48rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.5);
      }

      .badge {
        color: #bfdbfe;
      }

      .live .badge {
        color: #fcd34d;
      }

      .completed .badge {
        color: #bbf7d0;
      }

      .team-line {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 1rem;
      }

      .team-line strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
        font-size: 1rem;
      }

      .team-line span {
        min-width: 2.4rem;
        color: var(--ink);
        font-size: 1.65rem;
        font-weight: 950;
        text-align: right;
      }

      @media (min-width: 860px) {
        .match-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class TournamentViewerPageComponent implements OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private timer?: ReturnType<typeof setInterval>;

  tournament?: Tournament;
  teams: Team[] = [];
  courts: Court[] = [];
  groups: Group[] = [];
  matches: Match[] = [];
  tournamentId = Number(this.route.snapshot.paramMap.get('id'));

  constructor() {
    this.loadReferenceData();
    this.loadTournament();
    this.loadMatches();
    this.timer = setInterval(() => this.loadMatches(), 10000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  get liveMatches(): Match[] {
    return this.matches.filter((match) => match.status === 'Live');
  }

  get scheduledMatches(): Match[] {
    return this.matches.filter((match) => match.status === 'Scheduled');
  }

  get completedMatches(): Match[] {
    return this.matches.filter((match) => match.status === 'Completed');
  }

  loadReferenceData(): void {
    this.api.list<Team>('teams').subscribe((r) => (this.teams = r.results));
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.api.list<Group>('groups').subscribe((r) => (this.groups = r.results));
  }

  loadTournament(): void {
    this.api.get<Tournament>('tournaments', this.tournamentId).subscribe((tournament) => (this.tournament = tournament));
  }

  loadMatches(): void {
    this.api
      .list<Match>('matches', { tournament: this.tournamentId, ordering: 'scheduled_time' })
      .subscribe((r) => (this.matches = r.results));
  }

  getTeamName(id?: number | null): string {
    return getTeamName(this.teams, id);
  }

  getCourtName(match: Match): string {
    return getCourtName(this.courts, match);
  }

  getGroupName(id?: number | null): string {
    return getGroupName(this.groups, id);
  }

  formatMatchTime(value?: string | null): string {
    return formatMatchTime(value);
  }
}
