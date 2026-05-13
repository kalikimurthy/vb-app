import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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

          <div class="status-pill">
            <span></span>
            Admin
          </div>
        </div>

        <nav aria-label="Primary navigation">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
          <a routerLink="/tournaments" routerLinkActive="active">Tournaments</a>
          <a routerLink="/teams-players" routerLinkActive="active">Teams/Players</a>
          <a routerLink="/courts" routerLinkActive="active">Courts</a>
          <a routerLink="/groups" routerLinkActive="active">Groups</a>
          <a routerLink="/matches" routerLinkActive="active">Matches</a>
          <a routerLink="/score-update" routerLinkActive="active">Score Update</a>
          <a routerLink="/standings" routerLinkActive="active">Standings</a>
          <a routerLink="/brackets" routerLinkActive="active">Brackets</a>
          <a routerLink="/court-schedule" routerLinkActive="active">Court Schedule</a>
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
        border-bottom: 1px solid var(--line);
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(18px);
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
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(30, 41, 59, 0.68);
        font-size: 0.84rem;
        font-weight: 800;
        white-space: nowrap;
      }

      a.active,
      a:hover {
        border-color: rgba(20, 184, 166, 0.42);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(20, 184, 166, 0.14));
        color: var(--ink);
        box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.16);
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
export class AppComponent {}
