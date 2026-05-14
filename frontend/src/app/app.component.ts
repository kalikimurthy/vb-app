import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
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

        <nav *ngIf="showAdminChrome" aria-label="Primary navigation">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
          <a routerLink="/tournaments" routerLinkActive="active">Tournaments</a>
          <a routerLink="/matches" routerLinkActive="active">Matches</a>
          <a routerLink="/teams-players" routerLinkActive="active">Teams/Players</a>
          <a routerLink="/courts" routerLinkActive="active">Courts</a>
          <a routerLink="/groups" routerLinkActive="active">Groups</a>
          <a routerLink="/score-update" routerLinkActive="active">Score Update</a>
          <a routerLink="/standings" routerLinkActive="active">Standings</a>
          <a routerLink="/brackets" routerLinkActive="active">Brackets</a>
          <a routerLink="/court-schedule" routerLinkActive="active">Court Schedule</a>
          <button type="button" class="logout-button" (click)="logout()">Logout</button>
        </nav>
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
          linear-gradient(90deg, rgba(37, 99, 235, 0.08), transparent 40%, rgba(20, 184, 166, 0.08)),
          rgba(2, 6, 23, 0.72);
        backdrop-filter: blur(22px);
        -webkit-backdrop-filter: blur(22px);
        box-shadow: 0 14px 34px rgba(2, 6, 23, 0.24);
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
        background: linear-gradient(135deg, var(--accent), var(--teal));
        color: var(--ink);
        font-size: 0.82rem;
        font-weight: 950;
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
        background: rgba(15, 23, 42, 0.42);
        font-size: 0.84rem;
        font-weight: 800;
        white-space: nowrap;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      a.active,
      a:hover {
        border-color: rgba(20, 184, 166, 0.42);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(20, 184, 166, 0.14));
        color: var(--ink);
        box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.16);
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
          padding-inline: 0.85rem;
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
  constructor(private router: Router, private auth: AuthService) {}

  get isViewerRoute(): boolean {
    return this.router.url.startsWith('/viewer/');
  }

  get isLoginRoute(): boolean {
    return this.router.url.startsWith('/admin/login');
  }

  get showAdminChrome(): boolean {
    return !this.isViewerRoute && !this.isLoginRoute;
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/admin/login'));
  }
}
