import { Court, Group, Match, Team, Tournament } from '../../core/models';

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

export function getDivisionLabel(match: Match): string {
  if (match.pool_type === 'premium') {
    return 'Division A · Champions League';
  }

  if (match.pool_type === 'star') {
    return 'Division B · Premier League';
  }

  return '';
}

export function getMatchStageLabel(match: Match, groups: Group[] = []): string {
  const groupName = getGroupName(groups, match.group);
  if (groupName) {
    return groupName;
  }

  return getDivisionLabel(match);
}

export function getMatchFormatLabel(match: Match): string {
  if (match.match_type !== 'knockout') {
    return '';
  }

  const stage = normalizeStage(match.stage);
  if (stage.startsWith('quarter_final')) {
    return 'Quarterfinal - Best of 1 to 21';
  }

  if (stage.startsWith('semi_final')) {
    return 'Semi Final - Best of 1 to 25';
  }
  if (stage === 'final') {
    return 'Final · Best of 3';
  }

  if (stage === 'semi_final') {
    return 'Semi Final · Best of 1 to 25';
  }

  if (stage === 'third_place') {
    return '3rd Place · Best of 1 to 21';
  }

  if (stage === 'quarter_final') {
    return 'Quarterfinal · Best of 1 to 21';
  }

  return 'Knockout · Best of 1';
}

export function normalizeStage(stage?: string | null): string {
  return (stage || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function formatTournamentTime(value?: string | null): string {
  if (!value) {
    return 'Time TBD';
  }

  const timeMatch = value.match(/T(\d{2}):(\d{2})/);
  if (!timeMatch) {
    return 'Time TBD';
  }

  const hour24 = Number(timeMatch[1]);
  const minute = timeMatch[2];

  if (Number.isNaN(hour24) || hour24 < 0 || hour24 > 23) {
    return 'Time TBD';
  }

  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${minute} ${suffix}`;
}

export function formatMatchTime(value?: string | null): string {
  return formatTournamentTime(value);
}
