import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { Court, Group, Match, Team, Tournament } from '../../core/models';
import {
  formatMatchTime,
  getCourtName,
  getGroupName,
  getTeamName,
  getTournamentName,
} from './match-display.helpers';

@Component({
  selector: 'app-match-score-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="score-page" *ngIf="match; else loading">
      <a [routerLink]="backLink" class="back-link">Back to {{ backLabel }}</a>

      <section class="panel match-panel">
        <div class="match-meta">
          <span class="status-chip" [class.live]="match.status === 'Live'" [class.completed]="match.status === 'Completed'">
            {{ match.status }}
          </span>
          <span>{{ getTournamentName(match.tournament) }}</span>
          <span>{{ getCourtName(match) }}</span>
          <span>{{ formatMatchTime(match.scheduled_time) }}</span>
          <span *ngIf="getGroupName(match.group)">{{ getGroupName(match.group) }}</span>
          <span>Ref: {{ match.referee_name || 'TBD' }}</span>
        </div>

        <div class="scoreboard">
          <div class="team-score">
            <strong>{{ getTeamName(match.team_a) }}</strong>
            <span>{{ scoreA }}</span>
            <div class="score-controls">
              <button type="button" class="score-btn" (click)="changeScore('A', -1)">-</button>
              <button type="button" class="score-btn" (click)="changeScore('A', 1)">+</button>
            </div>
          </div>

          <div class="versus">VS</div>

          <div class="team-score">
            <strong>{{ getTeamName(match.team_b) }}</strong>
            <span>{{ scoreB }}</span>
            <div class="score-controls">
              <button type="button" class="score-btn" (click)="changeScore('B', -1)">-</button>
              <button type="button" class="score-btn" (click)="changeScore('B', 1)">+</button>
            </div>
          </div>
        </div>

        <div class="status-actions">
          <button type="button" class="secondary" [class.selected]="status === 'Scheduled'" (click)="status = 'Scheduled'">
            Scheduled
          </button>
          <button type="button" class="secondary" [class.selected]="status === 'Live'" (click)="status = 'Live'">
            Live
          </button>
          <button type="button" class="secondary" [class.selected]="status === 'Completed'" (click)="status = 'Completed'">
            Completed
          </button>
        </div>

        <div class="action-row">
          <button type="button" class="live-button" (click)="markLive()" [disabled]="isSaving">
            Mark Live
          </button>
          <button type="button" (click)="saveScore()" [disabled]="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Score' }}
          </button>
          <button type="button" class="complete-button" (click)="completeMatch()" [disabled]="isSaving">
            Complete Match
          </button>
        </div>

        <p *ngIf="message" class="success">{{ message }}</p>
        <p *ngIf="error" class="error">{{ error }}</p>
      </section>
    </article>

    <ng-template #loading>
      <article class="score-page">
        <div class="panel empty-state">Loading match...</div>
      </article>
    </ng-template>
  `,
  styles: [
    `
      .score-page {
        display: grid;
        gap: 1rem;
      }

      .back-link {
        justify-self: start;
        text-decoration: none;
        color: var(--teal);
        font-weight: 900;
      }

      .match-panel {
        display: grid;
        gap: 1rem;
        padding: 1rem;
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.14), transparent 42%),
          rgba(30, 41, 59, 0.9);
      }

      .match-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        color: var(--muted);
        font-size: 0.84rem;
        font-weight: 800;
      }

      .match-meta span {
        padding: 0.35rem 0.55rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.44);
      }

      .status-chip.live {
        border-color: rgba(245, 158, 11, 0.36);
        color: #fcd34d;
      }

      .status-chip.completed {
        border-color: rgba(34, 197, 94, 0.32);
        color: #bbf7d0;
      }

      .scoreboard {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.85rem;
      }

      .team-score {
        display: grid;
        gap: 0.75rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.45);
      }

      .team-score strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 1.05rem;
      }

      .team-score span {
        color: var(--ink);
        font-size: clamp(3rem, 12vw, 5.6rem);
        font-weight: 950;
        line-height: 0.95;
        text-align: center;
      }

      .score-controls {
        display: flex;
        gap: 0.6rem;
        min-width: 0;
      }

      .score-btn {
        flex: 1 1 0;
        width: auto;
        min-width: 0;
        min-height: 3.1rem;
        font-size: 1.35rem;
      }

      .versus {
        display: none;
        align-self: center;
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 950;
        text-align: center;
      }

      .status-actions,
      .action-row {
        display: grid;
        gap: 0.6rem;
      }

      .status-actions .selected {
        border-color: rgba(20, 184, 166, 0.44);
        background: rgba(20, 184, 166, 0.16);
      }

      .complete-button {
        background: linear-gradient(135deg, var(--success), var(--teal));
      }

      .live-button {
        background: linear-gradient(135deg, #f59e0b, var(--teal));
      }

      @media (min-width: 760px) {
        .scoreboard {
          grid-template-columns: minmax(0, 1fr) 3rem minmax(0, 1fr);
          align-items: stretch;
        }

        .versus {
          display: block;
        }

        .status-actions {
          grid-template-columns: repeat(3, 1fr);
        }

        .action-row {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    `,
  ],
})
export class MatchScorePageComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  tournaments: Tournament[] = [];
  teams: Team[] = [];
  courts: Court[] = [];
  groups: Group[] = [];
  match?: Match;
  scoreA = 0;
  scoreB = 0;
  status: Match['status'] = 'Scheduled';
  isSaving = false;
  message = '';
  error = '';
  backLink = '/matches';
  backLabel = 'matches';

  constructor() {
    this.loadReferenceData();
    const from = this.route.snapshot.queryParamMap.get('from');
    if (from === 'score-update') {
      this.backLink = '/score-update';
      this.backLabel = 'score update';
    }

    const id = Number(this.route.snapshot.paramMap.get('matchId'));
    if (id) {
      this.loadMatch(id);
    }
  }

  loadReferenceData(): void {
    this.api.list<Tournament>('tournaments').subscribe((r) => (this.tournaments = r.results));
    this.api.list<Team>('teams').subscribe((r) => (this.teams = r.results));
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.api.list<Group>('groups').subscribe((r) => (this.groups = r.results));
  }

  loadMatch(id: number): void {
    this.api.get<Match>('matches', id).subscribe({
      next: (match) => {
        this.match = match;
        this.scoreA = match.score_a;
        this.scoreB = match.score_b;
        this.status = match.status;
      },
      error: (err) => (this.error = this.formatApiError(err)),
    });
  }

  changeScore(team: 'A' | 'B', delta: number): void {
    if (team === 'A') {
      this.scoreA = Math.max(0, this.scoreA + delta);
      return;
    }

    this.scoreB = Math.max(0, this.scoreB + delta);
  }

  saveScore(): void {
    this.persistScore(this.status, 'Score saved.');
  }

  markLive(): void {
    this.status = 'Live';
    this.persistScore('Live', 'Match marked live.');
  }

  completeMatch(): void {
    this.status = 'Completed';
    this.persistScore('Completed', 'Match completed.');
  }

  getTournamentName(id?: number | null): string {
    return getTournamentName(this.tournaments, id);
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

  private persistScore(status: Match['status'], successMessage: string): void {
    if (!this.match?.id) {
      this.error = 'Match not loaded.';
      return;
    }

    this.isSaving = true;
    this.message = '';
    this.error = '';

    this.api
      .action<Match>('matches', `${this.match.id}/update_score`, {
        score_a: this.scoreA,
        score_b: this.scoreB,
        status,
      })
      .subscribe({
        next: (match) => {
          this.match = match;
          this.scoreA = match.score_a;
          this.scoreB = match.score_b;
          this.status = match.status;
          this.message = successMessage;
          this.isSaving = false;
        },
        error: (err) => {
          this.error = this.formatApiError(err);
          this.isSaving = false;
        },
      });
  }

  private formatApiError(err: unknown): string {
    const error = (err as { error?: unknown })?.error;
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      return Object.entries(error as Record<string, unknown>)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
        .join(' | ');
    }

    return 'Request failed.';
  }
}
