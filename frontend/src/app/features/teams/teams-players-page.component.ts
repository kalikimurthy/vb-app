import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { Player, Team, TeamPlayer, Tournament } from '../../core/models';

@Component({
  selector: 'app-teams-players-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="teams-page">
      <header class="page-hero">
        <div>
          <p class="kicker">Roster control</p>
          <h2>Teams & players</h2>
          <p>
            Build tournament rosters, assign players, and inspect each team like a matchday squad list.
          </p>
        </div>
        <div class="hero-stat">
          <strong>{{ teams.length }}</strong>
          <span>Teams</span>
        </div>
      </header>

      <div class="teams-layout">
        <section class="panel teams-panel">
          <div class="panel-header">
            <div>
              <p class="kicker">Teams</p>
              <h3>Create and select</h3>
            </div>
            <span>{{ players.length }} players</span>
          </div>

          <form class="form-card" (ngSubmit)="addTeam()">
            <select [(ngModel)]="teamForm.tournament" name="teamTournament">
              <option [ngValue]="undefined">Tournament</option>
              <option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option>
            </select>
            <input [(ngModel)]="teamForm.name" name="teamName" placeholder="Team name" />
            <button type="submit" [disabled]="isSavingTeam">
              {{ isSavingTeam ? 'Adding...' : 'Add Team' }}
            </button>
            <p *ngIf="teamError" class="error">{{ teamError }}</p>
          </form>

          <div class="team-list" *ngIf="teams.length; else noTeams">
            <button
              type="button"
              class="team-card"
              *ngFor="let team of teams"
              [class.selected]="selectedTeam?.id === team.id"
              (click)="selectTeam(team)"
            >
              <span class="team-card-top">
                <strong>{{ team.name }}</strong>
                <span>{{ getPlayersForTeam(team.id).length }}</span>
              </span>
              <span class="team-meta">{{ getTournamentName(team.tournament) }}</span>
            </button>
          </div>

          <ng-template #noTeams>
            <div class="empty-state">
              Add your first team to start building the tournament roster.
            </div>
          </ng-template>
        </section>

        <section class="detail-stack">
          <aside class="panel team-detail" *ngIf="selectedTeam; else noSelectedTeam">
            <div class="detail-top">
              <div>
                <p class="kicker">Selected team</p>
                <h3>{{ selectedTeam.name }}</h3>
                <p>{{ getTournamentName(selectedTeam.tournament) }}</p>
              </div>
              <div class="player-count">
                <strong>{{ getPlayersForTeam(selectedTeam.id).length }}</strong>
                <span>Players</span>
              </div>
            </div>

            <div class="players-list" *ngIf="getPlayersForTeam(selectedTeam.id).length; else noPlayers">
              <div class="player-row" *ngFor="let player of getPlayersForTeam(selectedTeam.id); let i = index">
                <span>{{ i + 1 }}</span>
                <strong>{{ player.name }}</strong>
              </div>
            </div>
          </aside>

          <ng-template #noSelectedTeam>
            <aside class="panel team-detail empty-detail">
              <p class="kicker">Selected team</p>
              <h3>No team selected</h3>
              <p>Choose a team card to inspect assigned players.</p>
            </aside>
          </ng-template>

          <ng-template #noPlayers>
            <div class="empty-state">
              No players assigned yet. Use the assignment card below to add players to this team.
            </div>
          </ng-template>

          <section class="panel assignment-panel">
            <div class="panel-header">
              <div>
                <p class="kicker">Players</p>
                <h3>Add & assign</h3>
              </div>
            </div>

            <form class="form-card compact-form" (ngSubmit)="addPlayer()">
              <input [(ngModel)]="playerForm.name" name="playerName" placeholder="Player name" />
              <button type="submit">Add Player</button>
            </form>

            <form class="form-card" (ngSubmit)="linkPlayer()">
              <select [(ngModel)]="linkForm.team" name="linkTeam">
                <option [ngValue]="undefined">Team</option>
                <option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option>
              </select>

              <select [(ngModel)]="linkForm.player" name="linkPlayer">
                <option [ngValue]="undefined">Player</option>
                <option *ngFor="let p of players" [ngValue]="p.id">{{ p.name }}</option>
              </select>

              <select [(ngModel)]="linkForm.tournament" name="linkTournament">
                <option [ngValue]="undefined">Tournament</option>
                <option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option>
              </select>

              <button type="submit">Assign to Team</button>
            </form>
          </section>
        </section>
      </div>
    </article>
  `,
  styles: [
    `
      .teams-page {
        display: grid;
        gap: 1rem;
      }

      .page-hero {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 1.25rem;
        background:
          linear-gradient(135deg, rgba(140, 251, 91, 0.1), transparent 42%),
          var(--card);
        box-shadow: var(--shadow);
      }

      .page-hero h2,
      .page-hero p {
        margin-bottom: 0;
      }

      .page-hero h2 {
        margin-top: 0.25rem;
        font-size: clamp(1.65rem, 4vw, 2.55rem);
        letter-spacing: -0.03em;
      }

      .page-hero p:not(.kicker) {
        max-width: 42rem;
      }

      .hero-stat,
      .player-count {
        min-width: 5.3rem;
        padding: 0.78rem;
        border: 1px solid rgba(140, 251, 91, 0.24);
        border-radius: 1rem;
        background: rgba(140, 251, 91, 0.08);
        text-align: center;
      }

      .hero-stat strong,
      .player-count strong {
        display: block;
        color: var(--accent);
        font-size: 1.55rem;
        line-height: 1;
      }

      .hero-stat span,
      .player-count span {
        color: var(--muted);
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .teams-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 1rem;
      }

      .panel {
        padding: 1rem;
      }

      .panel-header,
      .detail-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .panel-header h3,
      .detail-top h3 {
        margin: 0.15rem 0 0;
        font-size: 1.1rem;
      }

      .panel-header span {
        color: var(--muted);
        font-size: 0.82rem;
        font-weight: 800;
      }

      .form-card {
        display: grid;
        gap: 0.7rem;
        padding: 0.78rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: var(--card-elevated);
        margin-bottom: 1rem;
      }

      .compact-form {
        grid-template-columns: minmax(0, 1fr);
      }

      .team-list {
        display: grid;
        gap: 0.65rem;
      }

      .team-card {
        width: 100%;
        display: grid;
        gap: 0.4rem;
        padding: 0.82rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.035);
        color: var(--ink);
        text-align: left;
      }

      .team-card:hover,
      .team-card.selected {
        border-color: rgba(140, 251, 91, 0.42);
        background: rgba(140, 251, 91, 0.1);
      }

      .team-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .team-card-top strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 1rem;
      }

      .team-card-top span {
        min-width: 2rem;
        padding: 0.25rem 0.5rem;
        border-radius: 999px;
        background: var(--surface);
        color: var(--accent);
        font-size: 0.78rem;
        font-weight: 900;
        text-align: center;
      }

      .team-meta {
        color: var(--muted);
        font-size: 0.82rem;
        font-weight: 700;
      }

      .detail-stack {
        display: grid;
        gap: 1rem;
      }

      .team-detail {
        min-height: 15rem;
      }

      .detail-top p {
        margin-bottom: 0;
      }

      .players-list {
        display: grid;
        gap: 0.55rem;
      }

      .player-row {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.68rem;
        border: 1px solid var(--line);
        border-radius: 0.9rem;
        background: rgba(255, 255, 255, 0.035);
      }

      .player-row span {
        display: grid;
        place-items: center;
        width: 1.8rem;
        height: 1.8rem;
        border-radius: 0.7rem;
        background: var(--surface);
        color: var(--muted);
        font-weight: 900;
      }

      .player-row strong {
        color: var(--ink);
      }

      .empty-detail {
        display: grid;
        align-content: center;
      }

      @media (min-width: 860px) {
        .teams-layout {
          grid-template-columns: minmax(20rem, 0.85fr) minmax(0, 1.15fr);
          align-items: start;
        }

        .compact-form {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .compact-form button {
          width: auto;
          min-width: 9rem;
        }
      }

      @media (max-width: 720px) {
        .page-hero {
          align-items: flex-start;
          flex-direction: column;
        }

        .hero-stat {
          width: 100%;
        }
      }
    `,
  ],
})
export class TeamsPlayersPageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  teams: Team[] = [];
  players: Player[] = [];
  teamPlayers: TeamPlayer[] = [];

  selectedTeam?: Team;
  teamForm: Partial<Team> = { name: '', tournament: undefined };
  playerForm: Player = { name: '' };
  linkForm: Partial<TeamPlayer> = {};

  teamError = '';
  isSavingTeam = false;

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Tournament>('tournaments').subscribe((r) => (this.tournaments = r.results));
    this.api.list<Player>('players').subscribe((r) => (this.players = r.results));
    this.api.list<TeamPlayer>('team-players').subscribe((r) => (this.teamPlayers = r.results));
    this.api.list<Team>('teams').subscribe((r) => {
      const selectedId = this.selectedTeam?.id;
      this.teams = r.results;
      this.selectedTeam = this.teams.find((team) => team.id === selectedId) ?? this.teams[0];

      if (this.selectedTeam) {
        this.selectTeam(this.selectedTeam);
      }
    });
  }

  addTeam(): void {
    this.teamError = '';

    const name = this.teamForm.name?.trim();
    const tournament = this.teamForm.tournament;

    if (!tournament) {
      this.teamError = 'Select a tournament before adding a team.';
      return;
    }

    if (!name) {
      this.teamError = 'Enter a team name.';
      return;
    }

    this.isSavingTeam = true;

    const payload: Team = {
      tournament,
      name,
    };

    this.api.create<Team>('teams', payload).subscribe({
      next: () => {
        this.teamForm = { tournament, name: '' };
        this.isSavingTeam = false;
        this.load();
      },
      error: (err) => {
        this.teamError = this.formatApiError(err);
        this.isSavingTeam = false;
      },
    });
  }

  addPlayer(): void {
    if (!this.playerForm.name?.trim()) {
      return;
    }

    this.api.create<Player>('players', this.playerForm).subscribe(() => {
      this.playerForm = { name: '' };
      this.load();
    });
  }

  linkPlayer(): void {
    this.api.create<TeamPlayer>('team-players', this.linkForm).subscribe(() => {
      this.api.list<TeamPlayer>('team-players').subscribe((r) => (this.teamPlayers = r.results));
    });
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.linkForm.team = team.id;
    this.linkForm.tournament = team.tournament;
  }

  getTournamentName(tournamentId?: number): string {
    if (!tournamentId) {
      return 'Tournament not set';
    }

    return (
      this.tournaments.find((tournament) => tournament.id === tournamentId)?.name ??
      `Tournament #${tournamentId}`
    );
  }

  getPlayersForTeam(teamId?: number): Player[] {
    if (!teamId) {
      return [];
    }

    const playerIds = new Set(
      this.teamPlayers
        .filter((assignment) => assignment.team === teamId)
        .map((assignment) => assignment.player)
    );

    return this.players.filter((player) => player.id && playerIds.has(player.id));
  }

  getPlayerName(playerId?: number): string {
    if (!playerId) {
      return 'Unknown player';
    }

    return this.players.find((player) => player.id === playerId)?.name ?? `Player #${playerId}`;
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

    return 'Could not add team. Check that the backend is running and the tournament is valid.';
  }
}