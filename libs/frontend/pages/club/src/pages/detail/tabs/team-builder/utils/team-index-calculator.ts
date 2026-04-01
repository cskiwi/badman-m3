import { TeamBuilderConfig, TeamBuilderPlayer, TeamBuilderTeam, DEFAULT_TEAM_BUILDER_CONFIG } from '../types/team-builder.types';

/**
 * Extract ranking values from a player's rankingLastPlaces relation.
 */
export function getPlayerRanking(player: TeamBuilderPlayer): { single: number; double: number; mix: number } {
  const ranking = player.rankingLastPlaces?.[0];
  return {
    single: ranking?.single ?? 0,
    double: ranking?.double ?? 0,
    mix: ranking?.mix ?? 0,
  };
}

/**
 * Calculate the team index (base index) for a team.
 *
 * Rules:
 * - Only REGULAR members count (not BACKUP)
 * - Take the 4 best players (lowest contribution = strongest)
 * - M/F subevents: sum of (single + double) per player
 * - MX subevents: sum of (single + double + mix) per player
 */
export function calculateTeamIndex(players: TeamBuilderPlayer[], teamType: 'M' | 'F' | 'MX'): number {
  const regularPlayers = players.filter((p) => p.membershipType === 'REGULAR');

  if (regularPlayers.length === 0) return 0;

  if (teamType === 'MX') {
    // MX: top 2 males + top 2 females (sorted by contribution ascending = strongest first)
    const males = regularPlayers
      .filter((p) => p.gender === 'M')
      .map((p) => getPlayerContribution(p, teamType))
      .sort((a, b) => a - b)
      .slice(0, 2);
    const females = regularPlayers
      .filter((p) => p.gender === 'F')
      .map((p) => getPlayerContribution(p, teamType))
      .sort((a, b) => a - b)
      .slice(0, 2);
    return [...males, ...females].reduce((sum, c) => sum + c, 0);
  }

  const contributions = regularPlayers
    .map((p) => getPlayerContribution(p, teamType))
    .sort((a, b) => a - b); // ascending: strongest (lowest numbers) first

  // Take the 4 best (strongest) players
  const base = contributions.slice(0, 4);

  return base.reduce((sum, c) => sum + c, 0);
}

export function getPlayerContribution(player: TeamBuilderPlayer, teamType: 'M' | 'F' | 'MX'): number {
  const { single, double, mix } = getPlayerRanking(player);
  if (teamType === 'MX') {
    return single + double + mix;
  }
  return single + double;
}

/**
 * Validate a team's composition against competition rules.
 * Returns an array of error messages (empty = valid).
 */
export function validateTeam(team: TeamBuilderTeam, config: TeamBuilderConfig = DEFAULT_TEAM_BUILDER_CONFIG): string[] {
  const errors: string[] = [];
  const regularPlayers = team.players.filter((p) => p.membershipType === 'REGULAR');

  // Minimum player count
  if (regularPlayers.length < config.minPlayersPerTeam) {
    errors.push(`Need at least ${config.minPlayersPerTeam} regular players, have ${regularPlayers.length}`);
  }

  // MX gender minimum checks
  if (team.type === 'MX') {
    const maleCount = regularPlayers.filter((p) => p.gender === 'M').length;
    const femaleCount = regularPlayers.filter((p) => p.gender === 'F').length;
    if (maleCount < config.minMalesPerMxTeam) {
      errors.push(`Need at least ${config.minMalesPerMxTeam} male regular player(s), have ${maleCount}`);
    }
    if (femaleCount < config.minFemalesPerMxTeam) {
      errors.push(`Need at least ${config.minFemalesPerMxTeam} female regular player(s), have ${femaleCount}`);
    }
  }

  // Maximum player count (regular + backup)
  if (team.players.length > config.maxPlayersPerTeam) {
    errors.push(`Maximum ${config.maxPlayersPerTeam} players allowed, have ${team.players.length}`);
  }

  const minAllowedIndex = team.selectedSubEvent?.minBaseIndex;
  const maxAllowedIndex = team.selectedSubEvent?.maxBaseIndex;

  if (minAllowedIndex != null && team.teamIndex < minAllowedIndex) {
    errors.push(`Team index ${team.teamIndex} is below minimum ${minAllowedIndex}`);
  }

  // Team index check
  if (maxAllowedIndex != null && team.teamIndex > maxAllowedIndex) {
    errors.push(`Team index ${team.teamIndex} exceeds maximum ${maxAllowedIndex}`);
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

  // Min level check: warn if player is too strong for the subevent
  // (lower number = stronger, minLevel is the ceiling for how strong a player can be)
  const minLevel = team.selectedSubEvent?.level;
  if (minLevel != null) {
    const playersTooStrong = regularPlayers.filter((p) => {
      const { single } = getPlayerRanking(p);
      return single < minLevel && single > 0;
    });
    if (playersTooStrong.length > 0) {
      errors.push(
        `${playersTooStrong.length} player(s) may be too strong for level ${minLevel}: ${playersTooStrong.map((p) => p.fullName).join(', ')}`,
      );
    }
  }

  return errors;
}

/**
 * Recalculate team index, per-player warnings, and validation for a team (mutates in place).
 */
export function recalculateTeam(team: TeamBuilderTeam, config: TeamBuilderConfig = DEFAULT_TEAM_BUILDER_CONFIG): TeamBuilderTeam {
  team.teamIndex = calculateTeamIndex(team.players, team.type);

  // Set per-player level warnings
  const levelThreshold = team.selectedSubEvent?.level;
  for (const player of team.players) {
    player.levelWarning = undefined;
    if (player.membershipType !== 'REGULAR') continue;

    const { single, double } = getPlayerRanking(player);
    if (levelThreshold != null && (single < levelThreshold || double < levelThreshold)) {
      player.levelWarning = `Level too high for this subevent (max: ${levelThreshold})`;
    }
  }

  team.validationErrors = validateTeam(team, config);
  team.isValid = team.validationErrors.length === 0;
  return team;
}
