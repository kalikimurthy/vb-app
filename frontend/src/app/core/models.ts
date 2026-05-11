export type TournamentFormat = 'Top4' | 'Top8' | 'Premium/Star';

export interface Tournament {
  id?: number;
  name: string;
  date: string;
  format: TournamentFormat;
  status?: 'Draft' | 'Live' | 'Completed';
}

export interface Team {
  id?: number;
  tournament: number;
  name: string;
}

export interface Player {
  id?: number;
  name: string;
}

export interface TeamPlayer {
  id?: number;
  team: number;
  player: number;
  tournament: number;
}

export interface Court {
  id?: number;
  name: string;
  location?: string;
  description?: string;
  is_active: boolean;
}

export interface Group {
  id?: number;
  tournament: number;
  name: string;
}

export interface GroupTeam {
  id?: number;
  group: number;
  team: number;
}

export interface Match {
  id?: number;
  tournament: number;
  group?: number | null;
  court?: number | null;
  team_a?: number | null;
  team_b?: number | null;
  match_type: 'league' | 'knockout';
  stage: string;
  pool_type: 'none' | 'premium' | 'star';
  manual_match: boolean;
  bracket_locked: boolean;
  scheduled_time?: string | null;
  status: 'Scheduled' | 'Live' | 'Completed';
  score_a: number;
  score_b: number;
  winner_team?: number | null;
}

export interface Standing {
  id?: number;
  tournament: number;
  team: number;
  team_name?: string;
  wins: number;
  losses: number;
  points_scored: number;
  points_given: number;
  net_run_rate: number;
  rank: number;
  pool_type?: 'premium' | 'star' | null;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
