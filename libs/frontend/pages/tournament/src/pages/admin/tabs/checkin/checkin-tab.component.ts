import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TournamentEvent } from '@app/models';
import { CheckInStatus } from '@app/models-enum';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CheckInWithDetails, CheckinTabService } from './checkin-tab.service';

@Component({
  selector: 'app-checkin-tab',
  standalone: true,
  imports: [
    FormsModule,
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
    TooltipModule,
    CheckboxModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './checkin-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckinTabComponent {
  tournament = input.required<TournamentEvent>();

  private readonly dataService = new CheckinTabService();

  // Form controls
  statusFilter = new FormControl<CheckInStatus | null>(null);
  searchControl = new FormControl<string>('');

  // Data
  checkIns = this.dataService.checkIns;
  stats = this.dataService.stats;
  loading = this.dataService.loading;
  error = this.dataService.error;
  updating = this.dataService.updating;
  updateError = this.dataService.updateError;

  // Selection
  selectedCheckIns = signal<CheckInWithDetails[]>([]);

  // Status filter options
  readonly statusOptions = [
    { label: 'All', value: null },
    { label: 'Pending', value: CheckInStatus.PENDING },
    { label: 'Checked In', value: CheckInStatus.CHECKED_IN },
    { label: 'No Show', value: CheckInStatus.NO_SHOW },
  ];

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

    // Watch status filter
    effect(() => {
      const status = this.statusFilter.value;
      this.dataService.filter.patchValue({
        status,
      });
    });

    // Watch search
    effect(() => {
      const search = this.searchControl.value;
      this.dataService.filter.patchValue({
        search: search ?? '',
      });
    });
  }

  getStatusSeverity(status: CheckInStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case CheckInStatus.CHECKED_IN:
        return 'success';
      case CheckInStatus.PENDING:
        return 'warn';
      case CheckInStatus.NO_SHOW:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getPlayerName(checkIn: CheckInWithDetails): string {
    if (checkIn.enrollment?.isGuest && checkIn.enrollment.guestName) {
      return `${checkIn.enrollment.guestName} (Guest)`;
    }
    return checkIn.player?.fullName ?? 'Unknown';
  }

  // Selection handlers
  isSelected(checkIn: CheckInWithDetails): boolean {
    return this.selectedCheckIns().some((c) => c.id === checkIn.id);
  }

  toggleSelection(checkIn: CheckInWithDetails): void {
    const current = this.selectedCheckIns();
    if (this.isSelected(checkIn)) {
      this.selectedCheckIns.set(current.filter((c) => c.id !== checkIn.id));
    } else {
      this.selectedCheckIns.set([...current, checkIn]);
    }
  }

  selectAllPending(): void {
    const pending = this.checkIns().filter((c) => c.status === CheckInStatus.PENDING);
    this.selectedCheckIns.set(pending);
  }

  clearSelection(): void {
    this.selectedCheckIns.set([]);
  }

  // Actions
  async initializeCheckIns(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament) return;

    await this.dataService.initializeCheckIns(tournament.id);
  }

  async checkIn(checkIn: CheckInWithDetails): Promise<void> {
    const tournament = this.tournament();
    if (!tournament || !checkIn.enrollment?.id) return;

    await this.dataService.checkInPlayer(tournament.id, checkIn.enrollment.id);
  }

  async markNoShow(checkIn: CheckInWithDetails): Promise<void> {
    const tournament = this.tournament();
    if (!tournament || !checkIn.enrollment?.id) return;

    await this.dataService.markNoShow(tournament.id, checkIn.enrollment.id);
  }

  async undoCheckIn(checkIn: CheckInWithDetails): Promise<void> {
    await this.dataService.undoCheckIn(checkIn.id);
  }

  async bulkCheckIn(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament) return;

    const selected = this.selectedCheckIns();
    const enrollmentIds = selected.filter((c) => c.enrollment?.id && c.status === CheckInStatus.PENDING).map((c) => c.enrollment!.id);

    if (enrollmentIds.length === 0) return;

    const result = await this.dataService.bulkCheckIn(tournament.id, enrollmentIds);

    if (result) {
      this.selectedCheckIns.set([]);
    }
  }

  refetch(): void {
    this.dataService.refetch();
  }
}
