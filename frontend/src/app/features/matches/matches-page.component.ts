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
  getMatchFormatLabel,
  getMatchStageLabel,
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
        <div class="hero-actions">
          <div class="status-pill">{{ matches.length }} Matches</div>
          <button type="button" class="knockout-button" (click)="generateKnockout()" [disabled]="isGeneratingKnockout">
            {{ isGeneratingKnockout ? 'Generating...' : 'Generate Official Knockout Matches' }}
          </button>
        </div>
      </header>

      <p *ngIf="knockoutSuccess" class="success">{{ knockoutSuccess }}</p>
      <p *ngIf="knockoutError" class="error">{{ knockoutError }}</p>

      <ng-container *ngFor="let section of matchSections">
        <section class="match-section" *ngIf="section.matches.length">
          <div class="section-heading">
            <h3>{{ section.title }}</h3>
            <span>{{ section.matches.length }} Matches</span>
          </div>

          <div class="match-list">
            <article class="panel match-card" *ngFor="let m of section.matches">
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
                <span *ngIf="getMatchStageLabel(m)">{{ getMatchStageLabel(m) }}</span>
                <span *ngIf="getMatchFormatLabel(m)">{{ getMatchFormatLabel(m) }}</span>
                <span>Ref: {{ m.referee_name || 'TBD' }}</span>
              </div>

              <div class="card-actions">
                <button type="button" class="edit-link" (click)="startEdit(m)">Edit Match</button>
                <a class="score-link" [routerLink]="['/matches', m.id, 'score']" [queryParams]="{ from: 'matches' }">
                  Score Match
                </a>
              </div>
            </article>
          </div>
        </section>
      </ng-container>

      <section class="panel edit-panel" *ngIf="editForm">
        <div class="panel-title-row">
          <div>
            <p class="kicker">Admin edit</p>
            <h3>Edit Match</h3>
          </div>
          <button type="button" class="edit-link subtle" (click)="cancelEdit()">Close</button>
        </div>

        <form class="create-grid" (ngSubmit)="saveEdit()">
          <select [(ngModel)]="editForm.tournament" name="editTournament">
            <option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option>
          </select>
          <select [(ngModel)]="editForm.match_type" name="editMatchType">
            <option value="league">Pool / group stage</option>
            <option value="knockout">Knockout</option>
          </select>
          <select [(ngModel)]="editForm.stage" name="editStage">
            <option *ngFor="let option of stageOptions" [value]="option.value">{{ option.label }}</option>
          </select>
          <select [(ngModel)]="editForm.group" name="editGroup">
            <option [ngValue]="null">No Group</option>
            <option *ngFor="let g of groups" [ngValue]="g.id">{{ g.name }}</option>
          </select>
          <select [(ngModel)]="editForm.team_a" name="editTeamA">
            <option [ngValue]="null">Team A</option>
            <option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option>
          </select>
          <select [(ngModel)]="editForm.team_b" name="editTeamB">
            <option [ngValue]="null">Team B</option>
            <option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option>
          </select>
          <select [(ngModel)]="editForm.court" name="editCourt">
            <option [ngValue]="null">Court</option>
            <option *ngFor="let c of courts" [ngValue]="c.id">{{ c.name }}</option>
          </select>
          <input [(ngModel)]="editForm.scheduled_time" name="editScheduledTime" type="datetime-local" />
          <input [(ngModel)]="editForm.referee_name" name="editRefereeName" placeholder="Referee / ref team" />
          <select [(ngModel)]="editForm.pool_type" name="editPoolType">
            <option value="none">No knockout division</option>
            <option value="premium">Division A · Champions League</option>
            <option value="star">Division B · Premier League</option>
          </select>
          <select [(ngModel)]="editForm.best_of" name="editBestOf">
            <option [ngValue]="1">Best of 1</option>
            <option [ngValue]="3">Best of 3</option>
          </select>
          <select [(ngModel)]="editForm.status" name="editStatus">
            <option value="Scheduled">Scheduled</option>
            <option value="Live">Live</option>
            <option value="Completed">Completed</option>
          </select>
          <button type="submit" [disabled]="isUpdating">{{ isUpdating ? 'Saving...' : 'Save Match Changes' }}</button>
        </form>
        <p *ngIf="editSuccess" class="success">{{ editSuccess }}</p>
        <p *ngIf="editError" class="error">{{ editError }}</p>
      </section>

      <section class="panel create-panel">
        <h3>Create Match</h3>
        <form class="create-grid" (ngSubmit)="create()">
          <select [(ngModel)]="form.tournament" name="tournament"><option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option></select>
          <select [(ngModel)]="form.match_type" name="matchType"><option value="league">league</option><option value="knockout">knockout</option></select>
          <select [(ngModel)]="form.stage" name="stage">
            <option *ngFor="let option of stageOptions" [value]="option.value">{{ option.label }}</option>
          </select>
          <select [(ngModel)]="form.group" name="group"><option [ngValue]="null">No Group</option><option *ngFor="let g of groups" [ngValue]="g.id">{{ g.name }}</option></select>
          <select [(ngModel)]="form.team_a" name="teamA"><option [ngValue]="null">Team A</option><option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option></select>
          <select [(ngModel)]="form.team_b" name="teamB"><option [ngValue]="null">Team B</option><option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option></select>
          <select [(ngModel)]="form.court" name="court"><option [ngValue]="null">Court</option><option *ngFor="let c of courts" [ngValue]="c.id">{{ c.name }}</option></select>
          <input [(ngModel)]="form.scheduled_time" name="scheduledTime" type="datetime-local" />
          <input [(ngModel)]="form.referee_name" name="refereeName" placeholder="Referee / ref team" />
          <select [(ngModel)]="form.pool_type" name="poolType"><option value="none">none</option><option value="premium">premium</option><option value="star">star</option></select>
          <select [(ngModel)]="form.best_of" name="bestOf"><option [ngValue]="1">Best of 1</option><option [ngValue]="3">Best of 3</option></select>
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

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 0.65rem;
      }

      .knockout-button {
        min-height: 2.75rem;
        padding: 0.78rem 1rem;
        border: 1px solid rgba(20, 184, 166, 0.28);
        border-radius: 0.9rem;
        background: rgba(20, 184, 166, 0.12);
        color: var(--ink);
        font-weight: 900;
      }

      .knockout-button:disabled {
        cursor: wait;
        opacity: 0.68;
      }

      .match-section {
        display: grid;
        gap: 0.7rem;
      }

      .section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .section-heading h3 {
        margin: 0;
        color: var(--ink);
      }

      .section-heading span {
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 900;
      }

      .match-card {
        display: grid;
        gap: 0.75rem;
        padding: 0.95rem;
        position: relative;
        overflow: hidden;
      }

      .match-card::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 0.22rem;
        background: linear-gradient(180deg, var(--accent), var(--teal));
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

      .card-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.55rem;
      }

      .edit-link {
        min-height: 2.75rem;
        padding: 0.78rem 1rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 0.9rem;
        background: rgba(15, 23, 42, 0.48);
        color: var(--ink);
        font-weight: 900;
        text-align: center;
      }

      .edit-link.subtle {
        min-height: 2.35rem;
        padding: 0.55rem 0.8rem;
      }

      .edit-panel {
        padding: 0.95rem;
        border-color: rgba(20, 184, 166, 0.22);
      }

      .panel-title-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.75rem;
      }

      .panel-title-row h3 {
        margin: 0.15rem 0 0;
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

        .card-actions {
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
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
  isGeneratingKnockout = false;
  isUpdating = false;
  createError = '';
  createSuccess = '';
  editError = '';
  editSuccess = '';
  knockoutError = '';
  knockoutSuccess = '';
  editForm: Match | null = null;
  stageOptions = [
    { value: 'league', label: 'Pool / group stage' },
    { value: 'quarter_final_1', label: 'Quarterfinal 1' },
    { value: 'quarter_final_2', label: 'Quarterfinal 2' },
    { value: 'quarter_final_3', label: 'Quarterfinal 3' },
    { value: 'quarter_final_4', label: 'Quarterfinal 4' },
    { value: 'semi_final_1', label: 'Semifinal 1' },
    { value: 'semi_final_2', label: 'Semifinal 2' },
    { value: 'third_place', label: '3rd Place' },
    { value: 'final', label: 'Final' },
  ];

  form: Match = {
    tournament: 0,
    match_type: 'league',
    stage: 'league',
    pool_type: 'none',
    best_of: 1,
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

  get matchSections(): { title: string; matches: Match[] }[] {
    return [
      { title: 'Pool Matches', matches: this.matches.filter((match) => this.isPoolMatch(match)) },
      { title: 'Division A · Champions League', matches: this.matches.filter((match) => this.isChampionsMatch(match)) },
      { title: 'Division B · Premier League', matches: this.matches.filter((match) => this.isPremierMatch(match)) },
      { title: 'Independent / Other', matches: this.matches.filter((match) => this.isOtherMatch(match)) },
    ];
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

    const payload: Match = {
      ...this.form,
      group: this.form.match_type === 'knockout' ? null : this.form.group,
      pool_type: this.form.match_type === 'league' ? 'none' : this.form.pool_type,
      stage: this.form.stage || (this.form.match_type === 'league' ? 'league' : 'quarter_final_1'),
      best_of: this.form.stage === 'final' ? 3 : this.form.best_of || 1,
    };

    this.api.create<Match>('matches', payload).subscribe({
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

  generateKnockout(): void {
    this.knockoutError = '';
    this.knockoutSuccess = '';

    const tournament = this.form.tournament || this.tournaments[0]?.id;
    if (!tournament) {
      this.knockoutError = 'Select a tournament before generating knockout matches.';
      return;
    }

    this.isGeneratingKnockout = true;
    this.api.action<{ created: number; detail: string }>('matches', 'generate_knockout', { tournament }).subscribe({
      next: (result) => {
        this.knockoutSuccess =
          result.created > 0
            ? `${result.detail} ${result.created} official knockout matches created.`
            : `${result.detail} No duplicate matches were created.`;
        this.isGeneratingKnockout = false;
        this.load();
      },
      error: (err) => {
        this.knockoutError = this.formatApiError(err);
        this.isGeneratingKnockout = false;
      },
    });
  }

  startEdit(match: Match): void {
    this.editError = '';
    this.editSuccess = '';
    this.editForm = {
      ...match,
      best_of: match.best_of || 1,
      scheduled_time: this.toDateTimeLocal(match.scheduled_time),
    };
  }

  cancelEdit(): void {
    this.editForm = null;
    this.editError = '';
    this.editSuccess = '';
  }

  saveEdit(): void {
    this.editError = '';
    this.editSuccess = '';

    if (!this.editForm?.id) {
      this.editError = 'Select a match before saving.';
      return;
    }

    if (!this.editForm.tournament) {
      this.editError = 'Tournament is required.';
      return;
    }

    if (this.editForm.team_a && this.editForm.team_b && this.editForm.team_a === this.editForm.team_b) {
      this.editError = 'A match needs two different teams.';
      return;
    }

    const payload: Match = {
      ...this.editForm,
      group: this.editForm.match_type === 'knockout' ? null : this.editForm.group,
      pool_type: this.editForm.match_type === 'league' ? 'none' : this.editForm.pool_type,
      stage: this.editForm.stage || (this.editForm.match_type === 'league' ? 'league' : 'quarter_final_1'),
      best_of: this.editForm.stage === 'final' ? 3 : this.editForm.best_of || 1,
    };

    this.isUpdating = true;
    this.api.update<Match>('matches', this.editForm.id, payload).subscribe({
      next: (match) => {
        this.editSuccess = 'Match updated.';
        this.editForm = {
          ...match,
          best_of: match.best_of || 1,
          scheduled_time: this.toDateTimeLocal(match.scheduled_time),
        };
        this.isUpdating = false;
        this.load();
      },
      error: (err) => {
        this.editError = this.formatApiError(err);
        this.isUpdating = false;
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

  getMatchStageLabel(match: Match): string {
    return getMatchStageLabel(match, this.groups);
  }

  getMatchFormatLabel(match: Match): string {
    return getMatchFormatLabel(match);
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

  private isPoolMatch(match: Match): boolean {
    return match.match_type === 'league' && Boolean(match.group);
  }

  private isChampionsMatch(match: Match): boolean {
    return match.match_type === 'knockout' && match.pool_type === 'premium';
  }

  private isPremierMatch(match: Match): boolean {
    return match.match_type === 'knockout' && match.pool_type === 'star';
  }

  private isOtherMatch(match: Match): boolean {
    return !this.isPoolMatch(match) && !this.isChampionsMatch(match) && !this.isPremierMatch(match);
  }

  private toDateTimeLocal(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    return match ? `${match[1]}T${match[2]}` : value;
  }
}
