import { TeamBuilderPlayer, TeamBuilderTeam } from '../types/team-builder.types';

/**
 * Calculate the team index (base index) for a team.
 *
 * Rules:
 * - Only REGULAR members count (not BACKUP)
 * - Take the 4 players with the highest contribution (weakest = highest level numbers)
 * - M/F subevents: sum of (single + double) per player
 * - MX subevents: sum of (single + double + mix) per player
 */
export function calculateTeamIndex(players: TeamBuilderPlayer[], teamType: 'M' | 'F' | 'MX'): number {
  const regularPlayers = players.filter((p) => p.membershipType === 'REGULAR');

  if (regularPlayers.length === 0) return 0;

  const contributions = regularPlayers
    .map((p) => getPlayerContribution(p, teamType))
    .sort((a, b) => b - a); // descending: weakest (highest numbers) first

  // Take the 4 weakest players
  const base = contributions.slice(0, 4);

  return base.reduce((sum, c) => sum + c, 0);
}

export function getPlayerContribution(player: TeamBuilderPlayer, teamType: 'M' | 'F' | 'MX'): number {
  if (teamType === 'MX') {
    return (player.single ?? 0) + (player.double ?? 0) + (player.mix ?? 0);
  }
  return (player.single ?? 0) + (player.double ?? 0);
}

/**
 * Validate a team's composition against competition rules.
 * Returns an array of error messages (empty = valid).
 */
export function validateTeam(team: TeamBuilderTeam): string[] {
  const errors: string[] = [];
  const regularPlayers = team.players.filter((p) => p.membershipType === 'REGULAR');

  // Minimum player count
  if (regularPlayers.length < 4) {
    errors.push(`Need at least 4 regular players, have ${regularPlayers.length}`);
  }

  // Team index check
  if (team.maxAllowedIndex != null && team.teamIndex > team.maxAllowedIndex) {
    errors.push(`Team index ${team.teamIndex} exceeds maximum ${team.maxAllowedIndex}`);
  }

  // Gender constraints
  if (team.type === 'M') {
    const wrongGender = regularPlayers.filter((p) => p.gender === 'F');
    if (wrongGender.length > 0) {
      errors.push(`${wrongGender.length} female player(s) in a men's team`);
    }
  } else if (team.type === 'F') {
    const wrongGender = regularPlayers.filter((p) => p.gender === 'M');
    if (wrongGender.length > 0) {
      errors.push(`${wrongGender.length} male player(s) in a women's team`);
    }
  }

  // Max level check: warn if player level number exceeds subevent maxLevel
  // (higher number = weaker player, so exceeding maxLevel means too weak for this level)
  if (team.maxLevel != null) {
    const playersBeyondMax = regularPlayers.filter(
      (p) => p.single > team.maxLevel! || p.double > team.maxLevel!,
    );
    if (playersBeyondMax.length > 0) {
      errors.push(
        `${playersBeyondMax.length} player(s) exceed max level ${team.maxLevel}: ${playersBeyondMax.map((p) => p.fullName).join(', ')}`,
      );
    }
  }

  // Min level check: warn if player is too strong for the subevent
  // (lower number = stronger, minLevel is the ceiling for how strong a player can be)
  if (team.minLevel != null) {
    const playersTooStrong = regularPlayers.filter(
      (p) => p.single < team.minLevel! && p.single > 0,
    );
    if (playersTooStrong.length > 0) {
      errors.push(
        `${playersTooStrong.length} player(s) may be too strong for level ${team.minLevel}: ${playersTooStrong.map((p) => p.fullName).join(', ')}`,
      );
    }
  }

  return errors;
}

/**
 * Recalculate team index, per-player warnings, and validation for a team (mutates in place).
 */
export function recalculateTeam(team: TeamBuilderTeam): TeamBuilderTeam {
  team.teamIndex = calculateTeamIndex(team.players, team.type);

  // Set per-player level warnings
  for (const player of team.players) {
    player.levelWarning = undefined;
    if (player.membershipType !== 'REGULAR') continue;

    if (team.maxLevel != null && (player.single > team.maxLevel || player.double > team.maxLevel)) {
      player.levelWarning = `Level too high for this subevent (max: ${team.maxLevel})`;
    } else if (team.minLevel != null && player.single > 0 && player.single < team.minLevel) {
      player.levelWarning = `May be too strong for level ${team.minLevel}`;
    }
  }

  team.validationErrors = validateTeam(team);
  team.isValid = team.validationErrors.length === 0;
  return team;
}
