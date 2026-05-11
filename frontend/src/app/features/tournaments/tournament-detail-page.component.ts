import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { Match, Standing, Tournament } from '../../core/models';

@Component({
  selector: 'app-tournament-detail-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="page grid">
      <h2>{{ tournament?.name }}</h2>
      <p>{{ tournament?.date }} • {{ tournament?.format }} • {{ tournament?.status }}</p>
      <section class="grid two">
        <div class="page">
          <h3>Matches</h3>
          <ul>
            <li *ngFor="let m of matches">#{{ m.id }} {{ m.match_type }} {{ m.stage }} ({{ m.status }})</li>
          </ul>
        </div>
        <div class="page">
          <h3>Standings</h3>
          <ol>
            <li *ngFor="let s of standings">{{ s.team_name || s.team }} - W:{{ s.wins }} L:{{ s.losses }}</li>
          </ol>
        </div>
      </section>
    </article>
  `,
})
export class TournamentDetailPageComponent {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  tournament?: Tournament;
  matches: Match[] = [];
  standings: Standing[] = [];

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get<Tournament>('tournaments', id).subscribe((t) => (this.tournament = t));
    this.api.list<Match>('matches', { tournament: id }).subscribe((res) => (this.matches = res.results));
    this.api.list<Standing>('standings', { tournament: id }).subscribe((res) => (this.standings = res.results));
  }
}
