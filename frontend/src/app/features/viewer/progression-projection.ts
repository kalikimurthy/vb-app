import { Group, GroupTeam, Standing, Team } from '../../core/models';

export type PublicBracketKey = 'premier' | 'star';

export interface ProgressionRule {
  key: PublicBracketKey;
  name: string;
  qualifyingRanks: number[];
  description: string;
  bracketSize: number;
  matchupPattern: number[][];
  semifinalPattern: { label: string; sourceMatchups: number[] }[];
  projectionStrategy: 'better-seed';
  matchFormat: {
    sets: number;
    label: string;
  };
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
  projectedWinner?: SeededProjectionTeam;
}

export interface ProjectedRoundMatch {
  label: string;
  matchupLabel?: string;
  top?: SeededProjectionTeam;
  bottom?: SeededProjectionTeam;
  projectedWinner?: SeededProjectionTeam;
}

export interface ProjectedBracketRounds {
  quarterfinals: ProjectedRoundMatch[];
  semifinals: ProjectedRoundMatch[];
  final?: ProjectedRoundMatch;
  champion?: SeededProjectionTeam;
}

export interface BracketProjection {
  rule: ProgressionRule;
  seeds: SeededProjectionTeam[];
  matchups: ProjectedMatchup[];
  projectedRounds: ProjectedBracketRounds;
  isComplete: boolean;
}

export interface ProgressionProjection {
  brackets: Record<PublicBracketKey, BracketProjection>;
  eliminated: SeededProjectionTeam[];
}

export const PUBLIC_PROGRESSION_CONFIG = {
  // Future dynamic rules/PDF parsing can hydrate this shape from admin-created format data.
  brackets: [
    {
      key: 'premier',
      name: 'Premier',
      qualifyingRanks: [1, 2],
      description: '1st-2nd from each group',
      bracketSize: 8,
      matchupPattern: [
        [1, 8],
        [2, 7],
        [3, 6],
        [4, 5],
      ],
      semifinalPattern: [
        { label: 'SF1', sourceMatchups: [0, 3] },
        { label: 'SF2', sourceMatchups: [1, 2] },
      ],
      projectionStrategy: 'better-seed',
      matchFormat: {
        sets: 1,
        label: 'Projected single-match knockout',
      },
    },
    {
      key: 'star',
      name: 'Star',
      qualifyingRanks: [3, 4],
      description: '3rd-4th from each group',
      bracketSize: 8,
      matchupPattern: [
        [1, 8],
        [2, 7],
        [3, 6],
        [4, 5],
      ],
      semifinalPattern: [
        { label: 'SF1', sourceMatchups: [0, 3] },
        { label: 'SF2', sourceMatchups: [1, 2] },
      ],
      projectionStrategy: 'better-seed',
      matchFormat: {
        sets: 1,
        label: 'Projected single-match knockout',
      },
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
        allRankedTeams.filter((team) => rule.qualifyingRanks.includes(team.groupRank)),
        rule
      );
      const matchups = buildMatchups(seeds, rule);

      accumulator[rule.key] = {
        rule,
        seeds,
        matchups,
        projectedRounds: buildProjectedRounds(matchups, rule),
        isComplete: seeds.length >= rule.bracketSize,
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

function seedBracket(teams: SeededProjectionTeam[], rule: ProgressionRule): SeededProjectionTeam[] {
  return teams
    .sort(compareSeedCandidates)
    .slice(0, rule.bracketSize)
    .map((team, index) => ({ ...team, seed: index + 1 }));
}

function buildMatchups(seeds: SeededProjectionTeam[], rule: ProgressionRule): ProjectedMatchup[] {
  return rule.matchupPattern.map(([topSeed, bottomSeed]) => {
    const top = seeds.find((team) => team.seed === topSeed);
    const bottom = seeds.find((team) => team.seed === bottomSeed);

    return {
      label: `${topSeed} vs ${bottomSeed}`,
      top,
      bottom,
      projectedWinner: projectWinner(top, bottom),
    };
  });
}

export function buildProjectedRounds(
  matchups: ProjectedMatchup[],
  rule: ProgressionRule
): ProjectedBracketRounds {
  const quarterfinals = matchups.map((matchup, index) => ({
    label: `QF${index + 1}`,
    matchupLabel: matchup.label,
    top: matchup.top,
    bottom: matchup.bottom,
    projectedWinner: matchup.projectedWinner,
  }));

  const semifinals = rule.semifinalPattern.map((semifinal) => {
    const top = quarterfinals[semifinal.sourceMatchups[0]]?.projectedWinner;
    const bottom = quarterfinals[semifinal.sourceMatchups[1]]?.projectedWinner;

    return {
      label: semifinal.label,
      top,
      bottom,
      projectedWinner: projectWinner(top, bottom),
    };
  });

  const final = {
    label: 'Final',
    top: semifinals[0]?.projectedWinner,
    bottom: semifinals[1]?.projectedWinner,
    projectedWinner: projectWinner(semifinals[0]?.projectedWinner, semifinals[1]?.projectedWinner),
  };

  return {
    quarterfinals,
    semifinals,
    final,
    champion: final.projectedWinner,
  };
}

export function getBetterSeed(
  teamA?: SeededProjectionTeam,
  teamB?: SeededProjectionTeam
): SeededProjectionTeam | undefined {
  if (!teamA) {
    return teamB;
  }

  if (!teamB) {
    return teamA;
  }

  return (teamA.seed ?? Number.MAX_SAFE_INTEGER) < (teamB.seed ?? Number.MAX_SAFE_INTEGER) ? teamA : teamB;
}

export function projectWinner(
  teamA?: SeededProjectionTeam,
  teamB?: SeededProjectionTeam
): SeededProjectionTeam | undefined {
  return getBetterSeed(teamA, teamB);
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
