import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { Court, Group, Match, Team, Tournament } from '../../core/models';
import {
  formatMatchTime,
  getCourtName,
  getGroupName,
  getMatchFormatLabel,
  getMatchStageLabel,
  getTeamName,
  getTournamentName,
} from './match-display.helpers';

@Component({
  selector: 'app-match-score-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <article class="score-page" *ngIf="match; else loading">
      <section class="panel match-panel">
        <div class="match-meta">
          <span class="status-chip" [class.live]="match.status === 'Live'" [class.completed]="match.status === 'Completed'">
            {{ match.status }}
          </span>
          <span>{{ getTournamentName(match.tournament) }}</span>
          <span>{{ getCourtName(match) }}</span>
          <span>{{ formatMatchTime(match.scheduled_time) }}</span>
          <span *ngIf="getMatchStageLabel(match)">{{ getMatchStageLabel(match) }}</span>
          <span *ngIf="getMatchFormatLabel(match)">{{ getMatchFormatLabel(match) }}</span>
          <span>Ref: {{ match.referee_name || 'TBD' }}</span>
        </div>

        <div class="scoreboard">
          <div class="team-score">
            <strong>{{ getTeamName(match.team_a) }}</strong>
            <input
              type="number"
              inputmode="numeric"
              min="0"
              name="scoreA"
              [(ngModel)]="scoreA"
              (ngModelChange)="onScoreInput('A', $event)"
              aria-label="Team A score"
            />
          </div>

          <div class="versus">VS</div>

          <div class="team-score">
            <strong>{{ getTeamName(match.team_b) }}</strong>
            <input
              type="number"
              inputmode="numeric"
              min="0"
              name="scoreB"
              [(ngModel)]="scoreB"
              (ngModelChange)="onScoreInput('B', $event)"
              aria-label="Team B score"
            />
          </div>
        </div>

        <div class="autosave-row" [class.saving]="autosaveStatus === 'Saving...'" [class.failed]="autosaveStatus === 'Failed to save'">
          {{ autosaveStatus }}
        </div>

        <div class="format-note" *ngIf="match.best_of === 3">
          Final match: Best of 3. Use the score boxes for sets won until set-by-set scoring is added.
        </div>

        <div class="action-row">
          <button type="button" class="live-button" (click)="markLive()" [disabled]="isSaving">
            {{ status === 'Live' ? 'Mark Live' : 'Start Live' }}
          </button>
          <button type="button" class="complete-button" (click)="completeMatch()" [disabled]="isSaving">
            Complete Match
          </button>
          <a [routerLink]="backLink" class="back-button">Back</a>
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

      .team-score input {
        width: 100%;
        min-height: 5.4rem;
        padding: 0.35rem;
        border-radius: 1rem;
        border-color: rgba(20, 184, 166, 0.24);
        background: rgba(15, 23, 42, 0.56);
        color: var(--ink);
        font-size: clamp(3rem, 12vw, 5.6rem);
        font-weight: 950;
        line-height: 0.95;
        text-align: center;
      }

      .team-score input::-webkit-outer-spin-button,
      .team-score input::-webkit-inner-spin-button {
        margin: 0;
        appearance: none;
      }

      .versus {
        display: none;
        align-self: center;
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 950;
        text-align: center;
      }

      .action-row {
        display: grid;
        gap: 0.6rem;
      }

      .autosave-row {
        min-height: 1.6rem;
        color: var(--muted);
        font-size: 0.82rem;
        font-weight: 850;
      }

      .autosave-row.saving {
        color: #bfdbfe;
      }

      .autosave-row.failed {
        color: #fecaca;
      }

      .format-note {
        padding: 0.75rem 0.85rem;
        border: 1px solid rgba(20, 184, 166, 0.22);
        border-radius: 0.9rem;
        background: rgba(20, 184, 166, 0.1);
        color: #ccfbf1;
        font-size: 0.85rem;
        font-weight: 850;
      }

      .complete-button {
        background: linear-gradient(135deg, var(--success), var(--teal));
      }

      .live-button {
        background: linear-gradient(135deg, #f59e0b, var(--teal));
      }

      .back-button {
        display: grid;
        place-items: center;
        min-height: 2.75rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.1);
        color: var(--ink);
        font-weight: 850;
        text-decoration: none;
      }

      @media (min-width: 760px) {
        .scoreboard {
          grid-template-columns: minmax(0, 1fr) 3rem minmax(0, 1fr);
          align-items: stretch;
        }

        .versus {
          display: block;
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
  autosaveStatus = 'Saved';
  backLink = '/matches';
  backLabel = 'matches';
  private autosaveTimer?: ReturnType<typeof setTimeout>;

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
        this.autosaveStatus = 'Saved';
      },
      error: (err) => (this.error = this.formatApiError(err)),
    });
  }

  onScoreInput(team: 'A' | 'B', value: number | string): void {
    const nextScore = this.normalizeScore(value);
    if (team === 'A') {
      this.scoreA = nextScore;
    } else {
      this.scoreB = nextScore;
    }

    this.scheduleAutosave();
  }

  markLive(): void {
    this.clearAutosaveTimer();
    this.status = 'Live';
    this.persistScore('Live', 'Match marked live.');
  }

  completeMatch(): void {
    this.clearAutosaveTimer();
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

  getMatchStageLabel(match: Match): string {
    return getMatchStageLabel(match, this.groups);
  }

  getMatchFormatLabel(match: Match): string {
    return getMatchFormatLabel(match);
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
    this.autosaveStatus = 'Saving...';
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
          this.autosaveStatus = 'Saved';
          this.isSaving = false;
        },
        error: (err) => {
          this.error = this.formatApiError(err);
          this.autosaveStatus = 'Failed to save';
          this.isSaving = false;
        },
      });
  }

  private scheduleAutosave(): void {
    if (!this.match?.id) {
      return;
    }

    this.clearAutosaveTimer();
    this.autosaveStatus = 'Saving...';
    this.autosaveTimer = setTimeout(() => {
      this.persistScore(this.status, 'Score autosaved.');
    }, 650);
  }

  private clearAutosaveTimer(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = undefined;
    }
  }

  private normalizeScore(value: number | string): number {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }

    return Math.floor(parsed);
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
