import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { Match, Tournament } from '../../core/models';

@Component({
  selector: 'app-brackets-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="page grid two">
      <section class="grid">
        <h2>Bracket Operations</h2>
        <select [(ngModel)]="tournamentId" (ngModelChange)="loadMatches()">
          <option [ngValue]="0">Select Tournament</option>
          <option *ngFor="let t of tournaments" [ngValue]="t.id">{{ t.name }}</option>
        </select>
        <button (click)="generate()">Generate Bracket</button>
        <button class="secondary" (click)="lock(true)">Lock</button>
        <button class="secondary" (click)="lock(false)">Unlock</button>
        <h3>Manual Match Add</h3>
        <input [(ngModel)]="manual.stage" placeholder="stage name" />
        <select [(ngModel)]="manual.pool_type"><option value="none">none</option><option value="premium">premium</option><option value="star">star</option></select>
        <input [(ngModel)]="manual.team_a" type="number" placeholder="Team A ID" />
        <input [(ngModel)]="manual.team_b" type="number" placeholder="Team B ID" />
        <button (click)="createManual()">Create Manual Match</button>
      </section>
      <section>
        <h2>Knockout + Pool Matches</h2>
        <ul>
          <li *ngFor="let m of matches">
            #{{ m.id }} {{ m.pool_type }} {{ m.stage }} teams({{ m.team_a }} vs {{ m.team_b }}) lock={{ m.bracket_locked }}
          </li>
        </ul>
      </section>
    </article>
  `,
})
export class BracketsPageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  matches: Match[] = [];
  tournamentId = 0;
  manual: Partial<Match> = { stage: 'quarter_final', pool_type: 'none', team_a: null, team_b: null };

  constructor() {
    this.api.list<Tournament>('tournaments').subscribe((r) => (this.tournaments = r.results));
  }

  loadMatches(): void {
    if (!this.tournamentId) return;
    this.api.list<Match>('matches', { tournament: this.tournamentId, match_type: 'knockout' }).subscribe((r) => (this.matches = r.results));
  }

  generate(): void {
    if (!this.tournamentId) return;
    this.api.action<Match[]>('brackets', 'generate', { tournament_id: this.tournamentId }).subscribe(() => this.loadMatches());
  }

  lock(locked: boolean): void {
    if (!this.tournamentId) return;
    this.api.action('brackets', 'lock', { tournament_id: this.tournamentId, locked }).subscribe(() => this.loadMatches());
  }

  createManual(): void {
    if (!this.tournamentId) return;
    this.api.action('brackets', 'manual_match', {
      tournament: this.tournamentId,
      stage: this.manual.stage,
      pool_type: this.manual.pool_type,
      team_a: this.manual.team_a,
      team_b: this.manual.team_b,
      score_a: 0,
      score_b: 0,
      status: 'Scheduled',
      bracket_locked: false,
      manual_match: true,
      match_type: 'knockout'
    }).subscribe(() => this.loadMatches());
  }
}
