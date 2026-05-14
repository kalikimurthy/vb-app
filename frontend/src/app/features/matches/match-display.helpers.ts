import { Court, Group, Match, Team, Tournament } from '../../core/models';

const TOURNAMENT_TIME_ZONE = 'America/New_York';

export function getById<T extends { id?: number }>(items: T[], id?: number | null): T | undefined {
  return id ? items.find((item) => item.id === id) : undefined;
}

export function getTournamentName(tournaments: Tournament[], id?: number | null): string {
  return getById(tournaments, id)?.name ?? (id ? `Tournament #${id}` : 'Tournament');
}

export function getTeamName(teams: Team[], id?: number | null): string {
  return getById(teams, id)?.name ?? 'TBD';
}

export function getCourtName(courts: Court[], match: Match): string {
  return match.court_name || getById(courts, match.court)?.name || 'Court TBD';
}

export function getGroupName(groups: Group[], id?: number | null): string {
  return getById(groups, id)?.name ?? '';
}

export function formatMatchTime(value?: string | null): string {
  if (!value) {
    return 'Time TBD';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Time TBD';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: TOURNAMENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
