import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { ApiService } from './api.service';
import { Tournament } from './models';

@Injectable({ providedIn: 'root' })
export class AdminTournamentContextService {
  private api = inject(ApiService);
  private storageKey = 'vb-admin-selected-tournament-id';
  private tournamentsSubject = new BehaviorSubject<Tournament[]>([]);
  private selectedTournamentIdSubject = new BehaviorSubject<number>(this.readStoredTournamentId());

  tournaments$ = this.tournamentsSubject.asObservable();
  selectedTournamentId$ = this.selectedTournamentIdSubject.asObservable();

  get tournaments(): Tournament[] {
    return this.tournamentsSubject.value;
  }

  get selectedTournamentId(): number {
    return this.selectedTournamentIdSubject.value;
  }

  loadTournaments(): void {
    this.api.list<Tournament>('tournaments', { page_size: 100 }).subscribe((response) => {
      const tournaments = response.results;
      this.tournamentsSubject.next(tournaments);
      this.ensureSelectedTournament(tournaments);
    });
  }

  setSelectedTournament(id: number): void {
    this.selectedTournamentIdSubject.next(id);

    if (id) {
      localStorage.setItem(this.storageKey, String(id));
      return;
    }

    localStorage.removeItem(this.storageKey);
  }

  private ensureSelectedTournament(tournaments: Tournament[]): void {
    const currentId = this.selectedTournamentId;
    if (currentId && tournaments.some((tournament) => tournament.id === currentId)) {
      return;
    }

    const defaultTournament = this.pickDefaultTournament(tournaments);
    this.setSelectedTournament(defaultTournament?.id ?? 0);
  }

  private pickDefaultTournament(tournaments: Tournament[]): Tournament | undefined {
    return [...tournaments].sort((a, b) => {
      const statusA = a.status === 'Live' ? 1 : 0;
      const statusB = b.status === 'Live' ? 1 : 0;

      if (statusA !== statusB) {
        return statusB - statusA;
      }

      const dateA = Date.parse(a.date || '');
      const dateB = Date.parse(b.date || '');

      if (dateA !== dateB) {
        return dateB - dateA;
      }

      return (b.id ?? 0) - (a.id ?? 0);
    })[0];
  }

  private readStoredTournamentId(): number {
    const stored = localStorage.getItem(this.storageKey);
    const parsed = stored ? Number(stored) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
