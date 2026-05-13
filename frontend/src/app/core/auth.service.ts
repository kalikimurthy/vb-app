import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

interface AuthResponse {
  authenticated?: boolean;
  user?: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000/api/auth';
  private userSubject = new BehaviorSubject<AuthUser | null>(null);

  user$ = this.userSubject.asObservable();

  login(username: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login/`, { username, password }, { withCredentials: true })
      .pipe(
        map((response) => response.user as AuthUser),
        tap((user) => this.userSubject.next(user))
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout/`, {}, { withCredentials: true }).pipe(
      tap(() => this.userSubject.next(null)),
      catchError(() => {
        this.userSubject.next(null);
        return of(undefined);
      })
    );
  }

  me(): Observable<AuthUser | null> {
    return this.http.get<AuthResponse>(`${this.baseUrl}/me/`, { withCredentials: true }).pipe(
      map((response) => (response.authenticated ? response.user ?? null : null)),
      tap((user) => this.userSubject.next(user)),
      catchError(() => {
        this.userSubject.next(null);
        return of(null);
      })
    );
  }

  isLoggedIn(): boolean {
    return Boolean(this.userSubject.value);
  }
}
