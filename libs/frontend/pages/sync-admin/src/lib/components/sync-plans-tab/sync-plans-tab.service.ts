import { computed, inject, signal } from '@angular/core';
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
import { SyncApiService } from '../../services';

export interface HierarchyDisplayItem {
  id: string;
  name?: string;
  level: number;
  type: 'event' | 'subEvent' | 'draw' | 'encounter';
  isSelectable: boolean;
  hasChildren: boolean;
  expanded: boolean;
  childCount: number;
  extra?: string;
}

export class SyncPlansTabService {
  private readonly auth = inject(AuthService);
  private readonly syncService = inject(SyncApiService);

  filter = new FormGroup({
    eventCategory: new FormControl<EventCategory>('competition', { nonNullable: true }),
    official: new FormControl<boolean>(true, { nonNullable: true }),
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
  private eventsRefreshTrigger = signal(0);
  private _hierarchyExpansionStates = signal<Map<string, boolean>>(new Map());
  private _selectedIds = signal<Set<string>>(new Set());

  private eventsResource = computed(() => {
    const filter = this.filterSignal();
    const _ = this.eventsRefreshTrigger();
    return { filter };
  });

  private _competitionEvents = signal<CompetitionEvent[]>([]);
  private _tournamentEvents = signal<TournamentEvent[]>([]);
  private _eventsLoading = signal(false);

  eventsLoading = computed(() => this._eventsLoading());
  selectedIds = computed(() => this._selectedIds());
  selectedCount = computed(() => this._selectedIds().size);

  displayItems = computed(() => {
    const category = this.filter.controls.eventCategory.value;
    const syncLevel = this.filter.controls.syncLevel.value;
    const expansionStates = this._hierarchyExpansionStates();

    if (category === 'competition') {
      return this.flattenCompetitionHierarchy(this._competitionEvents(), syncLevel, expansionStates);
    } else {
      return this.flattenTournamentHierarchy(this._tournamentEvents(), syncLevel, expansionStates);
    }
  });

  constructor() {
    // Watch filter changes and reload events
    const filterWatch = toSignal(this.filter.valueChanges);
    // Load initial events
    this.loadEvents();
  }

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
    return selectableItems.every((item) => this._selectedIds().has(item.id));
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
    this.loadEvents();
  }

  private async loadEvents(): Promise<void> {
    try {
      if (!this.auth.loggedIn()) return;
      this._eventsLoading.set(true);

      const filter = this.filter.value;
      const category = filter.eventCategory ?? 'competition';
      const syncLevel = filter.syncLevel ?? 'event';
      const args = this.buildQueryArgs(filter);

      if (category === 'competition') {
        const events = await lastValueFrom(this.syncService.getCompetitionEvents(args, syncLevel));
        const filtered = this.filterByLevel(events, filter.minLevel, filter.maxLevel);
        this._competitionEvents.set(filtered);
        this._tournamentEvents.set([]);
      } else {
        const effectiveLevel = syncLevel === 'encounter' ? 'draw' : syncLevel;
        const events = await lastValueFrom(this.syncService.getTournamentEvents(args, effectiveLevel as 'event' | 'subEvent' | 'draw'));
        const filtered = this.filterByTournamentLevel(events, filter.minLevel, filter.maxLevel);
        this._tournamentEvents.set(filtered);
        this._competitionEvents.set([]);
      }
    } catch (err) {
      console.warn('Failed to load events:', err);
    } finally {
      this._eventsLoading.set(false);
    }
  }

  private buildQueryArgs(filter: typeof this.filter.value): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [];
    if (filter.official) {
      conditions.push({ official: { eq: true } });
    }
    if (filter.eventCategory === 'competition') {
      if (filter.seasonFrom) conditions.push({ season: { gte: filter.seasonFrom } });
      if (filter.seasonTo) conditions.push({ season: { lte: filter.seasonTo } });
    } else {
      if (filter.dateFrom) conditions.push({ firstDay: { gte: filter.dateFrom.toISOString() } });
      if (filter.dateTo) conditions.push({ firstDay: { lte: filter.dateTo.toISOString() } });
    }
    const args: Record<string, unknown> = {};
    if (conditions.length > 0) {
      args['where'] = [{ AND: conditions }];
    }
    args['order'] = { [filter.eventCategory === 'tournament' ? 'firstDay' : 'season']: 'DESC' };
    return args;
  }

  private filterByLevel(events: CompetitionEvent[], minLevel: number | null | undefined, maxLevel: number | null | undefined): CompetitionEvent[] {
    if (!minLevel && !maxLevel) return events;
    return events.filter((event) => {
      const subEvents = (event as CompetitionEvent & { competitionSubEvents?: CompetitionSubEvent[] }).competitionSubEvents;
      if (!subEvents || subEvents.length === 0) return true;
      return subEvents.some((se) => {
        const level = se.level ?? 0;
        if (minLevel && level < minLevel) return false;
        if (maxLevel && level > maxLevel) return false;
        return true;
      });
    });
  }

  private filterByTournamentLevel(
    events: TournamentEvent[],
    minLevel: number | null | undefined,
    maxLevel: number | null | undefined,
  ): TournamentEvent[] {
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
                  const encounterName = homeTeam && awayTeam ? `${homeTeam.name} vs ${awayTeam.name}` : (encounter.visualCode ?? encounter.id);
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

  private flattenTournamentHierarchy(events: TournamentEvent[], syncLevel: SyncLevel, expansionStates: Map<string, boolean>): HierarchyDisplayItem[] {
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
          const levelInfo = subEvent.minLevel != null && subEvent.maxLevel != null ? `Level ${subEvent.minLevel}-${subEvent.maxLevel}` : '';
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
}
