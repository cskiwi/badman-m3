import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Court, Game, TournamentEvent, TournamentScheduleSlot } from '@app/models';
import { ScheduleSlotStatus, ScheduleStrategy } from '@app/models-enum';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ScheduleResult, ScheduleTabService } from './schedule-tab.service';

@Component({
  selector: 'app-schedule-tab',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    CardModule,
    ButtonModule,
    TagModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    MessageModule,
    ProgressBarModule,
    DialogModule,
    TooltipModule,
    CheckboxModule,
    DatePickerModule,
    MultiSelectModule,
    DatePipe,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
  ],
  templateUrl: './schedule-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleTabComponent {
  tournament = input.required<TournamentEvent>();

  private readonly dataService = new ScheduleTabService();

  // Date filter
  selectedDate = signal<Date | null>(null);

  // Generate slots dialog
  showGenerateSlotsDialog = signal(false);
  generateSlotsForm = new FormGroup({
    courtIds: new FormControl<string[]>([], Validators.required),
    dates: new FormControl<Date[]>([], Validators.required),
    startTime: new FormControl<string>('09:00', Validators.required),
    endTime: new FormControl<string>('18:00', Validators.required),
    slotDurationMinutes: new FormControl<number>(30, Validators.required),
    breakMinutes: new FormControl<number>(0),
  });

  // Auto-schedule dialog
  showAutoScheduleDialog = signal(false);
  autoScheduleForm = new FormGroup({
    strategy: new FormControl<ScheduleStrategy>(ScheduleStrategy.MINIMIZE_WAIT, Validators.required),
    minRestMinutes: new FormControl<number>(15),
  });
  lastScheduleResult = signal<ScheduleResult | null>(null);

  // Data
  slots = this.dataService.slots;
  courts = this.dataService.courts;
  unscheduledGames = this.dataService.unscheduledGames;
  slotsGroupedByTime = this.dataService.slotsGroupedByTime;
  availableDates = this.dataService.availableDates;
  loading = this.dataService.loading;
  error = this.dataService.error;
  updating = this.dataService.updating;
  updateError = this.dataService.updateError;
  stats = this.dataService.stats;

  // Strategy options
  readonly strategyOptions = [
    { label: 'Minimize Wait Time', value: ScheduleStrategy.MINIMIZE_WAIT },
    { label: 'Category Order', value: ScheduleStrategy.CATEGORY_ORDER },
    { label: 'By Level', value: ScheduleStrategy.BY_LEVEL },
    { label: 'Random', value: ScheduleStrategy.RANDOM },
  ];

  // Slot duration options
  readonly slotDurationOptions = [
    { label: '20 min', value: 20 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
  ];

  // Computed courts for grid header
  gridCourts = computed(() => {
    const allCourts = this.courts();
    const slotsData = this.slots();

    // Get unique court IDs from slots
    const courtIds = new Set(slotsData.map((s) => s.courtId));

    return allCourts.filter((c) => courtIds.has(c.id)).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  });

  // Unscheduled panel visibility
  showUnscheduledPanel = signal(true);

  // Selected game for assignment
  selectedGame = signal<Game | null>(null);

  constructor() {
    // Initialize filter with tournament ID
    effect(() => {
      const tournament = this.tournament();
      if (tournament) {
        this.dataService.filter.patchValue({
          tournamentEventId: tournament.id,
        });
      }
    });

    // Update filter when date changes
    effect(() => {
      const date = this.selectedDate();
      this.dataService.filter.patchValue({
        date,
      });
    });
  }

  getSlotStatusSeverity(status: ScheduleSlotStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case ScheduleSlotStatus.AVAILABLE:
        return 'secondary';
      case ScheduleSlotStatus.SCHEDULED:
        return 'info';
      case ScheduleSlotStatus.IN_PROGRESS:
        return 'warn';
      case ScheduleSlotStatus.COMPLETED:
        return 'success';
      case ScheduleSlotStatus.BLOCKED:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getGameDisplayName(game: Game): string {
    const memberships = game.gamePlayerMemberships ?? [];
    const team1 = memberships.filter((m) => m.single === 1 || m.double === 1);
    const team2 = memberships.filter((m) => m.single === 2 || m.double === 2);

    const team1Names = team1.map((m) => m.gamePlayer?.fullName ?? 'TBD').join(' / ');
    const team2Names = team2.map((m) => m.gamePlayer?.fullName ?? 'TBD').join(' / ');

    return `${team1Names || 'TBD'} vs ${team2Names || 'TBD'}`;
  }

  getSlotForCourt(slots: TournamentScheduleSlot[], courtId: string): TournamentScheduleSlot | undefined {
    return slots.find((s) => s.courtId === courtId);
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Actions
  openGenerateSlotsDialog(): void {
    const tournament = this.tournament();
    const courts = this.courts();

    // Pre-select all courts
    this.generateSlotsForm.patchValue({
      courtIds: courts.map((c) => c.id),
      dates: tournament?.firstDay ? [new Date(tournament.firstDay)] : [],
      startTime: '09:00',
      endTime: '18:00',
      slotDurationMinutes: 30,
      breakMinutes: 0,
    });

    this.showGenerateSlotsDialog.set(true);
  }

  async generateSlots(): Promise<void> {
    if (!this.generateSlotsForm.valid) return;

    const tournament = this.tournament();
    if (!tournament) return;

    const { courtIds, dates, startTime, endTime, slotDurationMinutes, breakMinutes } = this.generateSlotsForm.value;

    await this.dataService.generateTimeSlots(
      tournament.id,
      courtIds!,
      dates!,
      startTime!,
      endTime!,
      slotDurationMinutes!,
      breakMinutes ?? 0,
    );

    this.showGenerateSlotsDialog.set(false);
  }

  openAutoScheduleDialog(): void {
    this.autoScheduleForm.reset({
      strategy: ScheduleStrategy.MINIMIZE_WAIT,
      minRestMinutes: 15,
    });
    this.lastScheduleResult.set(null);
    this.showAutoScheduleDialog.set(true);
  }

  async autoSchedule(): Promise<void> {
    if (!this.autoScheduleForm.valid) return;

    const tournament = this.tournament();
    if (!tournament) return;

    const { strategy, minRestMinutes } = this.autoScheduleForm.value;

    const result = await this.dataService.scheduleGames(tournament.id, strategy!, minRestMinutes ?? 15);

    this.lastScheduleResult.set(result);
  }

  async publishSchedule(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament) return;

    if (!confirm('Are you sure you want to publish the schedule? Players will be able to see their game times.')) {
      return;
    }

    const success = await this.dataService.publishSchedule(tournament.id);
    if (success) {
      // Reload tournament data to update phase
      window.location.reload();
    }
  }

  // Drag and drop handlers
  onGameDragStart(game: Game): void {
    this.selectedGame.set(game);
  }

  onGameDragEnd(): void {
    this.selectedGame.set(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async onDropOnSlot(event: CdkDragDrop<any>, slot: TournamentScheduleSlot): Promise<void> {
    const game = event.item.data as Game;

    if (!game || !slot) return;

    // Check if slot is available
    if (slot.status !== ScheduleSlotStatus.AVAILABLE) {
      return;
    }

    await this.dataService.assignGameToSlot(game.id, slot.id);
    this.selectedGame.set(null);
  }

  async removeFromSlot(slot: TournamentScheduleSlot): Promise<void> {
    if (!slot.gameId) return;
    await this.dataService.removeGameFromSlot(slot.id);
  }

  async toggleBlockSlot(slot: TournamentScheduleSlot): Promise<void> {
    if (slot.status === ScheduleSlotStatus.BLOCKED) {
      await this.dataService.unblockSlot(slot.id);
    } else if (slot.status === ScheduleSlotStatus.AVAILABLE) {
      await this.dataService.blockSlot(slot.id);
    }
  }

  async deleteSlot(slot: TournamentScheduleSlot): Promise<void> {
    if (!confirm('Are you sure you want to delete this time slot?')) return;
    await this.dataService.deleteSlot(slot.id);
  }

  refetch(): void {
    this.dataService.refetch();
  }

  onDateChange(date: Date | null): void {
    this.selectedDate.set(date);
  }

  // Track functions for ngFor
  trackByTime(index: number, item: { time: Date }): string {
    return item.time.toISOString();
  }

  trackByCourt(index: number, item: Court): string {
    return item.id;
  }

  trackByGame(index: number, item: Game): string {
    return item.id;
  }
}
