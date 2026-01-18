import { DatePipe, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SyncButtonComponent, SyncButtonConfig, SyncStatusIndicatorComponent, SyncStatusConfig } from '@app/frontend-components/sync';
import { SeoService } from '@app/frontend-modules-seo/service';
import { AuthService } from '@app/frontend-modules-auth/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { DetailService } from './page-detail.service';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-page-detail',
  imports: [
    DatePipe,
    SlicePipe,
    SkeletonModule,
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    SyncButtonComponent,
    SyncStatusIndicatorComponent,
    TabsModule,
    ButtonModule,
  ],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  private readonly auth = inject(AuthService);

  // Permission check for admin access
  canEdit = computed(() => {
    const tournament = this.tournament();
    if (!tournament || !this.auth.loggedIn()) return false;
    return this.auth.hasAnyPermission([
      'edit-any:tournament',
      'edit-any:club',
      `${tournament.club?.id}_edit:club`,
      `${tournament.club?.id}_edit:tournament`,
    ]);
  });

  // Helper function to extract event type and level
  private getEventTypeAndLevel = (eventType: string) => {
    if (!eventType) return { type: 'Other', level: 999 };
    const match = eventType.match(/^(MX|M|F)(\d+)?/);
    if (!match) return { type: 'Other', level: 999 };
    return {
      type: match[1],
      level: parseInt(match[2] || '0', 10),
    };
  };

  // Grouped sub-events by type for visual separation
  groupedSubEvents = computed(() => {
    const subEvents = this.tournament()?.tournamentSubEvents ?? [];
    // Sort all events first
    const sortedEvents = [...subEvents].sort((a, b) => {
      const aData = this.getEventTypeAndLevel(a.eventType || '');
      const bData = this.getEventTypeAndLevel(b.eventType || '');
      const typeOrder = { M: 1, F: 2, MX: 3, Other: 4 };
      const aTypeOrder = typeOrder[aData.type as keyof typeof typeOrder] || 999;
      const bTypeOrder = typeOrder[bData.type as keyof typeof typeOrder] || 999;
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder;
      }
      return aData.level - bData.level;
    });

    // Group by event type
    const groups: {
      type: string;
      label: string;
      events: typeof subEvents;
      gameTypeTabs: { gameType: string; label: string; events: typeof subEvents }[];
    }[] = [];
    const typeLabels = {
      M: 'all.tournament.types.men',
      F: 'all.tournament.types.women',
      MX: 'all.tournament.types.mix',
      Other: 'all.tournament.types.other',
    };

    const gameTypeLabels = {
      S: 'all.tournament.gameTypes.singles',
      D: 'all.tournament.gameTypes.doubles',
      MX: 'all.tournament.gameTypes.mixed',
    };

    sortedEvents.forEach((event) => {
      const eventData = this.getEventTypeAndLevel(event.eventType || '');
      let group = groups.find((g) => g.type === eventData.type);
      if (!group) {
        group = {
          type: eventData.type,
          label: typeLabels[eventData.type as keyof typeof typeLabels] || 'all.tournament.types.other',
          events: [],
          gameTypeTabs: [],
        };
        groups.push(group);
      }
      group.events.push(event);
    });

    // Create game type tabs for each group
    groups.forEach((group) => {
      const gameTypeMap = new Map<string, typeof subEvents>();

      group.events.forEach((event) => {
        const gameType = event.gameType || 'Other';
        if (!gameTypeMap.has(gameType)) {
          gameTypeMap.set(gameType, []);
        }
        gameTypeMap.get(gameType)!.push(event);
      });

      // Convert to tabs array and sort
      group.gameTypeTabs = Array.from(gameTypeMap.entries())
        .map(([gameType, events]) => ({
          gameType,
          label: gameTypeLabels[gameType as keyof typeof gameTypeLabels] || 'all.tournament.gameTypes.other',
          events,
        }))
        .sort((a, b) => {
          const order = { S: 1, D: 2, MX: 3, Other: 4 };
          const aOrder = order[a.gameType as keyof typeof order] || 999;
          const bOrder = order[b.gameType as keyof typeof order] || 999;
          return aOrder - bOrder;
        });
    });

    return groups;
  });

  private readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly tournamentId = injectParams('tournamentId');

  // selectors
  tournament = this.dataService.tournament;

  error = this.dataService.error;
  loading = this.dataService.loading;

  // Sync configuration for tournament level
  syncConfig = computed((): SyncButtonConfig | null => {
    const tournament = this.tournament();

    if (!tournament || !this.auth.loggedIn()) {
      return null;
    }

    return {
      level: 'event',
      tournamentCode: tournament.visualCode,
      tournamentName: tournament?.name,
      eventCode: tournament.visualCode, // Use tournament code as event code for tournament-level sync
      eventName: tournament.name,
    };
  });

  // Sync status configuration for tournament level
  syncStatusConfig = computed((): SyncStatusConfig | null => {
    const tournament = this.tournament();

    if (!tournament || !this.auth.loggedIn()) {
      return null;
    }

    return {
      entityType: 'event',
      entityCode: tournament.visualCode!,
      entityName: tournament?.name,
      lastSync: tournament.lastSync,
    };
  });

  // Helper method to create sync config for individual subevents
  getSubEventSyncConfig(subEvent: any): SyncButtonConfig | null {
    const tournament = this.tournament();

    if (!tournament || !subEvent || !this.auth.loggedIn()) {
      return null;
    }

    return {
      level: 'sub-event',
      tournamentCode: tournament.visualCode,
      tournamentName: tournament?.name,
      eventCode: subEvent.visualCode,
      eventName: subEvent.name,
    };
  }

  // Helper method to create sync status config for individual subevents
  getSubEventSyncStatusConfig(subEvent: any): SyncStatusConfig | null {
    const tournament = this.tournament();

    if (!tournament || !subEvent || !this.auth.loggedIn()) {
      return null;
    }

    return {
      entityType: 'event',
      entityCode: subEvent.visualCode,
      entityName: subEvent.name,
      lastSync: subEvent.lastSync, // Use sub-event's own lastSync field
    };
  }

  constructor() {
    effect(() => {
      this.dataService.filter.get('tournamentId')?.setValue(this.tournamentId());
    });

    effect(() => {
      const tournament = this.tournament();
      if (tournament) {
        this.seoService.update({
          seoType: 'generic',
          title: tournament.name,
          description: `Tournament ${tournament.name}${tournament.tournamentNumber ? ` (${tournament.tournamentNumber})` : ''}`,
        });
      }
    });
  }
}
