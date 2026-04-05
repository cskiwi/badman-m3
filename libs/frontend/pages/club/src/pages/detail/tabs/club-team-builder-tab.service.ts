import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { Club, CompetitionSubEvent, Entry, Player, Team } from '@app/models';
import { LevelType, UseForTeamName } from '@app/models-enum';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { sortTeams } from '@app/utils/sorts';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import {
  TEAM_BUILDER_AUTO_SUB_EVENT,
  TeamBuilderConfig,
  TeamBuilderPlayer,
  TeamBuilderStandingOutcome,
  TeamBuilderTeam,
  DEFAULT_TEAM_BUILDER_CONFIG,
} from './team-builder/types/team-builder.types';
import { SurveyResponse } from './team-builder/types/survey-response';
import { MatchResult } from './team-builder/services/player-matcher.service';
import { calculateTeamIndex, recalculateTeam } from './team-builder/utils/team-index-calculator';
import { evaluatePerformance, EncounterStats } from './team-builder/utils/performance-flags';

const TEAM_BUILDER_DATA_QUERY = gql`
  query TeamBuilderData($clubId: ID!, $season: Float!, $rankingLastPlacesArgs: RankingLastPlaceArgs) {
    club(id: $clubId) {
      id
      name
      teamName
      fullName
      abbreviation
      useForTeamName
      state
      clubPlayerMemberships {
        id
        active
        player {
          id
          slug
          fullName
          firstName
          lastName
          gender
          memberId
          rankingLastPlaces(args: $rankingLastPlacesArgs) {
            id
            single
            double
            mix
            systemId
          }
        }
      }
      teams(args: { where: [{ season: { eq: $season } }], take: 50, order: { name: ASC } }) {
        id
        name
        season
        link
        type
        abbreviation
        teamNumber
        preferredDay
        preferredTime
        captainId
        captain {
          id
          fullName
        }
        teamPlayerMemberships {
          id
          membershipType
          playerId
          player {
            id
            slug
            fullName
            firstName
            lastName
            gender
            memberId
            rankingLastPlaces(args: $rankingLastPlacesArgs) {
              id
              single
              double
              mix
              systemId
            }
          }
        }
        entries {
          id
          meta {
            competition {
              teamIndex
            }
          }
          standing {
            position
            size
            riser
            faller
          }
          competitionDraw {
            id
            size
            risers
            fallers
          }
          competitionSubEvents {
            id
            name
            level
            maxLevel
            minBaseIndex
            maxBaseIndex
            eventType
            competitionEvent {
              id
              type
              state
            }
          }
        }
      }
    }
  }
`;

const NEXT_SEASON_TEAMS_QUERY = gql`
  query NextSeasonTeams($clubId: ID!, $season: Float!) {
    club(id: $clubId) {
      id
      teams(args: { where: [{ season: { eq: $season } }], take: 50, order: { name: ASC } }) {
        id
        name
        season
        type
        teamNumber
        preferredDay
        captainId
        link
        teamPlayerMemberships {
          id
          membershipType
          playerId
          player {
            id
            slug
            fullName
            firstName
            lastName
            gender
            memberId
            rankingLastPlaces {
              id
              single
              double
              mix
              systemId
            }
          }
        }
      }
    }
  }
`;

const AVAILABLE_SUB_EVENTS_QUERY = gql`
  query AvailableCompetitionSubEvents($season: Float!) {
    competitionEvents(args: { where: [{ season: { eq: $season }, official: { eq: true } }] }) {
      id
      type
      state
      competitionSubEvents {
        id
        name
        level
        maxLevel
        minBaseIndex
        maxBaseIndex
        eventType
      }
    }
  }
`;

const SAVE_TEAM_BUILDER = gql`
  mutation SaveTeamBuilder($clubId: ID!, $season: Float!, $teams: [TeamBuilderTeamInput!]!) {
    saveTeamBuilder(clubId: $clubId, season: $season, teams: $teams)
  }
`;

const CREATE_PLAYERS_FOR_TEAM_BUILDER = gql`
  mutation CreatePlayersForTeamBuilder($clubId: ID!, $players: [CreatePlayerForTeamBuilderInput!]!) {
    createPlayersForTeamBuilder(clubId: $clubId, players: $players) {
      id
      fullName
      firstName
      lastName
      gender
      slug
    }
  }
`;

const PLAYER_WITH_RANKINGS_QUERY = gql`
  query TeamBuilderPlayerRankings($args: PlayerArgs, $rankingLastPlacesArgs: RankingLastPlaceArgs) {
    players(args: $args) {
      id
      fullName
      firstName
      lastName
      gender
      slug
      rankingLastPlaces(args: $rankingLastPlacesArgs) {
        id
        single
        double
        mix
      }
    }
  }
`;

const TEAM_PERFORMANCE_QUERY = gql`
  query TeamBuilderPerformance($encounterArgs: CompetitionEncounterArgs) {
    competitionEncounters(args: $encounterArgs) {
      id
      homeTeamId
      awayTeamId
      games {
        id
        winner
        gamePlayerMemberships {
          playerId
          team
        }
      }
    }
  }
`;

interface TeamBuilderQueryData {
  club: Club;
}

export class ClubTeamBuilderTabService {
  private readonly apollo = inject(Apollo);
  private readonly http = inject(HttpClient);
  private readonly rankingSystemService = inject(RankingSystemService);

  private clubId = signal<string | null>(null);
  private season = signal<number | null>(null);

  // Mutable builder state
  readonly teams = signal<TeamBuilderTeam[]>([]);
  readonly stoppingPlayers = signal<TeamBuilderPlayer[]>([]);
  readonly surveyResponses = signal<SurveyResponse[]>([]);
  readonly matchedImportPlayers = signal<Player[]>([]);
  readonly initialized = signal(false);
  readonly loadedFromDraft = signal(false);
  readonly performanceLoading = signal(false);

  // Configurable thresholds
  readonly config = signal<TeamBuilderConfig>({ ...DEFAULT_TEAM_BUILDER_CONFIG });

  // Manually added/removed players
  // slotAdjustments: negative = net removed slots, positive = extra slots added.
  // Pool formula: remainingSlots = max(0, desiredSlots + adjustment - regularTeamCount)
  readonly slotAdjustments = signal<Map<string, number>>(new Map());
  readonly removedPlayers = signal<TeamBuilderPlayer[]>([]);
  readonly manuallyAddedPlayers = signal<TeamBuilderPlayer[]>([]);

  // Sub-event info collected from current season entries for automatic selection and validation.
  private subEventsByType = signal<Map<string, CompetitionSubEvent[]>>(new Map());

  // All available sub-events from the season, keyed by `${LevelType}:${GenderType}` (e.g. "LIGA:M").
  // Used for cross-event transitions (Liga ↔ Prov ↔ National).
  private allSubEventsByKey = signal<Map<string, CompetitionSubEvent[]>>(new Map());

  // Tracks the parent event level type and state for each sub-event (by sub-event ID).
  private subEventContext = signal<Map<string, { levelType: LevelType; state?: string }>>(new Map());

  // Club state (province) for Prov sub-event matching.
  clubState = computed(() => this.dataResource.value()?.club?.state);

  // Data resource for current season teams
  private dataResource = resource({
    params: () => ({
      clubId: this.clubId(),
      season: this.season(),
      systemId: this.systemId(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || !params.season) return null;

      try {
        const result = await lastValueFrom(
          this.apollo.query<TeamBuilderQueryData>({
            query: TEAM_BUILDER_DATA_QUERY,
            variables: {
              clubId: params.clubId,
              season: params.season,
              rankingLastPlacesArgs: params.systemId ? { where: [{ systemId: { eq: params.systemId } }] } : undefined,
            },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );
        return result.data;
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Resource for existing next-season teams (draft)
  private nextSeasonResource = resource({
    params: () => ({
      clubId: this.clubId(),
      season: this.nextSeason(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || !params.season) return null;

      try {
        const result = await lastValueFrom(
          this.apollo.query<TeamBuilderQueryData>({
            query: NEXT_SEASON_TEAMS_QUERY,
            variables: { clubId: params.clubId, season: params.season },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );
        return result.data;
      } catch {
        return null;
      }
    },
  });

  // Resource for all available competition sub-events in the current season.
  // Used for cross-event transitions (Liga ↔ Prov ↔ National).
  private availableSubEventsResource = resource({
    params: () => ({
      season: this.season(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.season) return null;

      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            competitionEvents: {
              id: string;
              type: LevelType;
              state?: string;
              competitionSubEvents?: CompetitionSubEvent[];
            }[];
          }>({
            query: AVAILABLE_SUB_EVENTS_QUERY,
            variables: { season: params.season },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only',
          }),
        );
        return result.data?.competitionEvents ?? [];
      } catch {
        return [];
      }
    },
  });

  // Computed selectors
  currentTeams = computed(() => {
    const data = this.dataResource.value();
    if (!data?.club?.teams) return [];
    return [...data.club.teams].sort(sortTeams);
  });

  nextSeasonTeams = computed(() => {
    const data = this.nextSeasonResource.value();
    if (!data?.club?.teams) return [];
    return [...data.club.teams].sort(sortTeams);
  });

  loading = computed(() => this.dataResource.isLoading() || this.nextSeasonResource.isLoading());
  error = computed(() => this.dataResource.error()?.message || null);

  systemId = computed(() => this.rankingSystemService.systemId() ?? '');

  private clubTeamBaseName = computed(() => {
    const data = this.dataResource.value();
    if (!data?.club) return '';
    const club = data.club;
    switch (club.useForTeamName) {
      case UseForTeamName.TEAM_NAME:
        return club.teamName || club.name;
      case UseForTeamName.FULL_NAME:
        return club.fullName || club.name;
      case UseForTeamName.ABBREVIATION:
        return club.abbreviation || club.name;
      case UseForTeamName.NAME:
      default:
        return club.name;
    }
  });

  unassignedPlayers = computed(() => {
    const allTeams = this.teams();
    const activeTeams = allTeams.filter((t) => !t.isMarkedForRemoval);
    const stoppingIds = new Set(this.stoppingPlayers().map((p) => p.id));

    // Count how many active teams each player is a REGULAR in (backups don't count)
    const playerTeamCount = new Map<string, number>();
    for (const team of activeTeams) {
      for (const player of team.players) {
        if (player.membershipType === 'REGULAR') {
          playerTeamCount.set(player.id, (playerTeamCount.get(player.id) ?? 0) + 1);
        }
      }
    }

    const adjustments = this.slotAdjustments();
    const allPlayers = [...this.getAllPlayersFromData(), ...this.manuallyAddedPlayers()];
    // Deduplicate by ID (manually added player may overlap with data players)
    const seen = new Set<string>();
    const uniquePlayers: TeamBuilderPlayer[] = [];
    for (const p of allPlayers) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        uniquePlayers.push(p);
      }
    }

    const result: TeamBuilderPlayer[] = [];

    for (const p of uniquePlayers) {
      if (stoppingIds.has(p.id)) continue;

      const currentCount = playerTeamCount.get(p.id) ?? 0;
      const adjustment = adjustments.get(p.id) ?? 0;
      const desiredCount = p.survey?.desiredTeamCount;

      // If survey has a desired count, use it; otherwise default to 1 slot
      const baseSlots = desiredCount != null && desiredCount > 0 ? desiredCount : 1;
      const remainingSlots = Math.max(0, baseSlots + adjustment - currentCount);

      for (let i = 0; i < remainingSlots; i++) {
        result.push(p);
      }
    }

    return result;
  });

  validationSummary = computed(() => {
    const activeTeams = this.teams().filter((t) => !t.isMarkedForRemoval);
    const valid = activeTeams.filter((t) => t.isValid).length;
    const invalid = activeTeams.length - valid;
    const teamErrors = activeTeams.flatMap((t) => t.validationErrors.map((e) => `${t.name}: ${e}`));
    const crossTeamWarnings: string[] = [];

    // Count REGULAR assignments per player across active teams
    const playerTeamCount = new Map<string, { name: string; count: number; desired: number }>();
    for (const team of activeTeams) {
      for (const player of team.players) {
        if (player.membershipType !== 'REGULAR') continue;
        const existing = playerTeamCount.get(player.id);
        if (existing) {
          existing.count++;
        } else {
          playerTeamCount.set(player.id, {
            name: player.fullName,
            count: 1,
            desired: player.survey?.desiredTeamCount ?? 0,
          });
        }
      }
    }

    // Over-assigned: player is REGULAR in more teams than desired
    for (const [, info] of playerTeamCount) {
      if (info.desired > 0 && info.count > info.desired) {
        crossTeamWarnings.push(`${info.name}: wants ${info.desired} team(s), assigned to ${info.count}`);
      }
    }

    // Under-assigned: check every player with a survey desired count.
    // If they have zero remaining pool slots AND fewer regular assignments than desired, warn.
    // This does not rely on removedPlayers — it derives purely from the slot formula.
    const adjustments = this.slotAdjustments();
    const stoppingIds = new Set(this.stoppingPlayers().map((p) => p.id));
    const allKnownPlayers = [...this.getAllPlayersFromData(), ...this.manuallyAddedPlayers()];
    const seenIds = new Set<string>();

    for (const player of allKnownPlayers) {
      if (seenIds.has(player.id)) continue;
      seenIds.add(player.id);
      if (stoppingIds.has(player.id)) continue;

      const desired = Number(player.survey?.desiredTeamCount ?? 0);
      if (desired <= 0) continue;

      const adjustment = adjustments.get(player.id) ?? 0;
      const regularCount = playerTeamCount.get(player.id)?.count ?? 0;
      const available = Math.max(0, desired + adjustment - regularCount);

      if (regularCount > 0 && regularCount < desired) {
        crossTeamWarnings.push(`${player.fullName}: wants ${desired} team(s), only assigned to ${regularCount}`);
      }
    }

    return {
      valid,
      invalid,
      total: activeTeams.length,
      errors: [...teamErrors, ...crossTeamWarnings],
      warnings: crossTeamWarnings.length,
    };
  });

  nextSeason = computed(() => (this.season() ?? 0) + 1);

  sortedTeams = computed(() => {
    const teams = this.teams();
    return [...teams].sort((a, b) => {
      // Removed teams go last
      if (a.isMarkedForRemoval !== b.isMarkedForRemoval) {
        return a.isMarkedForRemoval ? 1 : -1;
      }
      return sortTeams(a, b);
    });
  });

  getClubPlayers(): Player[] {
    const data = this.dataResource.value();
    const memberships = data?.club?.clubPlayerMemberships ?? [];
    if (memberships.length === 0) return [];

    const playerMap = new Map<string, Player>();

    for (const membership of memberships) {
      if (membership.active === false || !membership.player) continue;

      const player = membership.player;
      if (!player?.id || playerMap.has(player.id)) continue;

      playerMap.set(player.id, player);
    }

    return Array.from(playerMap.values());
  }

  setClubId(clubId: string | null) {
    this.clubId.set(clubId);
  }

  setSeason(season: number | null) {
    this.season.set(season);
  }

  updateConfig(config: Partial<TeamBuilderConfig>) {
    this.config.update((c) => ({ ...c, ...config }));
    // Re-validate all teams with new config
    this.teams.set(this.teams().map((t) => this.recalculateManagedTeam(t)));
  }

  /**
   * Initialize the builder. If next-season teams exist, load those as draft.
   * Otherwise clone current-season teams.
   */
  initializeBuilder() {
    // Collect sub-event info from current season for promotion logic
    this.collectSubEventInfo();

    const nextTeams = this.nextSeasonTeams();
    if (nextTeams.length > 0) {
      this.initializeFromDraft(nextTeams);
      this.loadedFromDraft.set(true);
    } else {
      this.initializeFromCurrentSeason();
      this.loadedFromDraft.set(false);
    }

    this.initialized.set(true);
    this.updateTeamCountWarnings();

    // Load performance data asynchronously after initialization
    this.loadPerformanceData();
  }

  async loadPerformanceData() {
    const currentTeams = this.currentTeams();
    if (currentTeams.length === 0) return;

    // Collect team IDs and draw IDs from current season teams
    const teamIds = currentTeams.map((t) => t.id);
    const drawIds = new Set<string>();
    for (const team of currentTeams) {
      for (const entry of team.entries ?? []) {
        const drawId = (entry as any)?.competitionDraw?.id;
        if (drawId) drawIds.add(drawId);
      }
    }

    if (teamIds.length === 0 || drawIds.size === 0) return;

    this.performanceLoading.set(true);

    try {
      const drawIdArray = Array.from(drawIds);
      const now = new Date().toISOString();
      const result = await lastValueFrom(
        this.apollo.query<{
          competitionEncounters: {
            id: string;
            homeTeamId?: string;
            awayTeamId?: string;
            games?: {
              id: string;
              winner?: number;
              gamePlayerMemberships?: { playerId: string; team?: number }[];
            }[];
          }[];
        }>({
          query: TEAM_PERFORMANCE_QUERY,
          variables: {
            encounterArgs: {
              where: [
                { homeTeamId: { in: teamIds }, drawId: { in: drawIdArray }, date: { lte: now } },
                { awayTeamId: { in: teamIds }, drawId: { in: drawIdArray }, date: { lte: now } },
              ],
            },
          },
          fetchPolicy: 'network-only',
        }),
      );

      const encounters = result.data?.competitionEncounters ?? [];

      // Build per-player per-team stats: how many encounters and how many they played in
      const statsMap = new Map<string, EncounterStats>();

      // Map each team's encounters (only count when both homeTeamId and awayTeamId are present)
      const teamIdsSet = new Set(teamIds);
      const teamEncounterCounts = new Map<string, number>();
      for (const encounter of encounters) {
        const homeId = encounter.homeTeamId;
        const awayId = encounter.awayTeamId;
        // Only count the encounter if both teams are present (skip BYE/forfeit encounters)
        if (!homeId || !awayId) continue;
        if (teamIdsSet.has(homeId)) teamEncounterCounts.set(homeId, (teamEncounterCounts.get(homeId) ?? 0) + 1);
        if (teamIdsSet.has(awayId)) teamEncounterCounts.set(awayId, (teamEncounterCounts.get(awayId) ?? 0) + 1);

        // Separate players by team (1 = home, 2 = away) using gamePlayerMembership.team
        // Track which players were present in at least one game (for encounter presence)
        const homePlayers = new Set<string>();
        const awayPlayers = new Set<string>();
        // Track per-player games played and wins/losses in this encounter
        const playerGames = new Map<string, number>();
        const playerWins = new Map<string, number>();
        const playerLosses = new Map<string, number>();
        for (const game of encounter.games ?? []) {
          const gameWinner = game.winner; // 1 = home wins, 2 = away wins
          for (const membership of game.gamePlayerMemberships ?? []) {
            if (membership.playerId) {
              if (membership.team === 1) {
                homePlayers.add(membership.playerId);
                playerGames.set(membership.playerId, (playerGames.get(membership.playerId) ?? 0) + 1);
                if (gameWinner === 1) {
                  playerWins.set(membership.playerId, (playerWins.get(membership.playerId) ?? 0) + 1);
                } else if (gameWinner === 2) {
                  playerLosses.set(membership.playerId, (playerLosses.get(membership.playerId) ?? 0) + 1);
                }
              } else if (membership.team === 2) {
                awayPlayers.add(membership.playerId);
                playerGames.set(membership.playerId, (playerGames.get(membership.playerId) ?? 0) + 1);
                if (gameWinner === 2) {
                  playerWins.set(membership.playerId, (playerWins.get(membership.playerId) ?? 0) + 1);
                } else if (gameWinner === 1) {
                  playerLosses.set(membership.playerId, (playerLosses.get(membership.playerId) ?? 0) + 1);
                }
              }
            }
          }
        }

        // Track participation only for our club's teams
        // Each encounter: +1 to totalEncounters for the team, +1 to playedEncounters if player was present
        const teamPlayerPairs: [string | undefined, Set<string>][] = [
          [homeId, homePlayers],
          [awayId, awayPlayers],
        ];
        for (const [teamId, players] of teamPlayerPairs) {
          if (!teamId || !teamIdsSet.has(teamId)) continue;
          for (const playerId of players) {
            const key = `${playerId}:${teamId}`;
            if (!statsMap.has(key)) {
              statsMap.set(key, {
                playerId,
                teamId,
                totalEncounters: 0,
                playedEncounters: 0,
                playedGames: 0,
                wins: 0,
                losses: 0,
              });
            }
            const stats = statsMap.get(key)!;
            // Player was present in this encounter (played at least 1 game)
            stats.playedEncounters++;
            stats.playedGames += playerGames.get(playerId) ?? 0;
            stats.wins += playerWins.get(playerId) ?? 0;
            stats.losses += playerLosses.get(playerId) ?? 0;
          }
        }
      }

      console.log('Team performance stats map', statsMap.get('44a91c31-e7c8-45bc-8d19-f3e8fd885b95:ba76bb3b-b081-48ca-8f39-a1edeb72e0d7'));

      // Set total encounter counts for each player-team combo
      for (const [key, stats] of statsMap) {
        stats.totalEncounters = teamEncounterCounts.get(stats.teamId) ?? 0;
      }

      // Apply performance data to players in current builder teams
      const teamIdMap = new Map<string, string>();
      for (const currentTeam of currentTeams) {
        // Map current-season team IDs to builder team IDs
        const builderTeam = this.teams().find((t) => t.id === currentTeam.id || (t as any).link === currentTeam.id);
        if (builderTeam) {
          teamIdMap.set(currentTeam.id, builderTeam.id);
        }
      }

      const updatedTeams = this.teams().map((team) => {
        const currentTeamId = [...teamIdMap.entries()].find(([, builderId]) => builderId === team.id)?.[0] ?? team.id;
        const updatedPlayers = team.players.map((player) => {
          // Skip performance evaluation for backup players
          if (player.membershipType === 'BACKUP') {
            return {
              ...player,
              lowPerformance: false,
              lowPresence: false,
              performancePercent: 0,
              presencePercent: 0,
            };
          }
          const key = `${player.id}:${currentTeamId}`;
          const stats = statsMap.get(key);
          const cfg = this.config();
          const perf = evaluatePerformance(stats, cfg.performanceThreshold, cfg.presenceThreshold);
          return {
            ...player,
            lowPerformance: perf.lowPerformance,
            lowPresence: perf.lowPresence,
            performancePercent: perf.performancePercent,
            presencePercent: perf.presencePercent,
          };
        });
        return { ...team, players: updatedPlayers };
      });

      this.teams.set(updatedTeams);
    } catch (err) {
      console.error('Failed to load performance data', err);
    } finally {
      this.performanceLoading.set(false);
    }
  }

  private collectSubEventInfo() {
    const currentTeams = this.currentTeams();
    const byType = new Map<string, CompetitionSubEvent[]>();
    const context = new Map<string, { levelType: LevelType; state?: string }>();

    for (const team of currentTeams) {
      const entries = team.entries ?? [];
      for (const entry of entries) {
        const subEvent = this.getPrimaryCompetitionSubEvent(entry);
        if (subEvent) {
          const type = subEvent.eventType ?? team.type;
          if (!type) continue;
          if (!byType.has(type)) {
            byType.set(type, []);
          }
          const existing = byType.get(type)!;
          if (!existing.some((s: CompetitionSubEvent) => s.id === subEvent.id)) {
            existing.push(subEvent);
          }

          // Track event level type (Liga/Prov/National) from the resolved competitionEvent
          const eventInfo = (subEvent as any).competitionEvent;
          if (eventInfo?.type) {
            context.set(subEvent.id, { levelType: eventInfo.type as LevelType, state: eventInfo.state });
          }
        }
      }
    }

    // Sort each type's sub-events by level ascending
    for (const [, subs] of byType) {
      subs.sort((a: CompetitionSubEvent, b: CompetitionSubEvent) => (a.level ?? 0) - (b.level ?? 0));
    }

    this.subEventsByType.set(byType);
    this.subEventContext.set(context);

    // Process all available sub-events from the season (for cross-event transitions)
    this.processAvailableSubEvents();
  }

  private processAvailableSubEvents() {
    const events = this.availableSubEventsResource.value() ?? [];
    const byKey = new Map<string, CompetitionSubEvent[]>();
    const context = new Map(this.subEventContext());

    for (const event of events) {
      const levelType = event.type;
      for (const subEvent of event.competitionSubEvents ?? []) {
        const genderType = subEvent.eventType ?? '';
        const key = `${levelType}:${genderType}`;
        if (!byKey.has(key)) {
          byKey.set(key, []);
        }
        const list = byKey.get(key)!;
        if (!list.some((s) => s.id === subEvent.id)) {
          list.push(subEvent);
        }

        // Also populate context for these sub-events
        if (!context.has(subEvent.id)) {
          context.set(subEvent.id, { levelType, state: event.state });
        }
      }
    }

    // Sort by level ascending
    for (const [, subs] of byKey) {
      subs.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    }

    this.allSubEventsByKey.set(byKey);
    this.subEventContext.set(context);
  }

  getSubEventOptions(type: 'M' | 'F' | 'MX') {
    // Include sub-events from all event types (Liga, Prov, National) for the given gender
    // Prov sub-events are filtered by the club's province
    const options: { label: string; value: string }[] = [{ label: 'Auto', value: TEAM_BUILDER_AUTO_SUB_EVENT }];
    const clubState = this.clubState();
    const context = this.subEventContext();

    for (const levelType of [LevelType.NATIONAL, LevelType.LIGA, LevelType.PROV]) {
      const key = `${levelType}:${type}`;
      const subEvents = this.allSubEventsByKey().get(key) ?? [];
      for (const subEvent of subEvents) {
        // For Prov events, only show sub-events from the club's province
        if (levelType === LevelType.PROV && clubState) {
          const ctx = context.get(subEvent.id);
          if (ctx?.state && ctx.state !== clubState) continue;
        }
        options.push({
          label: `[${levelType}] ${this.formatSubEventOptionLabel(subEvent)}`,
          value: subEvent.id,
        });
      }
    }

    return options;
  }

  getAllSubEvents(type: 'M' | 'F' | 'MX'): CompetitionSubEvent[] {
    const result: CompetitionSubEvent[] = [];
    const clubState = this.clubState();
    const context = this.subEventContext();

    for (const levelType of [LevelType.NATIONAL, LevelType.LIGA, LevelType.PROV]) {
      const key = `${levelType}:${type}`;
      const subEvents = this.allSubEventsByKey().get(key) ?? [];
      for (const subEvent of subEvents) {
        if (levelType === LevelType.PROV && clubState) {
          const ctx = context.get(subEvent.id);
          if (ctx?.state && ctx.state !== clubState) continue;
        }
        result.push(subEvent);
      }
    }
    return result;
  }

  setTeamSubEvent(teamId: string, selection: string) {
    const teams = this.teams().map((team) => {
      if (team.id !== teamId) return team;

      if (selection === TEAM_BUILDER_AUTO_SUB_EVENT) {
        return this.recalculateManagedTeam({
          ...team,
          subEventManuallyOverridden: false,
        });
      }

      const subEvent = this.findSubEvent(team.type, selection);
      if (!subEvent) return team;

      return this.applySelectedSubEvent(
        {
          ...team,
          subEventManuallyOverridden: true,
        },
        subEvent,
      );
    });

    this.teams.set(teams);
  }

  private formatSubEventOptionLabel(subEvent: CompetitionSubEvent) {
    const name = subEvent.name?.trim() || (subEvent.level != null ? `Level ${subEvent.level}` : 'Unnamed');
    const min = subEvent.minBaseIndex ?? '?';
    const max = subEvent.maxBaseIndex ?? '?';
    return `${name} (${min}-${max})`;
  }

  private getPrimaryCompetitionSubEvent(entry?: Entry): CompetitionSubEvent | undefined {
    // The GraphQL resolver exposes 'competitionSubEvents' (plural, returning an array),
    // but the Entry model only types the singular 'competitionSubEvent' relation.
    return (entry as any)?.competitionSubEvents?.[0];
  }

  private resolveStandingOutcome(entry?: Entry): TeamBuilderStandingOutcome {
    const standing = entry?.standing;
    const draw = entry?.competitionDraw;

    if (!standing && !draw) {
      return 'UNCHANGED';
    }

    const position = standing?.position;
    const drawSize = standing?.size ?? draw?.size;
    const risers = draw?.risers ?? 0;
    const fallers = draw?.fallers ?? 0;

    if (standing?.riser || (position != null && risers > 0 && position <= risers)) {
      return 'PROMOTED';
    }

    if (standing?.faller || (position != null && drawSize != null && fallers > 0 && position > drawSize - fallers)) {
      return 'DEMOTED';
    }

    return 'UNCHANGED';
  }

  private getOriginalSubEvent(team: Pick<TeamBuilderTeam, 'originalSubEvent'>): CompetitionSubEvent | undefined {
    return team.originalSubEvent;
  }

  private findSubEvent(type: 'M' | 'F' | 'MX', id?: string, level?: number): CompetitionSubEvent | undefined {
    // Search in current season entries first
    const subEvents = this.subEventsByType().get(type) ?? [];

    if (id) {
      const byId = subEvents.find((subEvent) => subEvent.id === id);
      if (byId) {
        return byId;
      }

      // Also search in all available sub-events (for cross-event manual selections)
      for (const [, subs] of this.allSubEventsByKey()) {
        const found = subs.find((s) => s.id === id);
        if (found) return found;
      }
    }

    if (level != null) {
      return subEvents.find((subEvent) => subEvent.level === level);
    }

    return undefined;
  }

  /**
   * Find a sub-event in a specific event level type (Liga/Prov/National) and gender type.
   */
  private findSubEventInEventType(
    levelType: LevelType,
    genderType: 'M' | 'F' | 'MX',
    level?: number,
    state?: string,
  ): CompetitionSubEvent | undefined {
    const key = `${levelType}:${genderType}`;
    const subEvents = this.allSubEventsByKey().get(key) ?? [];

    if (state) {
      // Filter by state first (for Prov)
      const stateFiltered = subEvents.filter((s) => {
        const ctx = this.subEventContext().get(s.id);
        return ctx?.state === state;
      });

      if (level != null) {
        return stateFiltered.find((s) => s.level === level);
      }
      return stateFiltered[0]; // First (lowest level)
    }

    if (level != null) {
      return subEvents.find((s) => s.level === level);
    }
    return subEvents[0]; // First (lowest level)
  }

  /**
   * Get the highest level number (lowest tier) within an event type and gender.
   */
  private getHighestLevel(levelType: LevelType, genderType: 'M' | 'F' | 'MX', state?: string): number | undefined {
    const key = `${levelType}:${genderType}`;
    const subEvents = this.allSubEventsByKey().get(key) ?? [];

    let filtered = subEvents;
    if (state) {
      filtered = subEvents.filter((s) => {
        const ctx = this.subEventContext().get(s.id);
        return ctx?.state === state;
      });
    }

    if (filtered.length === 0) return undefined;
    // Sub-events are sorted by level ascending, last one is highest
    return filtered[filtered.length - 1].level ?? undefined;
  }

  private findMatchingSubEvent(type: 'M' | 'F' | 'MX', referenceIndex: number, preferredSubEventId?: string): CompetitionSubEvent | undefined {
    if (referenceIndex <= 0) {
      return undefined;
    }

    const subEvents = this.subEventsByType().get(type) ?? [];

    if (preferredSubEventId) {
      const preferred = subEvents.find((subEvent) => subEvent.id === preferredSubEventId);
      if (preferred && this.isIndexWithinSubEvent(referenceIndex, preferred)) {
        return preferred;
      }
    }

    return subEvents.find((subEvent) => this.isIndexWithinSubEvent(referenceIndex, subEvent));
  }

  private isIndexWithinSubEvent(referenceIndex: number, subEvent?: CompetitionSubEvent): boolean {
    if (!subEvent) {
      return false;
    }

    const aboveMin = subEvent.minBaseIndex == null || referenceIndex >= subEvent.minBaseIndex;
    const belowMax = subEvent.maxBaseIndex == null || referenceIndex <= subEvent.maxBaseIndex;

    return aboveMin && belowMax;
  }

  private resolveAutomaticSubEvent(
    team: Pick<TeamBuilderTeam, 'type' | 'standingOutcome' | 'originalSubEvent'>,
    referenceIndex: number,
  ): CompetitionSubEvent | undefined {
    const originalSubEvent = this.getOriginalSubEvent(team);
    const currentLevel = originalSubEvent?.level;
    const subEventCtx = originalSubEvent ? this.subEventContext().get(originalSubEvent.id) : undefined;
    const currentEventType = subEventCtx?.levelType;
    const clubState = this.clubState();

    if (team.standingOutcome === 'PROMOTED' && currentLevel != null) {
      // Try promoting within the same event type (level - 1)
      if (currentEventType) {
        const stateForSearch = currentEventType === LevelType.PROV ? clubState : undefined;
        const sameEventTarget = this.findSubEventInEventType(currentEventType, team.type, currentLevel - 1, stateForSearch);
        if (sameEventTarget) return sameEventTarget;
      }

      // Cross-event promotion: PROV level 1 → LIGA highest level
      if (currentEventType === LevelType.PROV && currentLevel === 1) {
        const highestLigaLevel = this.getHighestLevel(LevelType.LIGA, team.type);
        if (highestLigaLevel != null) {
          return this.findSubEventInEventType(LevelType.LIGA, team.type, highestLigaLevel);
        }
      }

      // Cross-event promotion: LIGA top → NATIONAL
      if (currentEventType === LevelType.LIGA && currentLevel === 1) {
        const highestNationalLevel = this.getHighestLevel(LevelType.NATIONAL, team.type);
        if (highestNationalLevel != null) {
          return this.findSubEventInEventType(LevelType.NATIONAL, team.type, highestNationalLevel);
        }
      }

      return originalSubEvent;
    }

    if (team.standingOutcome === 'DEMOTED' && currentLevel != null) {
      // Try demoting within the same event type (level + 1)
      if (currentEventType) {
        const stateForSearch = currentEventType === LevelType.PROV ? clubState : undefined;
        const sameEventTarget = this.findSubEventInEventType(currentEventType, team.type, currentLevel + 1, stateForSearch);
        if (sameEventTarget) return sameEventTarget;
      }

      // Cross-event demotion: LIGA bottom → PROV level 1 (same state as club)
      if (currentEventType === LevelType.LIGA) {
        return this.findSubEventInEventType(LevelType.PROV, team.type, 1, clubState) ?? originalSubEvent;
      }

      // Cross-event demotion: NATIONAL → LIGA level 1
      if (currentEventType === LevelType.NATIONAL) {
        return this.findSubEventInEventType(LevelType.LIGA, team.type, 1) ?? originalSubEvent;
      }

      return originalSubEvent;
    }

    return this.findMatchingSubEvent(team.type, referenceIndex, originalSubEvent?.id) ?? originalSubEvent;
  }

  private applySelectedSubEvent(team: TeamBuilderTeam, subEvent?: CompetitionSubEvent): TeamBuilderTeam {
    return recalculateTeam(
      {
        ...team,
        selectedSubEvent: subEvent,
      },
      this.config(),
    );
  }

  private recalculateManagedTeam(team: TeamBuilderTeam): TeamBuilderTeam {
    if (team.isMarkedForRemoval) {
      return recalculateTeam(team, this.config());
    }

    if (team.subEventManuallyOverridden) {
      return this.applySelectedSubEvent(team, this.findSubEvent(team.type, team.selectedSubEvent?.id) ?? this.getOriginalSubEvent(team));
    }

    const regularPlayerCount = team.players.filter((player) => player.membershipType === 'REGULAR').length;
    const calculatedIndex = calculateTeamIndex(team.players, team.type);
    const referenceIndex = regularPlayerCount >= this.config().minPlayersPerTeam ? calculatedIndex : (team.originalTeamIndex ?? calculatedIndex);

    const resolvedSubEvent = this.resolveAutomaticSubEvent(team, referenceIndex);

    // If the standing says PROMOTED/DEMOTED but the resolved sub-event is still the original
    // (e.g. already at the lowest level), override the flags to UNCHANGED
    const effectivelyUnchanged =
      (team.standingOutcome === 'PROMOTED' || team.standingOutcome === 'DEMOTED') && resolvedSubEvent?.id === team.originalSubEvent?.id;

    const updatedTeam = effectivelyUnchanged ? { ...team, isPromoted: false, isDemoted: false, standingOutcome: 'UNCHANGED' as const } : team;

    return this.applySelectedSubEvent(updatedTeam, resolvedSubEvent);
  }

  private createBuilderTeam(team: Team, players: TeamBuilderPlayer[], entry?: Entry): TeamBuilderTeam {
    const subEvent = this.getPrimaryCompetitionSubEvent(entry);
    const standingOutcome = this.resolveStandingOutcome(entry);

    return this.recalculateManagedTeam({
      ...team,
      isNew: false,
      isPromoted: standingOutcome === 'PROMOTED',
      isDemoted: standingOutcome === 'DEMOTED',
      isMarkedForRemoval: false,
      standingOutcome,
      standingPosition: entry?.standing?.position,
      originalSubEvent: subEvent,
      originalTeamIndex: entry?.meta?.competition?.teamIndex,
      selectedSubEvent: subEvent,
      subEventManuallyOverridden: false,
      players,
      teamIndex: 0,
      isValid: true,
      validationErrors: [],
    } as TeamBuilderTeam);
  }

  private initializeFromDraft(nextTeams: (Team & { link?: string })[]) {
    const surveys = this.surveyResponses();
    const surveyMap = this.buildSurveyMap(surveys);
    const currentPlayerIds = this.getCurrentSeasonPlayerIds();

    // Map next-season teams to builder teams, inheriting sub-event info from current season via link
    const currentTeamMap = new Map<string, Team>();
    for (const currentTeam of this.currentTeams()) {
      currentTeamMap.set(currentTeam.id, currentTeam);
      if (currentTeam.link) {
        currentTeamMap.set(currentTeam.link, currentTeam);
      }
    }

    const builderTeams: TeamBuilderTeam[] = nextTeams.map((team) => {
      // Find linked current-season team for sub-event constraints
      const linkedTeam = team.link ? currentTeamMap.get(team.link) : undefined;
      const entry = linkedTeam?.entries?.[0];

      const players = this.buildPlayers(team, surveyMap, currentPlayerIds);

      return this.createBuilderTeam(team, players, entry);
    });

    this.teams.set(builderTeams);
  }

  private initializeFromCurrentSeason() {
    const currentTeams = this.currentTeams();
    const surveys = this.surveyResponses();
    const surveyMap = this.buildSurveyMap(surveys);
    const currentPlayerIds = this.getCurrentSeasonPlayerIds();

    const builderTeams: TeamBuilderTeam[] = currentTeams.map((team) => {
      const entry = team.entries?.[0];

      const players = this.buildPlayers(team, surveyMap, currentPlayerIds);

      return this.createBuilderTeam(team, players, entry);
    });

    this.teams.set(builderTeams);
  }

  private buildPlayers(team: Team, surveyMap: Map<string, SurveyResponse>, currentPlayerIds: Set<string>): TeamBuilderPlayer[] {
    return (team.teamPlayerMemberships ?? []).map((m: any) => {
      const player = m.player;
      const survey = surveyMap.get(player?.id);

      return {
        ...player,
        survey,
        lowPerformance: false,
        lowPresence: false,
        performancePercent: 0,
        presencePercent: 100,
        isNewPlayer: !currentPlayerIds.has(player?.id),
        isStopping: survey?.stoppingCompetition ?? false,
        assignedTeamId: team.id,
        membershipType: m.membershipType ?? 'REGULAR',
      } as TeamBuilderPlayer;
    });
  }

  private buildSurveyMap(surveys: SurveyResponse[]): Map<string, SurveyResponse> {
    const map = new Map<string, SurveyResponse>();
    for (const s of surveys) {
      if (s.matchedPlayerId) {
        map.set(s.matchedPlayerId, s);
      }
    }
    return map;
  }

  private getCurrentSeasonPlayerIds(): Set<string> {
    const ids = new Set<string>();
    const data = this.dataResource.value();
    if (!data?.club?.teams) return ids;

    for (const team of data.club.teams) {
      for (const m of (team as any).teamPlayerMemberships ?? []) {
        if (m.player?.id) {
          ids.add(m.player.id);
        }
      }
    }
    return ids;
  }

  /**
   * Apply survey data after import. Merges survey responses into existing players
   * and marks new players (matched in survey but not in any current team).
   */
  applySurveyData(responses: SurveyResponse[]) {
    this.surveyResponses.set(responses);

    const surveyMap = this.buildSurveyMap(responses);
    const currentPlayerIds = this.getCurrentSeasonPlayerIds();
    const newStoppingPlayers: TeamBuilderPlayer[] = [];

    // Update existing team players with survey data, remove stopping players from teams
    const updatedTeams = this.teams().map((team) => {
      const remainingPlayers: TeamBuilderPlayer[] = [];

      for (const p of team.players) {
        const survey = surveyMap.get(p.id);
        const isNewPlayer = !currentPlayerIds.has(p.id);
        const isStopping = survey?.stoppingCompetition ?? false;
        const updated = survey ? { ...p, survey, isNewPlayer, isStopping } : { ...p, isNewPlayer, isStopping };

        if (isStopping) {
          newStoppingPlayers.push({ ...updated, assignedTeamId: undefined });
        } else {
          remainingPlayers.push(updated);
        }
      }

      return this.recalculateManagedTeam({ ...team, players: remainingPlayers });
    });

    this.teams.set(updatedTeams);
    this.stoppingPlayers.set(newStoppingPlayers);
    this.updateTeamCountWarnings();
  }

  /**
   * Process import dialog results: create new players for unmatched entries marked
   * as "create new", then apply all survey data.
   */
  async processImportResults(results: MatchResult[]) {
    const clubId = this.clubId();
    const toCreate = results.filter((r) => !r.player && r.createNew && r.survey.firstName && r.survey.lastName);

    if (toCreate.length > 0 && clubId) {
      try {
        const playersInput = toCreate.map((r) => ({
          firstName: r.survey.firstName,
          lastName: r.survey.lastName,
          gender: undefined as string | undefined,
        }));

        const result = await lastValueFrom(
          this.apollo.mutate<{
            createPlayersForTeamBuilder: Player[];
          }>({
            mutation: CREATE_PLAYERS_FOR_TEAM_BUILDER,
            variables: { clubId, players: playersInput },
          }),
        );

        const createdPlayers = result.data?.createPlayersForTeamBuilder ?? [];

        // Match created players back to survey entries by index
        for (let i = 0; i < toCreate.length && i < createdPlayers.length; i++) {
          const created = createdPlayers[i];
          toCreate[i].survey.matchedPlayerId = created.id;
          toCreate[i].survey.matchedPlayerName = created.fullName;
          toCreate[i].survey.matchConfidence = 'high';
          toCreate[i].player = created;
        }
      } catch (err) {
        console.error('Failed to create new players', err);
      }
    }

    this.matchedImportPlayers.set(this.collectMatchedImportPlayers(results));

    // Collect surveys from all matched + newly created results
    const surveys = results.filter((r) => r.player).map((r) => r.survey);

    this.applySurveyData(surveys);
  }

  private collectMatchedImportPlayers(results: MatchResult[]): Player[] {
    const playerMap = new Map<string, Player>();

    for (const result of results) {
      if (result.player) {
        playerMap.set(result.player.id, result.player);
      }
    }

    return Array.from(playerMap.values());
  }

  movePlayer(playerId: string, fromTeamId: string | null, toTeamId: string | null) {
    const teams = this.teams().map((t) => ({ ...t, players: [...t.players] }));

    // Guard: don't add a player to a team they're already in
    if (toTeamId && toTeamId !== 'stopping') {
      const targetTeam = teams.find((t) => t.id === toTeamId);
      if (targetTeam?.players.some((p) => p.id === playerId)) return;
    }

    let player: TeamBuilderPlayer | undefined;

    if (fromTeamId === 'stopping') {
      // Moving from stopping pool
      const stopping = [...this.stoppingPlayers()];
      const idx = stopping.findIndex((p) => p.id === playerId);
      if (idx >= 0) {
        player = stopping.splice(idx, 1)[0];
        player = { ...player, isStopping: false };
        this.stoppingPlayers.set(stopping);
      }
    } else if (fromTeamId) {
      const fromTeam = teams.find((t) => t.id === fromTeamId);
      if (fromTeam) {
        const idx = fromTeam.players.findIndex((p) => p.id === playerId);
        if (idx >= 0) {
          player = fromTeam.players.splice(idx, 1)[0];
          Object.assign(fromTeam, this.recalculateManagedTeam(fromTeam));
        }
      }
    } else {
      // From unassigned pool — player may already be in another team (wants multiple teams)
      player = this.unassignedPlayers().find((p) => p.id === playerId);
    }

    if (player && toTeamId === 'stopping') {
      // Moving to stopping pool
      player = { ...player, assignedTeamId: undefined, isStopping: true };
      this.stoppingPlayers.set([...this.stoppingPlayers(), player]);
    } else if (player && toTeamId) {
      const toTeam = teams.find((t) => t.id === toTeamId);
      if (toTeam) {
        player = { ...player, assignedTeamId: toTeamId };
        toTeam.players.push(player);
        Object.assign(toTeam, this.recalculateManagedTeam(toTeam));
      }
    } else if (player && !toTeamId) {
      player = { ...player, assignedTeamId: undefined };
    }

    this.teams.set(teams);
    this.updateTeamCountWarnings();
  }

  setMembershipType(playerId: string, teamId: string, type: 'REGULAR' | 'BACKUP') {
    const teams = this.teams().map((t) => {
      if (t.id !== teamId) return t;
      const players = t.players.map((p) => (p.id === playerId ? { ...p, membershipType: type } : p));
      return this.recalculateManagedTeam({ ...t, players });
    });
    this.teams.set(teams);
    this.updateTeamCountWarnings();
  }

  /**
   * Update a player's survey data across all locations (teams, stopping, manually added).
   * Also updates the isStopping flag and moves the player accordingly.
   */
  updatePlayerSurvey(playerId: string, survey: SurveyResponse) {
    const isStopping = survey.stoppingCompetition;

    // Helper to update player survey in an array
    const updateInArray = (arr: TeamBuilderPlayer[]) => arr.map((p) => (p.id === playerId ? { ...p, survey, isStopping } : p));

    // Update in teams
    const updatedTeams = this.teams().map((team) => {
      const playerInTeam = team.players.find((p) => p.id === playerId);
      if (!playerInTeam) return team;

      if (isStopping) {
        // Remove from team, will be added to stopping list below
        return this.recalculateManagedTeam({ ...team, players: team.players.filter((p) => p.id !== playerId) });
      }
      return this.recalculateManagedTeam({ ...team, players: updateInArray(team.players) });
    });

    // Update in stopping players
    let stoppingPlayers = this.stoppingPlayers();
    const wasInStopping = stoppingPlayers.some((p) => p.id === playerId);

    if (isStopping && !wasInStopping) {
      // Find the player from any source
      const player =
        this.teams()
          .flatMap((t) => t.players)
          .find((p) => p.id === playerId) ??
        this.manuallyAddedPlayers().find((p) => p.id === playerId) ??
        this.getAllPlayersFromData().find((p) => p.id === playerId);
      if (player) {
        stoppingPlayers = [...stoppingPlayers, { ...player, survey, isStopping: true, assignedTeamId: undefined }];
      }
    } else if (!isStopping && wasInStopping) {
      // Remove from stopping
      stoppingPlayers = stoppingPlayers.filter((p) => p.id !== playerId);
    } else {
      stoppingPlayers = updateInArray(stoppingPlayers);
    }

    // Update in manually added players
    const manuallyAdded = updateInArray(this.manuallyAddedPlayers());

    // Update survey responses signal
    const surveys = this.surveyResponses().map((s) => (s.matchedPlayerId === playerId ? survey : s));
    const existingSurvey = surveys.find((s) => s.matchedPlayerId === playerId);
    if (!existingSurvey) {
      surveys.push(survey);
    }

    this.teams.set(updatedTeams);
    this.stoppingPlayers.set(stoppingPlayers);
    this.manuallyAddedPlayers.set(manuallyAdded);
    this.surveyResponses.set(surveys);
    this.updateTeamCountWarnings();
  }

  addTeam(type: 'M' | 'F' | 'MX') {
    const teams = this.teams();
    const teamNumber = teams.filter((t) => t.type === type && !t.isMarkedForRemoval).length + 1;
    const newTeam = {
      id: crypto.randomUUID(),
      name: this.buildTeamName(type, teamNumber),
      type,
      teamNumber,
      isNew: true,
      isPromoted: false,
      isDemoted: false,
      isMarkedForRemoval: false,
      standingOutcome: 'UNCHANGED',
      subEventManuallyOverridden: false,
      players: [],
      teamIndex: 0,
      isValid: false,
      validationErrors: [`Need at least ${this.config().minPlayersPerTeam} regular players, have 0`],
    } as unknown as TeamBuilderTeam;
    this.teams.set([...teams, newTeam]);
  }

  removeTeam(teamId: string) {
    const removedTeam = this.teams().find((t) => t.id === teamId);
    const teams = this.teams().filter((t) => t.id !== teamId);
    this.teams.set(this.renumberTeams(teams, removedTeam?.type));
  }

  /**
   * Mark/unmark a team for removal. Players are moved to the unassigned pool
   * and remaining teams of the same type are renumbered.
   */
  markTeamForRemoval(teamId: string) {
    let teams = this.teams().map((t) => {
      if (t.id !== teamId) return t;

      const marking = !t.isMarkedForRemoval;
      return {
        ...t,
        isMarkedForRemoval: marking,
        players: marking ? [] : t.players,
      };
    });

    const team = teams.find((t) => t.id === teamId);
    teams = this.renumberTeams(teams, team?.type);
    this.teams.set(teams);
    this.updateTeamCountWarnings();
  }

  /**
   * Remove one pool slot for a player. Only decrements slotAdjustments when
   * removing from the pool or removing a REGULAR team assignment. Removing a
   * BACKUP from a team only cleans up that assignment — it never consumed a slot.
   */
  removePlayer(playerId: string, fromTeamId?: string | null) {
    let wasBackupInTeam = false;

    // If coming from a team, remove the player from that specific team
    if (fromTeamId && fromTeamId !== 'stopping') {
      const sourceTeam = this.teams().find((t) => t.id === fromTeamId);
      const playerInTeam = sourceTeam?.players.find((p) => p.id === playerId);
      wasBackupInTeam = playerInTeam?.membershipType === 'BACKUP';

      const teams = this.teams().map((t) => {
        if (t.id !== fromTeamId) return t;
        const idx = t.players.findIndex((p) => p.id === playerId);
        if (idx < 0) return t;
        const players = [...t.players];
        players.splice(idx, 1);
        return this.recalculateManagedTeam({ ...t, players });
      });
      this.teams.set(teams);
    }

    // If coming from stopping, remove from there
    if (fromTeamId === 'stopping') {
      this.stoppingPlayers.update((sp) => {
        const idx = sp.findIndex((p) => p.id === playerId);
        if (idx < 0) return sp;
        const next = [...sp];
        next.splice(idx, 1);
        return next;
      });
    }

    // Only consume a pool slot when removing from pool or removing a REGULAR assignment.
    // Removing a BACKUP does not affect pool slots (backups never counted as used slots).
    if (!wasBackupInTeam) {
      const nextAdjustments = new Map(this.slotAdjustments());
      nextAdjustments.set(playerId, (nextAdjustments.get(playerId) ?? 0) - 1);
      this.slotAdjustments.set(nextAdjustments);
    }

    // Ensure player is in the display list (add once)
    if (!this.removedPlayers().some((p) => p.id === playerId)) {
      const player =
        this.getAllPlayersFromData().find((p) => p.id === playerId) ??
        this.teams()
          .flatMap((t) => t.players)
          .find((p) => p.id === playerId) ??
        this.stoppingPlayers().find((p) => p.id === playerId) ??
        this.manuallyAddedPlayers().find((p) => p.id === playerId);
      if (player) {
        this.removedPlayers.update((rp) => [...rp, player]);
      }
    }

    this.updateTeamCountWarnings();
  }

  /**
   * Restore one removed slot for a player (increments slotAdjustments by 1).
   * Removes from the display list once adjustment is no longer negative.
   */
  restorePlayer(playerId: string) {
    const nextAdjustments = new Map(this.slotAdjustments());
    const current = nextAdjustments.get(playerId) ?? 0;
    const next = current + 1;
    if (next === 0) {
      nextAdjustments.delete(playerId);
    } else {
      nextAdjustments.set(playerId, next);
    }
    this.slotAdjustments.set(nextAdjustments);

    // Remove from display list once adjustment is no longer negative
    if (next >= 0) {
      this.removedPlayers.update((rp) => rp.filter((p) => p.id !== playerId));
    }
  }

  /**
   * Search for players by name. Club players first, then global search API.
   */
  async searchPlayers(query: string): Promise<Player[]> {
    if (!query || query.length < 2) return [];

    const normalizedQuery = query.toLowerCase();

    // Club players first
    const clubPlayers = this.getClubPlayers();
    const clubMatches = clubPlayers.filter((p) => p.fullName.toLowerCase().includes(normalizedQuery));

    // Global search
    try {
      const searchResults = await lastValueFrom(
        this.http.get<Array<{ hit: { objectID: string; firstName?: string; lastName?: string; fullName?: string; gender?: string } }>>(
          `/api/v1/search`,
          { params: { query, types: 'players' } },
        ),
      );

      const clubIds = new Set(clubMatches.map((p) => p.id));
      const globalMatches = searchResults
        .filter((r) => !clubIds.has(r.hit.objectID))
        .map(
          (r) =>
            ({
              id: r.hit.objectID,
              fullName: r.hit.fullName ?? `${r.hit.firstName ?? ''} ${r.hit.lastName ?? ''}`.trim(),
              firstName: r.hit.firstName ?? '',
              lastName: r.hit.lastName ?? '',
              gender: r.hit.gender as 'M' | 'F' | undefined,
            }) as Player,
        );

      return [...clubMatches, ...globalMatches];
    } catch {
      return clubMatches;
    }
  }

  /**
   * Add an external player (from search) to the pool with rankings.
   */
  async addExternalPlayer(playerBasic: Player): Promise<boolean> {
    const knownIds = new Set([...this.getAllPlayersFromData().map((p) => p.id), ...this.manuallyAddedPlayers().map((p) => p.id)]);

    if (knownIds.has(playerBasic.id)) {
      // Player already known — add one extra slot (covers backup + additional team needs,
      // and also un-does a prior removal if adjustment is negative)
      const nextAdjustments = new Map(this.slotAdjustments());
      const current = nextAdjustments.get(playerBasic.id) ?? 0;
      const next = current + 1;
      if (next === 0) {
        nextAdjustments.delete(playerBasic.id);
      } else {
        nextAdjustments.set(playerBasic.id, next);
      }
      this.slotAdjustments.set(nextAdjustments);

      // If this brought the player out of "removed" state, clean up display list
      if (current < 0 && next >= 0) {
        this.removedPlayers.update((rp) => rp.filter((p) => p.id !== playerBasic.id));
      }
      return true;
    }

    // Fetch rankings
    const systemId = this.systemId();
    let fetchedPlayer: Player | undefined;

    if (systemId) {
      try {
        const result = await lastValueFrom(
          this.apollo.query<{ players: Player[] }>({
            query: PLAYER_WITH_RANKINGS_QUERY,
            variables: {
              args: { where: { id: { in: [playerBasic.id] } }, take: 1 },
              rankingLastPlacesArgs: { where: [{ systemId: { eq: systemId } }] },
            },
          }),
        );
        fetchedPlayer = result.data?.players?.[0];
      } catch {
        // Continue without rankings
      }
    }

    const tbPlayer = {
      ...(fetchedPlayer ?? playerBasic),
      lowPerformance: false,
      lowPresence: false,
      performancePercent: 0,
      presencePercent: 0,
      isNewPlayer: true,
      isStopping: false,
      membershipType: 'REGULAR' as const,
    } as TeamBuilderPlayer;

    this.manuallyAddedPlayers.update((mp) => [...mp, tbPlayer]);
    return true;
  }

  private buildTeamName(type: string, teamNumber: number): string {
    const baseName = this.clubTeamBaseName();
    const genderCode: Record<string, string> = { M: 'H', F: 'D', MX: 'G' };
    const letter = genderCode[type] ?? type;
    return baseName ? `${baseName} ${teamNumber}${letter}` : `${letter} ${teamNumber}`;
  }

  private renumberTeams(teams: TeamBuilderTeam[], type?: string): TeamBuilderTeam[] {
    if (!type) return teams;

    let number = 1;
    return teams.map((t) => {
      if (t.type !== type) return t;
      if (t.isMarkedForRemoval) return t;

      const teamNumber = number++;
      if (t.teamNumber === teamNumber) return t;
      return { ...t, teamNumber, name: this.buildTeamName(t.type, teamNumber) };
    });
  }

  /**
   * Get a save summary for the confirmation dialog.
   */
  getSaveSummary(): { teamsCreated: number; teamsUpdated: number; teamsRemoved: number; totalPlayers: number; warnings: string[] } {
    const allTeams = this.teams();
    const activeTeams = allTeams.filter((t) => !t.isMarkedForRemoval);
    const teamsRemoved = allTeams.filter((t) => t.isMarkedForRemoval && !t.isNew).length;
    const teamsCreated = activeTeams.filter((t) => t.isNew).length;
    const teamsUpdated = activeTeams.length - teamsCreated;
    const totalPlayers = activeTeams.reduce((sum, t) => sum + t.players.length, 0);
    const warnings = this.validationSummary().errors;

    return { teamsCreated, teamsUpdated, teamsRemoved, totalPlayers, warnings };
  }

  async save(): Promise<boolean> {
    const clubId = this.clubId();
    const season = this.nextSeason();
    if (!clubId) return false;

    const teamsInput = this.teams()
      .filter((t) => !t.isMarkedForRemoval)
      .map((t) => ({
        teamId: t.isNew ? undefined : t.id,
        name: t.name,
        type: t.type,
        teamNumber: t.teamNumber,
        preferredDay: t.preferredDay,
        captainId: t.captainId,
        players: t.players.map((p) => ({
          playerId: p.id,
          membershipType: p.membershipType,
        })),
      }));

    try {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: SAVE_TEAM_BUILDER,
          variables: { clubId, season, teams: teamsInput },
        }),
      );
      return true;
    } catch (err) {
      console.error('Failed to save team builder', err);
      return false;
    }
  }

  private getAllPlayersFromData(): TeamBuilderPlayer[] {
    const data = this.dataResource.value();
    if (!data?.club?.teams) return [];

    const playerMap = new Map<string, TeamBuilderPlayer>();
    const currentPlayerIds = this.getCurrentSeasonPlayerIds();
    const importedPlayerMap = new Map(this.matchedImportPlayers().map((player) => [player.id, player]));

    for (const team of data.club.teams) {
      for (const m of (team as any).teamPlayerMemberships ?? []) {
        const player = m.player;
        if (!player || playerMap.has(player.id)) continue;

        const survey = this.surveyResponses().find((s) => s.matchedPlayerId === player.id);

        playerMap.set(player.id, {
          ...player,
          survey,
          lowPerformance: false,
          lowPresence: false,
          performancePercent: 0,
          presencePercent: 100,
          isNewPlayer: !currentPlayerIds.has(player.id),
          isStopping: survey?.stoppingCompetition ?? false,
          membershipType: 'REGULAR',
        } as TeamBuilderPlayer);
      }
    }

    // Also add survey-matched players not in any current team
    for (const s of this.surveyResponses()) {
      if (!s.matchedPlayerId || playerMap.has(s.matchedPlayerId)) continue;

      const importedPlayer = importedPlayerMap.get(s.matchedPlayerId);

      playerMap.set(s.matchedPlayerId, {
        ...importedPlayer,
        id: s.matchedPlayerId,
        fullName: importedPlayer?.fullName ?? s.matchedPlayerName ?? s.fullName,
        firstName: importedPlayer?.firstName ?? s.firstName,
        lastName: importedPlayer?.lastName ?? s.lastName,
        survey: s,
        lowPerformance: false,
        lowPresence: false,
        performancePercent: 0,
        presencePercent: 0,
        isNewPlayer: !currentPlayerIds.has(s.matchedPlayerId),
        isStopping: s.stoppingCompetition,
        membershipType: 'REGULAR',
      } as TeamBuilderPlayer);
    }

    return Array.from(playerMap.values());
  }

  /**
   * Update teamCountWarning on all assigned players by comparing
   * actual team count vs survey desiredTeamCount.
   */
  private updateTeamCountWarnings() {
    const allTeams = this.teams();
    const activeTeams = allTeams.filter((t) => !t.isMarkedForRemoval);

    // Count active teams per player (only REGULAR, backups don't count)
    const playerTeamCount = new Map<string, number>();
    for (const team of activeTeams) {
      for (const player of team.players) {
        if (player.membershipType === 'REGULAR') {
          playerTeamCount.set(player.id, (playerTeamCount.get(player.id) ?? 0) + 1);
        }
      }
    }

    const adjustmentsMap = this.slotAdjustments();
    let changed = false;
    const updated = allTeams.map((team) => {
      const updatedPlayers = team.players.map((player) => {
        const count = playerTeamCount.get(player.id) ?? 0;
        const desired = player.survey?.desiredTeamCount;
        let teamCountWarning: string | undefined;

        if (desired != null && desired > 0) {
          if (count > desired) {
            teamCountWarning = `Wants ${desired} team(s), assigned to ${count}`;
          } else if (count > 0 && count < desired) {
            teamCountWarning = `Wants ${desired} team(s), only assigned to ${count}`;
          }
        }

        if (player.teamCountWarning === teamCountWarning) return player;
        changed = true;
        return { ...player, teamCountWarning };
      });

      if (updatedPlayers.every((p, i) => p === team.players[i])) return team;
      return { ...team, players: updatedPlayers };
    });

    if (changed) {
      this.teams.set(updated);
    }
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load team builder data';
    }
    return err.statusText || 'An error occurred';
  }
}
