import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminTournamentContextService } from './core/admin-tournament-context.service';
import { AuthService } from './core/auth.service';
import { Tournament } from './core/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <main>
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <span class="brand-mark">VB</span>
            <div>
              <p class="eyebrow">Tournament platform</p>
              <h1>VB Tournament</h1>
            </div>
          </div>

          <div class="status-pill" [class.public]="isViewerRoute">
            <span></span>
            {{ isViewerRoute ? 'Read-only' : isLoginRoute ? 'Login' : 'Admin' }}
          </div>
        </div>

        <section *ngIf="showAdminChrome" class="admin-context" aria-label="Selected tournament">
          <label>
            <span>Tournament</span>
            <select [(ngModel)]="selectedTournamentId" (ngModelChange)="selectTournament($event)">
              <option [ngValue]="0">Select tournament</option>
              <option *ngFor="let tournament of tournaments" [ngValue]="tournament.id">{{ tournament.name }}</option>
            </select>
          </label>

          <div class="viewer-actions" *ngIf="selectedTournamentId">
            <a [routerLink]="['/viewer/tournament', selectedTournamentId]">View Public Site</a>
            <a [routerLink]="['/viewer/tournament', selectedTournamentId, 'brackets']">View Brackets</a>
          </div>
        </section>

        <nav *ngIf="showAdminChrome" class="desktop-nav" aria-label="Primary navigation">
          <a routerLink="/tournaments" routerLinkActive="active">Tournaments</a>
          <a routerLink="/matches" routerLinkActive="active">Matches</a>
          <a routerLink="/standings" routerLinkActive="active">Standings</a>
          <a routerLink="/groups" routerLinkActive="active">Groups</a>
          <a *ngIf="selectedTournamentId" [routerLink]="['/viewer/tournament', selectedTournamentId]">Viewer</a>
          <details class="more-menu">
            <summary>More</summary>
            <div>
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
              <a routerLink="/teams-players" routerLinkActive="active">Teams/Players</a>
              <a routerLink="/courts" routerLinkActive="active">Courts</a>
              <a routerLink="/score-update" routerLinkActive="active">Score Update</a>
              <a routerLink="/brackets" routerLinkActive="active">Brackets</a>
              <a routerLink="/court-schedule" routerLinkActive="active">Court Schedule</a>
            </div>
          </details>
          <button type="button" class="logout-button" (click)="logout()">Logout</button>
        </nav>

        <details *ngIf="showAdminChrome" #adminMobileMenu class="mobile-admin-menu">
          <summary>
            <span>Admin Menu</span>
            <strong>{{ activeAdminLabel }}</strong>
          </summary>
          <div class="mobile-admin-panel">
            <a routerLink="/tournaments" routerLinkActive="active" (click)="adminMobileMenu.removeAttribute('open')">Tournaments</a>
            <a routerLink="/matches" routerLinkActive="active" (click)="adminMobileMenu.removeAttribute('open')">Matches</a>
            <a routerLink="/score-update" routerLinkActive="active" (click)="adminMobileMenu.removeAttribute('open')">Score Update</a>
            <a routerLink="/standings" routerLinkActive="active" (click)="adminMobileMenu.removeAttribute('open')">Standings</a>
            <a routerLink="/groups" routerLinkActive="active" (click)="adminMobileMenu.removeAttribute('open')">Groups</a>
            <a routerLink="/teams-players" routerLinkActive="active" (click)="adminMobileMenu.removeAttribute('open')">Teams/Players</a>
            <a routerLink="/courts" routerLinkActive="active" (click)="adminMobileMenu.removeAttribute('open')">Courts</a>
            <a routerLink="/court-schedule" routerLinkActive="active" (click)="adminMobileMenu.removeAttribute('open')">Court Schedule</a>
            <button type="button" class="logout-button mobile-logout" (click)="adminMobileMenu.removeAttribute('open'); logout()">Logout</button>
          </div>
        </details>
      </header>

      <section class="container">
        <router-outlet></router-outlet>
      </section>
    </main>
  `,
  styles: [
    `
      main {
        min-height: 100vh;
      }

      .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 55%),
          linear-gradient(90deg, rgba(37, 99, 235, 0.08), transparent 40%, rgba(20, 184, 166, 0.08)),
          rgba(2, 6, 23, 0.62);
        backdrop-filter: blur(26px) saturate(150%);
        -webkit-backdrop-filter: blur(26px) saturate(150%);
        box-shadow: 0 16px 38px rgba(2, 6, 23, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      .topbar-inner {
        box-sizing: border-box;
        width: min(1180px, 100%);
        margin: 0 auto;
        padding: 0.8rem 1rem 0.55rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.85rem;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.22), transparent 34%),
          linear-gradient(135deg, var(--accent), var(--teal));
        color: var(--ink);
        font-size: 0.82rem;
        font-weight: 950;
        box-shadow: 0 12px 26px rgba(37, 99, 235, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      .eyebrow {
        margin: 0 0 0.12rem;
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 850;
        letter-spacing: 0.1em;
        line-height: 1;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        color: var(--ink);
        font-size: clamp(1rem, 2vw, 1.32rem);
        font-weight: 900;
        line-height: 1.1;
      }

      .status-pill {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.45rem 0.7rem;
        border: 1px solid rgba(20, 184, 166, 0.28);
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.1);
        color: #99f6e4;
        font-size: 0.76rem;
        font-weight: 900;
      }

      .status-pill span {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 999px;
        background: var(--teal);
        box-shadow: 0 0 14px rgba(20, 184, 166, 0.72);
      }

      .status-pill.public {
        border-color: rgba(37, 99, 235, 0.34);
        background: rgba(37, 99, 235, 0.14);
        color: #bfdbfe;
      }

      .admin-context {
        box-sizing: border-box;
        width: min(1180px, 100%);
        margin: 0 auto;
        padding: 0 1rem 0.55rem;
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .admin-context label {
        min-width: min(22rem, 100%);
        display: grid;
        gap: 0.28rem;
      }

      .admin-context label span {
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .admin-context select {
        min-height: 2.55rem;
        border-radius: 0.85rem;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(15, 23, 42, 0.64);
        color: var(--ink);
        font-weight: 850;
      }

      .viewer-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.45rem;
      }

      nav {
        box-sizing: border-box;
        width: min(1180px, 100%);
        margin: 0 auto;
        padding: 0 1rem 0.85rem;
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        scrollbar-width: none;
      }

      nav::-webkit-scrollbar {
        display: none;
      }

      a {
        flex: 0 0 auto;
        color: var(--muted);
        text-decoration: none;
        padding: 0.48rem 0.72rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 999px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent),
          rgba(15, 23, 42, 0.38);
        font-size: 0.84rem;
        font-weight: 800;
        white-space: nowrap;
        backdrop-filter: blur(14px) saturate(135%);
        -webkit-backdrop-filter: blur(14px) saturate(135%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      a.active,
      a:hover {
        border-color: rgba(20, 184, 166, 0.42);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent),
          linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(20, 184, 166, 0.16));
        color: var(--ink);
        box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.16);
      }

      .more-menu {
        position: relative;
        flex: 0 0 auto;
      }

      .more-menu summary {
        color: var(--muted);
        padding: 0.48rem 0.72rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 999px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent),
          rgba(15, 23, 42, 0.38);
        font-size: 0.84rem;
        font-weight: 800;
        list-style: none;
        cursor: pointer;
      }

      .more-menu summary::-webkit-details-marker {
        display: none;
      }

      .more-menu div {
        position: absolute;
        top: calc(100% + 0.4rem);
        right: 0;
        min-width: 12rem;
        z-index: 20;
        display: grid;
        gap: 0.35rem;
        padding: 0.45rem;
        border: 1px solid var(--glass-border);
        border-radius: 1rem;
        background: rgba(2, 6, 23, 0.92);
        box-shadow: 0 18px 42px rgba(2, 6, 23, 0.42);
      }

      .more-menu:not([open]) div {
        display: none;
      }

      .mobile-admin-menu {
        display: none;
        box-sizing: border-box;
        width: min(1180px, 100%);
        margin: 0 auto;
        padding: 0 1rem 0.85rem;
      }

      .mobile-admin-menu summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        min-height: 2.9rem;
        padding: 0.65rem 0.78rem;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 1rem;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent),
          rgba(15, 23, 42, 0.6);
        color: var(--ink);
        font-size: 0.9rem;
        font-weight: 950;
        list-style: none;
        cursor: pointer;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      .mobile-admin-menu summary::-webkit-details-marker {
        display: none;
      }

      .mobile-admin-menu summary span {
        color: var(--muted);
        font-size: 0.7rem;
        font-weight: 950;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .mobile-admin-menu summary strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mobile-admin-panel {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.45rem;
        margin-top: 0.5rem;
        padding: 0.55rem;
        border: 1px solid var(--glass-border);
        border-radius: 1.1rem;
        background: rgba(2, 6, 23, 0.82);
        box-shadow: 0 18px 42px rgba(2, 6, 23, 0.32);
      }

      .mobile-admin-panel a,
      .mobile-admin-panel button {
        min-height: 2.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .mobile-logout {
        grid-column: 1 / -1;
      }

      .logout-button {
        flex: 0 0 auto;
        min-height: auto;
        padding: 0.48rem 0.72rem;
        border-color: rgba(239, 68, 68, 0.28);
        background: rgba(239, 68, 68, 0.1);
        color: #fecaca;
        font-size: 0.84rem;
      }

      .logout-button:hover {
        border-color: rgba(239, 68, 68, 0.45);
        background: rgba(239, 68, 68, 0.18);
      }

      .container {
        box-sizing: border-box;
        width: min(1180px, 100%);
        margin: 0 auto;
        padding: 1rem;
      }

      @media (max-width: 720px) {
        .topbar-inner {
          padding-inline: 0.85rem;
        }

        nav {
          display: none;
        }

        .mobile-admin-menu {
          display: block;
          padding-inline: 0.85rem;
        }

        .admin-context {
          align-items: stretch;
          flex-direction: column;
          padding-inline: 0.85rem;
        }

        .viewer-actions {
          justify-content: stretch;
        }

        .viewer-actions a {
          flex: 1 1 auto;
          text-align: center;
        }

        .container {
          width: calc(100vw - 1.7rem);
          padding: 0.85rem 0;
        }
      }
    `,
  ],
})
export class AppComponent {
  tournaments: Tournament[] = [];
  selectedTournamentId = 0;

  constructor(
    private router: Router,
    private auth: AuthService,
    private tournamentContext: AdminTournamentContextService,
  ) {
    this.tournamentContext.tournaments$.subscribe((tournaments) => (this.tournaments = tournaments));
    this.tournamentContext.selectedTournamentId$.subscribe((id) => (this.selectedTournamentId = id));
    this.tournamentContext.loadTournaments();
  }

  get isViewerRoute(): boolean {
    return this.router.url.startsWith('/viewer/');
  }

  get isLoginRoute(): boolean {
    return this.router.url.startsWith('/admin/login');
  }

  get showAdminChrome(): boolean {
    return !this.isViewerRoute && !this.isLoginRoute;
  }

  get activeAdminLabel(): string {
    const path = this.router.url.split('?')[0];

    if (path.startsWith('/matches')) {
      return 'Matches';
    }

    if (path.startsWith('/score-update')) {
      return 'Score Update';
    }

    if (path.startsWith('/standings')) {
      return 'Standings';
    }

    if (path.startsWith('/groups')) {
      return 'Groups';
    }

    if (path.startsWith('/teams-players')) {
      return 'Teams/Players';
    }

    if (path.startsWith('/courts')) {
      return 'Courts';
    }

    if (path.startsWith('/court-schedule')) {
      return 'Court Schedule';
    }

    if (path.startsWith('/tournaments')) {
      return 'Tournaments';
    }

    return 'Admin';
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/admin/login'));
  }

  selectTournament(id: number): void {
    this.tournamentContext.setSelectedTournament(Number(id));
  }
}
