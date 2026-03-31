import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { Team } from '@app/models';
import { UseForTeamName } from '@app/models-enum';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { sortTeams } from '@app/utils/sorts';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { TeamBuilderPlayer, TeamBuilderTeam } from './team-builder/types/team-builder.types';
import { SurveyResponse } from './team-builder/types/survey-response';
import { recalculateTeam } from './team-builder/utils/team-index-calculator';

const TEAM_BUILDER_DATA_QUERY = gql`
  query TeamBuilderData($clubId: ID!, $season: Float!) {
    club(id: $clubId) {
      id
      name
      teamName
      fullName
      abbreviation
      useForTeamName
      teams(args: { where: [{ season: { eq: $season } }], take: 50, order: { name: ASC } }) {
        id
        name
        season
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
            rankingLastPlaces {
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

const SAVE_TEAM_BUILDER = gql`
  mutation SaveTeamBuilder($clubId: ID!, $season: Float!, $teams: [TeamBuilderTeamInput!]!) {
    saveTeamBuilder(clubId: $clubId, season: $season, teams: $teams)
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

interface SubEventInfo {
  id: string;
  name: string;
  level?: number;
  maxLevel?: number;
  minBaseIndex?: number;
  maxBaseIndex?: number;
  eventType?: string;
}

interface TeamBuilderData {
  club: {
    id: string;
    name: string;
    teamName: string;
    fullName?: string;
    abbreviation: string;
    useForTeamName: UseForTeamName;
    teams: (Team & {
      entries?: {
        id: string;
        meta?: { competition?: { teamIndex?: number } };
        subEvent?: SubEventInfo;
      }[];
    })[];
  };
}

interface NextSeasonData {
  club: {
    id: string;
    teams: (Team & { link?: string })[];
  };
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
  readonly initialized = signal(false);
  readonly loadedFromDraft = signal(false);

  // Manually added/removed players
  // Tracks how many pool slots have been removed per player (not all-or-nothing)
  readonly removedSlots = signal<Map<string, number>>(new Map());
  readonly removedPlayers = signal<TeamBuilderPlayer[]>([]);
  readonly manuallyAddedPlayers = signal<TeamBuilderPlayer[]>([]);

  // Sub-event info collected from current season entries (for promotion shifting)
  private subEventsByType = signal<Map<string, SubEventInfo[]>>(new Map());

  // Data resource for current season teams
  private dataResource = resource({
    params: () => ({
      clubId: this.clubId(),
      season: this.season(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || !params.season) return null;

      try {
        const result = await lastValueFrom(
          this.apollo.query<TeamBuilderData>({
            query: TEAM_BUILDER_DATA_QUERY,
            variables: { clubId: params.clubId, season: params.season },
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
          this.apollo.query<NextSeasonData>({
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

    const removedSlotsMap = this.removedSlots();
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
      const removedCount = removedSlotsMap.get(p.id) ?? 0;
      const desiredCount = p.survey?.desiredTeamCount;

      // If survey has a desired count, use it; otherwise default to 1 slot
      const totalSlots = desiredCount != null && desiredCount > 0 ? desiredCount : 1;
      const remainingSlots = Math.max(0, totalSlots - currentCount - removedCount);

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
    const errors = activeTeams.flatMap((t) => t.validationErrors.map((e) => `${t.name}: ${e}`));

    // Cross-team validation: players assigned as REGULAR to more teams than they want (backups don't count)
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

    for (const [, info] of playerTeamCount) {
      if (info.desired > 0 && info.count > info.desired) {
        errors.push(`${info.name}: wants ${info.desired} team(s), assigned to ${info.count}`);
      }
    }

    return { valid, invalid, total: activeTeams.length, errors };
  });

  nextSeason = computed(() => (this.season() ?? 0) + 1);

  /**
   * Get all club players from current season teams as MatchedPlayer objects,
   * suitable for passing to PlayerMatcherService for local matching.
   */
  getClubPlayers(): { id: string; fullName: string; firstName: string; lastName: string; gender?: string; slug?: string; memberId?: string }[] {
    const data = this.dataResource.value();
    if (!data?.club?.teams) return [];

    const playerMap = new Map<string, { id: string; fullName: string; firstName: string; lastName: string; gender?: string; slug?: string; memberId?: string }>();

    for (const team of data.club.teams) {
      for (const m of (team as any).teamPlayerMemberships ?? []) {
        const player = m.player;
        if (!player || playerMap.has(player.id)) continue;

        playerMap.set(player.id, {
          id: player.id,
          fullName: player.fullName ?? '',
          firstName: player.firstName ?? '',
          lastName: player.lastName ?? '',
          gender: player.gender,
          slug: player.slug,
          memberId: player.memberId,
        });
      }
    }

    return Array.from(playerMap.values());
  }

  setClubId(clubId: string | null) {
    this.clubId.set(clubId);
  }

  setSeason(season: number | null) {
    this.season.set(season);
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
  }

  private collectSubEventInfo() {
    const currentTeams = this.currentTeams();
    const byType = new Map<string, SubEventInfo[]>();

    for (const team of currentTeams) {
      const entries = (team as any).entries ?? [];
      for (const entry of entries) {
        if (entry.subEvent) {
          const type = entry.subEvent.eventType ?? team.type;
          if (!byType.has(type)) {
            byType.set(type, []);
          }
          const existing = byType.get(type)!;
          if (!existing.some((s: SubEventInfo) => s.id === entry.subEvent.id)) {
            existing.push(entry.subEvent);
          }
        }
      }
    }

    // Sort each type's sub-events by level ascending
    for (const [, subs] of byType) {
      subs.sort((a: SubEventInfo, b: SubEventInfo) => (a.level ?? 0) - (b.level ?? 0));
    }

    this.subEventsByType.set(byType);
  }

  private initializeFromDraft(nextTeams: (Team & { link?: string })[]) {
    const surveys = this.surveyResponses();
    const surveyMap = this.buildSurveyMap(surveys);
    const currentPlayerIds = this.getCurrentSeasonPlayerIds();

    // Map next-season teams to builder teams, inheriting sub-event info from current season via link
    const currentTeamMap = new Map(this.currentTeams().map((t) => [t.id, t]));

    const builderTeams: TeamBuilderTeam[] = nextTeams.map((team) => {
      // Find linked current-season team for sub-event constraints
      const linkedTeam = team.link ? currentTeamMap.get(team.link) : undefined;
      const entry = linkedTeam ? (linkedTeam as any).entries?.[0] : undefined;
      const subEvent = entry?.subEvent;

      const players = this.buildPlayers(team, surveyMap, currentPlayerIds);

      const builderTeam: TeamBuilderTeam = {
        id: team.id,
        name: team.name ?? '',
        type: (team.type as 'M' | 'F' | 'MX') ?? 'M',
        teamNumber: team.teamNumber,
        preferredDay: team.preferredDay,
        captainId: team.captainId,
        isNew: false,
        isPromoted: false,
        isMarkedForRemoval: false,
        subEventId: subEvent?.id,
        maxAllowedIndex: subEvent?.maxBaseIndex,
        minLevel: subEvent?.level,
        maxLevel: subEvent?.maxLevel,
        currentLevel: subEvent?.level,
        players,
        teamIndex: 0,
        isValid: true,
        validationErrors: [],
      };

      return recalculateTeam(builderTeam);
    });

    this.teams.set(builderTeams);
  }

  private initializeFromCurrentSeason() {
    const currentTeams = this.currentTeams();
    const surveys = this.surveyResponses();
    const surveyMap = this.buildSurveyMap(surveys);
    const currentPlayerIds = this.getCurrentSeasonPlayerIds();

    const builderTeams: TeamBuilderTeam[] = currentTeams.map((team) => {
      const entry = (team as any).entries?.[0];
      const subEvent = entry?.subEvent;

      const players = this.buildPlayers(team, surveyMap, currentPlayerIds);

      const builderTeam: TeamBuilderTeam = {
        id: team.id,
        name: team.name ?? '',
        type: (team.type as 'M' | 'F' | 'MX') ?? 'M',
        teamNumber: team.teamNumber,
        preferredDay: team.preferredDay,
        captainId: team.captainId,
        isNew: false,
        isPromoted: false,
        isMarkedForRemoval: false,
        subEventId: subEvent?.id,
        maxAllowedIndex: subEvent?.maxBaseIndex,
        minLevel: subEvent?.level,
        maxLevel: subEvent?.maxLevel,
        currentLevel: subEvent?.level,
        players,
        teamIndex: 0,
        isValid: true,
        validationErrors: [],
      };

      return recalculateTeam(builderTeam);
    });

    this.teams.set(builderTeams);
  }

  private buildPlayers(
    team: Team,
    surveyMap: Map<string, SurveyResponse>,
    currentPlayerIds: Set<string>,
  ): TeamBuilderPlayer[] {
    return (team.teamPlayerMemberships ?? []).map((m: any) => {
      const player = m.player;
      const ranking = player?.rankingLastPlaces?.[0];
      const survey = surveyMap.get(player?.id);

      return {
        id: player?.id ?? '',
        fullName: player?.fullName ?? '',
        firstName: player?.firstName ?? '',
        lastName: player?.lastName ?? '',
        gender: player?.gender as 'M' | 'F' | undefined,
        slug: player?.slug,
        single: ranking?.single ?? 0,
        double: ranking?.double ?? 0,
        mix: ranking?.mix ?? 0,
        survey,
        lowPerformance: false,
        encounterPresencePercent: 100,
        isNewPlayer: !currentPlayerIds.has(player?.id),
        isStopping: survey?.stoppingCompetition ?? false,
        assignedTeamId: team.id,
        membershipType: m.membershipType ?? 'REGULAR',
      } satisfies TeamBuilderPlayer;
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

      return recalculateTeam({ ...team, players: remainingPlayers });
    });

    this.teams.set(updatedTeams);
    this.stoppingPlayers.set(newStoppingPlayers);
    this.updateTeamCountWarnings();
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
          recalculateTeam(fromTeam);
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
        recalculateTeam(toTeam);
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
      return recalculateTeam({ ...t, players });
    });
    this.teams.set(teams);
    this.updateTeamCountWarnings();
  }

  addTeam(type: 'M' | 'F' | 'MX') {
    const teams = this.teams();
    const teamNumber = teams.filter((t) => t.type === type && !t.isMarkedForRemoval).length + 1;
    const newTeam: TeamBuilderTeam = {
      id: crypto.randomUUID(),
      name: this.buildTeamName(type, teamNumber),
      type,
      teamNumber,
      isNew: true,
      isPromoted: false,
      isMarkedForRemoval: false,
      players: [],
      teamIndex: 0,
      isValid: false,
      validationErrors: ['Need at least 4 regular players, have 0'],
    };
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
   * Remove one pool slot for a player. If the player is dragged from a team or stopping zone,
   * they are removed from that source. Each call removes exactly one slot.
   */
  removePlayer(playerId: string, fromTeamId?: string | null) {
    // Find the player for the restore list (only add once)
    const existing = this.removedPlayers().find((p) => p.id === playerId);
    if (!existing) {
      const player = this.getAllPlayersFromData().find((p) => p.id === playerId)
        ?? this.teams().flatMap((t) => t.players).find((p) => p.id === playerId)
        ?? this.stoppingPlayers().find((p) => p.id === playerId)
        ?? this.manuallyAddedPlayers().find((p) => p.id === playerId);

      if (player) {
        this.removedPlayers.update((rp) => [...rp, player]);
      }
    }

    // If coming from a team, remove the player from that team
    if (fromTeamId && fromTeamId !== 'stopping') {
      const teams = this.teams().map((t) => {
        if (t.id !== fromTeamId) return t;
        const idx = t.players.findIndex((p) => p.id === playerId);
        if (idx < 0) return t;
        const players = [...t.players];
        players.splice(idx, 1);
        return recalculateTeam({ ...t, players });
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

    // Increment the removed slot count by 1
    this.removedSlots.update((map) => {
      const next = new Map(map);
      next.set(playerId, (next.get(playerId) ?? 0) + 1);
      return next;
    });

    this.updateTeamCountWarnings();
  }

  /**
   * Restore one removed slot for a player back to the pool.
   */
  restorePlayer(playerId: string) {
    this.removedSlots.update((map) => {
      const next = new Map(map);
      const current = next.get(playerId) ?? 0;
      if (current <= 1) {
        next.delete(playerId);
      } else {
        next.set(playerId, current - 1);
      }
      return next;
    });

    // Remove one entry from removedPlayers display list
    this.removedPlayers.update((rp) => {
      const idx = rp.findIndex((p) => p.id === playerId);
      if (idx < 0) return rp;
      // If this was the last removed slot, remove from display
      const remaining = this.removedSlots().get(playerId) ?? 0;
      if (remaining === 0) {
        return rp.filter((p) => p.id !== playerId);
      }
      return rp;
    });
  }

  /**
   * Search for players by name. Club players first, then global search API.
   */
  async searchPlayers(query: string): Promise<{ id: string; fullName: string; firstName: string; lastName: string; gender?: string }[]> {
    if (!query || query.length < 2) return [];

    const normalizedQuery = query.toLowerCase();

    // Club players first
    const clubPlayers = this.getClubPlayers();
    const clubMatches = clubPlayers.filter((p) =>
      p.fullName.toLowerCase().includes(normalizedQuery),
    );

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
        .map((r) => ({
          id: r.hit.objectID,
          fullName: r.hit.fullName ?? `${r.hit.firstName ?? ''} ${r.hit.lastName ?? ''}`.trim(),
          firstName: r.hit.firstName ?? '',
          lastName: r.hit.lastName ?? '',
          gender: r.hit.gender,
        }));

      return [...clubMatches, ...globalMatches];
    } catch {
      return clubMatches;
    }
  }

  /**
   * Add an external player (from search) to the pool with rankings.
   */
  async addExternalPlayer(playerBasic: { id: string; fullName: string; firstName: string; lastName: string; gender?: string }): Promise<boolean> {
    // Don't add if already present
    const allPlayerIds = new Set([
      ...this.getAllPlayersFromData().map((p) => p.id),
      ...this.manuallyAddedPlayers().map((p) => p.id),
    ]);
    if (allPlayerIds.has(playerBasic.id)) {
      // If removed, just restore
      if (this.removedSlots().has(playerBasic.id)) {
        this.restorePlayer(playerBasic.id);
        return true;
      }
      return false;
    }

    // Fetch rankings
    const systemId = this.systemId();
    let single = 0, double = 0, mix = 0;

    if (systemId) {
      try {
        const result = await lastValueFrom(
          this.apollo.query<{ players: { id: string; rankingLastPlaces?: { single: number; double: number; mix: number }[] }[] }>({
            query: PLAYER_WITH_RANKINGS_QUERY,
            variables: {
              args: { where: { id: { in: [playerBasic.id] } }, take: 1 },
              rankingLastPlacesArgs: { where: [{ systemId: { eq: systemId } }] },
            },
          }),
        );
        const fetched = result.data?.players?.[0];
        const ranking = fetched?.rankingLastPlaces?.[0];
        if (ranking) {
          single = ranking.single;
          double = ranking.double;
          mix = ranking.mix;
        }
      } catch {
        // Continue without rankings
      }
    }

    const tbPlayer: TeamBuilderPlayer = {
      id: playerBasic.id,
      fullName: playerBasic.fullName,
      firstName: playerBasic.firstName,
      lastName: playerBasic.lastName,
      gender: playerBasic.gender as 'M' | 'F' | undefined,
      single,
      double,
      mix,
      lowPerformance: false,
      encounterPresencePercent: 0,
      isNewPlayer: true,
      isStopping: false,
      membershipType: 'REGULAR',
    };

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
   * Toggle promotion for a team. When promoted, shift to the next higher level's constraints.
   * Level numbers go up (level 1 is highest/strongest), so promotion = level - 1.
   */
  promoteTeam(teamId: string) {
    const teams = this.teams().map((t) => {
      if (t.id !== teamId) return t;

      const promoted = !t.isPromoted;
      const subEvents = this.subEventsByType().get(t.type) ?? [];

      if (promoted && t.currentLevel != null) {
        // Find the next higher level (lower number)
        const targetLevel = t.currentLevel - 1;
        const targetSubEvent = subEvents.find((s: SubEventInfo) => s.level === targetLevel);

        return recalculateTeam({
          ...t,
          isPromoted: true,
          minLevel: targetSubEvent?.level ?? targetLevel,
          maxLevel: targetSubEvent?.maxLevel,
          maxAllowedIndex: targetSubEvent?.maxBaseIndex ?? t.maxAllowedIndex,
          subEventId: targetSubEvent?.id ?? t.subEventId,
        });
      } else {
        // Revert to original level
        const originalSubEvent = subEvents.find((s: SubEventInfo) => s.level === t.currentLevel);

        return recalculateTeam({
          ...t,
          isPromoted: false,
          minLevel: t.currentLevel,
          maxLevel: originalSubEvent?.maxLevel ?? t.maxLevel,
          maxAllowedIndex: originalSubEvent?.maxBaseIndex ?? t.maxAllowedIndex,
          subEventId: originalSubEvent?.id ?? t.subEventId,
        });
      }
    });

    this.teams.set(teams);
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

    const teamsInput = this.teams().filter((t) => !t.isMarkedForRemoval).map((t) => ({
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

    for (const team of data.club.teams) {
      for (const m of (team as any).teamPlayerMemberships ?? []) {
        const player = m.player;
        if (!player || playerMap.has(player.id)) continue;

        const ranking = player.rankingLastPlaces?.[0];
        const survey = this.surveyResponses().find((s) => s.matchedPlayerId === player.id);

        playerMap.set(player.id, {
          id: player.id,
          fullName: player.fullName ?? '',
          firstName: player.firstName ?? '',
          lastName: player.lastName ?? '',
          gender: player.gender as 'M' | 'F' | undefined,
          slug: player.slug,
          single: ranking?.single ?? 0,
          double: ranking?.double ?? 0,
          mix: ranking?.mix ?? 0,
          survey,
          lowPerformance: false,
          encounterPresencePercent: 100,
          isNewPlayer: !currentPlayerIds.has(player.id),
          isStopping: survey?.stoppingCompetition ?? false,
          membershipType: 'REGULAR',
        });
      }
    }

    // Also add survey-matched players not in any current team
    for (const s of this.surveyResponses()) {
      if (s.matchedPlayerId && !playerMap.has(s.matchedPlayerId)) {
        playerMap.set(s.matchedPlayerId, {
          id: s.matchedPlayerId,
          fullName: s.matchedPlayerName ?? s.fullName,
          firstName: '',
          lastName: '',
          single: 0,
          double: 0,
          mix: 0,
          survey: s,
          lowPerformance: false,
          encounterPresencePercent: 0,
          isNewPlayer: true,
          isStopping: s.stoppingCompetition,
          membershipType: 'REGULAR',
        });
      }
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

    let changed = false;
    const updated = allTeams.map((team) => {
      const updatedPlayers = team.players.map((player) => {
        const count = playerTeamCount.get(player.id) ?? 0;
        const desired = player.survey?.desiredTeamCount;
        let teamCountWarning: string | undefined;

        if (desired != null && desired > 0) {
          if (count > desired) {
            teamCountWarning = `Wants ${desired} team(s), assigned to ${count}`;
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
