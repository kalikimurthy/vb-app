import { Group, GroupTeam, Standing, Team } from '../../core/models';

export type PublicBracketKey = 'premier' | 'star';

export interface ProgressionRule {
  key: PublicBracketKey;
  name: string;
  qualifyingRanks: number[];
  description: string;
}

export interface SeededProjectionTeam {
  seed?: number;
  teamId: number;
  teamName: string;
  groupId?: number;
  groupName: string;
  groupRank: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  rating: number;
}

export interface ProjectedMatchup {
  label: string;
  top?: SeededProjectionTeam;
  bottom?: SeededProjectionTeam;
}

export interface BracketProjection {
  rule: ProgressionRule;
  seeds: SeededProjectionTeam[];
  matchups: ProjectedMatchup[];
  isComplete: boolean;
}

export interface ProgressionProjection {
  brackets: Record<PublicBracketKey, BracketProjection>;
  eliminated: SeededProjectionTeam[];
}

export const PUBLIC_PROGRESSION_CONFIG = {
  bracketSize: 8,
  matchupPattern: [
    [1, 8],
    [2, 7],
    [3, 6],
    [4, 5],
  ],
  brackets: [
    {
      key: 'premier',
      name: 'Premier',
      qualifyingRanks: [1, 2],
      description: '1st-2nd from each group',
    },
    {
      key: 'star',
      name: 'Star',
      qualifyingRanks: [3, 4],
      description: '3rd-4th from each group',
    },
  ] satisfies ProgressionRule[],
  eliminatedRank: 5,
};

export function buildProgressionProjection(
  standings: Standing[],
  teams: Team[],
  groups: Group[],
  groupTeams: GroupTeam[]
): ProgressionProjection {
  const groupRankedTeams = buildGroupRankedTeams(standings, teams, groups, groupTeams);
  const allRankedTeams = Object.values(groupRankedTeams).flat();

  const brackets = PUBLIC_PROGRESSION_CONFIG.brackets.reduce(
    (accumulator, rule) => {
      const seeds = seedBracket(
        allRankedTeams.filter((team) => rule.qualifyingRanks.includes(team.groupRank))
      );

      accumulator[rule.key] = {
        rule,
        seeds,
        matchups: buildMatchups(seeds),
        isComplete: seeds.length >= PUBLIC_PROGRESSION_CONFIG.bracketSize,
      };

      return accumulator;
    },
    {} as Record<PublicBracketKey, BracketProjection>
  );

  return {
    brackets,
    eliminated: allRankedTeams
      .filter((team) => team.groupRank === PUBLIC_PROGRESSION_CONFIG.eliminatedRank)
      .sort(compareSeedCandidates),
  };
}

function buildGroupRankedTeams(
  standings: Standing[],
  teams: Team[],
  groups: Group[],
  groupTeams: GroupTeam[]
): Record<number, SeededProjectionTeam[]> {
  const standingsByTeam = new Map<number, Standing>();
  const teamsById = new Map(teams.filter((team) => team.id).map((team) => [team.id as number, team]));
  const groupsById = new Map(groups.filter((group) => group.id).map((group) => [group.id as number, group]));

  standings.forEach((standing) => {
    const existing = standingsByTeam.get(standing.team);
    if (!existing || (!standing.pool_type && existing.pool_type)) {
      standingsByTeam.set(standing.team, standing);
    }
  });

  return groups.reduce((accumulator, group) => {
    if (!group.id) {
      return accumulator;
    }

    const groupId = group.id;
    const rankedTeams = groupTeams
      .filter((link) => link.group === groupId)
      .map((link) => {
        const standing = standingsByTeam.get(link.team);
        const team = teamsById.get(link.team);

        if (!standing || !team?.id) {
          return undefined;
        }

        return toProjectionTeam(standing, team, groupId, groupsById.get(groupId)?.name ?? group.name);
      })
      .filter((team): team is SeededProjectionTeam => Boolean(team))
      .sort(compareGroupRankCandidates)
      .map((team, index) => ({ ...team, groupRank: index + 1 }));

    accumulator[groupId] = rankedTeams;
    return accumulator;
  }, {} as Record<number, SeededProjectionTeam[]>);
}

function toProjectionTeam(
  standing: Standing,
  team: Team,
  groupId: number,
  groupName: string
): SeededProjectionTeam {
  return {
    teamId: team.id as number,
    teamName: standing.team_name || team.name,
    groupId,
    groupName,
    groupRank: standing.rank,
    wins: standing.wins,
    losses: standing.losses,
    pointsFor: standing.points_scored,
    pointsAgainst: standing.points_given,
    pointDifferential: standing.points_scored - standing.points_given,
    rating: Number(standing.net_run_rate ?? 0),
  };
}

function seedBracket(teams: SeededProjectionTeam[]): SeededProjectionTeam[] {
  return teams
    .sort(compareSeedCandidates)
    .slice(0, PUBLIC_PROGRESSION_CONFIG.bracketSize)
    .map((team, index) => ({ ...team, seed: index + 1 }));
}

function buildMatchups(seeds: SeededProjectionTeam[]): ProjectedMatchup[] {
  return PUBLIC_PROGRESSION_CONFIG.matchupPattern.map(([topSeed, bottomSeed]) => ({
    label: `${topSeed} vs ${bottomSeed}`,
    top: seeds.find((team) => team.seed === topSeed),
    bottom: seeds.find((team) => team.seed === bottomSeed),
  }));
}

function compareGroupRankCandidates(a: SeededProjectionTeam, b: SeededProjectionTeam): number {
  return comparePerformance(a, b);
}

function compareSeedCandidates(a: SeededProjectionTeam, b: SeededProjectionTeam): number {
  return a.groupRank - b.groupRank || comparePerformance(a, b);
}

function comparePerformance(a: SeededProjectionTeam, b: SeededProjectionTeam): number {
  return (
    b.wins - a.wins ||
    b.rating - a.rating ||
    b.pointDifferential - a.pointDifferential ||
    b.pointsFor - a.pointsFor ||
    a.pointsAgainst - b.pointsAgainst ||
    a.teamName.localeCompare(b.teamName)
  );
}
