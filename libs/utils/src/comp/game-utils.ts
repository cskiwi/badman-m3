import { GameType } from '@app/models-enum';

interface GameLike {
  set1Team1?: number | null;
  set1Team2?: number | null;
  set2Team1?: number | null;
  set2Team2?: number | null;
  set3Team1?: number | null;
  set3Team2?: number | null;
  winner?: number | null;
  playedAt?: Date | null;
  gamePlayerMemberships?: MembershipLike[];
}

interface MembershipLike {
  team?: number | null;
  single?: number | null;
  double?: number | null;
  mix?: number | null;
}

export function getSetScores(game: GameLike): { team1Sets: number[]; team2Sets: number[] } {
  const team1Sets: number[] = [];
  const team2Sets: number[] = [];

  if (game.set1Team1 !== null && game.set1Team1 !== undefined && game.set1Team2 !== null && game.set1Team2 !== undefined) {
    team1Sets.push(game.set1Team1);
    team2Sets.push(game.set1Team2);
  }
  if (game.set2Team1 !== null && game.set2Team1 !== undefined && game.set2Team2 !== null && game.set2Team2 !== undefined) {
    team1Sets.push(game.set2Team1);
    team2Sets.push(game.set2Team2);
  }
  if (game.set3Team1 !== null && game.set3Team1 !== undefined && game.set3Team2 !== null && game.set3Team2 !== undefined) {
    team1Sets.push(game.set3Team1);
    team2Sets.push(game.set3Team2);
  }

  return { team1Sets, team2Sets };
}

export function isBye(game: GameLike): boolean {
  const isScorelessBye =
    game.set1Team1 === null &&
    game.set1Team2 === null &&
    game.set2Team1 === null &&
    game.set2Team2 === null &&
    game.set3Team1 === null &&
    game.set3Team2 === null;

  const isPastGame = game.playedAt ? new Date(game.playedAt) < new Date() : false;

  return isScorelessBye && isPastGame;
}

export function getGameTeamMemberships<T extends MembershipLike>(game: { gamePlayerMemberships?: T[] }, teamNumber: 1 | 2): T[] {
  const memberships = game.gamePlayerMemberships || [];
  return memberships.filter((m) => m.team === teamNumber);
}

export function getWinnerIndicator(game: GameLike, teamIndex: number): boolean {
  return game.winner !== null && game.winner !== undefined && game.winner !== 0 && game.winner === teamIndex + 1;
}

export function getPlayerLevel(membership: MembershipLike, gameType?: GameType | string): number | null {
  if (!gameType) return null;

  switch (gameType) {
    case GameType.S:
      return membership.single || null;
    case GameType.D:
      return membership.double || null;
    case GameType.MX:
      return membership.mix || null;
    default:
      return null;
  }
}
