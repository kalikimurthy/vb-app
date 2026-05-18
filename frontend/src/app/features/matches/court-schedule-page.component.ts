import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminTournamentContextService } from '../../core/admin-tournament-context.service';
import { ApiService } from '../../core/api.service';
import { Court, Group, Match } from '../../core/models';
import { formatMatchTime, getCourtName, getMatchFormatLabel, getMatchStageLabel } from './match-display.helpers';

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
          <tr><th>Match</th><th>Court</th><th>Time</th><th>Stage</th><th>Format</th><th>Status</th></tr>
          <tr *ngFor="let m of matches">
            <td>#{{ m.id }}</td>
            <td>{{ getCourtName(m) }}</td>
            <td>{{ formatMatchTime(m.scheduled_time) }}</td>
            <td>{{ getMatchStageLabel(m) || '-' }}</td>
            <td>{{ getMatchFormatLabel(m) || '-' }}</td>
            <td>{{ m.status }}</td>
          </tr>
        </table>
      </div>
    </article>
  `,
})
export class CourtSchedulePageComponent {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  private tournamentContext = inject(AdminTournamentContextService);
  courts: Court[] = [];
  groups: Group[] = [];
  matches: Match[] = [];
  courtId = 0;
  selectedTournamentId = 0;

  constructor() {
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.tournamentContext.selectedTournamentId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.selectedTournamentId = id;
        this.load();
      });
    this.tournamentContext.loadTournaments();
  }

  load(): void {
    if (!this.selectedTournamentId) {
      this.groups = [];
      this.matches = [];
      return;
    }

    this.api.list<Group>('groups', { tournament: this.selectedTournamentId, page_size: 100 }).subscribe((r) => (this.groups = r.results));
    const params: Record<string, number> = { tournament: this.selectedTournamentId, page_size: 250 };
    if (this.courtId) {
      params['court'] = this.courtId;
    }

    this.api.list<Match>('matches', params).subscribe((r) => (this.matches = r.results));
  }

  formatMatchTime(value?: string | null): string {
    return formatMatchTime(value);
  }

  getCourtName(match: Match): string {
    return getCourtName(this.courts, match);
  }

  getMatchStageLabel(match: Match): string {
    return getMatchStageLabel(match, this.groups);
  }

  getMatchFormatLabel(match: Match): string {
    return getMatchFormatLabel(match);
  }
}
