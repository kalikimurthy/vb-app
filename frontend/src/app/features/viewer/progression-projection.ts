import { Group, GroupTeam, Standing, Team } from '../../core/models';

export type PublicBracketKey = 'champions' | 'premier';

export interface MatchFormatMetadata {
  label: string;
  quarterFinal: string;
  semifinal: string;
  thirdPlace: string;
  final: string;
}

export interface ProgressionRule {
  key: PublicBracketKey;
  name: string;
  qualifyingRankRange: [number, number];
  description: string;
  bracketSize: number;
  matchupPattern: number[][];
  semifinalPattern: { label: string; sourceMatchups: number[] }[];
  thirdPlaceEnabled: boolean;
  projectionStrategy: 'better-seed';
  matchFormat: MatchFormatMetadata;
}

export interface SeededProjectionTeam {
  seed?: number;
  teamId: number;
  teamName: string;
  groupId?: number;
  groupName: string;
  overallRank: number;
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
  projectedLoser?: SeededProjectionTeam;
}

export interface ProjectedRoundMatch {
  label: string;
  matchupLabel?: string;
  top?: SeededProjectionTeam;
  bottom?: SeededProjectionTeam;
  projectedWinner?: SeededProjectionTeam;
  projectedLoser?: SeededProjectionTeam;
}

export interface ProjectedBracketRounds {
  quarterfinals: ProjectedRoundMatch[];
  semifinals: ProjectedRoundMatch[];
  thirdPlace?: ProjectedRoundMatch;
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
  // Future admin format editing or rules/PDF parsing can hydrate this object instead of changing templates.
  brackets: [
    {
      key: 'champions',
      name: 'Champions League',
      qualifyingRankRange: [1, 8],
      description: 'Overall pool-stage ranks 1-8',
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
      thirdPlaceEnabled: true,
      projectionStrategy: 'better-seed',
      matchFormat: {
        label: 'Official projected knockout path',
        quarterFinal: 'Quarter Final: 1 set, 21-point hard stop',
        semifinal: 'Semi Finals: 1 set, 25-point hard stop',
        thirdPlace: '3rd Place: 1 set, 21-point hard stop',
        final: 'Finals: best of 3 sets; sets 1-2 to 21 with 25-point hard stop, set 3 to 15. Captains may choose one set to 25.',
      },
    },
    {
      key: 'premier',
      name: 'Premier League',
      qualifyingRankRange: [9, 16],
      description: 'Overall pool-stage ranks 9-16',
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
      thirdPlaceEnabled: true,
      projectionStrategy: 'better-seed',
      matchFormat: {
        label: 'Official projected knockout path',
        quarterFinal: 'Quarter Final: 1 set, 21-point hard stop',
        semifinal: 'Semi Finals: 1 set, 25-point hard stop',
        thirdPlace: '3rd Place: 1 set, 21-point hard stop',
        final: 'Finals: best of 3 sets; sets 1-2 to 21 with 25-point hard stop, set 3 to 15. Captains may choose one set to 25.',
      },
    },
  ] satisfies ProgressionRule[],
  eliminatedRankRange: [17, 20] as [number, number],
};

export function buildProgressionProjection(
  standings: Standing[],
  teams: Team[],
  groups: Group[],
  groupTeams: GroupTeam[]
): ProgressionProjection {
  const allRankedTeams = buildOverallRankedTeams(standings, teams, groups, groupTeams);

  const brackets = PUBLIC_PROGRESSION_CONFIG.brackets.reduce(
    (accumulator, rule) => {
      const seeds = seedBracket(
        allRankedTeams.filter((team) => isRankInRange(team.overallRank, rule.qualifyingRankRange)),
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
    eliminated: allRankedTeams.filter((team) =>
      isRankInRange(team.overallRank, PUBLIC_PROGRESSION_CONFIG.eliminatedRankRange)
    ),
  };
}

function buildOverallRankedTeams(
  standings: Standing[],
  teams: Team[],
  groups: Group[],
  groupTeams: GroupTeam[]
): SeededProjectionTeam[] {
  const teamsById = new Map(teams.filter((team) => team.id).map((team) => [team.id as number, team]));
  const groupsById = new Map(groups.filter((group) => group.id).map((group) => [group.id as number, group]));
  const groupNameByTeamId = new Map<number, { groupId?: number; groupName: string }>();

  groupTeams.forEach((link) => {
    const group = groupsById.get(link.group);
    if (group) {
      groupNameByTeamId.set(link.team, { groupId: group.id, groupName: group.name });
    }
  });

  return standings
    .filter((standing) => !standing.pool_type)
    .sort(compareStandingRows)
    .map((standing, index) => {
      const team = teamsById.get(standing.team);
      const groupInfo = groupNameByTeamId.get(standing.team);

      return {
        teamId: standing.team,
        teamName: standing.team_name || team?.name || `Team ${standing.team}`,
        groupId: groupInfo?.groupId,
        groupName: groupInfo?.groupName || 'Pool TBD',
        overallRank: standing.rank || index + 1,
        wins: standing.wins,
        losses: standing.losses,
        pointsFor: standing.points_scored,
        pointsAgainst: standing.points_given,
        pointDifferential: standing.points_scored - standing.points_given,
        rating: Number(standing.net_run_rate ?? 0),
      };
    })
    .sort(compareOverallRankCandidates);
}

function seedBracket(teams: SeededProjectionTeam[], rule: ProgressionRule): SeededProjectionTeam[] {
  return teams
    .sort(compareOverallRankCandidates)
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
      projectedLoser: projectLoser(top, bottom),
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
    projectedLoser: matchup.projectedLoser,
  }));

  const semifinals = rule.semifinalPattern.map((semifinal) => {
    const top = quarterfinals[semifinal.sourceMatchups[0]]?.projectedWinner;
    const bottom = quarterfinals[semifinal.sourceMatchups[1]]?.projectedWinner;

    return {
      label: semifinal.label,
      top,
      bottom,
      projectedWinner: projectWinner(top, bottom),
      projectedLoser: projectLoser(top, bottom),
    };
  });

  const thirdPlace = rule.thirdPlaceEnabled
    ? {
        label: '3rd Place',
        top: semifinals[0]?.projectedLoser,
        bottom: semifinals[1]?.projectedLoser,
        projectedWinner: projectWinner(semifinals[0]?.projectedLoser, semifinals[1]?.projectedLoser),
        projectedLoser: projectLoser(semifinals[0]?.projectedLoser, semifinals[1]?.projectedLoser),
      }
    : undefined;

  const final = {
    label: 'Final',
    top: semifinals[0]?.projectedWinner,
    bottom: semifinals[1]?.projectedWinner,
    projectedWinner: projectWinner(semifinals[0]?.projectedWinner, semifinals[1]?.projectedWinner),
    projectedLoser: projectLoser(semifinals[0]?.projectedWinner, semifinals[1]?.projectedWinner),
  };

  return {
    quarterfinals,
    semifinals,
    thirdPlace,
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

export function projectLoser(
  teamA?: SeededProjectionTeam,
  teamB?: SeededProjectionTeam
): SeededProjectionTeam | undefined {
  const winner = projectWinner(teamA, teamB);
  if (!winner) {
    return undefined;
  }

  return winner.teamId === teamA?.teamId ? teamB : teamA;
}

function isRankInRange(rank: number, range: [number, number]): boolean {
  return rank >= range[0] && rank <= range[1];
}

function compareStandingRows(a: Standing, b: Standing): number {
  return a.rank - b.rank;
}

function compareOverallRankCandidates(a: SeededProjectionTeam, b: SeededProjectionTeam): number {
  return a.overallRank - b.overallRank || comparePerformance(a, b);
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
