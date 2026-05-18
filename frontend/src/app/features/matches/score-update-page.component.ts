import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminTournamentContextService } from '../../core/admin-tournament-context.service';
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

      <ng-container *ngFor="let section of matchSections">
        <section class="match-section" *ngIf="section.matches.length">
          <div class="section-heading">
            <h3>{{ section.title }}</h3>
            <span>{{ section.matches.length }} Matches</span>
          </div>

          <div class="match-list">
            <article class="panel score-card" *ngFor="let m of section.matches">
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
                <span *ngIf="getMatchStageLabel(m)">{{ getMatchStageLabel(m) }}</span>
                <span *ngIf="getMatchFormatLabel(m)">{{ getMatchFormatLabel(m) }}</span>
                <span>Ref: {{ m.referee_name || 'TBD' }}</span>
              </div>

              <a class="score-link" [routerLink]="['/matches', m.id, 'score']" [queryParams]="{ from: 'score-update' }">
                {{ m.status === 'Scheduled' ? 'Start scoring' : m.status === 'Live' ? 'Continue scoring' : 'Score match' }}
              </a>
            </article>
          </div>
        </section>
      </ng-container>
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
  private destroyRef = inject(DestroyRef);
  private tournamentContext = inject(AdminTournamentContextService);

  tournaments: Tournament[] = [];
  teams: Team[] = [];
  courts: Court[] = [];
  groups: Group[] = [];
  matches: Match[] = [];
  selectedTournamentId = 0;

  constructor() {
    this.tournamentContext.tournaments$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tournaments) => (this.tournaments = tournaments));
    this.tournamentContext.selectedTournamentId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.selectedTournamentId = id;
        this.load();
      });
    this.tournamentContext.loadTournaments();
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
    const tournament = this.selectedTournamentId;
    if (!tournament) {
      this.teams = [];
      this.groups = [];
      this.matches = [];
      this.api.list<Court>('courts', { page_size: 100 }).subscribe((r) => (this.courts = r.results));
      return;
    }

    this.api.list<Team>('teams', { tournament, page_size: 100 }).subscribe((r) => (this.teams = r.results));
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.api.list<Group>('groups', { tournament, page_size: 100 }).subscribe((r) => (this.groups = r.results));
    this.api.list<Match>('matches', { tournament, ordering: 'scheduled_time', page_size: 250 }).subscribe((r) => (this.matches = r.results));
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
}
