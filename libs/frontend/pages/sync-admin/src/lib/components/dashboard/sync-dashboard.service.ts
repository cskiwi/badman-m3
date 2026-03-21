import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { AuthService } from '@app/frontend-modules-auth/service';
import {
  CompetitionDraw,
  CompetitionEncounter,
  CompetitionEvent,
  CompetitionSubEvent,
  TournamentDraw,
  TournamentEvent,
  TournamentSubEvent,
} from '@app/models';
import { lastValueFrom } from 'rxjs';
import { EventCategory, SyncLevel } from '../../models/sync-dashboard.models';
import { SyncJob } from '../../models/sync.models';
import { SyncApiService } from '../../services';
import { WebSocketSyncService } from '../../services/websocket-sync.service';

// Display item for the flattened hierarchy table
export interface HierarchyDisplayItem {
  id: string;
  name?: string;
  level: number; // indentation depth
  type: 'event' | 'subEvent' | 'draw' | 'encounter';
  isSelectable: boolean; // only items at the chosen sync level are selectable
  hasChildren: boolean;
  expanded: boolean;
  childCount: number;
  // Extra display info
  extra?: string;
}

export class SyncDashboardService {
  private readonly auth = inject(AuthService);
  readonly webSocketService = inject(WebSocketSyncService);
  private readonly syncService = inject(SyncApiService);

  // Internal flat job list for centralized management
  private _flatJobsList = signal<SyncJob[]>([]);
  private _expansionStates = signal<Map<string, boolean>>(new Map());

  // Computed hierarchical jobs that automatically rebuild when flat list changes
  private _hierarchicalJobs = computed(() => {
    const flatJobs = this._flatJobsList();
    const expansionStates = this._expansionStates();

    if (flatJobs.length === 0) {
      return [];
    }

    return this.buildJobHierarchy([...flatJobs], expansionStates);
  });

  // ===== SCHEDULING FILTER =====

  filter = new FormGroup({
    eventCategory: new FormControl<EventCategory>('competition', { nonNullable: true }),
    official: new FormControl<boolean>(true, { nonNullable: true }),
    // Competition uses season (year), tournament uses date range
    seasonFrom: new FormControl<number | null>(null),
    seasonTo: new FormControl<number | null>(null),
    dateFrom: new FormControl<Date | null>(null),
    dateTo: new FormControl<Date | null>(null),
    minLevel: new FormControl<number | null>(null),
    maxLevel: new FormControl<number | null>(null),
    syncLevel: new FormControl<SyncLevel>('event', { nonNullable: true }),
    includeSubComponents: new FormControl<boolean>(true, { nonNullable: true }),
  });

  private filterSignal = toSignal(this.filter.valueChanges, { initialValue: this.filter.value });

  // ===== EVENTS RESOURCE =====

  private eventsRefreshTrigger = signal(0);

  private eventsResource = resource({
    params: computed(() => ({
      filter: this.filterSignal(),
      refresh: this.eventsRefreshTrigger(),
    })),
    loader: async ({ params }) => {
      try {
        if (!this.auth.loggedIn()) {
          return { competitionEvents: [] as CompetitionEvent[], tournamentEvents: [] as TournamentEvent[] };
        }

        const { filter } = params;
        const category = filter.eventCategory ?? 'competition';
        const syncLevel = filter.syncLevel ?? 'event';
        const args = this.buildQueryArgs(filter);

        if (category === 'competition') {
          const events = await lastValueFrom(this.syncService.getCompetitionEvents(args, syncLevel));
          const filtered = this.filterByLevel(events, filter.minLevel, filter.maxLevel);
          return { competitionEvents: filtered, tournamentEvents: [] as TournamentEvent[] };
        } else {
          // Tournaments don't support encounter level
          const effectiveLevel = syncLevel === 'encounter' ? 'draw' : syncLevel;
          const events = await lastValueFrom(
            this.syncService.getTournamentEvents(args, effectiveLevel as 'event' | 'subEvent' | 'draw'),
          );
          const filtered = this.filterByTournamentLevel(events, filter.minLevel, filter.maxLevel);
          return { competitionEvents: [] as CompetitionEvent[], tournamentEvents: filtered };
        }
      } catch (err) {
        console.warn('Failed to load events:', err);
        return { competitionEvents: [] as CompetitionEvent[], tournamentEvents: [] as TournamentEvent[] };
      }
    },
  });

  // ===== EXPANSION & SELECTION STATE =====

  private _hierarchyExpansionStates = signal<Map<string, boolean>>(new Map());
  private _selectedIds = signal<Set<string>>(new Set());

  // ===== PUBLIC COMPUTED SELECTORS =====

  // Jobs
  syncStatus = this.webSocketService.syncStatus;
  queueStats = this.webSocketService.queueStats;
  queueStatsLoading = this.webSocketService.queueStatsLoading;
  recentJobs = computed(() => this._hierarchicalJobs());
  recentJobsLoading = this.webSocketService.recentJobsLoading;
  loading = this.webSocketService.loading;

  // Events
  competitionEvents = computed(() => this.eventsResource.value()?.competitionEvents ?? []);
  tournamentEvents = computed(() => this.eventsResource.value()?.tournamentEvents ?? []);
  eventsLoading = computed(() => this.eventsResource.isLoading());
  selectedIds = computed(() => this._selectedIds());
  selectedCount = computed(() => this._selectedIds().size);

  // Flattened hierarchy for display
  displayItems = computed(() => {
    const category = this.filter.controls.eventCategory.value;
    const syncLevel = this.filter.controls.syncLevel.value;
    const expansionStates = this._hierarchyExpansionStates();

    if (category === 'competition') {
      return this.flattenCompetitionHierarchy(this.competitionEvents(), syncLevel, expansionStates);
    } else {
      return this.flattenTournamentHierarchy(this.tournamentEvents(), syncLevel, expansionStates);
    }
  });

  // Job filter form (for backwards compat with jobs section)
  private jobsFilter = new FormGroup({
    jobsLimit: new FormControl<number | undefined>(undefined),
    jobsStatus: new FormControl<string | null>(null),
    refreshInterval: new FormControl<number>(30000),
  });

  constructor() {
    this.loadInitialData();
    this.webSocketService.setJobUpdateHandler((job: SyncJob) => this.handleJobUpdate(job));
  }

  // ===== SCHEDULING ACTIONS =====

  toggleHierarchyExpansion(id: string): void {
    const states = new Map(this._hierarchyExpansionStates());
    states.set(id, !(states.get(id) ?? false));
    this._hierarchyExpansionStates.set(states);
  }

  toggleSelection(id: string): void {
    const ids = new Set(this._selectedIds());
    if (ids.has(id)) {
      ids.delete(id);
    } else {
      ids.add(id);
    }
    this._selectedIds.set(ids);
  }

  selectAll(): void {
    const items = this.displayItems().filter((item) => item.isSelectable);
    this._selectedIds.set(new Set(items.map((item) => item.id)));
  }

  deselectAll(): void {
    this._selectedIds.set(new Set());
  }

  isSelected(id: string): boolean {
    return this._selectedIds().has(id);
  }

  isAllSelected(): boolean {
    const selectableItems = this.displayItems().filter((item) => item.isSelectable);
    if (selectableItems.length === 0) return false;
    const selectedIds = this._selectedIds();
    return selectableItems.every((item) => selectedIds.has(item.id));
  }

  scheduleSyncForSelected(): void {
    const syncLevel = this.filter.controls.syncLevel.value;
    const includeSubComponents = this.filter.controls.includeSubComponents.value;
    const ids = [...this._selectedIds()];

    if (ids.length === 0) return;

    let sync$;
    switch (syncLevel) {
      case 'event':
        sync$ = this.syncService.triggerEventsSync(ids, includeSubComponents);
        break;
      case 'subEvent':
        sync$ = this.syncService.triggerSubEventsSync(ids, includeSubComponents);
        break;
      case 'draw':
        sync$ = this.syncService.triggerDrawsSync(ids, includeSubComponents);
        break;
      case 'encounter':
        sync$ = this.syncService.triggerEncountersSync(ids);
        break;
    }

    return sync$ as unknown as void; // Return observable for component to subscribe
  }

  getScheduleSyncObservable() {
    const syncLevel = this.filter.controls.syncLevel.value;
    const includeSubComponents = this.filter.controls.includeSubComponents.value;
    const ids = [...this._selectedIds()];

    if (ids.length === 0) return null;

    switch (syncLevel) {
      case 'event':
        return this.syncService.triggerEventsSync(ids, includeSubComponents);
      case 'subEvent':
        return this.syncService.triggerSubEventsSync(ids, includeSubComponents);
      case 'draw':
        return this.syncService.triggerDrawsSync(ids, includeSubComponents);
      case 'encounter':
        return this.syncService.triggerEncountersSync(ids);
      default:
        return null;
    }
  }

  refreshEvents(): void {
    this.eventsRefreshTrigger.update((v) => v + 1);
  }

  // ===== JOBS =====

  refresh(): void {
    this.loadInitialData();
  }

  toggleJobExpansion(jobId: string): void {
    const currentStates = this._expansionStates();
    const newStates = new Map(currentStates);
    newStates.set(jobId, !(newStates.get(jobId) ?? false));
    this._expansionStates.set(newStates);
  }

  flattenJobsForDisplay(jobs: SyncJob[], level = 0): Array<SyncJob & { level: number }> {
    const flattened: Array<SyncJob & { level: number }> = [];

    jobs.forEach((job) => {
      flattened.push({ ...job, level });

      if (job.expanded && job.children && job.children.length > 0) {
        const childrenFlattened = this.flattenJobsForDisplay(job.children, level + 1);
        flattened.push(...childrenFlattened);
      }
    });

    return flattened;
  }

  // ===== PRIVATE: QUERY ARGS BUILDER =====

  private buildQueryArgs(filter: typeof this.filter.value): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [];

    if (filter.official) {
      conditions.push({ official: { eq: true } });
    }

    if (filter.eventCategory === 'competition') {
      // Competition: filter by season (year)
      if (filter.seasonFrom) {
        conditions.push({ season: { gte: filter.seasonFrom } });
      }
      if (filter.seasonTo) {
        conditions.push({ season: { lte: filter.seasonTo } });
      }
    } else {
      // Tournament: filter by date range
      if (filter.dateFrom) {
        conditions.push({ firstDay: { gte: filter.dateFrom.toISOString() } });
      }
      if (filter.dateTo) {
        conditions.push({ firstDay: { lte: filter.dateTo.toISOString() } });
      }
    }

    const args: Record<string, unknown> = {};
    if (conditions.length > 0) {
      args['where'] = [{ AND: conditions }];
    }
    args['order'] = { [filter.eventCategory === 'tournament' ? 'firstDay' : 'season']: 'DESC' };

    return args;
  }

  // ===== PRIVATE: LEVEL FILTERING (client-side) =====

  private filterByLevel(events: CompetitionEvent[], minLevel: number | null | undefined, maxLevel: number | null | undefined): CompetitionEvent[] {
    if (!minLevel && !maxLevel) return events;

    return events.filter((event) => {
      const subEvents = (event as CompetitionEvent & { competitionSubEvents?: CompetitionSubEvent[] }).competitionSubEvents;
      if (!subEvents || subEvents.length === 0) return true; // keep events without sub-events loaded

      return subEvents.some((se) => {
        const level = se.level ?? 0;
        if (minLevel && level < minLevel) return false;
        if (maxLevel && level > maxLevel) return false;
        return true;
      });
    });
  }

  private filterByTournamentLevel(events: TournamentEvent[], minLevel: number | null | undefined, maxLevel: number | null | undefined): TournamentEvent[] {
    if (!minLevel && !maxLevel) return events;

    return events.filter((event) => {
      const subEvents = (event as TournamentEvent & { tournamentSubEvents?: TournamentSubEvent[] }).tournamentSubEvents;
      if (!subEvents || subEvents.length === 0) return true;

      return subEvents.some((se) => {
        const seMin = se.minLevel ?? 0;
        const seMax = se.maxLevel ?? 99;
        if (minLevel && seMax < minLevel) return false;
        if (maxLevel && seMin > maxLevel) return false;
        return true;
      });
    });
  }

  // ===== PRIVATE: HIERARCHY FLATTENING =====

  private flattenCompetitionHierarchy(
    events: CompetitionEvent[],
    syncLevel: SyncLevel,
    expansionStates: Map<string, boolean>,
  ): HierarchyDisplayItem[] {
    const items: HierarchyDisplayItem[] = [];

    for (const event of events) {
      const subEvents = (event as CompetitionEvent & { competitionSubEvents?: CompetitionSubEvent[] }).competitionSubEvents ?? [];
      const isEventLevel = syncLevel === 'event';
      const eventExpanded = expansionStates.get(event.id) ?? false;
      const hasChildren = !isEventLevel && subEvents.length > 0;

      items.push({
        id: event.id,
        name: event.name,
        level: 0,
        type: 'event',
        isSelectable: isEventLevel,
        hasChildren,
        expanded: eventExpanded,
        childCount: subEvents.length,
        extra: event.type ?? '',
      });

      if (!isEventLevel && eventExpanded) {
        for (const subEvent of subEvents) {
          const draws = (subEvent as CompetitionSubEvent & { competitionDraws?: CompetitionDraw[] }).competitionDraws ?? [];
          const isSubEventLevel = syncLevel === 'subEvent';
          const subEventExpanded = expansionStates.get(subEvent.id) ?? false;
          const subHasChildren = !isSubEventLevel && draws.length > 0;

          items.push({
            id: subEvent.id,
            name: subEvent.name,
            level: 1,
            type: 'subEvent',
            isSelectable: isSubEventLevel,
            hasChildren: subHasChildren,
            expanded: subEventExpanded,
            childCount: draws.length,
            extra: subEvent.level != null ? `Level ${subEvent.level}` : '',
          });

          if (!isSubEventLevel && subEventExpanded) {
            for (const draw of draws) {
              const encounters = (draw as CompetitionDraw & { competitionEncounters?: CompetitionEncounter[] }).competitionEncounters ?? [];
              const isDrawLevel = syncLevel === 'draw';
              const drawExpanded = expansionStates.get(draw.id) ?? false;
              const drawHasChildren = !isDrawLevel && encounters.length > 0;

              items.push({
                id: draw.id,
                name: draw.name,
                level: 2,
                type: 'draw',
                isSelectable: isDrawLevel,
                hasChildren: drawHasChildren,
                expanded: drawExpanded,
                childCount: encounters.length,
                extra: draw.visualCode ?? '',
              });

              if (!isDrawLevel && drawExpanded) {
                for (const encounter of encounters) {
                  const homeTeam = (encounter as CompetitionEncounter & { homeTeam?: { name: string } }).homeTeam;
                  const awayTeam = (encounter as CompetitionEncounter & { awayTeam?: { name: string } }).awayTeam;
                  const encounterName = homeTeam && awayTeam
                    ? `${homeTeam.name} vs ${awayTeam.name}`
                    : encounter.visualCode ?? encounter.id;

                  items.push({
                    id: encounter.id,
                    name: encounterName,
                    level: 3,
                    type: 'encounter',
                    isSelectable: true,
                    hasChildren: false,
                    expanded: false,
                    childCount: 0,
                    extra: encounter.date ? new Date(encounter.date).toLocaleDateString() : '',
                  });
                }
              }
            }
          }
        }
      }
    }

    return items;
  }

  private flattenTournamentHierarchy(
    events: TournamentEvent[],
    syncLevel: SyncLevel,
    expansionStates: Map<string, boolean>,
  ): HierarchyDisplayItem[] {
    const items: HierarchyDisplayItem[] = [];

    for (const event of events) {
      const subEvents = (event as TournamentEvent & { tournamentSubEvents?: TournamentSubEvent[] }).tournamentSubEvents ?? [];
      const isEventLevel = syncLevel === 'event';
      const eventExpanded = expansionStates.get(event.id) ?? false;
      const hasChildren = !isEventLevel && subEvents.length > 0;

      items.push({
        id: event.id,
        name: event.name,
        level: 0,
        type: 'event',
        isSelectable: isEventLevel,
        hasChildren,
        expanded: eventExpanded,
        childCount: subEvents.length,
        extra: event.phase ?? '',
      });

      if (!isEventLevel && eventExpanded) {
        for (const subEvent of subEvents) {
          const draws = (subEvent as TournamentSubEvent & { drawTournaments?: TournamentDraw[] }).drawTournaments ?? [];
          const isSubEventLevel = syncLevel === 'subEvent';
          const subEventExpanded = expansionStates.get(subEvent.id) ?? false;
          const subHasChildren = !isSubEventLevel && draws.length > 0;

          const levelInfo = subEvent.minLevel != null && subEvent.maxLevel != null
            ? `Level ${subEvent.minLevel}-${subEvent.maxLevel}`
            : '';

          items.push({
            id: subEvent.id,
            name: subEvent.name,
            level: 1,
            type: 'subEvent',
            isSelectable: isSubEventLevel,
            hasChildren: subHasChildren,
            expanded: subEventExpanded,
            childCount: draws.length,
            extra: levelInfo,
          });

          if (!isSubEventLevel && subEventExpanded) {
            for (const draw of draws) {
              items.push({
                id: draw.id,
                name: draw.name,
                level: 2,
                type: 'draw',
                isSelectable: true,
                hasChildren: false,
                expanded: false,
                childCount: 0,
                extra: draw.visualCode ?? '',
              });
            }
          }
        }
      }
    }

    return items;
  }

  // ===== PRIVATE: INITIAL DATA LOADING =====

  private async loadInitialData(): Promise<void> {
    try {
      if (!this.auth.loggedIn()) {
        return;
      }

      this.webSocketService.setQueueStatsLoading(true);
      this.webSocketService.setRecentJobsLoading(true);

      const syncStatusResult = await lastValueFrom(this.syncService.getStatus());

      if (syncStatusResult) {
        this.webSocketService.setInitialSyncStatus(syncStatusResult);
        this.webSocketService.setInitialQueueStats(syncStatusResult.queues);
      }

      const filterValues = this.jobsFilter.value;
      const syncJobsResult = await lastValueFrom(
        this.syncService.getRecentJobs(filterValues?.jobsLimit, filterValues?.jobsStatus || undefined),
      );

      if (syncJobsResult) {
        this.setInitialJobs(syncJobsResult);
      }
    } catch (err) {
      console.warn('Failed to load initial sync data:', err);
    } finally {
      this.webSocketService.setQueueStatsLoading(false);
      this.webSocketService.setRecentJobsLoading(false);
    }
  }

  // ===== PRIVATE: JOB HIERARCHY =====

  private setInitialJobs(jobs: SyncJob[]): void {
    const currentHierarchy = this._hierarchicalJobs();
    const expansionState = new Map<string, boolean>();
    this.collectExpansionStates(currentHierarchy, expansionState);
    this._expansionStates.set(expansionState);
    this._flatJobsList.set([...jobs]);
  }

  private handleJobUpdate(updatedJob: SyncJob): void {
    if (!updatedJob.children) updatedJob.children = [];
    if (updatedJob.expanded === undefined) updatedJob.expanded = false;

    const currentFlatJobs = this._flatJobsList();
    const existingIndex = currentFlatJobs.findIndex((job) => job.id === updatedJob.id);

    let updatedFlatJobs: SyncJob[];
    if (existingIndex >= 0) {
      updatedFlatJobs = [...currentFlatJobs];
      updatedFlatJobs[existingIndex] = updatedJob;
    } else {
      updatedFlatJobs = this.insertJobInProperPosition(updatedJob, currentFlatJobs);
    }

    if (updatedJob.parentId) {
      const parentIndex = updatedFlatJobs.findIndex((j) => j.id === updatedJob.parentId);
      if (parentIndex >= 0) {
        const siblings = updatedFlatJobs.filter((j) => j.parentId === updatedJob.parentId);
        if (siblings.length > 0) {
          const done = siblings.filter((j) => j.status === 'completed' || j.status === 'failed').length;
          const derivedProgress = Math.round((done / siblings.length) * 100);
          updatedFlatJobs = [...updatedFlatJobs];
          updatedFlatJobs[parentIndex] = { ...updatedFlatJobs[parentIndex], progress: derivedProgress };
        }
      }
    }

    this._flatJobsList.set(updatedFlatJobs);
  }

  private buildJobHierarchy(jobs: SyncJob[], expansionStates: Map<string, boolean>): SyncJob[] {
    const jobMap = new Map<string, SyncJob>();
    const rootJobs: SyncJob[] = [];

    const clonedJobs = jobs.map((job) => ({
      ...job,
      children: [] as SyncJob[],
      expanded: expansionStates.get(job.id) ?? false,
    }));
    clonedJobs.forEach((job) => {
      jobMap.set(job.id, job);
    });

    clonedJobs.forEach((job) => {
      if (job.parentId && jobMap.has(job.parentId)) {
        const parent = jobMap.get(job.parentId);
        if (parent && Array.isArray(parent.children)) {
          parent.children.push(job);
        }
      } else {
        rootJobs.push(job);
      }
    });

    this.sortJobsRecursively(rootJobs);
    return rootJobs;
  }

  private sortJobsRecursively(jobs: SyncJob[]): void {
    jobs.sort((a, b) => {
      const timeA = a.timestamp || a.createdAt?.getTime() || 0;
      const timeB = b.timestamp || b.createdAt?.getTime() || 0;
      return timeB - timeA;
    });

    jobs.forEach((job) => {
      if (job.children && job.children.length > 0) {
        this.sortJobsRecursively(job.children);
      }
    });
  }

  private insertJobInProperPosition(newJob: SyncJob, currentJobs: SyncJob[]): SyncJob[] {
    if (newJob.parentId) {
      const parentIndex = currentJobs.findIndex((job) => job.id === newJob.parentId);
      if (parentIndex >= 0) {
        const updatedJobs = [...currentJobs];
        updatedJobs.splice(parentIndex + 1, 0, newJob);
        return updatedJobs;
      }

      const siblingIndex = currentJobs.findIndex((job) => job.parentId === newJob.parentId);
      if (siblingIndex >= 0) {
        const updatedJobs = [...currentJobs];
        updatedJobs.splice(siblingIndex, 0, newJob);
        return updatedJobs;
      }
    }

    return [newJob, ...currentJobs];
  }

  private collectExpansionStates(jobs: SyncJob[], stateMap: Map<string, boolean>): void {
    jobs.forEach((job) => {
      if (job.expanded !== undefined) {
        stateMap.set(job.id, job.expanded);
      }
      if (job.children && job.children.length > 0) {
        this.collectExpansionStates(job.children, stateMap);
      }
    });
  }
}
