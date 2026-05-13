import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { Court, Group, GroupTeam, Match, Standing, Team, Tournament } from '../../core/models';
import {
  formatMatchTime,
  getCourtName,
  getGroupName,
  getTeamName,
} from '../matches/match-display.helpers';
import {
  BracketProjection,
  PUBLIC_PROGRESSION_CONFIG,
  PublicBracketKey,
  SeededProjectionTeam,
  buildProgressionProjection,
} from './progression-projection';

@Component({
  selector: 'app-tournament-viewer-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="viewer-page" *ngIf="tournament; else loading">
      <header class="page-hero viewer-hero">
        <div>
          <p class="kicker">Public Viewer</p>
          <h2>{{ tournament.name }}</h2>
          <p>{{ tournament.date }} - {{ tournament.format }}</p>
        </div>
        <div class="viewer-status">
          <span class="status-pill">{{ tournament.status || 'Draft' }}</span>
          <span class="read-only-pill">Read-only</span>
        </div>
      </header>

      <section class="viewer-tabs" aria-label="Public viewer sections">
        <button type="button" [class.active]="activeTab === 'matches'" (click)="activeTab = 'matches'">
          Matches
        </button>
        <button type="button" [class.active]="activeTab === 'standings'" (click)="activeTab = 'standings'">
          Standings
        </button>
        <button type="button" [class.active]="activeTab === 'brackets'" (click)="activeTab = 'brackets'">
          Brackets
        </button>
      </section>

      <ng-container *ngIf="activeTab === 'matches'">
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
      </ng-container>

      <ng-container *ngIf="activeTab === 'standings'">
        <section class="standings-section">
          <div class="section-title">
            <div>
              <p class="kicker">Read-only standings</p>
              <h3>Tournament table</h3>
            </div>
            <span>{{ standings.length }} Teams</span>
          </div>

          <div class="standings-list" *ngIf="standings.length; else noStandings">
            <article class="standing-card" *ngFor="let standing of standings">
              <div class="rank-block">
                <strong>{{ standing.rank }}</strong>
                <span>Rank</span>
              </div>

              <div class="standing-main">
                <strong>{{ getStandingTeamName(standing) }}</strong>
                <small *ngIf="getPoolLabel(standing)">{{ getPoolLabel(standing) }}</small>
              </div>

              <div class="standing-stats">
                <span><strong>{{ standing.wins }}</strong> W</span>
                <span><strong>{{ standing.losses }}</strong> L</span>
                <span><strong>{{ standing.points_scored }}</strong> PF</span>
                <span><strong>{{ standing.points_given }}</strong> PA</span>
                <span><strong>{{ getPointDifferential(standing) }}</strong> Diff</span>
                <span><strong>{{ standing.net_run_rate }}</strong> Rating</span>
              </div>
            </article>
          </div>

          <ng-template #noStandings>
            <div class="empty-state">Standings will appear after completed matches are recorded.</div>
          </ng-template>
        </section>
      </ng-container>

      <ng-container *ngIf="activeTab === 'brackets'">
        <section class="bracket-section">
          <div class="section-title">
            <div>
              <p class="kicker">Projected progression</p>
              <h3>Public bracket path</h3>
            </div>
            <span>Top 4 from each group advance</span>
          </div>

          <div class="progression-summary">
            <span>Premier: 1st-2nd from each group</span>
            <span>Star: 3rd-4th from each group</span>
            <span>Eliminated: 5th from each group</span>
          </div>

          <div class="league-switch" aria-label="Bracket league">
            <button
              type="button"
              [class.active]="selectedBracket === 'premier'"
              (click)="selectedBracket = 'premier'"
            >
              Premier
            </button>
            <button
              type="button"
              [class.active]="selectedBracket === 'star'"
              (click)="selectedBracket = 'star'"
            >
              Star
            </button>
          </div>

          <ng-container *ngIf="activeBracketProjection as bracket">
            <div class="bracket-intro">
              <div>
                <p class="kicker">{{ bracket.rule.name }} bracket</p>
                <h4>{{ bracket.rule.description }}</h4>
              </div>
              <span>{{ bracket.seeds.length }}/{{ bracketSize }} seeds</span>
            </div>

            <div class="empty-state" *ngIf="!bracket.isComplete">
              Bracket seeds will appear after group standings are available.
            </div>

            <div class="seed-list" *ngIf="bracket.seeds.length">
              <article class="seed-card" *ngFor="let team of bracket.seeds">
                <ng-container *ngTemplateOutlet="teamSeed; context: { $implicit: team }"></ng-container>
              </article>
            </div>

            <div class="matchup-grid" *ngIf="bracket.seeds.length">
              <article class="matchup-card" *ngFor="let matchup of bracket.matchups">
                <div class="matchup-title">
                  <span>Quarterfinal</span>
                  <strong>{{ matchup.label }}</strong>
                </div>

                <div class="matchup-team" *ngIf="matchup.top; else openTop">
                  <ng-container *ngTemplateOutlet="teamSeed; context: { $implicit: matchup.top }"></ng-container>
                </div>
                <ng-template #openTop>
                  <div class="open-slot">Seed pending</div>
                </ng-template>

                <div class="matchup-divider">vs</div>

                <div class="matchup-team" *ngIf="matchup.bottom; else openBottom">
                  <ng-container *ngTemplateOutlet="teamSeed; context: { $implicit: matchup.bottom }"></ng-container>
                </div>
                <ng-template #openBottom>
                  <div class="open-slot">Seed pending</div>
                </ng-template>
              </article>
            </div>
          </ng-container>

          <section class="eliminated-section">
            <div class="section-title compact-title">
              <div>
                <p class="kicker">Eliminated</p>
                <h3>5th-place teams</h3>
              </div>
              <span>{{ progression.eliminated.length }} Teams</span>
            </div>

            <div class="seed-list eliminated-list" *ngIf="progression.eliminated.length; else noEliminated">
              <article class="seed-card muted-seed" *ngFor="let team of progression.eliminated">
                <ng-container *ngTemplateOutlet="teamSeed; context: { $implicit: team }"></ng-container>
              </article>
            </div>

            <ng-template #noEliminated>
              <div class="empty-state">Eliminated teams will appear after group standings are available.</div>
            </ng-template>
          </section>
        </section>
      </ng-container>

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

      <ng-template #teamSeed let-team>
        <div class="seed-number">#{{ team.seed || team.groupRank }}</div>
        <div class="seed-main">
          <strong>{{ team.teamName }}</strong>
          <small>{{ team.groupName }} - Group rank {{ team.groupRank }}</small>
        </div>
        <div class="seed-stats">
          <span>{{ team.wins }}-{{ team.losses }}</span>
          <span>PF {{ team.pointsFor }}</span>
          <span>PA {{ team.pointsAgainst }}</span>
          <span>Diff {{ team.pointDifferential }}</span>
          <span>Rating {{ team.rating }}</span>
        </div>
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

      .viewer-status {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .read-only-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.45rem 0.7rem;
        border: 1px solid rgba(20, 184, 166, 0.3);
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.1);
        color: #99f6e4;
        font-size: 0.76rem;
        font-weight: 900;
      }

      .viewer-tabs {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.5rem;
        padding: 0.35rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.5);
      }

      .viewer-tabs button {
        min-height: 2.55rem;
        border: 1px solid transparent;
        background: transparent;
        color: var(--muted);
      }

      .viewer-tabs button.active {
        border-color: rgba(20, 184, 166, 0.36);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.34), rgba(20, 184, 166, 0.22));
        color: var(--ink);
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

      .standings-section {
        display: grid;
        gap: 0.75rem;
      }

      .bracket-section,
      .eliminated-section {
        display: grid;
        gap: 0.75rem;
      }

      .section-title {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
      }

      .section-title h3 {
        margin: 0.12rem 0 0;
      }

      .section-title span {
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 900;
      }

      .compact-title {
        margin-top: 0.25rem;
      }

      .progression-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .progression-summary span,
      .bracket-intro > span {
        padding: 0.38rem 0.58rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.5);
        color: var(--muted);
        font-size: 0.76rem;
        font-weight: 850;
      }

      .league-switch {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
      }

      .league-switch button {
        border: 1px solid var(--line);
        background: rgba(30, 41, 59, 0.76);
        color: var(--muted);
      }

      .league-switch button.active {
        border-color: rgba(20, 184, 166, 0.38);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.38), rgba(20, 184, 166, 0.22));
        color: var(--ink);
      }

      .bracket-intro {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: rgba(30, 41, 59, 0.72);
      }

      .bracket-intro h4 {
        margin: 0.12rem 0 0;
        color: var(--ink);
        font-size: 1rem;
      }

      .seed-list,
      .matchup-grid {
        display: grid;
        gap: 0.65rem;
      }

      .seed-card,
      .matchup-team {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.65rem;
        padding: 0.75rem;
        border: 1px solid var(--line);
        border-radius: 0.95rem;
        background: rgba(30, 41, 59, 0.88);
      }

      .seed-number {
        display: grid;
        place-items: center;
        width: 2.35rem;
        min-height: 2.35rem;
        border-radius: 0.75rem;
        background: rgba(20, 184, 166, 0.14);
        color: #99f6e4;
        font-size: 0.82rem;
        font-weight: 950;
      }

      .seed-main {
        min-width: 0;
        display: grid;
        gap: 0.16rem;
      }

      .seed-main strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
      }

      .seed-main small {
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 850;
      }

      .seed-stats {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .seed-stats span {
        padding: 0.26rem 0.45rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.55);
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 850;
      }

      .matchup-card {
        display: grid;
        gap: 0.55rem;
        padding: 0.85rem;
        border: 1px solid rgba(20, 184, 166, 0.18);
        border-radius: 1rem;
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 48%),
          rgba(17, 24, 39, 0.78);
      }

      .matchup-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .matchup-title span {
        color: var(--teal);
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .matchup-title strong {
        color: var(--muted);
        font-size: 0.78rem;
      }

      .matchup-divider {
        justify-self: center;
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 950;
        text-transform: uppercase;
      }

      .open-slot {
        padding: 0.85rem;
        border: 1px dashed var(--line-strong);
        border-radius: 0.95rem;
        color: var(--muted);
        background: rgba(15, 23, 42, 0.35);
        font-weight: 850;
      }

      .muted-seed {
        opacity: 0.76;
      }

      .standings-list {
        display: grid;
        gap: 0.65rem;
      }

      .standing-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.75rem;
        padding: 0.85rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: rgba(30, 41, 59, 0.88);
      }

      .rank-block {
        display: grid;
        place-items: center;
        align-content: center;
        width: 3rem;
        min-height: 3rem;
        border-radius: 0.85rem;
        background: rgba(37, 99, 235, 0.18);
      }

      .rank-block strong {
        color: var(--ink);
        font-size: 1.25rem;
        line-height: 1;
      }

      .rank-block span,
      .standing-main small {
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .standing-main {
        min-width: 0;
        display: grid;
        gap: 0.25rem;
      }

      .standing-main > strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
      }

      .standing-stats {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.45rem;
      }

      .standing-stats span {
        min-width: 0;
        padding: 0.45rem 0.5rem;
        border-radius: 0.75rem;
        background: rgba(15, 23, 42, 0.48);
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 850;
        text-align: center;
      }

      .standing-stats strong {
        display: block;
        color: var(--ink);
        font-size: 0.95rem;
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
        grid-template-columns: minmax(0, 1fr) minmax(2.4rem, auto);
        align-items: center;
        gap: 0.75rem;
      }

      .team-line strong {
        min-width: 0;
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

        .standing-card {
          grid-template-columns: auto minmax(12rem, 1fr) minmax(22rem, 1.7fr);
          align-items: center;
        }

        .standing-stats {
          grid-column: auto;
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }

        .seed-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .matchup-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: start;
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
  groupTeams: GroupTeam[] = [];
  matches: Match[] = [];
  standings: Standing[] = [];
  activeTab: 'matches' | 'standings' | 'brackets' = 'matches';
  selectedBracket: PublicBracketKey = 'premier';
  tournamentId = Number(this.route.snapshot.paramMap.get('id'));

  constructor() {
    const requestedTab = this.route.snapshot.queryParamMap.get('tab');
    if (requestedTab === 'standings' || requestedTab === 'brackets') {
      this.activeTab = requestedTab;
    }

    if (this.route.snapshot.queryParamMap.get('bracket') === 'star') {
      this.selectedBracket = 'star';
    }

    this.loadReferenceData();
    this.loadTournament();
    this.loadMatches();
    this.loadStandings();
    this.timer = setInterval(() => {
      this.loadMatches();
      this.loadStandings();
    }, 10000);
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

  get bracketSize(): number {
    return PUBLIC_PROGRESSION_CONFIG.bracketSize;
  }

  get progression() {
    return buildProgressionProjection(this.standings, this.teams, this.groups, this.groupTeams);
  }

  get activeBracketProjection(): BracketProjection {
    return this.progression.brackets[this.selectedBracket];
  }

  loadReferenceData(): void {
    this.api.list<Team>('teams').subscribe((r) => (this.teams = r.results));
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.api.list<Group>('groups').subscribe((r) => (this.groups = r.results));
    this.api.list<GroupTeam>('group-teams').subscribe((r) => (this.groupTeams = r.results));
  }

  loadTournament(): void {
    this.api.get<Tournament>('tournaments', this.tournamentId).subscribe((tournament) => (this.tournament = tournament));
  }

  loadMatches(): void {
    this.api
      .list<Match>('matches', { tournament: this.tournamentId, ordering: 'scheduled_time' })
      .subscribe((r) => (this.matches = r.results));
  }

  loadStandings(): void {
    this.api
      .list<Standing>('standings', { tournament: this.tournamentId, ordering: 'rank' })
      .subscribe((r) => (this.standings = r.results));
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

  getStandingTeamName(standing: Standing): string {
    return standing.team_name || getTeamName(this.teams, standing.team);
  }

  getPointDifferential(standing: Standing): number {
    return standing.points_scored - standing.points_given;
  }

  getPoolLabel(standing: Standing): string {
    if (!standing.pool_type) {
      return '';
    }

    return `${standing.pool_type.charAt(0).toUpperCase()}${standing.pool_type.slice(1)} pool`;
  }
}
