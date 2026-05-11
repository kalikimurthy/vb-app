import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { Court, Group, Match, Team, Tournament } from '../../core/models';

@Component({
  selector: 'app-matches-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="page grid two">
      <section class="grid">
        <h2>Matches</h2>
        <div class="mobile-scroll">
          <table>
            <tr>
              <th>ID</th><th>Tournament</th><th>Type</th><th>Stage</th><th>Court</th><th>Status</th><th>Score</th>
            </tr>
            <tr *ngFor="let m of matches">
              <td>{{ m.id }}</td><td>{{ m.tournament }}</td><td>{{ m.match_type }}</td><td>{{ m.stage }}</td>
              <td>{{ m.court }}</td><td>{{ m.status }}</td><td>{{ m.score_a }}-{{ m.score_b }}</td>
            </tr>
          </table>
        </div>
      </section>

      <section class="grid">
        <h3>Create Match</h3>
        <select [(ngModel)]="form.tournament"><option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option></select>
        <select [(ngModel)]="form.match_type"><option value="league">league</option><option value="knockout">knockout</option></select>
        <input [(ngModel)]="form.stage" placeholder="stage (quarter_final/semi_final/final/custom)" />
        <select [(ngModel)]="form.group"><option [ngValue]="null">No Group</option><option *ngFor="let g of groups" [ngValue]="g.id">{{ g.name }}</option></select>
        <select [(ngModel)]="form.team_a"><option [ngValue]="null">Team A</option><option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option></select>
        <select [(ngModel)]="form.team_b"><option [ngValue]="null">Team B</option><option *ngFor="let t of teams" [ngValue]="t.id">{{ t.name }}</option></select>
        <select [(ngModel)]="form.court"><option [ngValue]="null">Court</option><option *ngFor="let c of courts" [ngValue]="c.id">{{ c.name }}</option></select>
        <input [(ngModel)]="form.scheduled_time" type="datetime-local" />
        <select [(ngModel)]="form.pool_type"><option value="none">none</option><option value="premium">premium</option><option value="star">star</option></select>
        <button (click)="create()">Create Match</button>
      </section>
    </article>
  `,
})
export class MatchesPageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  teams: Team[] = [];
  groups: Group[] = [];
  courts: Court[] = [];
  matches: Match[] = [];

  form: Match = {
    tournament: 0,
    match_type: 'league',
    stage: 'league',
    pool_type: 'none',
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

  load(): void {
    this.api.list<Tournament>('tournaments').subscribe((r) => (this.tournaments = r.results));
    this.api.list<Team>('teams').subscribe((r) => (this.teams = r.results));
    this.api.list<Group>('groups').subscribe((r) => (this.groups = r.results));
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.api.list<Match>('matches').subscribe((r) => (this.matches = r.results));
  }

  create(): void {
    this.api.create<Match>('matches', this.form).subscribe(() => this.load());
  }
}
