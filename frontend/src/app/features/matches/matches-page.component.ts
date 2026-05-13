import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
  selector: 'app-matches-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <article class="matches-page">
      <header class="page-hero">
        <div>
          <p class="kicker">Match center</p>
          <h2>Matches</h2>
          <p>Create fixtures, review court assignments, and open one match at a time for scoring.</p>
        </div>
        <div class="status-pill">{{ matches.length }} Matches</div>
      </header>

      <section class="match-list">
        <article class="panel match-card" *ngFor="let m of matches">
          <div class="match-card-top">
            <div>
              <p class="kicker">{{ getTournamentName(m.tournament) }}</p>
              <h3>{{ getTeamName(m.team_a) }} vs {{ getTeamName(m.team_b) }}</h3>
            </div>
            <span class="status-chip" [class.live]="m.status === 'Live'" [class.completed]="m.status === 'Completed'">
              {{ m.status }}
            </span>
          </div>

          <div class="score-line">
            <span>{{ getTeamName(m.team_a) }}</span>
            <strong>{{ m.score_a }}</strong>
          </div>
          <div class="score-line">
            <span>{{ getTeamName(m.team_b) }}</span>
            <strong>{{ m.score_b }}</strong>
          </div>

          <div class="meta-row">
            <span>{{ getCourtName(m) }}</span>
            <span>{{ formatMatchTime(m.scheduled_time) }}</span>
            <span *ngIf="getGroupName(m.group)">{{ getGroupName(m.group) }}</span>
            <span>{{ m.stage }}</span>
          </div>

          <a class="score-link" [routerLink]="['/matches', m.id, 'score']" [queryParams]="{ from: 'matches' }">
            Score Match
          </a>
        </article>
      </section>

      <section class="panel create-panel">
        <h3>Create Match</h3>
        <form class="create-grid" (ngSubmit)="create()">
          <select [(ngModel)]="form.tournament" name="tournament"><option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option></select>
          <select [(ngModel)]="form.match_type" name="matchType"><option value="league">league</option><option value="knockout">knockout</option></select>
          <input [(ngModel)]="form.stage" name="stage" placeholder="stage (quarter_final/semi_final/final/custom)" />
          <select [(ngModel)]="form.group" name="group"><option [ngValue]="null">No Group</option><option *ngFor="let g of groups" [ngValue]="g.id">{{ g.name }}</option></select>
          <select [(ngModel)]="form.team_a" name="teamA"><option [ngValue]="null">Team A</option><option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option></select>
          <select [(ngModel)]="form.team_b" name="teamB"><option [ngValue]="null">Team B</option><option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option></select>
          <select [(ngModel)]="form.court" name="court"><option [ngValue]="null">Court</option><option *ngFor="let c of courts" [ngValue]="c.id">{{ c.name }}</option></select>
          <input [(ngModel)]="form.scheduled_time" name="scheduledTime" type="datetime-local" />
          <select [(ngModel)]="form.pool_type" name="poolType"><option value="none">none</option><option value="premium">premium</option><option value="star">star</option></select>
          <button type="submit" [disabled]="isCreating">{{ isCreating ? 'Creating...' : 'Create Match' }}</button>
        </form>
        <p *ngIf="createSuccess" class="success">{{ createSuccess }}</p>
        <p *ngIf="createError" class="error">{{ createError }}</p>
      </section>
    </article>
  `,
  styles: [
    `
      .matches-page {
        display: grid;
        gap: 1rem;
      }

      .match-list {
        display: grid;
        gap: 0.75rem;
      }

      .match-card {
        display: grid;
        gap: 0.75rem;
        padding: 0.95rem;
      }

      .match-card-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .match-card-top > div {
        min-width: 0;
      }

      .match-card h3 {
        margin: 0.2rem 0 0;
        font-size: 1rem;
      }

      .status-chip {
        flex: 0 0 auto;
        max-width: 8rem;
        padding: 0.35rem 0.55rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        color: var(--muted);
        font-size: 0.76rem;
        font-weight: 900;
      }

      .status-chip.live {
        border-color: rgba(245, 158, 11, 0.36);
        color: #fcd34d;
      }

      .status-chip.completed {
        border-color: rgba(34, 197, 94, 0.32);
        color: #bbf7d0;
      }

      .score-line {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(2.4rem, auto);
        align-items: center;
        gap: 0.75rem;
      }

      .score-line span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
        font-weight: 850;
      }

      .score-line strong {
        min-width: 2.4rem;
        color: var(--ink);
        font-size: 1.8rem;
        text-align: right;
      }

      .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .meta-row span {
        padding: 0.3rem 0.5rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.44);
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 800;
      }

      .score-link {
        display: block;
        min-height: 2.75rem;
        padding: 0.78rem 1rem;
        border-radius: 0.9rem;
        background: linear-gradient(135deg, var(--accent), var(--teal));
        color: var(--ink);
        font-weight: 900;
        text-align: center;
        text-decoration: none;
      }

      .create-panel {
        padding: 0.95rem;
      }

      .create-grid {
        display: grid;
        gap: 0.7rem;
      }

      @media (min-width: 860px) {
        .match-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .create-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class MatchesPageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  teams: Team[] = [];
  groups: Group[] = [];
  courts: Court[] = [];
  matches: Match[] = [];
  isCreating = false;
  createError = '';
  createSuccess = '';

  form: Match = {
    tournament: 0,
    match_type: 'league',
    stage: 'league',
    pool_type: 'none',
    manual_match: false,
    bracket_locked: false,
    status: 'Scheduled',
    score_a: 0,
    score_b: 0,
    group: null,
    team_a: null,
    team_b: null,
    court: null,
    scheduled_time: null,
  };

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Tournament>('tournaments').subscribe((r) => {
      this.tournaments = r.results;
      if (!this.form.tournament && this.tournaments[0]?.id) {
        this.form.tournament = this.tournaments[0].id;
      }
    });
    this.api.list<Team>('teams').subscribe((r) => (this.teams = r.results));
    this.api.list<Group>('groups').subscribe((r) => (this.groups = r.results));
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.api.list<Match>('matches').subscribe((r) => (this.matches = r.results));
  }

  create(): void {
    this.createError = '';
    this.createSuccess = '';

    if (!this.form.tournament) {
      this.createError = 'Select a tournament before creating a match.';
      return;
    }

    if (!this.form.team_a || !this.form.team_b) {
      this.createError = 'Select both teams before creating a match.';
      return;
    }

    if (this.form.team_a === this.form.team_b) {
      this.createError = 'A match needs two different teams.';
      return;
    }

    this.isCreating = true;

    this.api.create<Match>('matches', this.form).subscribe({
      next: () => {
        this.createSuccess = 'Match created.';
        this.isCreating = false;
        this.load();
      },
      error: (err) => {
        this.createError = this.formatApiError(err);
        this.isCreating = false;
      },
    });
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

    return 'Request failed. Check that the backend is running and the match form is valid.';
  }
}
