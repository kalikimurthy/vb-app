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
    <article class="page grid two">
      <section class="grid">
        <h2>Teams</h2>
        <select [(ngModel)]="teamForm.tournament">
          <option [ngValue]="undefined">Tournament</option>
          <option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option>
        </select>
        <input [(ngModel)]="teamForm.name" placeholder="Team name" />
        <button (click)="addTeam()">Add Team</button>
        <ul><li *ngFor="let team of teams">{{ team.name }} (T{{ team.tournament }})</li></ul>
      </section>

      <section class="grid">
        <h2>Players + Team Assignment</h2>
        <input [(ngModel)]="playerForm.name" placeholder="Player name" />
        <button (click)="addPlayer()">Add Player</button>
        <select [(ngModel)]="linkForm.team"><option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option></select>
        <select [(ngModel)]="linkForm.player"><option *ngFor="let p of players" [ngValue]="p.id">{{ p.name }}</option></select>
        <select [(ngModel)]="linkForm.tournament"><option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option></select>
        <button (click)="linkPlayer()">Assign to Team in Tournament</button>
      </section>
    </article>
  `,
})
export class TeamsPlayersPageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  teams: Team[] = [];
  players: Player[] = [];

  teamForm: Partial<Team> = { name: '' };
  playerForm: Player = { name: '' };
  linkForm: Partial<TeamPlayer> = {};

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Tournament>('tournaments').subscribe((r) => (this.tournaments = r.results));
    this.api.list<Team>('teams').subscribe((r) => (this.teams = r.results));
    this.api.list<Player>('players').subscribe((r) => (this.players = r.results));
  }

  addTeam(): void {
    this.api.create<Team>('teams', this.teamForm).subscribe(() => this.load());
  }

  addPlayer(): void {
    this.api.create<Player>('players', this.playerForm).subscribe(() => {
      this.playerForm = { name: '' };
      this.load();
    });
  }

  linkPlayer(): void {
    this.api.create<TeamPlayer>('team-players', this.linkForm).subscribe();
  }
}
