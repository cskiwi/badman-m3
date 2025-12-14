import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TournamentEvent, TournamentSubEvent } from '@app/models';
import { TournamentPhase, SubEventTypeEnum } from '@app/models-enum';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { StepperModule } from 'primeng/stepper';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SettingsTabService } from './settings-tab.service';

interface PhaseStep {
  phase: TournamentPhase;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-settings-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    DatePickerModule,
    CheckboxModule,
    MessageModule,
    DividerModule,
    TableModule,
    TagModule,
    DialogModule,
    SelectModule,
    InputNumberModule,
    TooltipModule,
    StepperModule,
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
  showSubEventDialog = signal(false);
  editingSubEvent = signal<TournamentSubEvent | null>(null);

  // Phase steps
  readonly phaseSteps: PhaseStep[] = [
    {
      phase: TournamentPhase.DRAFT,
      label: 'all.tournament.phases.draft',
      icon: 'pi pi-file-edit',
      description: 'all.tournament.phases.draftDesc',
    },
    {
      phase: TournamentPhase.ENROLLMENT_OPEN,
      label: 'all.tournament.phases.enrollmentOpen',
      icon: 'pi pi-user-plus',
      description: 'all.tournament.phases.enrollmentOpenDesc',
    },
    {
      phase: TournamentPhase.ENROLLMENT_CLOSED,
      label: 'all.tournament.phases.enrollmentClosed',
      icon: 'pi pi-lock',
      description: 'all.tournament.phases.enrollmentClosedDesc',
    },
    {
      phase: TournamentPhase.DRAWS_MADE,
      label: 'all.tournament.phases.drawsMade',
      icon: 'pi pi-sitemap',
      description: 'all.tournament.phases.drawsMadeDesc',
    },
    {
      phase: TournamentPhase.SCHEDULED,
      label: 'all.tournament.phases.scheduled',
      icon: 'pi pi-calendar',
      description: 'all.tournament.phases.scheduledDesc',
    },
    {
      phase: TournamentPhase.IN_PROGRESS,
      label: 'all.tournament.phases.inProgress',
      icon: 'pi pi-play',
      description: 'all.tournament.phases.inProgressDesc',
    },
    {
      phase: TournamentPhase.COMPLETED,
      label: 'all.tournament.phases.completed',
      icon: 'pi pi-check-circle',
      description: 'all.tournament.phases.completedDesc',
    },
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

  // Tournament settings form
  settingsForm = new FormGroup({
    name: new FormControl<string>('', [Validators.required, Validators.maxLength(255)]),
    tournamentDates: new FormControl<Date[] | null>(null),
    enrollmentDates: new FormControl<Date[] | null>(null),
    official: new FormControl<boolean>(false),
    allowGuestEnrollments: new FormControl<boolean>(false),
    schedulePublished: new FormControl<boolean>(false),
  });

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

  // Current phase index
  currentPhaseIndex = computed(() => {
    const phase = this.tournament()?.phase;
    return this.phaseSteps.findIndex((s) => s.phase === phase);
  });

  // Can advance to next phase
  canAdvance = computed(() => {
    const idx = this.currentPhaseIndex();
    return idx >= 0 && idx < this.phaseSteps.length - 1;
  });

  // Can go back to previous phase
  canGoBack = computed(() => {
    const idx = this.currentPhaseIndex();
    return idx > 0;
  });

  constructor() {
    // Initialize form when tournament changes
    effect(() => {
      const t = this.tournament();
      if (t) {
        // Tournament dates (firstDay to last day)
        const tournamentDates =
          t.firstDay && t.closeDate
            ? [new Date(t.firstDay), new Date(t.closeDate)]
            : t.firstDay
              ? [new Date(t.firstDay)]
              : null;

        // Enrollment open/close dates
        const enrollmentDates =
          t.enrollmentOpenDate && t.enrollmentCloseDate
            ? [new Date(t.enrollmentOpenDate), new Date(t.enrollmentCloseDate)]
            : null;

        this.settingsForm.patchValue({
          name: t.name,
          tournamentDates,
          enrollmentDates,
          official: t.official ?? false,
          allowGuestEnrollments: t.allowGuestEnrollments ?? false,
          schedulePublished: t.schedulePublished ?? false,
        });
      }
    });
  }

  async saveSettings(): Promise<void> {
    if (this.settingsForm.invalid) return;

    const t = this.tournament();
    const values = this.settingsForm.value;

    // Extract dates from range pickers
    const tournamentDates = values.tournamentDates as Date[] | null;
    const enrollmentDates = values.enrollmentDates as Date[] | null;

    const result = await this.dataService.updateTournament(t.id, {
      name: values.name ?? undefined,
      firstDay: tournamentDates?.[0] ?? undefined,
      closeDate: tournamentDates?.[1] ?? tournamentDates?.[0] ?? undefined,
      enrollmentOpenDate: enrollmentDates?.[0] ?? undefined,
      enrollmentCloseDate: enrollmentDates?.[1] ?? undefined,
      official: values.official ?? undefined,
      allowGuestEnrollments: values.allowGuestEnrollments ?? undefined,
      schedulePublished: values.schedulePublished ?? undefined,
    });

    if (result) {
      this.tournamentUpdated.emit();
    }
  }

  async advancePhase(): Promise<void> {
    const idx = this.currentPhaseIndex();
    if (idx < 0 || idx >= this.phaseSteps.length - 1) return;

    const nextPhase = this.phaseSteps[idx + 1].phase;
    const result = await this.dataService.updatePhase(this.tournament().id, nextPhase);

    if (result) {
      this.tournamentUpdated.emit();
    }
  }

  async goBackPhase(): Promise<void> {
    const idx = this.currentPhaseIndex();
    if (idx <= 0) return;

    const prevPhase = this.phaseSteps[idx - 1].phase;
    const result = await this.dataService.updatePhase(this.tournament().id, prevPhase);

    if (result) {
      this.tournamentUpdated.emit();
    }
  }

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
    this.subEventForm.get('gameType')?.disable();
    this.showSubEventDialog.set(true);
  }

  async saveSubEvent(): Promise<void> {
    if (this.subEventForm.invalid) return;

    const values = this.subEventForm.value;
    const editing = this.editingSubEvent();

    if (editing) {
      // Update existing
      const result = await this.dataService.updateSubEvent(editing.id, {
        name: values.name ?? undefined,
        eventType: values.eventType ?? undefined,
        maxEntries: values.maxEntries ?? undefined,
        waitingListEnabled: values.waitingListEnabled ?? undefined,
        minLevel: values.minLevel ?? undefined,
        maxLevel: values.maxLevel ?? undefined,
      });

      if (result) {
        this.showSubEventDialog.set(false);
        this.tournamentUpdated.emit();
      }
    } else {
      // Create new
      const result = await this.dataService.createSubEvent({
        eventId: this.tournament().id,
        name: values.name!,
        eventType: values.eventType!,
        gameType: values.gameType!,
        minLevel: values.minLevel ?? undefined,
        maxLevel: values.maxLevel ?? undefined,
        maxEntries: values.maxEntries ?? undefined,
        waitingListEnabled: values.waitingListEnabled ?? true,
      });

      if (result) {
        this.showSubEventDialog.set(false);
        this.tournamentUpdated.emit();
      }
    }
  }

  async deleteSubEvent(subEvent: TournamentSubEvent): Promise<void> {
    const result = await this.dataService.deleteSubEvent(subEvent.id);

    if (result) {
      this.tournamentUpdated.emit();
    }
  }

  getGameTypeLabel(gameType: string): string {
    return this.gameTypeOptions.find((o) => o.value === gameType)?.label ?? gameType;
  }

  getEventTypeLabel(eventType: SubEventTypeEnum): string {
    return this.eventTypeOptions.find((o) => o.value === eventType)?.label ?? eventType;
  }

  getPhaseTagSeverity(phase: TournamentPhase): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (phase) {
      case TournamentPhase.DRAFT:
        return 'secondary';
      case TournamentPhase.ENROLLMENT_OPEN:
        return 'info';
      case TournamentPhase.ENROLLMENT_CLOSED:
        return 'warn';
      case TournamentPhase.DRAWS_MADE:
        return 'info';
      case TournamentPhase.SCHEDULED:
        return 'info';
      case TournamentPhase.IN_PROGRESS:
        return 'success';
      case TournamentPhase.COMPLETED:
        return 'success';
      default:
        return 'secondary';
    }
  }
}
