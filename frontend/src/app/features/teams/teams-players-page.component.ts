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
      <header class="page-hero roster-hero">
        <div>
          <p class="kicker">Roster management</p>
          <h2>Teams & players</h2>
          <p>Pick a team, add players, and keep tournament rosters easy to scan.</p>
        </div>
        <div class="hero-stat">
          <strong>{{ teams.length }}</strong>
          <span>Teams</span>
        </div>
      </header>

      <form class="panel create-team-card" (ngSubmit)="addTeam()">
        <div>
          <p class="kicker">Create team</p>
          <h3>Add a roster</h3>
        </div>

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

      <div class="roster-layout">
        <section class="panel teams-panel">
          <div class="section-heading">
            <div>
              <p class="kicker">Teams</p>
              <h3>Tournament rosters</h3>
            </div>
            <span>{{ players.length }} players</span>
          </div>

          <div class="team-list" *ngIf="teams.length; else noTeams">
            <button
              type="button"
              class="team-row"
              *ngFor="let team of teams"
              [class.selected]="selectedTeam?.id === team.id"
              (click)="selectTeam(team)"
            >
              <span class="team-main">
                <strong>{{ team.name }}</strong>
                <small>{{ getTournamentName(team.tournament) }}</small>
              </span>

              <span class="team-side">
                <span class="count-badge">{{ getPlayersForTeam(team.id).length }}</span>
                <small>View roster</small>
              </span>
            </button>
          </div>

          <ng-template #noTeams>
            <div class="empty-state">
              Create a team above to start building rosters.
            </div>
          </ng-template>
        </section>

        <aside class="panel roster-panel" *ngIf="selectedTeam; else noSelectedTeam">
          <div class="roster-top">
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

          <ng-template #noPlayers>
            <div class="empty-state compact-empty">No players yet.</div>
          </ng-template>

          <form class="add-player-card" (ngSubmit)="addPlayerToSelectedTeam()">
            <div>
              <p class="kicker">Add player to this team</p>
              <h4>New player</h4>
            </div>

            <div class="inline-form">
              <input
                [(ngModel)]="newPlayerName"
                name="newPlayerName"
                placeholder="Player name"
              />
              <button type="submit" [disabled]="isSavingPlayer">
                {{ isSavingPlayer ? 'Adding...' : 'Add Player' }}
              </button>
            </div>

            <p *ngIf="playerError" class="error">{{ playerError }}</p>
          </form>

          <section class="existing-player-card">
            <button
              type="button"
              class="toggle-existing"
              (click)="showExistingPlayerForm = !showExistingPlayerForm"
            >
              {{ showExistingPlayerForm ? 'Hide existing players' : 'Assign existing player' }}
            </button>

            <form
              *ngIf="showExistingPlayerForm"
              class="existing-form"
              (ngSubmit)="assignExistingPlayer()"
            >
              <select [(ngModel)]="existingPlayerId" name="existingPlayer">
                <option [ngValue]="undefined">Existing player</option>
                <option *ngFor="let p of unassignedPlayersForSelectedTeam()" [ngValue]="p.id">
                  {{ p.name }}
                </option>
              </select>

              <button type="submit" [disabled]="isAssigningPlayer">
                {{ isAssigningPlayer ? 'Assigning...' : 'Assign' }}
              </button>
            </form>

            <p *ngIf="assignmentError" class="error">{{ assignmentError }}</p>
          </section>
        </aside>

        <ng-template #noSelectedTeam>
          <aside class="panel roster-panel empty-detail">
            <p class="kicker">Selected team</p>
            <h3>Select a team first.</h3>
            <p>Choose a team row to view and manage its roster.</p>
          </aside>
        </ng-template>
      </div>
    </article>
  `,
  styles: [
    `
      .teams-page {
        display: grid;
        gap: 1rem;
      }

      .roster-hero h2 {
        margin-top: 0.25rem;
        font-size: clamp(1.65rem, 4vw, 2.45rem);
      }

      .hero-stat,
      .player-count {
        min-width: 5.25rem;
        padding: 0.72rem;
        border: 1px solid rgba(20, 184, 166, 0.28);
        border-radius: 0.95rem;
        background: rgba(20, 184, 166, 0.1);
        text-align: center;
      }

      .hero-stat strong,
      .player-count strong {
        display: block;
        color: #99f6e4;
        font-size: 1.5rem;
        line-height: 1;
      }

      .hero-stat span,
      .player-count span {
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .create-team-card {
        display: grid;
        gap: 0.75rem;
        padding: 0.95rem;
      }

      .create-team-card h3,
      .section-heading h3,
      .roster-top h3 {
        margin: 0.15rem 0 0;
      }

      .roster-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 1rem;
      }

      .teams-panel,
      .roster-panel {
        padding: 0.95rem;
      }

      .section-heading,
      .roster-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.9rem;
      }

      .section-heading span {
        color: var(--muted);
        font-size: 0.82rem;
        font-weight: 800;
      }

      .team-list,
      .players-list {
        display: grid;
        gap: 0.55rem;
      }

      .team-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.85rem;
        width: 100%;
        padding: 0.78rem;
        border: 1px solid var(--line);
        border-radius: 0.95rem;
        background: rgba(15, 23, 42, 0.38);
        color: var(--ink);
        text-align: left;
      }

      .team-row:hover,
      .team-row.selected {
        border-color: rgba(37, 99, 235, 0.45);
        background: rgba(37, 99, 235, 0.13);
        box-shadow: none;
      }

      .team-main {
        min-width: 0;
        display: grid;
        gap: 0.18rem;
      }

      .team-main strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.98rem;
      }

      .team-main small,
      .team-side small {
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 750;
      }

      .team-side {
        flex: 0 0 auto;
        display: grid;
        justify-items: end;
        gap: 0.24rem;
      }

      .count-badge {
        min-width: 2rem;
        padding: 0.22rem 0.5rem;
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.14);
        color: #99f6e4;
        font-size: 0.78rem;
        font-weight: 900;
        text-align: center;
      }

      .roster-panel {
        display: grid;
        align-content: start;
        gap: 0.9rem;
      }

      .roster-top {
        margin-bottom: 0;
      }

      .roster-top p {
        margin-bottom: 0;
      }

      .player-row {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.68rem;
        border: 1px solid var(--line);
        border-radius: 0.85rem;
        background: rgba(15, 23, 42, 0.42);
      }

      .player-row span {
        display: grid;
        place-items: center;
        width: 1.8rem;
        height: 1.8rem;
        border-radius: 0.65rem;
        background: rgba(37, 99, 235, 0.16);
        color: #bfdbfe;
        font-weight: 900;
      }

      .player-row strong {
        color: var(--ink);
      }

      .compact-empty {
        padding: 0.8rem;
      }

      .add-player-card,
      .existing-player-card {
        display: grid;
        gap: 0.7rem;
        padding-top: 0.9rem;
        border-top: 1px solid var(--line);
      }

      .add-player-card h4 {
        margin: 0.15rem 0 0;
        font-size: 0.98rem;
      }

      .inline-form,
      .existing-form {
        display: grid;
        gap: 0.65rem;
      }

      .toggle-existing {
        width: auto;
        justify-self: start;
        min-height: 2.25rem;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--line);
        background: rgba(148, 163, 184, 0.08);
        color: var(--ink);
        font-size: 0.84rem;
      }

      .empty-detail {
        min-height: 14rem;
        align-content: center;
      }

      @media (min-width: 860px) {
        .create-team-card {
          grid-template-columns: minmax(10rem, 0.75fr) minmax(12rem, 1fr) minmax(12rem, 1fr) auto;
          align-items: end;
        }

        .create-team-card button {
          width: auto;
          min-width: 8.5rem;
        }

        .create-team-card .error {
          grid-column: 1 / -1;
        }

        .roster-layout {
          grid-template-columns: minmax(19rem, 0.9fr) minmax(0, 1.1fr);
          align-items: start;
        }

        .inline-form,
        .existing-form {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .inline-form button,
        .existing-form button {
          width: auto;
          min-width: 8.5rem;
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
  newPlayerName = '';
  existingPlayerId?: number;
  showExistingPlayerForm = false;

  teamError = '';
  playerError = '';
  assignmentError = '';
  isSavingTeam = false;
  isSavingPlayer = false;
  isAssigningPlayer = false;

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Tournament>('tournaments').subscribe((r) => (this.tournaments = r.results));
    this.api.list<Player>('players').subscribe((r) => (this.players = r.results));
    this.loadTeamPlayers();
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

    this.api.create<Team>('teams', { tournament, name }).subscribe({
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

  addPlayerToSelectedTeam(): void {
    this.playerError = '';
    this.assignmentError = '';

    if (!this.selectedTeam?.id) {
      this.playerError = 'Select a team first.';
      return;
    }

    const name = this.newPlayerName.trim();

    if (!name) {
      this.playerError = 'Enter a player name.';
      return;
    }

    this.isSavingPlayer = true;

    this.api.create<Player>('players', { name }).subscribe({
      next: (player) => {
        if (!player.id) {
          this.playerError = 'Player was created, but the API did not return an ID.';
          this.isSavingPlayer = false;
          return;
        }

        this.assignPlayerToSelectedTeam(player.id, {
          onSuccess: () => {
            this.newPlayerName = '';
            this.isSavingPlayer = false;
            this.reloadPlayersAndAssignments();
          },
          onError: (err) => {
            this.playerError = this.formatApiError(err);
            this.isSavingPlayer = false;
          },
        });
      },
      error: (err) => {
        this.playerError = this.formatApiError(err);
        this.isSavingPlayer = false;
      },
    });
  }

  assignExistingPlayer(): void {
    this.assignmentError = '';

    if (!this.selectedTeam?.id) {
      this.assignmentError = 'Select a team first.';
      return;
    }

    if (!this.existingPlayerId) {
      this.assignmentError = 'Select a player.';
      return;
    }

    this.isAssigningPlayer = true;

    this.assignPlayerToSelectedTeam(this.existingPlayerId, {
      onSuccess: () => {
        this.existingPlayerId = undefined;
        this.isAssigningPlayer = false;
        this.reloadPlayersAndAssignments();
      },
      onError: (err) => {
        this.assignmentError = this.formatApiError(err);
        this.isAssigningPlayer = false;
      },
    });
  }

  selectTeam(team: Team): void {
    this.selectedTeam = team;
    this.playerError = '';
    this.assignmentError = '';
    this.existingPlayerId = undefined;
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

  unassignedPlayersForSelectedTeam(): Player[] {
    if (!this.selectedTeam?.id) {
      return [];
    }

    const assignedIds = new Set(
      this.getPlayersForTeam(this.selectedTeam.id)
        .map((player) => player.id)
        .filter((id): id is number => Boolean(id))
    );

    return this.players.filter((player) => player.id && !assignedIds.has(player.id));
  }

  private assignPlayerToSelectedTeam(
    playerId: number,
    handlers: { onSuccess: () => void; onError: (err: unknown) => void }
  ): void {
    if (!this.selectedTeam?.id) {
      handlers.onError({ error: 'Select a team first.' });
      return;
    }

    this.api
      .create<TeamPlayer>('team-players', {
        team: this.selectedTeam.id,
        player: playerId,
        tournament: this.selectedTeam.tournament,
      })
      .subscribe({
        next: handlers.onSuccess,
        error: handlers.onError,
      });
  }

  private reloadPlayersAndAssignments(): void {
    this.api.list<Player>('players').subscribe((r) => (this.players = r.results));
    this.loadTeamPlayers();
  }

  private loadTeamPlayers(): void {
    this.api.list<TeamPlayer>('team-players').subscribe({
      next: (r) => (this.teamPlayers = r.results),
      error: (err) => (this.assignmentError = this.formatApiError(err)),
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

    return 'Request failed. Check that the backend is running and the form is valid.';
  }
}
