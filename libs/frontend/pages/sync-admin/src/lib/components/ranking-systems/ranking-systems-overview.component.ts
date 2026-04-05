import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import dayjs from 'dayjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { delay } from 'rxjs';
import { RankingSystemSyncInfo } from '../../models/sync.models';
import { SyncApiService } from '../../services';

@Component({
  selector: 'app-ranking-systems-overview',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    SkeletonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TranslateModule,
  ],
  providers: [MessageService],
  templateUrl: './ranking-systems-overview.component.html',
})
export class RankingSystemsOverviewComponent implements OnInit {
  private readonly syncApiService = inject(SyncApiService);
  private readonly messageService = inject(MessageService);
  private readonly translateService = inject(TranslateService);

  systems = signal<RankingSystemSyncInfo[]>([]);
  loading = signal(true);
  actionLoading = signal(false);

  // Calc dialog
  calcDialogVisible = signal(false);
  selectedSystem = signal<RankingSystemSyncInfo | null>(null);
  private calcStartDateSignal = signal<Date | null>(null);
  private calcStopDateSignal = signal<Date | null>(null);
  private rankingSyncStartDateSignal = signal<Date | null>(null);

  // Ranking sync dialog (VISUAL)
  rankingSyncDialogVisible = signal(false);

  get calcDialogOpen(): boolean {
    return this.calcDialogVisible();
  }

  set calcDialogOpen(value: boolean) {
    this.calcDialogVisible.set(value);
    if (!value) {
      this.selectedSystem.set(null);
      this.calcStartDateSignal.set(null);
      this.calcStopDateSignal.set(null);
    }
  }

  get rankingSyncDialogOpen(): boolean {
    return this.rankingSyncDialogVisible();
  }

  set rankingSyncDialogOpen(value: boolean) {
    this.rankingSyncDialogVisible.set(value);
    if (!value) {
      this.rankingSyncStartDateSignal.set(null);
    }
  }

  get calcStartDate(): Date | null {
    return this.calcStartDateSignal();
  }

  set calcStartDate(value: Date | null) {
    this.calcStartDateSignal.set(value);
  }

  get calcStopDate(): Date | null {
    return this.calcStopDateSignal();
  }

  set calcStopDate(value: Date | null) {
    this.calcStopDateSignal.set(value);
  }

  get rankingSyncStartDate(): Date | null {
    return this.rankingSyncStartDateSignal();
  }

  set rankingSyncStartDate(value: Date | null) {
    this.rankingSyncStartDateSignal.set(value);
  }

  visualSystems = computed(() => this.systems().filter((s) => s.rankingSystem === 'VISUAL'));
  nonVisualSystems = computed(() => this.systems().filter((s) => s.rankingSystem !== 'VISUAL'));

  ngOnInit(): void {
    this.loadSystems();
  }

  loadSystems(): void {
    this.loading.set(true);
    this.syncApiService.getRankingSystems().subscribe({
      next: (systems) => {
        this.systems.set(systems);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('all.common.error'),
          detail: 'Failed to load ranking systems',
        });
      },
    });
  }

  getStatusSeverity(system: RankingSystemSyncInfo): 'success' | 'warn' | 'danger' | 'secondary' {
    if (!system.runCurrently) return 'secondary';
    if (!system.calculationLastUpdate) return 'danger';

    const last = dayjs(system.calculationLastUpdate);
    const intervalMs = this.intervalToMs(system.calculationIntervalAmount, system.calculationIntervalUnit);
    const overdue = dayjs().diff(last, 'millisecond') > intervalMs * 1.5;
    return overdue ? 'warn' : 'success';
  }

  getStatusLabel(system: RankingSystemSyncInfo): string {
    if (!system.runCurrently) return 'Inactive';
    if (!system.calculationLastUpdate) return 'Never run';
    const severity = this.getStatusSeverity(system);
    return severity === 'warn' ? 'Overdue' : 'Up to date';
  }

  openCalcDialog(system: RankingSystemSyncInfo): void {
    this.selectedSystem.set(system);
    this.calcDialogVisible.set(true);
  }

  openRankingSyncDialog(): void {
    this.rankingSyncDialogVisible.set(true);
  }

  triggerCalc(): void {
    const system = this.selectedSystem();
    if (!system) return;

    this.actionLoading.set(true);
    const startDate = this.calcStartDateSignal() ? dayjs(this.calcStartDateSignal()!).format('YYYY-MM-DD') : undefined;
    const stopDate = this.calcStopDateSignal() ? dayjs(this.calcStopDateSignal()!).format('YYYY-MM-DD') : undefined;

    this.syncApiService
      .triggerRankingCalc(system.id, startDate, stopDate)
      .pipe(delay(600))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('all.common.success'),
            detail: `Ranking calculation queued for ${system.name}${startDate ? ` from ${startDate}` : ''}`,
          });
          this.calcDialogOpen = false;
          this.loadSystems();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('all.common.error'),
            detail: `Failed to queue ranking calculation for ${system.name}`,
          });
        },
        complete: () => this.actionLoading.set(false),
      });
  }

  triggerRankingSync(): void {
    this.actionLoading.set(true);
    const startDate = this.rankingSyncStartDateSignal() ? dayjs(this.rankingSyncStartDateSignal()!).format('YYYY-MM-DD') : undefined;

    this.syncApiService
      .triggerRankingSync(startDate)
      .pipe(delay(600))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('all.common.success'),
            detail: startDate ? `BBF ranking sync queued from ${startDate}` : 'BBF ranking sync queued',
          });
          this.rankingSyncDialogOpen = false;
          this.loadSystems();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('all.common.error'),
            detail: 'Failed to queue BBF ranking sync',
          });
        },
        complete: () => this.actionLoading.set(false),
      });
  }

  private intervalToMs(amount?: number, unit?: string): number {
    const a = amount ?? 1;
    switch (unit) {
      case 'days':
        return a * 86400000;
      case 'weeks':
        return a * 7 * 86400000;
      case 'months':
        return a * 30 * 86400000;
      default:
        return a * 86400000;
    }
  }
}
