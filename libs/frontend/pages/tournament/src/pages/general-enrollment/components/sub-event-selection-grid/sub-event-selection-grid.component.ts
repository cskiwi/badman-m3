import { Component, inject, output, input } from '@angular/core';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { TournamentSubEvent } from '@app/models';
import type { SubEventWithEligibility } from '../../page-general-enrollment.service';

@Component({
  selector: 'app-sub-event-selection-grid',
  standalone: true,
  imports: [
    CardModule,
    ButtonModule,
    ChipModule,
    TagModule,
    TranslateModule
],
  templateUrl: './sub-event-selection-grid.component.html',
})
export class SubEventSelectionGridComponent {
  private readonly translate = inject(TranslateService);
  readonly subEvents = input<SubEventWithEligibility[]>([]);
  readonly selectedIds = input<string[]>([]);
  readonly subEventSelect = output<TournamentSubEvent>();
  readonly subEventRemove = output<string>();

  /**
   * Check if sub-event is selected
   */
  isSelected(subEventId: string): boolean {
    return this.selectedIds().includes(subEventId);
  }

  /**
   * Toggle sub-event selection
   */
  toggleSelection(item: SubEventWithEligibility): void {
    const subEvent = item.subEvent;
    if (this.isSelected(subEvent.id!)) {
      this.subEventRemove.emit(subEvent.id!);
    } else {
      this.subEventSelect.emit(subEvent);
    }
  }

  /**
   * Get eligibility tag severity
   */
  getEligibilitySeverity(eligible: boolean): 'success' | 'danger' {
    return eligible ? 'success' : 'danger';
  }

  /**
   * Get capacity tag severity
   */
  getCapacitySeverity(capacity: { isFull: boolean; availableSpots: number; hasWaitingList: boolean }): 'success' | 'warn' | 'danger' {
    if (capacity.isFull) return 'danger';
    if (capacity.availableSpots < 5) return 'warn';
    return 'success';
  }

  /**
   * Format capacity text
   */
  getCapacityText(capacity: { isFull: boolean; availableSpots: number; hasWaitingList: boolean }): string {
    if (capacity.availableSpots === -1) {
      return this.translate.instant('all.tournament.unlimited');
    }
    if (capacity.isFull) {
      return capacity.hasWaitingList
        ? this.translate.instant('all.tournament.fullWaitingList')
        : this.translate.instant('all.tournament.full');
    }
    return this.translate.instant('all.tournament.spotsLeft', { count: capacity.availableSpots });
  }

  /**
   * Get game type icon
   */
  getEventTypeIcon(gameType?: string): string {
    switch (gameType) {
      case 'M':
        return 'pi-mars';
      case 'F':
        return 'pi-venus';
      case 'MX':
        return 'pi-users';
      default:
        return 'pi-trophy';
    }
  }

  /**
   * Get event type display name (gender/category)
   */
  getEventTypeDisplay(eventType?: string): string {
    switch (eventType) {
      case 'M':
        return this.translate.instant('all.tournament.eventTypes.men');
      case 'F':
        return this.translate.instant('all.tournament.eventTypes.women');
      case 'MX':
        return this.translate.instant('all.tournament.eventTypes.mixed');
      default:
        return this.translate.instant('all.common.unknown');
    }
  }

  /**
   * Get game type display name (singles/doubles/mixed)
   */
  getGameTypeDisplay(gameType?: string): string {
    switch (gameType) {
      case 'S':
        return this.translate.instant('all.tournament.gameTypes.singles');
      case 'D':
        return this.translate.instant('all.tournament.gameTypes.doubles');
      case 'MX':
        return this.translate.instant('all.tournament.gameTypes.mixed');
      default:
        return this.translate.instant('all.common.unknown');
    }
  }
}
