import { DatePipe, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SyncButtonComponent, SyncButtonConfig, SyncStatusIndicatorComponent, SyncStatusConfig } from '@app/frontend-components/sync';
import { SeoService } from '@app/frontend-modules-seo/service';
import { AuthService } from '@app/frontend-modules-auth/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { DetailService } from './page-detail.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-page-detail',
  imports: [
    DatePipe,
    SlicePipe,
    ProgressBarModule,
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    SyncButtonComponent,
    SyncStatusIndicatorComponent,
    ButtonModule,
  ],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  private readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly authService = inject(AuthService);
  private readonly competitionId = injectParams('competitionId');

  // selectors
  competition = this.dataService.competition;

  // Check if user can edit the competition
  canEdit = computed(() => {
    const competition = this.competition();
    if (!competition) return false;
    return this.authService.hasAnyPermission([
      'edit-any:competition',
      `${competition.id}_edit:competition`,
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
    const subEvents = this.competition()?.competitionSubEvents ?? [];

    // Sort all events first
    const sortedEvents = [...subEvents].sort((a, b) => {
      const aData = this.getEventTypeAndLevel(a.eventType || '');
      const bData = this.getEventTypeAndLevel(b.eventType || '');

      // Define order for event types
      const typeOrder = { M: 1, F: 2, MX: 3, Other: 4 };
      const aTypeOrder = typeOrder[aData.type as keyof typeof typeOrder] || 999;
      const bTypeOrder = typeOrder[bData.type as keyof typeof typeOrder] || 999;

      // First sort by event type
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder;
      }

      // Then sort by level
      return aData.level - bData.level;
    });

    // Group by event type
    const groups: { type: string; label: string; events: typeof subEvents }[] = [];
    const typeLabels = {
      M: 'all.competition.types.men',
      F: 'all.competition.types.women',
      MX: 'all.competition.types.mix',
      Other: 'all.competition.types.other',
    };

    sortedEvents.forEach((event) => {
      const eventData = this.getEventTypeAndLevel(event.eventType || '');
      let group = groups.find((g) => g.type === eventData.type);

      if (!group) {
        group = {
          type: eventData.type,
          label: typeLabels[eventData.type as keyof typeof typeLabels] || 'all.competition.types.other',
          events: [],
        };
        groups.push(group);
      }

      group.events.push(event);
    });

    return groups;
  });

  error = this.dataService.error;
  loading = this.dataService.loading;

  // Sync configuration for competition level
  syncConfig = computed((): SyncButtonConfig | null => {
    const competition = this.competition();

    if (!competition) {
      return null;
    }

    return {
      level: 'event',
      eventId: competition.id,
      eventName: competition.name,
    };
  });

  // Sync status configuration for competition level
  syncStatusConfig = computed((): SyncStatusConfig | null => {
    const competition = this.competition();

    if (!competition) {
      return null;
    }

    if (!competition.visualCode) {
      throw new Error('Competition visual code is missing');
    }

    return {
      entityType: 'competition',
      entityCode: competition.visualCode,
      entityName: competition.name,
      lastSync: competition.lastSync,
    };
  });

  // Helper method to create sync config for individual subevents
  getSubEventSyncConfig(subEvent: any): SyncButtonConfig | null {
    const competition = this.competition();

    if (!competition || !subEvent) {
      return null;
    }

    return {
      level: 'sub-event',
      subEventId: subEvent.id,
      eventName: competition.name,
      subEventName: subEvent.name,
    };
  }

  // Helper method to create sync status config for individual subevents
  getSubEventSyncStatusConfig(subEvent: any): SyncStatusConfig | null {
    const competition = this.competition();

    if (!competition || !subEvent) {
      return null;
    }

    if (!subEvent.visualCode) {
      throw new Error('Competition visual code is missing');
    }

    return {
      entityType: 'event',
      entityCode: subEvent.visualCode,
      entityName: subEvent.name,
      lastSync: subEvent.lastSync, // Use sub-event's own lastSync field
    };
  }

  /**
   * Scroll smoothly to the event group with the given type.
   * @param type The group type string
   */
  scrollToGroup(type: string): void {
    const el = document.getElementById('group-' + type);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  constructor() {
    effect(() => {
      this.dataService.filter.get('competitionId')?.setValue(this.competitionId());
    });

    effect(() => {
      const competition = this.competition();
      if (competition) {
        this.seoService.update({
          seoType: 'competition',
          competition,
        });
      }
    });
  }
}
