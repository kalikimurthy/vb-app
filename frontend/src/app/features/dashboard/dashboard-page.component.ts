import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  template: `
    <article class="page">
      <h2>Tournament Operations Console</h2>
      <p>Manage league + knockout flows, manual brackets, courts, scores, and standings from one place.</p>
      <div class="grid two">
        <section class="page">
          <h3>League</h3>
          <p>Create groups, schedule court assignments, and track live/completed scores.</p>
        </section>
        <section class="page">
          <h3>Knockout + Pools</h3>
          <p>Generate Top4/Top8/Premium-Star brackets, then manually edit matches before lock.</p>
        </section>
      </div>
    </article>
  `,
})
export class DashboardPageComponent {}
