import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <main>
      <header class="topbar">
        <h1>Volleyball Tournament Manager</h1>
        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
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
      .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        background: linear-gradient(120deg, #103c37, #125f5a);
        color: white;
        padding: 0.8rem 1rem;
      }
      h1 {
        margin: 0 0 0.5rem;
        font-size: 1.15rem;
        letter-spacing: 0.04em;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      a {
        color: #d7f2ea;
        text-decoration: none;
        padding: 0.3rem 0.5rem;
        border-radius: 6px;
        font-size: 0.9rem;
      }
      a.active,
      a:hover {
        background: rgba(255, 255, 255, 0.18);
        color: white;
      }
      .container {
        padding: 1rem;
      }
    `,
  ],
})
export class AppComponent {}
