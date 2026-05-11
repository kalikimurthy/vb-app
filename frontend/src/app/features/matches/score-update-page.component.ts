import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { Match } from '../../core/models';

@Component({
  selector: 'app-score-update-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="page grid two">
      <section>
        <h2>Score Updates</h2>
        <ul>
          <li *ngFor="let m of matches">
            Match #{{ m.id }} {{ m.stage }} | {{ m.score_a }} - {{ m.score_b }} | {{ m.status }}
          </li>
        </ul>
      </section>
      <section class="grid">
        <h3>Update Match Score</h3>
        <input [(ngModel)]="form.id" type="number" placeholder="Match ID" />
        <input [(ngModel)]="form.score_a" type="number" placeholder="Score A" />
        <input [(ngModel)]="form.score_b" type="number" placeholder="Score B" />
        <select [(ngModel)]="form.status">
          <option value="Scheduled">Scheduled</option>
          <option value="Live">Live</option>
          <option value="Completed">Completed</option>
        </select>
        <button (click)="updateScore()">Save Score</button>
      </section>
    </article>
  `,
})
export class ScoreUpdatePageComponent {
  private api = inject(ApiService);

  matches: Match[] = [];
  form: Partial<Match> = { id: 0, score_a: 0, score_b: 0, status: 'Live' };

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Match>('matches').subscribe((r) => (this.matches = r.results));
  }

  updateScore(): void {
    if (!this.form.id) {
      return;
    }
    this.api.action<Match>('matches', `${this.form.id}/update_score`, {
      score_a: this.form.score_a,
      score_b: this.form.score_b,
      status: this.form.status,
    }).subscribe(() => this.load());
  }
}
