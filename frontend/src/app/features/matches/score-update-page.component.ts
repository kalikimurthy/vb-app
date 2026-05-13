import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  selector: 'app-score-update-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="score-list-page">
      <header class="page-hero">
        <div>
          <p class="kicker">Admin scoring</p>
          <h2>Score one match at a time</h2>
          <p>Select a fixture, open the scoring controls, then return here for the next match.</p>
        </div>
        <div class="status-pill">{{ matches.length }} Matches</div>
      </header>

      <section class="match-list">
        <article class="panel score-card" *ngFor="let m of matches">
          <div class="card-top">
            <div>
              <p class="kicker">{{ getTournamentName(m.tournament) }}</p>
              <h3>{{ getTeamName(m.team_a) }} vs {{ getTeamName(m.team_b) }}</h3>
            </div>
            <span class="status-chip" [class.live]="m.status === 'Live'" [class.completed]="m.status === 'Completed'">
              {{ m.status }}
            </span>
          </div>

          <div class="score-row">
            <span>{{ getTeamName(m.team_a) }}</span>
            <strong>{{ m.score_a }}</strong>
          </div>
          <div class="score-row">
            <span>{{ getTeamName(m.team_b) }}</span>
            <strong>{{ m.score_b }}</strong>
          </div>

          <div class="meta-row">
            <span>{{ getCourtName(m) }}</span>
            <span>{{ formatMatchTime(m.scheduled_time) }}</span>
            <span *ngIf="getGroupName(m.group)">{{ getGroupName(m.group) }}</span>
            <span>Ref: {{ m.referee_name || 'TBD' }}</span>
          </div>

          <a class="score-link" [routerLink]="['/matches', m.id, 'score']" [queryParams]="{ from: 'score-update' }">
            {{ m.status === 'Scheduled' ? 'Start scoring' : m.status === 'Live' ? 'Continue scoring' : 'Score match' }}
          </a>
        </article>
      </section>
    </article>
  `,
  styles: [
    `
      .score-list-page {
        display: grid;
        gap: 1rem;
      }

      .match-list {
        display: grid;
        gap: 0.75rem;
      }

      .score-card {
        display: grid;
        gap: 0.72rem;
        padding: 0.95rem;
        position: relative;
        overflow: hidden;
      }

      .score-card::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 0.22rem;
        background: linear-gradient(180deg, var(--accent), var(--teal));
      }

      .card-top {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
      }

      .card-top > div {
        min-width: 0;
      }

      .card-top h3 {
        margin: 0.2rem 0 0;
        font-size: 1rem;
      }

      .status-chip {
        flex: 0 0 auto;
        align-self: start;
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

      .score-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(2.4rem, auto);
        align-items: center;
        gap: 0.75rem;
      }

      .score-row span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
        font-weight: 850;
      }

      .score-row strong {
        color: var(--ink);
        font-size: 1.8rem;
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

      @media (min-width: 860px) {
        .match-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class ScoreUpdatePageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  teams: Team[] = [];
  courts: Court[] = [];
  groups: Group[] = [];
  matches: Match[] = [];

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Tournament>('tournaments').subscribe((r) => (this.tournaments = r.results));
    this.api.list<Team>('teams').subscribe((r) => (this.teams = r.results));
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.api.list<Group>('groups').subscribe((r) => (this.groups = r.results));
    this.api.list<Match>('matches').subscribe((r) => (this.matches = r.results));
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
}
