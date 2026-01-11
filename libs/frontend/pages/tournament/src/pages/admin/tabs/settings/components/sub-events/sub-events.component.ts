
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TournamentEvent, TournamentSubEvent } from '@app/models';
import { SubEventTypeEnum } from '@app/models-enum';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SortMeta } from 'primeng/api';

@Component({
  selector: 'app-sub-events',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    TooltipModule
],
  templateUrl: './sub-events.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubEventsComponent {
  tournament = input.required<TournamentEvent>();
  updating = input<boolean>(false);

  // Create a mutable copy of sub-events for sorting/filtering
  subEvents = computed(() => {
    const events = this.tournament().tournamentSubEvents;
    return events ? [...events] : [];
  });

  createSubEventRequested = output<{
    eventId: string;
    name: string;
    gameType: string;
    eventType?: string;
    minLevel?: number;
    maxLevel?: number;
    maxEntries?: number;
    waitingListEnabled?: boolean;
  }>();

  updateSubEventRequested = output<{
    subEventId: string;
    data: {
      name?: string;
      eventType?: string;
      gameType?: string;
      maxEntries?: number;
      waitingListEnabled?: boolean;
      minLevel?: number;
      maxLevel?: number;
    };
  }>();

  deleteSubEventRequested = output<string>();

  showSubEventDialog = signal(false);
  editingSubEvent = signal<TournamentSubEvent | null>(null);

  // Default sort order: eventType -> gameType -> minLevel
  multiSortMeta: SortMeta[] = [
    { field: 'eventType', order: 1 },
    { field: 'gameType', order: 1 },
    { field: 'minLevel', order: 1 }
  ];

  // Game type options
  readonly gameTypeOptions = [
    { label: 'all.tournament.gameTypes.singles', value: 'S' },
    { label: 'all.tournament.gameTypes.doubles', value: 'D' },
    { label: 'all.tournament.gameTypes.mixed', value: 'MX' },
  ];

  // Event type options
  readonly eventTypeOptions = [
    { label: 'all.tournament.eventTypes.men', value: SubEventTypeEnum.M },
    { label: 'all.tournament.eventTypes.women', value: SubEventTypeEnum.F },
    { label: 'all.tournament.eventTypes.mixed', value: SubEventTypeEnum.MX }
  ];

  // Sub-event form
  subEventForm = new FormGroup({
    name: new FormControl<string>('', [Validators.required]),
    eventType: new FormControl<SubEventTypeEnum>(SubEventTypeEnum.MX, [Validators.required]),
    gameType: new FormControl<string>('D', [Validators.required]),
    minLevel: new FormControl<number | null>(null),
    maxLevel: new FormControl<number | null>(null),
    maxEntries: new FormControl<number | null>(null),
    waitingListEnabled: new FormControl<boolean>(true),
  });

  openAddSubEvent(): void {
    this.editingSubEvent.set(null);
    this.subEventForm.reset({
      name: '',
      eventType: SubEventTypeEnum.MX,
      gameType: 'D',
      minLevel: null,
      maxLevel: null,
      maxEntries: null,
      waitingListEnabled: true,
    });
    this.subEventForm.get('gameType')?.enable();
    this.showSubEventDialog.set(true);
  }

  openEditSubEvent(subEvent: TournamentSubEvent): void {
    this.editingSubEvent.set(subEvent);
    this.subEventForm.patchValue({
      name: subEvent.name,
      eventType: subEvent.eventType || SubEventTypeEnum.MX,
      gameType: subEvent.gameType || 'D',
      minLevel: subEvent.minLevel ?? null,
      maxLevel: subEvent.maxLevel ?? null,
      maxEntries: subEvent.maxEntries ?? null,
      waitingListEnabled: subEvent.waitingListEnabled ?? true,
    });
    this.subEventForm.get('gameType');
    this.showSubEventDialog.set(true);
  }

  saveSubEvent(): void {
    if (this.subEventForm.invalid) return;

    const values = this.subEventForm.value;
    const editing = this.editingSubEvent();

    console.log('Saving sub-event', values, editing);

    if (editing) {
      // Update existing
      this.updateSubEventRequested.emit({
        subEventId: editing.id,
        data: {
          name: values.name ?? undefined,
          eventType: values.eventType ?? undefined,
          gameType: values.gameType ?? undefined,
          maxEntries: values.maxEntries ?? undefined,
          waitingListEnabled: values.waitingListEnabled ?? undefined,
          minLevel: values.minLevel ?? undefined,
          maxLevel: values.maxLevel ?? undefined,
        },
      });
    } else {
      // Create new
      this.createSubEventRequested.emit({
        eventId: this.tournament().id,
        name: values.name!,
        eventType: values.eventType!,
        gameType: values.gameType!,
        minLevel: values.minLevel ?? undefined,
        maxLevel: values.maxLevel ?? undefined,
        maxEntries: values.maxEntries ?? undefined,
        waitingListEnabled: values.waitingListEnabled ?? true,
      });
    }
  }

  deleteSubEvent(subEvent: TournamentSubEvent): void {
    this.deleteSubEventRequested.emit(subEvent.id);
  }

  closeDialog(): void {
    this.showSubEventDialog.set(false);
  }

  getGameTypeLabel(gameType: string): string {
    return this.gameTypeOptions.find((o) => o.value === gameType)?.label ?? gameType;
  }

  getEventTypeLabel(eventType: SubEventTypeEnum): string {
    return this.eventTypeOptions.find((o) => o.value === eventType)?.label ?? eventType;
  }
}
