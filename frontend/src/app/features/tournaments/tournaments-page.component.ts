import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { Tournament } from '../../core/models';

@Component({
  selector: 'app-tournaments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <article class="tournaments-page">
      <header class="page-hero">
        <div>
          <p class="kicker">Tournament HQ</p>
          <h2>Manage competitions</h2>
          <p>Create tournaments, track status, and jump into tournament operations fast.</p>
        </div>
        <div class="hero-stat">
          <strong>{{ tournaments.length }}</strong>
          <span>Tournaments</span>
        </div>
      </header>

      <div class="tournament-layout">
        <section class="panel tournament-list-panel">
          <div class="panel-header">
            <div>
              <p class="kicker">Overview</p>
              <h3>Active tournament list</h3>
            </div>
          </div>

          <div class="tournament-grid" *ngIf="tournaments.length; else noTournaments">
            <a class="tournament-card" *ngFor="let t of tournaments" [routerLink]="['/tournaments', t.id]">
              <span class="tournament-card-top">
                <strong>{{ t.name }}</strong>
                <span class="status-chip">{{ t.status || 'Draft' }}</span>
              </span>
              <span class="tournament-meta">{{ t.date }} · {{ t.format }}</span>
              <span class="open-link">Open tournament</span>
            </a>
          </div>

          <ng-template #noTournaments>
            <div class="empty-state">No tournaments yet. Create one to start building the bracket.</div>
          </ng-template>
        </section>

        <section class="panel create-panel">
          <div class="panel-header">
            <div>
              <p class="kicker">Create</p>
              <h3>New tournament</h3>
            </div>
          </div>

          <form class="form-card" (ngSubmit)="create()">
            <input [(ngModel)]="form.name" name="tournamentName" placeholder="Tournament name" />
            <input [(ngModel)]="form.date" name="tournamentDate" type="date" />
            <select [(ngModel)]="form.format" name="tournamentFormat">
              <option [ngValue]="undefined">Format</option>
              <option value="Top4">Top4</option>
              <option value="Top8">Top8</option>
              <option value="Premium/Star">Premium/Star</option>
            </select>

            <button type="submit" [disabled]="isSavingTournament">
              {{ isSavingTournament ? 'Creating...' : 'Create Tournament' }}
            </button>

            <p *ngIf="tournamentError" class="error">{{ tournamentError }}</p>
            <p *ngIf="tournamentSuccess" class="success">{{ tournamentSuccess }}</p>
          </form>
        </section>
      </div>
    </article>
  `,
  styles: [
    `
      .tournaments-page {
        display: grid;
        gap: 1rem;
      }

      .page-hero h2 {
        margin-top: 0.25rem;
        font-size: clamp(1.75rem, 4vw, 2.65rem);
      }

      .hero-stat {
        min-width: 6rem;
        padding: 0.85rem;
        border: 1px solid rgba(20, 184, 166, 0.28);
        border-radius: 1rem;
        background: rgba(20, 184, 166, 0.1);
        text-align: center;
      }

      .hero-stat strong {
        display: block;
        color: #99f6e4;
        font-size: 1.65rem;
        line-height: 1;
      }

      .hero-stat span {
        color: var(--muted);
        font-size: 0.75rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .tournament-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 1rem;
      }

      .panel {
        padding: 1rem;
      }

      .panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .panel-header h3 {
        margin: 0.15rem 0 0;
      }

      .tournament-grid {
        display: grid;
        gap: 0.75rem;
      }

      .tournament-card {
        display: grid;
        gap: 0.55rem;
        padding: 0.95rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.42);
        color: var(--ink);
        text-decoration: none;
        transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
      }

      .tournament-card:hover {
        transform: translateY(-1px);
        border-color: rgba(37, 99, 235, 0.42);
        background: rgba(37, 99, 235, 0.12);
      }

      .tournament-card-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .tournament-card-top strong {
        font-size: 1rem;
      }

      .status-chip {
        flex: 0 0 auto;
        padding: 0.22rem 0.5rem;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.16);
        color: #bfdbfe;
        font-size: 0.72rem;
        font-weight: 900;
      }

      .tournament-meta {
        color: var(--muted);
        font-size: 0.86rem;
        font-weight: 700;
      }

      .open-link {
        color: var(--teal);
        font-size: 0.82rem;
        font-weight: 900;
      }

      @media (min-width: 900px) {
        .tournament-layout {
          grid-template-columns: minmax(0, 1.25fr) minmax(20rem, 0.75fr);
          align-items: start;
        }
      }
    `,
  ],
})
export class TournamentsPageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  form: Tournament = { name: '', date: '', format: 'Top8' };

  isSavingTournament = false;
  tournamentError = '';
  tournamentSuccess = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Tournament>('tournaments').subscribe({
      next: (res) => (this.tournaments = res.results),
      error: (err) => (this.tournamentError = this.formatApiError(err)),
    });
  }

  create(): void {
    this.tournamentError = '';
    this.tournamentSuccess = '';

    const name = this.form.name.trim();
    const date = this.form.date;
    const format = this.form.format;

    if (!name) {
      this.tournamentError = 'Enter a tournament name.';
      return;
    }

    if (!date) {
      this.tournamentError = 'Select a tournament date.';
      return;
    }

    if (!format) {
      this.tournamentError = 'Select a tournament format.';
      return;
    }

    this.isSavingTournament = true;

    this.api.create<Tournament>('tournaments', { name, date, format }).subscribe({
      next: () => {
        this.form = { name: '', date: '', format: 'Top8' };
        this.isSavingTournament = false;
        this.tournamentSuccess = 'Tournament created.';
        this.load();
      },
      error: (err) => {
        this.tournamentError = this.formatApiError(err);
        this.isSavingTournament = false;
      },
    });
  }

  private formatApiError(err: unknown): string {
    const error = (err as { error?: unknown })?.error;

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      return Object.entries(error as Record<string, unknown>)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
        .join(' | ');
    }

    return 'Request failed. Check that the backend is running and the form is valid.';
  }
}
