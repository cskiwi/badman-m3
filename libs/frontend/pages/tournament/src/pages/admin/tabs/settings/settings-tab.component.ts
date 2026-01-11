
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TournamentEvent } from '@app/models';
import { TranslateModule } from '@ngx-translate/core';
import { PhaseStepperComponent } from './components/phase-stepper/phase-stepper.component';
import { GeneralSettingsComponent } from './components/general-settings/general-settings.component';
import { SubEventsComponent } from './components/sub-events/sub-events.component';
import { SettingsTabService } from './settings-tab.service';

@Component({
  selector: 'app-settings-tab',
  standalone: true,
  imports: [
    TranslateModule,
    PhaseStepperComponent,
    GeneralSettingsComponent,
    SubEventsComponent
],
  templateUrl: './settings-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabComponent {
  tournament = input.required<TournamentEvent>();
  tournamentUpdated = output<void>();

  private readonly dataService = new SettingsTabService();

  // State
  updating = this.dataService.updating;
  updateError = this.dataService.updateError;

  async handleAdvancePhase(): Promise<void> {
    const result = await this.dataService.advancePhase(this.tournament());
    if (result) {
      this.tournamentUpdated.emit();
    }
  }

  async handleGoBackPhase(): Promise<void> {
    const result = await this.dataService.goBackPhase(this.tournament());
    if (result) {
      this.tournamentUpdated.emit();
    }
  }

  async handleSaveSettings(data: {
    name?: string;
    firstDay?: Date;
    closeDate?: Date;
    enrollmentOpenDate?: Date;
    enrollmentCloseDate?: Date;
    official?: boolean;
    allowGuestEnrollments?: boolean;
    schedulePublished?: boolean;
  }): Promise<void> {
    const result = await this.dataService.updateTournament(this.tournament().id, data);
    if (result) {
      this.tournamentUpdated.emit();
    }
  }

  async handleCreateSubEvent(data: {
    eventId: string;
    name: string;
    gameType: string;
    eventType?: string;
    minLevel?: number;
    maxLevel?: number;
    maxEntries?: number;
    waitingListEnabled?: boolean;
  }): Promise<void> {
    const result = await this.dataService.createSubEvent(data);
    if (result) {
      this.tournamentUpdated.emit();
    }
  }

  async handleUpdateSubEvent(payload: {
    subEventId: string;
    data: {
      name?: string;
      eventType?: string;
      maxEntries?: number;
      waitingListEnabled?: boolean;
      minLevel?: number;
      maxLevel?: number;
    };
  }): Promise<void> {
    const result = await this.dataService.updateSubEvent(payload.subEventId, payload.data);
    if (result) {
      this.tournamentUpdated.emit();
    }
  }

  async handleDeleteSubEvent(subEventId: string): Promise<void> {
    const result = await this.dataService.deleteSubEvent(subEventId);
    if (result) {
      this.tournamentUpdated.emit();
    }
  }
}
