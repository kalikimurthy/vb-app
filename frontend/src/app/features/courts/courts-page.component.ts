import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { Court } from '../../core/models';

@Component({
  selector: 'app-courts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="page grid two">
      <section>
        <h2>Courts</h2>
        <table>
          <tr><th>Name</th><th>Location</th><th>Active</th></tr>
          <tr *ngFor="let c of courts"><td>{{ c.name }}</td><td>{{ c.location }}</td><td>{{ c.is_active }}</td></tr>
        </table>
      </section>
      <section class="grid">
        <h3>Add Court</h3>
        <input [(ngModel)]="form.name" placeholder="Court name" />
        <input [(ngModel)]="form.location" placeholder="Location" />
        <textarea [(ngModel)]="form.description" placeholder="Description"></textarea>
        <label><input type="checkbox" [(ngModel)]="form.is_active" /> Active</label>
        <button (click)="create()">Save Court</button>
      </section>
    </article>
  `,
})
export class CourtsPageComponent {
  private api = inject(ApiService);
  courts: Court[] = [];
  form: Court = { name: '', location: '', description: '', is_active: true };

  constructor() {
    this.load();
  }

  load(): void {
    this.api.list<Court>('courts').subscribe((res) => (this.courts = res.results));
  }

  create(): void {
    this.api.create<Court>('courts', this.form).subscribe(() => {
      this.form = { name: '', location: '', description: '', is_active: true };
      this.load();
    });
  }
}
