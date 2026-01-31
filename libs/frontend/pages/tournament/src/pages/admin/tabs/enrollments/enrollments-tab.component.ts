import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TournamentEnrollment, TournamentEvent, TournamentSubEvent } from '@app/models';
import { EnrollmentStatus } from '@app/models-enum';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmationService } from 'primeng/api';
import { EnrollmentsTabService } from './enrollments-tab.service';

@Component({
  selector: 'app-enrollments-tab',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    SelectModule,
    InputTextModule,
    MessageModule,
    ProgressBarModule,
    DialogModule,
    ConfirmDialogModule,
    TabsModule,
    TooltipModule,
    CheckboxModule,
    TextareaModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './enrollments-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentsTabComponent {
  tournament = input.required<TournamentEvent>();

  private readonly dataService = new EnrollmentsTabService();
  private readonly confirmationService = new ConfirmationService();

  // Form controls
  subEventControl = new FormControl<TournamentSubEvent | null>(null);
  statusFilter = new FormControl<EnrollmentStatus | null>(null);
  searchControl = new FormControl<string>('');

  // Manual enrollment dialog
  showManualEnrollmentDialog = signal(false);
  manualEnrollmentForm = new FormGroup({
    playerSearch: new FormControl<string>('', Validators.required),
    partnerSearch: new FormControl<string>(''),
    isGuest: new FormControl<boolean>(false),
    guestName: new FormControl<string>(''),
    guestEmail: new FormControl<string>(''),
    notes: new FormControl<string>(''),
  });

  // Status options
  readonly statusOptions = [
    { label: 'All', value: null },
    { label: 'Confirmed', value: EnrollmentStatus.CONFIRMED },
    { label: 'Pending', value: EnrollmentStatus.PENDING },
    { label: 'Waiting List', value: EnrollmentStatus.WAITING_LIST },
    { label: 'Cancelled', value: EnrollmentStatus.CANCELLED },
    { label: 'Withdrawn', value: EnrollmentStatus.WITHDRAWN },
  ];

  // Data
  enrollments = this.dataService.enrollments;
  loading = this.dataService.loading;
  error = this.dataService.error;
  updating = this.dataService.updating;
  updateError = this.dataService.updateError;
  stats = this.dataService.stats;

  // Selected sub-event
  selectedSubEvent = signal<TournamentSubEvent | null>(null);

  // Sub-events list
  subEvents = computed(() => this.tournament()?.tournamentSubEvents ?? []);

  constructor() {
    // Watch sub-event selection
    effect(() => {
      const subEvent = this.subEventControl.value;
      if (subEvent) {
        this.selectedSubEvent.set(subEvent);
        this.dataService.filter.patchValue({
          subEventId: subEvent.id,
        });
      }
    });

    // Watch status filter
    effect(() => {
      const status = this.statusFilter.value;
      this.dataService.filter.patchValue({
        status: status,
      });
    });

    // Watch search
    effect(() => {
      const search = this.searchControl.value;
      this.dataService.filter.patchValue({
        search: search ?? '',
      });
    });

    // Auto-select first sub-event
    effect(() => {
      const subEvents = this.subEvents();
      if (subEvents.length > 0 && !this.selectedSubEvent()) {
        this.subEventControl.setValue(subEvents[0]);
      }
    });
  }

  getStatusSeverity(status: EnrollmentStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case EnrollmentStatus.CONFIRMED:
        return 'success';
      case EnrollmentStatus.PENDING:
        return 'info';
      case EnrollmentStatus.WAITING_LIST:
        return 'warn';
      case EnrollmentStatus.CANCELLED:
      case EnrollmentStatus.WITHDRAWN:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getPlayerName(enrollment: TournamentEnrollment): string {
    if (enrollment.isGuest) {
      return `${enrollment.guestName} (Guest)`;
    }
    return enrollment.player?.fullName ?? 'Unknown';
  }

  getPartnerName(enrollment: TournamentEnrollment): string {
    if (enrollment.confirmedPartner) {
      return enrollment.confirmedPartner.fullName ?? 'Unknown';
    }
    if (enrollment.preferredPartner) {
      return `${enrollment.preferredPartner.fullName ?? 'Unknown'} (Preferred)`;
    }
    return '-';
  }

  isDoublesEvent(): boolean {
    const subEvent = this.selectedSubEvent();
    return subEvent?.gameType === 'D' || subEvent?.gameType === 'MX';
  }

  async cancelEnrollment(enrollment: TournamentEnrollment): Promise<void> {
    const playerName = this.getPlayerName(enrollment);
    if (confirm(`Are you sure you want to cancel the enrollment for ${playerName}?`)) {
      await this.dataService.cancelEnrollment(enrollment.id);
    }
  }

  async promoteFromWaitingList(enrollment: TournamentEnrollment): Promise<void> {
    const playerName = this.getPlayerName(enrollment);
    if (confirm(`Are you sure you want to promote ${playerName} from the waiting list?`)) {
      await this.dataService.promoteFromWaitingList(enrollment.id);
    }
  }

  refetch(): void {
    this.dataService.refetch();
  }

  openManualEnrollmentDialog(): void {
    this.manualEnrollmentForm.reset({ isGuest: false });
    this.showManualEnrollmentDialog.set(true);
  }

  async createManualEnrollment(): Promise<void> {
    if (!this.manualEnrollmentForm.valid) return;

    const subEvent = this.selectedSubEvent();
    if (!subEvent) return;

    const formValue = this.manualEnrollmentForm.value;

    // TODO: Implement the actual enrollment creation logic
    // This would call the data service to create a manual enrollment
    // await this.dataService.createManualEnrollment(subEvent.id, {
    //   playerSearch: formValue.playerSearch,
    //   partnerSearch: formValue.partnerSearch,
    //   isGuest: formValue.isGuest,
    //   guestName: formValue.guestName,
    //   guestEmail: formValue.guestEmail,
    //   notes: formValue.notes,
    // });

    console.log('Creating manual enrollment:', formValue);
    this.showManualEnrollmentDialog.set(false);
  }
}
