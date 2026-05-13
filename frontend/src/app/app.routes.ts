import { Routes } from '@angular/router';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { TournamentsPageComponent } from './features/tournaments/tournaments-page.component';
import { TournamentDetailPageComponent } from './features/tournaments/tournament-detail-page.component';
import { TeamsPlayersPageComponent } from './features/teams/teams-players-page.component';
import { CourtsPageComponent } from './features/courts/courts-page.component';
import { GroupsPageComponent } from './features/groups/groups-page.component';
import { MatchesPageComponent } from './features/matches/matches-page.component';
import { ScoreUpdatePageComponent } from './features/matches/score-update-page.component';
import { StandingsPageComponent } from './features/standings/standings-page.component';
import { BracketsPageComponent } from './features/brackets/brackets-page.component';
import { CourtSchedulePageComponent } from './features/matches/court-schedule-page.component';
import { MatchScorePageComponent } from './features/matches/match-score-page.component';
import { TournamentViewerPageComponent } from './features/viewer/tournament-viewer-page.component';
import { AdminLoginPageComponent } from './features/auth/admin-login-page.component';
import { adminGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'admin/login', component: AdminLoginPageComponent },
  { path: '', component: DashboardPageComponent, canActivate: [adminGuard] },
  { path: 'tournaments', component: TournamentsPageComponent, canActivate: [adminGuard] },
  { path: 'tournaments/:id', component: TournamentDetailPageComponent, canActivate: [adminGuard] },
  { path: 'teams-players', component: TeamsPlayersPageComponent, canActivate: [adminGuard] },
  { path: 'courts', component: CourtsPageComponent, canActivate: [adminGuard] },
  { path: 'groups', component: GroupsPageComponent, canActivate: [adminGuard] },
  { path: 'matches', component: MatchesPageComponent, canActivate: [adminGuard] },
  { path: 'matches/:matchId/score', component: MatchScorePageComponent, canActivate: [adminGuard] },
  { path: 'score-update', component: ScoreUpdatePageComponent, canActivate: [adminGuard] },
  { path: 'standings', component: StandingsPageComponent, canActivate: [adminGuard] },
  { path: 'brackets', component: BracketsPageComponent, canActivate: [adminGuard] },
  { path: 'court-schedule', component: CourtSchedulePageComponent, canActivate: [adminGuard] },
  { path: 'viewer/tournament/:id', component: TournamentViewerPageComponent },
  { path: '**', redirectTo: '' },
];
