import { computed, inject, Injectable, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Player, Team, CompetitionAssembly, RankingLastPlace } from '@app/models';
import { TeamMembershipType } from '@app/models-enum';
import { AuthService } from '@app/frontend-modules-auth/service';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { getSeason } from '@app/utils/comp';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export interface ValidationMessage {
  params: { [key: string]: unknown };
  message: string;
}

export interface ValidationResult {
  baseTeamIndex: number;
  baseTeamPlayers: (Player & { single: number; double: number; mix: number })[];
  titularsIndex: number;
  titularsPlayers: (Player & { single: number; double: number; mix: number })[];
  valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}

export interface PlayerWithRanking extends Omit<Player, 'rankingLastPlaces'> {
  rankingLastPlaces?: RankingLastPlace[];
  teamMembership?: { id: string; membershipType: TeamMembershipType; teamId: string };
}

const TEAM_QUERY = gql`
  query TeamInfo($id: ID!, $rankingLastPlacesArgs: RankingLastPlaceArgs, $rankingPlacesArgs: RankingPlaceArgs) {
    team(id: $id) {
      id
      captainId
      clubId
      teamNumber
      type
      name
      season
      teamPlayerMemberships {
        id
        membershipType
        teamId
        player {
          id
          slug
          firstName
          lastName
          gender
          competitionPlayer
          rankingLastPlaces(args: $rankingLastPlacesArgs) {
            id
            single
            double
            mix
          }
          rankingPlaces(args: $rankingPlacesArgs) {
            id
            rankingDate
            single
            double
            mix
          }
        }
      }
      entries {
        id
        meta {
          competition {
            teamIndex
            players {
              id
              player
              single
              double
              mix
              gender
              levelExceptionGiven
              levelExceptionReason
              levelExceptionRequested
            }
          }
        }
      }
    }
  }
`;

const SAVED_ASSEMBLY_QUERY = gql`
  query SavedAssembly($id: ID!) {
    competitionEncounter(id: $id) {
      id
      assemblies {
        id
        assembly
        captainId
      }
    }
  }
`;

const VALIDATE_ASSEMBLY_QUERY = gql`
  query ValidateAssembly($assembly: AssemblyInput!) {
    validateAssembly(assembly: $assembly) {
      valid
      baseTeamIndex
      baseTeamPlayers {
        id
        firstName
        lastName
        single
        double
        mix
      }
      titularsIndex
      titularsPlayers {
        id
        firstName
        lastName
        single
        double
        mix
      }
      errors {
        message
        params
      }
      warnings {
        message
        params
      }
    }
  }
`;

const EVENT_FOR_ENCOUNTER_QUERY = gql`
  query CompetitionEncounterEvent($competitionEncounterId: ID!) {
    competitionEncounter(id: $competitionEncounterId) {
      id
      drawCompetition {
        id
        competitionSubEvent {
          id
          competitionEvent {
            id
            season
            usedRankingUnit
            usedRankingAmount
          }
        }
      }
    }
  }
`;

const PLAYER_INFO_QUERY = gql`
  query getPlayerInfo($playerId: ID!, $rankingPlacesArgs: RankingPlaceArgs, $rankingLastPlacesArgs: RankingLastPlaceArgs) {
    player(id: $playerId) {
      id
      slug
      firstName
      lastName
      gender
      competitionPlayer
      rankingLastPlaces(args: $rankingLastPlacesArgs) {
        id
        single
        double
        mix
      }
      rankingPlaces(args: $rankingPlacesArgs) {
        id
        rankingDate
        single
        double
        mix
      }
    }
  }
`;

@Injectable()
export class AssemblyService {
  private readonly apollo = inject(Apollo);
  private readonly authService = inject(AuthService);
  private readonly systemService = inject(RankingSystemService);

  formGroup = new FormGroup({
    season: new FormControl<number>(getSeason()),
    club: new FormControl<string | null>(null),
    team: new FormControl<string | null>(null),
    encounter: new FormControl<string | null>(null),
    captain: new FormControl<string | null>(null),
    single1: new FormControl<PlayerWithRanking | null>(null),
    single2: new FormControl<PlayerWithRanking | null>(null),
    single3: new FormControl<PlayerWithRanking | null>(null),
    single4: new FormControl<PlayerWithRanking | null>(null),
    double1: new FormControl<PlayerWithRanking[]>([]),
    double2: new FormControl<PlayerWithRanking[]>([]),
    double3: new FormControl<PlayerWithRanking[]>([]),
    double4: new FormControl<PlayerWithRanking[]>([]),
    subtitudes: new FormControl<PlayerWithRanking[]>([]),
  });

  // State
  team = signal<Team | null>(null);
  type = signal<string | undefined>(undefined);
  loaded = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  showBackup = signal(false);

  players = signal<{ [key in TeamMembershipType]: PlayerWithRanking[] }>({
    [TeamMembershipType.REGULAR]: [],
    [TeamMembershipType.BACKUP]: [],
  });

  // Slot arrays
  single1 = signal<PlayerWithRanking[]>([]);
  single2 = signal<PlayerWithRanking[]>([]);
  single3 = signal<PlayerWithRanking[]>([]);
  single4 = signal<PlayerWithRanking[]>([]);
  double1 = signal<PlayerWithRanking[]>([]);
  double2 = signal<PlayerWithRanking[]>([]);
  double3 = signal<PlayerWithRanking[]>([]);
  double4 = signal<PlayerWithRanking[]>([]);
  substitutes = signal<PlayerWithRanking[]>([]);

  // Validation
  validationResult = signal<ValidationResult | null>(null);
  errors = computed(() => this.validationResult()?.errors ?? []);
  warnings = computed(() => this.validationResult()?.warnings ?? []);
  valid = computed(() => this.validationResult()?.valid ?? false);

  titulars = computed(() => {
    const result = this.validationResult();
    if (!result) return { index: 0, players: [] as (Player & { single: number; double: number; mix: number; sum: number })[] };
    return {
      index: result.titularsIndex,
      players: result.titularsPlayers?.map((p) => ({
        ...p,
        sum: p.single + p.double + (this.type() === 'MX' ? p.mix : 0),
      })) ?? [],
    };
  });

  base = computed(() => {
    const result = this.validationResult();
    if (!result) return { index: 0, players: [] as (Player & { single: number; double: number; mix: number; sum: number })[] };
    return {
      index: result.baseTeamIndex,
      players: result.baseTeamPlayers?.map((p) => ({
        ...p,
        sum: p.single + p.double + (this.type() === 'MX' ? p.mix : 0),
      })) ?? [],
    };
  });

  // Slot labels (dynamic based on team type)
  captionDouble1 = computed(() => this.getSlotLabel('double1'));
  captionDouble2 = computed(() => this.getSlotLabel('double2'));
  captionDouble3 = computed(() => this.getSlotLabel('double3'));
  captionDouble4 = computed(() => this.getSlotLabel('double4'));
  captionSingle1 = computed(() => this.getSlotLabel('single1'));
  captionSingle2 = computed(() => this.getSlotLabel('single2'));
  captionSingle3 = computed(() => this.getSlotLabel('single3'));
  captionSingle4 = computed(() => this.getSlotLabel('single4'));

  // Ranking date range
  private startRanking = signal<Date | null>(null);
  private endRanking = signal<Date | null>(null);

  // Level exceptions
  private levelExceptions = signal<Map<string, boolean>>(new Map());

  isException(playerId?: string): boolean {
    if (!playerId) return false;
    return this.levelExceptions().get(playerId) ?? false;
  }

  getSlotLabel(slotId: string): { prefix: string; label: string } {
    const t = this.type();
    if (t === 'M') {
      return {
        prefix: 'all.gender.males',
        label: slotId.startsWith('double') ? `all.competition.team-assembly.double${slotId.slice(-1)}` : `all.competition.team-assembly.single${slotId.slice(-1)}`,
      };
    } else if (t === 'F') {
      return {
        prefix: 'all.gender.females',
        label: slotId.startsWith('double') ? `all.competition.team-assembly.double${slotId.slice(-1)}` : `all.competition.team-assembly.single${slotId.slice(-1)}`,
      };
    } else {
      // MX
      if (slotId.startsWith('double')) {
        return { prefix: '', label: `all.competition.team-assembly.mix${slotId.slice(-1)}` };
      } else if (slotId === 'single1' || slotId === 'single2') {
        return { prefix: 'all.gender.males', label: `all.competition.team-assembly.single${slotId.slice(-1)}` };
      } else {
        // single3 and single4 use single1/single2 labels with females prefix
        const num = slotId === 'single3' ? '1' : '2';
        return { prefix: 'all.gender.females', label: `all.competition.team-assembly.single${num}` };
      }
    }
  }

  async loadData(encounterId?: string) {
    this.loading.set(true);
    this.loaded.set(false);
    this.error.set(null);

    // Clear slots
    this.single1.set([]);
    this.single2.set([]);
    this.single3.set([]);
    this.single4.set([]);
    this.double1.set([]);
    this.double2.set([]);
    this.double3.set([]);
    this.double4.set([]);
    this.substitutes.set([]);
    this.validationResult.set(null);

    const teamId = this.formGroup.get('team')?.value;
    if (!teamId) {
      this.loading.set(false);
      return;
    }

    try {
      const rankingWhere = await this.getRankingWhere(encounterId);

      const result = await lastValueFrom(
        this.apollo.query<{ team: Team }>({
          query: TEAM_QUERY,
          variables: { id: teamId, ...rankingWhere },
        }),
      );

      const teamData = result.data?.team;
      if (!teamData) throw new Error('No team found');

      this.team.set(teamData);
      this.type.set(teamData.type);

      // Categorize players
      const categorized = this.categorizePlayers(teamData);
      this.players.set(categorized);

      // Set level exceptions
      const exceptions = new Map<string, boolean>();
      const entryMeta = (teamData as any).entries?.[0]?.meta?.competition?.players;
      if (entryMeta) {
        for (const p of entryMeta) {
          if (p.levelExceptionGiven) exceptions.set(p.id, true);
        }
      }
      this.levelExceptions.set(exceptions);

      // Load saved assembly
      if (encounterId) {
        await this.loadSavedAssembly(encounterId, teamData.captainId, categorized);
      } else {
        this.formGroup.get('captain')?.setValue(teamData.captainId ?? null);
      }

      this.sortLists();
      this.syncFormFromSlots();
      await this.validate();
      this.loaded.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      this.loading.set(false);
    }
  }

  async validate() {
    try {
      const assembly = {
        captainId: this.formGroup.get('captain')?.value,
        teamId: this.formGroup.get('team')?.value,
        encounterId: this.formGroup.get('encounter')?.value,
        single1: this.single1()[0]?.id,
        single2: this.single2()[0]?.id,
        single3: this.single3()[0]?.id,
        single4: this.single4()[0]?.id,
        double1: this.double1().map((r) => r.id),
        double2: this.double2().map((r) => r.id),
        double3: this.double3().map((r) => r.id),
        double4: this.double4().map((r) => r.id),
        subtitudes: this.substitutes().map((r) => r.id),
      };

      const result = await lastValueFrom(
        this.apollo.query<{ validateAssembly: ValidationResult }>({
          query: VALIDATE_ASSEMBLY_QUERY,
          variables: { assembly },
          fetchPolicy: 'no-cache',
        }),
      );

      this.validationResult.set(result.data?.validateAssembly ?? null);
    } catch {
      // Validation failed silently
    }
  }

  syncFormFromSlots() {
    this.formGroup.get('single1')?.setValue(this.single1()[0] ?? null);
    this.formGroup.get('single2')?.setValue(this.single2()[0] ?? null);
    this.formGroup.get('single3')?.setValue(this.single3()[0] ?? null);
    this.formGroup.get('single4')?.setValue(this.single4()[0] ?? null);
    this.formGroup.get('double1')?.setValue(this.double1());
    this.formGroup.get('double2')?.setValue(this.double2());
    this.formGroup.get('double3')?.setValue(this.double3());
    this.formGroup.get('double4')?.setValue(this.double4());
    this.formGroup.get('subtitudes')?.setValue(this.substitutes());
  }

  async addPlayer(player: Player) {
    if (!player.id) return;

    const systemId = this.systemService.systemId();
    const rankingPlacesArgs = {
      where: [{ rankingDate: { gte: this.startRanking()?.toISOString(), lte: this.endRanking()?.toISOString() }, systemId: { eq: systemId } }],
    };
    const rankingLastPlacesArgs = { where: [{ systemId: { eq: systemId } }] };

    try {
      const result = await lastValueFrom(
        this.apollo.query<{ player: Player }>({
          query: PLAYER_INFO_QUERY,
          variables: {
            playerId: player.id,
            rankingPlacesArgs,
            rankingLastPlacesArgs,
          },
        }),
      );

      const loaded = result.data?.player as PlayerWithRanking;
      const current = this.players();
      this.players.set({
        ...current,
        [TeamMembershipType.REGULAR]: [...current[TeamMembershipType.REGULAR], loaded],
      });
      this.sortLists();
    } catch {
      // Player add failed
    }
  }

  validatePlayerForAdd = (player: Player): { valid: boolean; message?: string } => {
    const current = this.players();
    if (current[TeamMembershipType.REGULAR].find((p) => p.id === player.id)) {
      return { valid: false, message: 'all.player.search.in-list' };
    }
    if (current[TeamMembershipType.BACKUP].find((p) => p.id === player.id)) {
      return { valid: false, message: 'all.player.search.backup-player' };
    }
    return { valid: true };
  };

  canDrop(playerId: string, playerGender: string | undefined, targetSlotId: string): boolean {
    // Get target slot data
    const targetData = this.getSlotData(targetSlotId);
    const length = targetData.length;

    // Capacity check
    if (targetSlotId.includes('single') && length >= 1) return false;
    if (targetSlotId.includes('double') && length >= 2) return false;

    // Substitute restriction: cannot drop if already in a game slot
    if (targetSlotId.includes('substitu')) {
      if (this.isInAnyGameSlot(playerId)) return false;
    }

    // Duplicate check
    if (targetData.some((r) => r.id === playerId)) return false;

    // Gender restrictions for MX type
    if (this.type() === 'MX') {
      if (targetSlotId === 'double1' && playerGender === 'F') return false;
      if (targetSlotId === 'double2' && playerGender === 'M') return false;
      if (targetSlotId === 'double3' || targetSlotId === 'double4') {
        if (playerGender === 'M' && targetData.filter((r) => r.gender === 'M').length >= 1) return false;
        if (playerGender === 'F' && targetData.filter((r) => r.gender === 'F').length >= 1) return false;
      }
      if ((targetSlotId === 'single1' || targetSlotId === 'single2') && playerGender === 'F') return false;
      if ((targetSlotId === 'single3' || targetSlotId === 'single4') && playerGender === 'M') return false;
    }

    return true;
  }

  movePlayer(playerId: string, fromSlotId: string, toSlotId: string) {
    if (fromSlotId === toSlotId) return;

    const player = this.findPlayerById(playerId);
    if (!player) return;

    // Check if can drop
    if (!this.canDrop(playerId, player.gender, toSlotId)) return;

    if (fromSlotId === 'playerList') {
      // Copy from pool (player stays in pool)
      // Additional checks
      const allSingles = [...this.single1(), ...this.single2(), ...this.single3(), ...this.single4()];
      const allDoubles = [...this.double1(), ...this.double2(), ...this.double3(), ...this.double4()];

      if (toSlotId.includes('single') && allSingles.some((p) => p.id === playerId)) return;
      if (toSlotId.includes('double') && allDoubles.filter((p) => p.id === playerId).length >= 2) return;

      this.addToSlot(toSlotId, player);
    } else if (toSlotId === 'playerList') {
      // Remove from source slot
      this.removeFromSlot(fromSlotId, playerId);
    } else {
      // Transfer between slots
      this.removeFromSlot(fromSlotId, playerId);
      this.addToSlot(toSlotId, player);
    }

    // Auto-remove from substitutes when going to a game slot
    if (toSlotId !== 'substituteList' && toSlotId !== 'playerList') {
      this.substitutes.update((subs) => subs.filter((r) => r.id !== playerId));
    }

    this.syncFormFromSlots();
    this.validate();
  }

  // For mobile select mode
  setSlotPlayer(slotId: string, index: number, player: PlayerWithRanking | null) {
    const slotSignal = this.getSlotSignal(slotId);
    if (!slotSignal) return;

    slotSignal.update((current) => {
      const updated = [...current];
      if (player) {
        updated[index] = player;
      } else if (index < updated.length) {
        updated.splice(index, 1);
      }
      return updated;
    });

    this.syncFormFromSlots();
    this.validate();
  }

  getAvailablePlayersForSlot(slotId: string, excludeIndex?: number): PlayerWithRanking[] {
    const allPlayers = [...this.players()[TeamMembershipType.REGULAR], ...this.players()[TeamMembershipType.BACKUP]];
    const currentSlotData = this.getSlotData(slotId);

    return allPlayers.filter((player) => {
      // Skip the player at the current index (they're being replaced)
      if (excludeIndex !== undefined && currentSlotData[excludeIndex]?.id === player.id) return true;

      return this.canDrop(player.id, player.gender, slotId);
    });
  }

  private findPlayerById(playerId: string): PlayerWithRanking | undefined {
    const allPlayers = [...this.players()[TeamMembershipType.REGULAR], ...this.players()[TeamMembershipType.BACKUP]];
    return allPlayers.find((p) => p.id === playerId)
      ?? [...this.single1(), ...this.single2(), ...this.single3(), ...this.single4(),
          ...this.double1(), ...this.double2(), ...this.double3(), ...this.double4(),
          ...this.substitutes()].find((p) => p.id === playerId);
  }

  private isInAnyGameSlot(playerId: string): boolean {
    return [...this.single1(), ...this.single2(), ...this.single3(), ...this.single4(),
            ...this.double1(), ...this.double2(), ...this.double3(), ...this.double4()]
      .some((p) => p.id === playerId);
  }

  getSlotData(slotId: string): PlayerWithRanking[] {
    switch (slotId) {
      case 'single1': return this.single1();
      case 'single2': return this.single2();
      case 'single3': return this.single3();
      case 'single4': return this.single4();
      case 'double1': return this.double1();
      case 'double2': return this.double2();
      case 'double3': return this.double3();
      case 'double4': return this.double4();
      case 'substituteList': return this.substitutes();
      default: return [];
    }
  }

  private getSlotSignal(slotId: string) {
    switch (slotId) {
      case 'single1': return this.single1;
      case 'single2': return this.single2;
      case 'single3': return this.single3;
      case 'single4': return this.single4;
      case 'double1': return this.double1;
      case 'double2': return this.double2;
      case 'double3': return this.double3;
      case 'double4': return this.double4;
      case 'substituteList': return this.substitutes;
      default: return null;
    }
  }

  private addToSlot(slotId: string, player: PlayerWithRanking) {
    const sig = this.getSlotSignal(slotId);
    if (sig) sig.update((arr) => [...arr, player]);
  }

  private removeFromSlot(slotId: string, playerId: string) {
    const sig = this.getSlotSignal(slotId);
    if (sig) sig.update((arr) => arr.filter((p) => p.id !== playerId));
  }

  private categorizePlayers(teamData: Team): { [key in TeamMembershipType]: PlayerWithRanking[] } {
    const result = {
      [TeamMembershipType.REGULAR]: [] as PlayerWithRanking[],
      [TeamMembershipType.BACKUP]: [] as PlayerWithRanking[],
    };

    const memberships = teamData.teamPlayerMemberships ?? [];
    for (const membership of memberships) {
      const player = (membership as any).player;
      if (!player) continue;
      const type = membership.membershipType ?? TeamMembershipType.REGULAR;
      const p = { ...player, teamMembership: membership } as PlayerWithRanking;
      (result as Record<string, PlayerWithRanking[]>)[type].push(p);
    }

    return result;
  }

  private async loadSavedAssembly(
    encounterId: string,
    captainId?: string,
    categorized?: { [key in TeamMembershipType]: PlayerWithRanking[] },
  ) {
    if (!this.authService.loggedIn()) {
      this.formGroup.get('captain')?.setValue(captainId ?? null);
      return;
    }

    try {
      const result = await lastValueFrom(
        this.apollo.query<{ competitionEncounter: { assemblies: CompetitionAssembly[] } }>({
          query: SAVED_ASSEMBLY_QUERY,
          variables: {
            id: encounterId,
          },
        }),
      );

      const saved = result.data?.competitionEncounter?.assemblies?.[0];
      this.formGroup.get('captain')?.setValue(saved?.captainId ?? captainId ?? null);

      if (!saved?.assembly) return;
      const assembly = saved.assembly as any;

      // Fetch missing players
      const allIds = [
        ...(assembly.double1 ?? []),
        ...(assembly.double2 ?? []),
        ...(assembly.double3 ?? []),
        ...(assembly.double4 ?? []),
        assembly.single1,
        assembly.single2,
        assembly.single3,
        assembly.single4,
        ...(assembly.subtitudes ?? assembly.substitutes ?? []),
      ].filter(Boolean);

      const allKnown = [...(categorized?.[TeamMembershipType.REGULAR] ?? []), ...(categorized?.[TeamMembershipType.BACKUP] ?? [])];
      const missingIds = [...new Set(allIds)].filter((id) => !allKnown.find((p) => p.id === id));

      for (const id of missingIds) {
        await this.addPlayer({ id } as Player);
      }

      // Populate slots
      const getPlayers = (ids: string[]) =>
        ids.map((id) => this.findPlayerById(id)).filter(Boolean) as PlayerWithRanking[];

      if (assembly.double1) this.double1.set(getPlayers(assembly.double1));
      if (assembly.double2) this.double2.set(getPlayers(assembly.double2));
      if (assembly.double3) this.double3.set(getPlayers(assembly.double3));
      if (assembly.double4) this.double4.set(getPlayers(assembly.double4));
      if (assembly.single1) this.single1.set(getPlayers([assembly.single1]));
      if (assembly.single2) this.single2.set(getPlayers([assembly.single2]));
      if (assembly.single3) this.single3.set(getPlayers([assembly.single3]));
      if (assembly.single4) this.single4.set(getPlayers([assembly.single4]));
      if (assembly.subtitudes ?? assembly.substitutes) {
        this.substitutes.set(getPlayers(assembly.subtitudes ?? assembly.substitutes));
      }
    } catch {
      this.formGroup.get('captain')?.setValue(captainId ?? null);
    }
  }

  private async getRankingWhere(encounterId?: string) {
    const systemId = this.systemService.systemId();
    if (!encounterId) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.startRanking.set(start);
      this.endRanking.set(end);
      return {
        rankingPlacesArgs: { where: [{ rankingDate: { gte: start.toISOString(), lte: end.toISOString() }, systemId: { eq: systemId } }] },
        rankingLastPlacesArgs: { where: [{ systemId: { eq: systemId } }] },
      };
    }

    try {
      const result = await lastValueFrom(
        this.apollo.query<{ competitionEncounter: any }>({
          query: EVENT_FOR_ENCOUNTER_QUERY,
          variables: { competitionEncounterId: encounterId },
        }),
      );

      const event = result.data?.competitionEncounter?.drawCompetition?.competitionSubEvent?.competitionEvent;
      if (!event?.season || !event?.usedRankingUnit || !event?.usedRankingAmount) {
        throw new Error('No event');
      }

      const date = new Date();
      date.setFullYear(event.season);
      if (event.usedRankingUnit === 'month') {
        date.setMonth(event.usedRankingAmount);
      }
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      this.startRanking.set(start);
      this.endRanking.set(end);

      return {
        rankingPlacesArgs: { where: [{ rankingDate: { gte: start.toISOString(), lte: end.toISOString() }, systemId: { eq: systemId } }] },
        rankingLastPlacesArgs: { where: [{ systemId: { eq: systemId } }] },
      };
    } catch {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.startRanking.set(start);
      this.endRanking.set(end);
      return {
        rankingPlacesArgs: { where: [{ rankingDate: { gte: start.toISOString(), lte: end.toISOString() }, systemId: { eq: systemId } }] },
        rankingLastPlacesArgs: { where: [{ systemId: { eq: systemId } }] },
      };
    }
  }

  sortLists() {
    const eventType = this.type();
    const sortList = (a: PlayerWithRanking, b: PlayerWithRanking) => {
      if (a.gender !== b.gender) return a.gender === 'F' ? -1 : 1;

      const aRanking = a.rankingLastPlaces?.[0];
      const bRanking = b.rankingLastPlaces?.[0];
      const playerA = (aRanking?.single ?? 12) + (aRanking?.double ?? 12) + (eventType === 'MX' ? (aRanking?.mix ?? 12) : 0);
      const playerB = (bRanking?.single ?? 12) + (bRanking?.double ?? 12) + (eventType === 'MX' ? (bRanking?.mix ?? 12) : 0);

      if (playerA === playerB) return (aRanking?.single ?? 12) - (bRanking?.single ?? 12);
      return playerA - playerB;
    };

    const sortDouble = (a: PlayerWithRanking, b: PlayerWithRanking) => {
      return (a.rankingLastPlaces?.[0]?.double ?? 12) - (b.rankingLastPlaces?.[0]?.double ?? 12);
    };

    const sortMix = (a: PlayerWithRanking, b: PlayerWithRanking) => {
      if (a.gender === b.gender) return sortDouble(a, b);
      return a.gender === 'F' ? -1 : 1;
    };

    this.players.update((p) => ({
      [TeamMembershipType.REGULAR]: [...p[TeamMembershipType.REGULAR]].sort(sortList),
      [TeamMembershipType.BACKUP]: [...p[TeamMembershipType.BACKUP]].sort(sortList),
    }));

    this.substitutes.update((s) => [...s].sort(sortList));
    this.double1.update((d) => [...d].sort(sortDouble));
    this.double2.update((d) => [...d].sort(sortDouble));
    if (eventType === 'MX') {
      this.double3.update((d) => [...d].sort(sortMix));
      this.double4.update((d) => [...d].sort(sortMix));
    } else {
      this.double3.update((d) => [...d].sort(sortDouble));
      this.double4.update((d) => [...d].sort(sortDouble));
    }
  }
}
