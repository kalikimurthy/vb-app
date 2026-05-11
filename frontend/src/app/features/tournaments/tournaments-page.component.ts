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
    <article class="page grid two">
      <section>
        <h2>Tournaments</h2>
        <div class="mobile-scroll">
          <table>
            <thead>
              <tr><th>Name</th><th>Date</th><th>Format</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of tournaments">
                <td>{{ t.name }}</td>
                <td>{{ t.date }}</td>
                <td>{{ t.format }}</td>
                <td>{{ t.status }}</td>
                <td><a [routerLink]="['/tournaments', t.id]">Open</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3>Create Tournament</h3>
        <div class="grid">
          <input [(ngModel)]="form.name" placeholder="Tournament name" />
          <input [(ngModel)]="form.date" type="date" />
          <select [(ngModel)]="form.format">
            <option value="Top4">Top4</option>
            <option value="Top8">Top8</option>
            <option value="Premium/Star">Premium/Star</option>
          </select>
          <button (click)="create()">Create</button>
        </div>
      </section>
    </article>
  `,
})
export class TournamentsPageComponent {
  private api = inject(ApiService);

  tournaments: Tournament[] = [];
  form: Tournament = { name: '', date: '', format: 'Top8' };

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Tournament>('tournaments').subscribe((res) => (this.tournaments = res.results));
  }

  create(): void {
    this.api.create<Tournament>('tournaments', this.form).subscribe(() => {
      this.form = { name: '', date: '', format: 'Top8' };
      this.load();
    });
  }
}
