import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { Court, Match } from '../../core/models';

@Component({
  selector: 'app-court-schedule-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="page grid">
      <h2>Court-wise Schedule</h2>
      <select [(ngModel)]="courtId" (ngModelChange)="load()">
        <option [ngValue]="0">All Courts</option>
        <option *ngFor="let c of courts" [ngValue]="c.id">{{ c.name }}</option>
      </select>
      <div class="mobile-scroll">
        <table>
          <tr><th>Match</th><th>Court</th><th>Time</th><th>Round</th><th>Status</th></tr>
          <tr *ngFor="let m of matches">
            <td>#{{ m.id }}</td>
            <td>{{ m.court }}</td>
            <td>{{ m.scheduled_time || '-' }}</td>
            <td>{{ m.stage }}</td>
            <td>{{ m.status }}</td>
          </tr>
        </table>
      </div>
    </article>
  `,
})
export class CourtSchedulePageComponent {
  private api = inject(ApiService);
  courts: Court[] = [];
  matches: Match[] = [];
  courtId = 0;

  constructor() {
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.load();
  }

  load(): void {
    const params = this.courtId ? { court: this.courtId } : undefined;
    this.api.list<Match>('matches', params).subscribe((r) => (this.matches = r.results));
  }
}
