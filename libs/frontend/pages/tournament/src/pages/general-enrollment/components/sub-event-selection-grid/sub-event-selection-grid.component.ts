import { Component, inject, output, input } from '@angular/core';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { TournamentSubEvent } from '@app/models';
import type { SubEventWithCalculations } from '../../page-general-enrollment.service';

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
  readonly subEvents = input<SubEventWithCalculations[]>([]);
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
  toggleSelection(item: SubEventWithCalculations): void {
    if (this.isSelected(item.id!)) {
      this.subEventRemove.emit(item.id!);
    } else {
      // Emit the base TournamentSubEvent (without calculated properties)
      const { _availableSpots, _isEnrollmentOpen, _isAlreadyEnrolled, _isEligible, ...subEvent } = item;
      this.subEventSelect.emit(subEvent as TournamentSubEvent);
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
  getCapacitySeverity(subEvent: SubEventWithCalculations): 'success' | 'warn' | 'danger' {
    const availableSpots = subEvent._availableSpots ?? 0;
    const isFull = availableSpots === 0;

    if (isFull) return 'danger';
    if (availableSpots > 0 && availableSpots < 5) return 'warn';
    return 'success';
  }

  /**
   * Format capacity text
   */
  getCapacityText(subEvent: SubEventWithCalculations): string {
    const availableSpots = subEvent._availableSpots ?? 0;
    const isFull = availableSpots === 0;

    if (availableSpots === -1) {
      return this.translate.instant('all.tournament.unlimited');
    }
    if (isFull) {
      return subEvent.waitingListEnabled
        ? this.translate.instant('all.tournament.fullWaitingList')
        : this.translate.instant('all.tournament.full');
    }
    return this.translate.instant('all.tournament.spotsLeft', { count: availableSpots });
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
