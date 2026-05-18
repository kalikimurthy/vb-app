import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminTournamentContextService } from '../../core/admin-tournament-context.service';
import { ApiService } from '../../core/api.service';
import { Group, GroupTeam, Team, Tournament } from '../../core/models';

@Component({
  selector: 'app-groups-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="groups-page">
      <header class="page-hero">
        <div>
          <p class="kicker">Tournament setup</p>
          <h2>Groups & pools</h2>
          <p>Create pools, assign teams, then build matches from those tournament groups.</p>
        </div>
        <div class="status-pill">{{ groups.length }} Groups</div>
      </header>

      <section class="setup-steps">
        <span>Create tournament</span>
        <span>Create teams</span>
        <span class="active">Create groups</span>
        <span>Add teams</span>
        <span>Create matches</span>
        <span>Score matches</span>
      </section>

      <div class="groups-layout">
        <section class="panel form-card">
          <p class="kicker">New group</p>
          <h3>Create a pool</h3>
          <form class="form-grid" (ngSubmit)="createGroup()">
            <select [(ngModel)]="groupForm.tournament" name="groupTournament" disabled>
              <option [ngValue]="undefined">Tournament</option>
              <option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option>
            </select>
            <input [(ngModel)]="groupForm.name" name="groupName" placeholder="Group name, like Pool A" />
            <button type="submit" [disabled]="isCreatingGroup">
              {{ isCreatingGroup ? 'Adding...' : 'Add Group' }}
            </button>
          </form>
          <p *ngIf="groupError" class="error">{{ groupError }}</p>
          <p *ngIf="groupSuccess" class="success">{{ groupSuccess }}</p>
        </section>

        <section class="panel form-card">
          <p class="kicker">Assign teams</p>
          <h3>Add team to group</h3>
          <form class="form-grid" (ngSubmit)="assignTeam()">
            <select [(ngModel)]="linkForm.group" name="linkGroup">
              <option [ngValue]="undefined">Group</option>
              <option *ngFor="let g of groups" [ngValue]="g.id">
                {{ g.name }} - {{ getTournamentName(g.tournament) }}
              </option>
            </select>
            <select [(ngModel)]="linkForm.team" name="linkTeam">
              <option [ngValue]="undefined">Team</option>
              <option *ngFor="let t of teamsForSelectedGroup()" [ngValue]="t.id">
                {{ t.name }}
              </option>
            </select>
            <button type="submit" [disabled]="isAssigningTeam">
              {{ isAssigningTeam ? 'Assigning...' : 'Assign Team' }}
            </button>
          </form>
          <p *ngIf="assignmentError" class="error">{{ assignmentError }}</p>
          <p *ngIf="assignmentSuccess" class="success">{{ assignmentSuccess }}</p>
        </section>
      </div>

      <section class="groups-list">
        <article class="panel group-card" *ngFor="let group of groups">
          <div class="group-top">
            <div>
              <p class="kicker">{{ getTournamentName(group.tournament) }}</p>
              <h3>{{ group.name }}</h3>
            </div>
            <span class="status-pill">{{ getTeamsForGroup(group.id).length }} Teams</span>
          </div>

          <div class="team-chip-list" *ngIf="getTeamsForGroup(group.id).length; else noTeams">
            <span *ngFor="let team of getTeamsForGroup(group.id)">{{ team.name }}</span>
          </div>

          <ng-template #noTeams>
            <div class="empty-state compact-empty">No teams assigned yet.</div>
          </ng-template>
        </article>
      </section>
    </article>
  `,
  styles: [
    `
      .groups-page {
        display: grid;
        gap: 1rem;
      }

      .setup-steps {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding-bottom: 0.15rem;
        scrollbar-width: none;
      }

      .setup-steps::-webkit-scrollbar {
        display: none;
      }

      .setup-steps span {
        flex: 0 0 auto;
        padding: 0.45rem 0.65rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.44);
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 900;
      }

      .setup-steps .active {
        border-color: rgba(20, 184, 166, 0.42);
        color: #99f6e4;
      }

      .groups-layout,
      .groups-list {
        display: grid;
        gap: 0.8rem;
      }

      .form-card,
      .group-card {
        display: grid;
        gap: 0.75rem;
        padding: 0.95rem;
      }

      .form-card h3,
      .group-card h3 {
        margin: 0.15rem 0 0;
      }

      .form-grid {
        display: grid;
        gap: 0.65rem;
      }

      .group-top {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
      }

      .team-chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .team-chip-list span {
        padding: 0.38rem 0.58rem;
        border: 1px solid rgba(20, 184, 166, 0.22);
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.1);
        color: var(--ink);
        font-size: 0.82rem;
        font-weight: 850;
      }

      .compact-empty {
        padding: 0.75rem;
      }

      @media (min-width: 860px) {
        .groups-layout,
        .groups-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class GroupsPageComponent {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  private tournamentContext = inject(AdminTournamentContextService);

  tournaments: Tournament[] = [];
  teams: Team[] = [];
  groups: Group[] = [];
  groupTeams: GroupTeam[] = [];
  selectedTournamentId = 0;

  groupForm: Partial<Group> = {};
  linkForm: Partial<GroupTeam> = {};
  isCreatingGroup = false;
  isAssigningTeam = false;
  groupError = '';
  groupSuccess = '';
  assignmentError = '';
  assignmentSuccess = '';

  constructor() {
    this.tournamentContext.tournaments$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tournaments) => (this.tournaments = tournaments));
    this.tournamentContext.selectedTournamentId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.selectedTournamentId = id;
        this.groupForm.tournament = id || undefined;
        this.linkForm = {};
        this.load();
      });
    this.tournamentContext.loadTournaments();
  }

  load(): void {
    const tournament = this.selectedTournamentId;
    if (!tournament) {
      this.teams = [];
      this.groups = [];
      this.groupTeams = [];
      return;
    }

    this.api.list<Team>('teams', { tournament, page_size: 100 }).subscribe((r) => (this.teams = r.results));
    this.api.list<Group>('groups', { tournament, page_size: 100 }).subscribe((r) => (this.groups = r.results));
    this.api.list<GroupTeam>('group-teams', { group__tournament: tournament, page_size: 200 }).subscribe((r) => (this.groupTeams = r.results));
  }

  createGroup(): void {
    this.groupError = '';
    this.groupSuccess = '';

    if (!this.selectedTournamentId) {
      this.groupError = 'Select a tournament before creating a group.';
      return;
    }

    if (!this.groupForm.name?.trim()) {
      this.groupError = 'Enter a group name.';
      return;
    }

    this.isCreatingGroup = true;
    this.api.create<Group>('groups', {
      tournament: this.selectedTournamentId,
      name: this.groupForm.name.trim(),
    }).subscribe({
      next: () => {
        this.groupForm = { tournament: this.selectedTournamentId, name: '' };
        this.groupSuccess = 'Group created.';
        this.isCreatingGroup = false;
        this.load();
      },
      error: (err) => {
        this.groupError = this.formatApiError(err);
        this.isCreatingGroup = false;
      },
    });
  }

  assignTeam(): void {
    this.assignmentError = '';
    this.assignmentSuccess = '';

    if (!this.linkForm.group) {
      this.assignmentError = 'Select a group.';
      return;
    }

    if (!this.linkForm.team) {
      this.assignmentError = 'Select a team.';
      return;
    }

    if (this.groupTeams.some((link) => link.group === this.linkForm.group && link.team === this.linkForm.team)) {
      this.assignmentError = 'This team is already in that group.';
      return;
    }

    this.isAssigningTeam = true;
    this.api.create<GroupTeam>('group-teams', this.linkForm).subscribe({
      next: () => {
        this.assignmentSuccess = 'Team assigned.';
        this.linkForm = { group: this.linkForm.group, team: undefined };
        this.isAssigningTeam = false;
        this.load();
      },
      error: (err) => {
        this.assignmentError = this.formatApiError(err);
        this.isAssigningTeam = false;
      },
    });
  }

  teamsForSelectedGroup(): Team[] {
    const group = this.groups.find((item) => item.id === this.linkForm.group);
    if (!group) {
      return this.teams;
    }

    return this.teams.filter((team) => team.tournament === group.tournament);
  }

  getTeamsForGroup(groupId?: number): Team[] {
    if (!groupId) {
      return [];
    }

    const teamIds = new Set(
      this.groupTeams
        .filter((link) => link.group === groupId)
        .map((link) => link.team)
    );

    return this.teams.filter((team) => team.id && teamIds.has(team.id));
  }

  getTournamentName(tournamentId?: number): string {
    return this.tournaments.find((tournament) => tournament.id === tournamentId)?.name ?? 'Tournament';
  }

  private formatApiError(err: unknown): string {
    const error = (err as { error?: unknown })?.error;

    if (typeof error === 'string') {
      return error.includes('unique') ? 'That setup already exists.' : error;
    }

    if (error && typeof error === 'object') {
      const text = Object.entries(error as Record<string, unknown>)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
        .join(' | ');
      return text.includes('unique') ? 'That setup already exists.' : text;
    }

    return 'Request failed. Check that the backend is running and the form is valid.';
  }
}
