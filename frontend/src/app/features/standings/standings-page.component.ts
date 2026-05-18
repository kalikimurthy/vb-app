import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { Standing, Tournament } from '../../core/models';

@Component({
  selector: 'app-standings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="page grid">
      <h2>Standings</h2>
      <div class="grid two">
        <select [(ngModel)]="tournamentId" (ngModelChange)="load()">
          <option [ngValue]="0">Select Tournament</option>
          <option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option>
        </select>
        <button (click)="recalculate()">Recalculate</button>
      </div>
      <div class="mobile-scroll">
        <table>
          <tr><th>Rank</th><th>Team</th><th>W-L</th><th>PF</th><th>PA</th><th>Diff</th></tr>
          <tr *ngFor="let s of standings">
            <td>{{ s.rank }}</td><td>{{ s.team_name || s.team }}</td><td>{{ s.wins }}-{{ s.losses }}</td>
            <td>{{ s.points_scored }}</td><td>{{ s.points_given }}</td><td>{{ getPointDifferential(s) }}</td>
          </tr>
        </table>
      </div>
    </article>
  `,
})
export class StandingsPageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  standings: Standing[] = [];
  tournamentId = 0;

  constructor() {
    this.api.list<Tournament>('tournaments').subscribe((r) => (this.tournaments = r.results));
  }

  load(): void {
    if (!this.tournamentId) {
      this.standings = [];
      return;
    }
    this.api.list<Standing>('standings', { tournament: this.tournamentId }).subscribe((r) => (this.standings = r.results));
  }

  recalculate(): void {
    if (!this.tournamentId) {
      return;
    }
    this.api.action('standings', 'recalculate', { tournament: this.tournamentId }).subscribe(() => this.load());
  }

  getPointDifferential(standing: Standing): string {
    const differential = standing.points_scored - standing.points_given;
    return differential > 0 ? `+${differential}` : String(differential);
  }
}
