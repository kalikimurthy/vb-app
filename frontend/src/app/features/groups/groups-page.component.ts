import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { Group, GroupTeam, Team, Tournament } from '../../core/models';

@Component({
  selector: 'app-groups-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="page grid two">
      <section class="grid">
        <h2>Groups</h2>
        <select [(ngModel)]="groupForm.tournament">
          <option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option>
        </select>
        <input [(ngModel)]="groupForm.name" placeholder="Group name" />
        <button (click)="createGroup()">Add Group</button>
        <ul><li *ngFor="let g of groups">{{ g.name }} (T{{ g.tournament }})</li></ul>
      </section>
      <section class="grid">
        <h2>Assign Teams</h2>
        <select [(ngModel)]="linkForm.group"><option *ngFor="let g of groups" [ngValue]="g.id">{{ g.name }}</option></select>
        <select [(ngModel)]="linkForm.team"><option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option></select>
        <button (click)="assignTeam()">Assign Team to Group</button>
      </section>
    </article>
  `,
})
export class GroupsPageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  teams: Team[] = [];
  groups: Group[] = [];

  groupForm: Partial<Group> = {};
  linkForm: Partial<GroupTeam> = {};

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Tournament>('tournaments').subscribe((r) => (this.tournaments = r.results));
    this.api.list<Team>('teams').subscribe((r) => (this.teams = r.results));
    this.api.list<Group>('groups').subscribe((r) => (this.groups = r.results));
  }

  createGroup(): void {
    this.api.create<Group>('groups', this.groupForm).subscribe(() => this.load());
  }

  assignTeam(): void {
    this.api.create<GroupTeam>('group-teams', this.linkForm).subscribe();
  }
}
