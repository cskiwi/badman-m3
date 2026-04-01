import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { Team } from '@app/models';
import { UseForTeamName } from '@app/models-enum';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { sortTeams } from '@app/utils/sorts';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import {
  TEAM_BUILDER_AUTO_SUB_EVENT,
  TeamBuilderPlayer,
  TeamBuilderStandingOutcome,
  TeamBuilderTeam,
} from './team-builder/types/team-builder.types';
import { SurveyResponse } from './team-builder/types/survey-response';
import { MatchResult, MatchedPlayer } from './team-builder/services/player-matcher.service';
import { calculateTeamIndex, recalculateTeam } from './team-builder/utils/team-index-calculator';

const TEAM_BUILDER_DATA_QUERY = gql`
  query TeamBuilderData(
    $clubId: ID!
    $season: Float!
    $rankingLastPlacesArgs: RankingLastPlaceArgs
  ) {
    club(id: $clubId) {
      id
      name
      teamName
      fullName
      abbreviation
      useForTeamName
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

interface SubEventInfo {
  id: string;
  name: string;
  level?: number;
  maxLevel?: number;
  minBaseIndex?: number;
  maxBaseIndex?: number;
  eventType?: string;
}

interface StandingInfo {
  position?: number;
  size?: number;
  riser?: boolean;
  faller?: boolean;
}

interface CompetitionDrawInfo {
  id: string;
  size?: number;
  risers?: number;
  fallers?: number;
}

interface TeamEntryInfo {
  id: string;
  meta?: { competition?: { teamIndex?: number } };
  standing?: StandingInfo;
  competitionDraw?: CompetitionDrawInfo;
  competitionSubEvents?: SubEventInfo[];
}

interface TeamBuilderData {
  club: {
    id: string;
    name: string;
    teamName: string;
    fullName?: string;
    abbreviation: string;
    useForTeamName: UseForTeamName;
    clubPlayerMemberships?: {
      id: string;
      active?: boolean;
      player?: MatchedPlayer | null;
    }[];
    teams: (Team & { entries?: TeamEntryInfo[] })[];
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
  readonly matchedImportPlayers = signal<MatchedPlayer[]>([]);
  readonly initialized = signal(false);
  readonly loadedFromDraft = signal(false);

  // Manually added/removed players
  // slotAdjustments: negative = net removed slots, positive = extra slots added.
  // Pool formula: remainingSlots = max(0, desiredSlots + adjustment - regularTeamCount)
  readonly slotAdjustments = signal<Map<string, number>>(new Map());
  readonly removedPlayers = signal<TeamBuilderPlayer[]>([]);
  readonly manuallyAddedPlayers = signal<TeamBuilderPlayer[]>([]);

  // Sub-event info collected from current season entries for automatic selection and validation.
  private subEventsByType = signal<Map<string, SubEventInfo[]>>(new Map());

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
          this.apollo.query<TeamBuilderData>({
            query: TEAM_BUILDER_DATA_QUERY,
            variables: {
              clubId: params.clubId,
              season: params.season,
              rankingLastPlacesArgs: params.systemId
                ? { where: [{ systemId: { eq: params.systemId } }] }
                : undefined,
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

  /**
   * Get all active club players as MatchedPlayer objects, suitable for
   * passing to PlayerMatcherService for local matching.
   */
  getClubPlayers(): { id: string; fullName: string; firstName: string; lastName: string; gender?: string; slug?: string; memberId?: string }[] {
    const data = this.dataResource.value();
    const memberships = data?.club?.clubPlayerMemberships ?? [];
    if (memberships.length === 0) return [];

    const playerMap = new Map<string, { id: string; fullName: string; firstName: string; lastName: string; gender?: string; slug?: string; memberId?: string }>();

    for (const membership of memberships) {
      if (membership.active === false || !membership.player) continue;

      const player = membership.player;
      if (!player?.id || playerMap.has(player.id)) continue;

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
      const entries = team.entries ?? [];
      for (const entry of entries) {
        const subEvent = this.getPrimaryCompetitionSubEvent(entry);
        if (subEvent) {
          const type = subEvent.eventType ?? team.type;
          if (!byType.has(type)) {
            byType.set(type, []);
          }
          const existing = byType.get(type)!;
          if (!existing.some((s: SubEventInfo) => s.id === subEvent.id)) {
            existing.push(subEvent);
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

  getSubEventOptions(type: 'M' | 'F' | 'MX') {
    const subEvents = this.subEventsByType().get(type) ?? [];
    return [
      { label: 'Auto', value: TEAM_BUILDER_AUTO_SUB_EVENT },
      ...subEvents.map((subEvent) => ({
        label: this.formatSubEventOptionLabel(subEvent),
        value: subEvent.id,
      })),
    ];
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

  private formatSubEventOptionLabel(subEvent: SubEventInfo) {
    const name = subEvent.name?.trim() || (subEvent.level != null ? `Level ${subEvent.level}` : 'Unnamed');
    const min = subEvent.minBaseIndex ?? '?';
    const max = subEvent.maxBaseIndex ?? '?';
    return `${name} (${min}-${max})`;
  }

  private getPrimaryCompetitionSubEvent(entry?: TeamEntryInfo): SubEventInfo | undefined {
    return entry?.competitionSubEvents?.[0];
  }

  private resolveStandingOutcome(entry?: TeamEntryInfo): TeamBuilderStandingOutcome {
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

  private getOriginalSubEvent(team: Pick<TeamBuilderTeam, 'type' | 'originalSubEventId' | 'currentLevel'>): SubEventInfo | undefined {
    return this.findSubEvent(team.type, team.originalSubEventId, team.currentLevel);
  }

  private findSubEvent(type: 'M' | 'F' | 'MX', id?: string, level?: number): SubEventInfo | undefined {
    const subEvents = this.subEventsByType().get(type) ?? [];

    if (id) {
      const byId = subEvents.find((subEvent) => subEvent.id === id);
      if (byId) {
        return byId;
      }
    }

    if (level != null) {
      return subEvents.find((subEvent) => subEvent.level === level);
    }

    return undefined;
  }

  private findMatchingSubEvent(type: 'M' | 'F' | 'MX', referenceIndex: number, preferredSubEventId?: string): SubEventInfo | undefined {
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

  private isIndexWithinSubEvent(referenceIndex: number, subEvent?: SubEventInfo): boolean {
    if (!subEvent) {
      return false;
    }

    const aboveMin = subEvent.minBaseIndex == null || referenceIndex >= subEvent.minBaseIndex;
    const belowMax = subEvent.maxBaseIndex == null || referenceIndex <= subEvent.maxBaseIndex;

    return aboveMin && belowMax;
  }

  private resolveAutomaticSubEvent(
    team: Pick<TeamBuilderTeam, 'type' | 'standingOutcome' | 'currentLevel' | 'originalSubEventId'>,
    referenceIndex: number,
  ): SubEventInfo | undefined {
    const originalSubEvent = this.getOriginalSubEvent(team);

    if (team.standingOutcome === 'PROMOTED' && team.currentLevel != null) {
      return this.findSubEvent(team.type, undefined, team.currentLevel - 1) ?? originalSubEvent;
    }

    if (team.standingOutcome === 'DEMOTED' && team.currentLevel != null) {
      return this.findSubEvent(team.type, undefined, team.currentLevel + 1) ?? originalSubEvent;
    }

    return this.findMatchingSubEvent(team.type, referenceIndex, originalSubEvent?.id) ?? originalSubEvent;
  }

  private applySelectedSubEvent(team: TeamBuilderTeam, subEvent?: SubEventInfo): TeamBuilderTeam {
    return recalculateTeam({
      ...team,
      subEventId: subEvent?.id,
      subEventName: subEvent?.name,
      minAllowedIndex: subEvent?.minBaseIndex,
      maxAllowedIndex: subEvent?.maxBaseIndex,
      minLevel: subEvent?.level,
      maxLevel: subEvent?.maxLevel,
    });
  }

  private recalculateManagedTeam(team: TeamBuilderTeam): TeamBuilderTeam {
    if (team.isMarkedForRemoval) {
      return recalculateTeam(team);
    }

    if (team.subEventManuallyOverridden) {
      return this.applySelectedSubEvent(team, this.findSubEvent(team.type, team.subEventId) ?? this.getOriginalSubEvent(team));
    }

    const regularPlayerCount = team.players.filter((player) => player.membershipType === 'REGULAR').length;
    const calculatedIndex = calculateTeamIndex(team.players, team.type);
    const referenceIndex = regularPlayerCount >= 4 ? calculatedIndex : (team.originalTeamIndex ?? calculatedIndex);

    return this.applySelectedSubEvent(team, this.resolveAutomaticSubEvent(team, referenceIndex));
  }

  private createBuilderTeam(team: Team, players: TeamBuilderPlayer[], entry?: TeamEntryInfo): TeamBuilderTeam {
    const subEvent = this.getPrimaryCompetitionSubEvent(entry);
    const standingOutcome = this.resolveStandingOutcome(entry);

    return this.recalculateManagedTeam({
      id: team.id,
      name: team.name ?? '',
      type: (team.type as 'M' | 'F' | 'MX') ?? 'M',
      teamNumber: team.teamNumber,
      preferredDay: team.preferredDay,
      captainId: team.captainId,
      isNew: false,
      isPromoted: standingOutcome === 'PROMOTED',
      isDemoted: standingOutcome === 'DEMOTED',
      isMarkedForRemoval: false,
      standingOutcome,
      standingPosition: entry?.standing?.position,
      originalSubEventId: subEvent?.id,
      originalTeamIndex: entry?.meta?.competition?.teamIndex,
      subEventId: subEvent?.id,
      subEventName: subEvent?.name,
      minAllowedIndex: subEvent?.minBaseIndex,
      maxAllowedIndex: subEvent?.maxBaseIndex,
      minLevel: subEvent?.level,
      maxLevel: subEvent?.maxLevel,
      currentLevel: subEvent?.level,
      subEventManuallyOverridden: false,
      players,
      teamIndex: 0,
      isValid: true,
      validationErrors: [],
    });
  }

  private initializeFromDraft(nextTeams: (Team & { link?: string })[]) {
    const surveys = this.surveyResponses();
    const surveyMap = this.buildSurveyMap(surveys);
    const currentPlayerIds = this.getCurrentSeasonPlayerIds();

    // Map next-season teams to builder teams, inheriting sub-event info from current season via link
    const currentTeamMap = new Map<string, Team & { entries?: TeamEntryInfo[] }>();
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
            createPlayersForTeamBuilder: { id: string; fullName: string; firstName: string; lastName: string; gender?: string; slug?: string }[];
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
          toCreate[i].player = {
            id: created.id,
            fullName: created.fullName,
            firstName: created.firstName,
            lastName: created.lastName,
            gender: created.gender,
            slug: created.slug,
          };
        }
      } catch (err) {
        console.error('Failed to create new players', err);
      }
    }

    this.matchedImportPlayers.set(
      this.collectMatchedImportPlayers(results),
    );

    // Collect surveys from all matched + newly created results
    const surveys = results
      .filter((r) => r.player)
      .map((r) => r.survey);

    this.applySurveyData(surveys);
  }

  private collectMatchedImportPlayers(results: MatchResult[]): MatchedPlayer[] {
    const playerMap = new Map<string, MatchedPlayer>();

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
    const updateInArray = (arr: TeamBuilderPlayer[]) =>
      arr.map((p) => (p.id === playerId ? { ...p, survey, isStopping } : p));

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
    const newTeam: TeamBuilderTeam = {
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
      const player = this.getAllPlayersFromData().find((p) => p.id === playerId)
        ?? this.teams().flatMap((t) => t.players).find((p) => p.id === playerId)
        ?? this.stoppingPlayers().find((p) => p.id === playerId)
        ?? this.manuallyAddedPlayers().find((p) => p.id === playerId);
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
    const knownIds = new Set([
      ...this.getAllPlayersFromData().map((p) => p.id),
      ...this.manuallyAddedPlayers().map((p) => p.id),
    ]);

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
    const importedPlayerMap = new Map(
      this.matchedImportPlayers().map((player) => [player.id, player]),
    );

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
      if (!s.matchedPlayerId || playerMap.has(s.matchedPlayerId)) continue;

      const importedPlayer = importedPlayerMap.get(s.matchedPlayerId);
      const ranking = importedPlayer?.rankingLastPlaces?.[0];

      playerMap.set(s.matchedPlayerId, {
        id: s.matchedPlayerId,
        fullName: importedPlayer?.fullName ?? s.matchedPlayerName ?? s.fullName,
        firstName: importedPlayer?.firstName ?? s.firstName,
        lastName: importedPlayer?.lastName ?? s.lastName,
        gender: importedPlayer?.gender as 'M' | 'F' | undefined,
        slug: importedPlayer?.slug,
        single: ranking?.single ?? 0,
        double: ranking?.double ?? 0,
        mix: ranking?.mix ?? 0,
        survey: s,
        lowPerformance: false,
        encounterPresencePercent: 0,
        isNewPlayer: !currentPlayerIds.has(s.matchedPlayerId),
        isStopping: s.stoppingCompetition,
        membershipType: 'REGULAR',
      });
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
