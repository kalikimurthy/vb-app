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

      <div class="action-feedback" *ngIf="groupActionError || groupActionSuccess">
        <p *ngIf="groupActionError" class="error">{{ groupActionError }}</p>
        <p *ngIf="groupActionSuccess" class="success">{{ groupActionSuccess }}</p>
      </div>

      <section class="groups-list">
        <article class="panel group-card" *ngFor="let group of groups">
          <div class="group-top">
            <div class="group-title-block">
              <p class="kicker">{{ getTournamentName(group.tournament) }}</p>
              <ng-container *ngIf="editingGroupId === group.id; else groupNameDisplay">
                <input
                  class="inline-edit-input"
                  [(ngModel)]="editGroupName"
                  [name]="'editGroupName' + group.id"
                  placeholder="Group name"
                />
              </ng-container>
              <ng-template #groupNameDisplay>
                <h3>{{ group.name }}</h3>
              </ng-template>
            </div>
            <span class="status-pill">{{ getTeamsForGroup(group.id).length }} Teams</span>
          </div>

          <div class="group-actions" *ngIf="editingGroupId === group.id; else editGroupButton">
            <button type="button" class="compact-action primary-action" (click)="saveGroupName(group)" [disabled]="savingGroupId === group.id">
              {{ savingGroupId === group.id ? 'Saving...' : 'Save name' }}
            </button>
            <button type="button" class="compact-action" (click)="cancelEditGroup()" [disabled]="savingGroupId === group.id">
              Cancel
            </button>
          </div>
          <ng-template #editGroupButton>
            <button type="button" class="compact-action" (click)="startEditGroup(group)">Rename group</button>
          </ng-template>

          <div class="group-team-list" *ngIf="getGroupTeamLinksForGroup(group.id).length; else noTeams">
            <article class="assigned-team-row" *ngFor="let link of getGroupTeamLinksForGroup(group.id)">
              <div>
                <strong>{{ getTeamName(link.team) }}</strong>
                <span>{{ group.name }}</span>
              </div>
              <div class="team-actions">
                <select [(ngModel)]="moveTargets[link.id || 0]" [name]="'moveTeam' + link.id" aria-label="Move team to group">
                  <option [ngValue]="undefined">Move to...</option>
                  <option *ngFor="let target of getMoveTargetGroups(link)" [ngValue]="target.id">
                    {{ target.name }}
                  </option>
                </select>
                <button
                  type="button"
                  class="compact-action"
                  (click)="moveTeam(link)"
                  [disabled]="movingLinkId === link.id || !moveTargets[link.id || 0]"
                >
                  {{ movingLinkId === link.id ? 'Moving...' : 'Move' }}
                </button>
                <button
                  type="button"
                  class="compact-action danger-action"
                  (click)="removeTeamFromGroup(link)"
                  [disabled]="removingLinkId === link.id"
                >
                  {{ removingLinkId === link.id ? 'Removing...' : 'Remove' }}
                </button>
              </div>
            </article>
          </div>

          <ng-template #noTeams>
            <div class="empty-state compact-empty">No teams assigned yet.</div>
          </ng-template>
        </article>
      </section>

      <section class="panel unassigned-panel">
        <div class="group-top">
          <div>
            <p class="kicker">Roster check</p>
            <h3>Unassigned teams</h3>
          </div>
          <span class="status-pill">{{ unassignedTeams.length }} Teams</span>
        </div>
        <div class="team-chip-list" *ngIf="unassignedTeams.length; else noUnassignedTeams">
          <span *ngFor="let team of unassignedTeams">{{ team.name }}</span>
        </div>
        <ng-template #noUnassignedTeams>
          <div class="empty-state compact-empty">Every team in this tournament is assigned to a group.</div>
        </ng-template>
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

      .action-feedback {
        display: grid;
        gap: 0.35rem;
      }

      .action-feedback p {
        margin: 0;
      }

      .group-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        min-width: 0;
      }

      .group-title-block {
        min-width: 0;
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

      .group-actions,
      .team-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        min-width: 0;
      }

      .inline-edit-input {
        width: min(100%, 20rem);
        margin-top: 0.25rem;
      }

      .group-team-list {
        display: grid;
        gap: 0.55rem;
      }

      .assigned-team-row {
        display: grid;
        gap: 0.55rem;
        min-width: 0;
        padding: 0.7rem;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 0.85rem;
        background: rgba(15, 23, 42, 0.42);
      }

      .assigned-team-row > div:first-child {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }

      .assigned-team-row strong,
      .assigned-team-row span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .assigned-team-row strong {
        color: var(--ink);
      }

      .assigned-team-row span {
        color: var(--muted);
        font-size: 0.76rem;
        font-weight: 800;
      }

      .team-actions {
        align-items: center;
      }

      .team-actions select {
        flex: 1 1 11rem;
        min-width: 0;
      }

      .compact-action {
        min-height: 2.2rem;
        padding: 0.42rem 0.58rem;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 0.7rem;
        background: rgba(15, 23, 42, 0.58);
        color: var(--ink);
        font-size: 0.78rem;
        font-weight: 900;
      }

      .primary-action {
        border-color: rgba(20, 184, 166, 0.34);
        background: rgba(20, 184, 166, 0.12);
        color: #99f6e4;
      }

      .danger-action {
        border-color: rgba(239, 68, 68, 0.28);
        color: #fecaca;
      }

      .compact-action:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .unassigned-panel {
        display: grid;
        gap: 0.75rem;
        padding: 0.95rem;
      }

      .compact-empty {
        padding: 0.75rem;
      }

      @media (min-width: 700px) {
        .assigned-team-row {
          grid-template-columns: minmax(0, 1fr) minmax(19rem, 1.5fr);
          align-items: center;
        }
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
  editingGroupId?: number;
  editGroupName = '';
  savingGroupId?: number;
  removingLinkId?: number;
  movingLinkId?: number;
  moveTargets: Record<number, number | undefined> = {};
  groupActionError = '';
  groupActionSuccess = '';

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
        this.cancelEditGroup();
        this.moveTargets = {};
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

    if (this.isTeamAssigned(this.linkForm.team)) {
      this.assignmentError = 'This team is already assigned to a group in this tournament.';
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
      return this.unassignedTeams;
    }

    return this.teams.filter((team) => team.tournament === group.tournament && !this.isTeamAssigned(team.id));
  }

  get unassignedTeams(): Team[] {
    return this.teams.filter((team) => team.id && !this.isTeamAssigned(team.id));
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

  getGroupTeamLinksForGroup(groupId?: number): GroupTeam[] {
    if (!groupId) {
      return [];
    }

    return this.groupTeams.filter((link) => link.group === groupId);
  }

  startEditGroup(group: Group): void {
    if (!group.id) {
      return;
    }

    this.groupActionError = '';
    this.groupActionSuccess = '';
    this.editingGroupId = group.id;
    this.editGroupName = group.name;
  }

  cancelEditGroup(): void {
    this.editingGroupId = undefined;
    this.editGroupName = '';
    this.groupActionError = '';
  }

  saveGroupName(group: Group): void {
    this.groupActionError = '';
    this.groupActionSuccess = '';

    if (!group.id) {
      return;
    }

    const name = this.editGroupName.trim();
    if (!name) {
      this.groupActionError = 'Enter a group name.';
      return;
    }

    if (this.groups.some((item) => item.id !== group.id && item.name.toLowerCase() === name.toLowerCase())) {
      this.groupActionError = 'A group with that name already exists in this tournament.';
      return;
    }

    this.savingGroupId = group.id;
    this.api.update<Group>('groups', group.id, { name }).subscribe({
      next: () => {
        this.groupActionSuccess = 'Group renamed.';
        this.savingGroupId = undefined;
        this.cancelEditGroup();
        this.load();
      },
      error: (err) => {
        this.groupActionError = this.formatApiError(err);
        this.savingGroupId = undefined;
      },
    });
  }

  removeTeamFromGroup(link: GroupTeam): void {
    if (!link.id) {
      return;
    }

    this.assignmentError = '';
    this.assignmentSuccess = '';
    this.groupActionError = '';
    this.groupActionSuccess = '';
    this.removingLinkId = link.id;

    this.api.remove('group-teams', link.id).subscribe({
      next: () => {
        delete this.moveTargets[link.id || 0];
        this.groupActionSuccess = 'Team removed from group.';
        this.removingLinkId = undefined;
        this.load();
      },
      error: (err) => {
        this.groupActionError = this.formatApiError(err);
        this.removingLinkId = undefined;
      },
    });
  }

  moveTeam(link: GroupTeam): void {
    if (!link.id) {
      return;
    }

    const targetGroup = this.moveTargets[link.id];
    if (!targetGroup) {
      this.groupActionError = 'Choose a group to move this team into.';
      return;
    }

    if (this.groupTeams.some((item) => item.id !== link.id && item.team === link.team && item.group === targetGroup)) {
      this.groupActionError = 'This team is already in the target group.';
      return;
    }

    this.assignmentError = '';
    this.assignmentSuccess = '';
    this.groupActionError = '';
    this.groupActionSuccess = '';
    this.movingLinkId = link.id;

    this.api.update<GroupTeam>('group-teams', link.id, { group: targetGroup, team: link.team }).subscribe({
      next: () => {
        delete this.moveTargets[link.id || 0];
        this.groupActionSuccess = 'Team moved.';
        this.movingLinkId = undefined;
        this.load();
      },
      error: (err) => {
        this.groupActionError = this.formatApiError(err);
        this.movingLinkId = undefined;
      },
    });
  }

  getMoveTargetGroups(link: GroupTeam): Group[] {
    return this.groups.filter(
      (group) =>
        group.id !== link.group &&
        !this.groupTeams.some((item) => item.id !== link.id && item.team === link.team && item.group === group.id)
    );
  }

  getTournamentName(tournamentId?: number): string {
    return this.tournaments.find((tournament) => tournament.id === tournamentId)?.name ?? 'Tournament';
  }

  getTeamName(teamId?: number): string {
    return this.teams.find((team) => team.id === teamId)?.name ?? 'Team';
  }

  private isTeamAssigned(teamId?: number): boolean {
    if (!teamId) {
      return false;
    }

    return this.groupTeams.some((link) => link.team === teamId);
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
