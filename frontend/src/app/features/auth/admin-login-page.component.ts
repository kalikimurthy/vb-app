import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="login-page">
      <section class="login-card">
        <p class="kicker">Organizer access</p>
        <h2>Admin login</h2>
        <p class="login-copy">Sign in to manage tournaments, groups, matches, courts, and live scoring.</p>
        <p class="demo-hint">Local demo: admin / admin123</p>

        <form (ngSubmit)="login()" #loginForm="ngForm">
          <label>
            Username
            <input name="username" [(ngModel)]="username" autocomplete="username" required />
          </label>

          <label>
            Password
            <input name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required />
          </label>

          <div class="error" *ngIf="error">{{ error }}</div>

          <button type="submit" [disabled]="isLoggingIn || loginForm.invalid">
            {{ isLoggingIn ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>
      </section>
    </article>
  `,
  styles: [
    `
      .login-page {
        min-height: calc(100vh - 10rem);
        display: grid;
        place-items: center;
      }

      .login-card {
        width: min(26rem, 100%);
        padding: 1.2rem;
        border: 1px solid var(--line);
        border-radius: 1.25rem;
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.18), transparent 54%),
          var(--card);
        box-shadow: var(--shadow);
      }

      h2 {
        margin: 0.2rem 0 0;
        color: var(--ink);
        font-size: clamp(1.6rem, 5vw, 2.25rem);
      }

      .login-copy {
        margin: 0.45rem 0 1rem;
        color: var(--muted);
      }

      .demo-hint {
        margin: -0.35rem 0 1rem;
        padding: 0.5rem 0.65rem;
        border: 1px solid rgba(20, 184, 166, 0.22);
        border-radius: 0.8rem;
        background: rgba(20, 184, 166, 0.08);
        color: #99f6e4;
        font-size: 0.82rem;
        font-weight: 850;
      }

      form {
        display: grid;
        gap: 0.75rem;
      }

      label {
        display: grid;
        gap: 0.35rem;
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 900;
      }

      input {
        min-height: 2.7rem;
      }

      button {
        min-height: 2.8rem;
      }
    `,
  ],
})
export class AdminLoginPageComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = '';
  password = '';
  error = '';
  isLoggingIn = false;

  login(): void {
    this.error = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Enter your username and password.';
      return;
    }

    this.isLoggingIn = true;
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/matches';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        const backendMessage =
          typeof error?.error === 'string' ? error.error : error?.error?.detail || error?.message;
        this.error = backendMessage || `Could not sign in${error?.status ? ` (${error.status})` : ''}.`;
        console.error('Admin login failed', error);
        this.isLoggingIn = false;
      },
    });
  }
}
