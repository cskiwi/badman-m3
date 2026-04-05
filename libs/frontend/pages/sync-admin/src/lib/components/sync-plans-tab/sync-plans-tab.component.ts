import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import dayjs from 'dayjs';
import { delay } from 'rxjs';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ConfirmationService, MessageService } from 'primeng/api';
import { SyncApiService } from '../../services';
import { SyncPlansTabService } from './sync-plans-tab.service';

@Component({
  selector: 'app-sync-plans-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    SelectModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TranslateModule,
  ],
  providers: [MessageService, ConfirmationService, SyncPlansTabService],
  templateUrl: './sync-plans-tab.component.html',
})
export class SyncPlansTabComponent {
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private syncPlansService = inject(SyncPlansTabService);
  private syncApiService = inject(SyncApiService);
  private translateService = inject(TranslateService);

  filter = this.syncPlansService.filter;
  displayItems = this.syncPlansService.displayItems;
  eventsLoading = this.syncPlansService.eventsLoading;
  selectedCount = this.syncPlansService.selectedCount;
  actionLoading = signal(false);

  // Ranking sync dialog
  rankingSyncDialogState = signal(false);
  rankingSyncStartDate = signal<Date | null>(null);

  get rankingDialogVisible(): boolean {
    return this.rankingSyncDialogState();
  }

  set rankingDialogVisible(value: boolean) {
    this.rankingSyncDialogState.set(value);
    if (!value) {
      this.rankingSyncStartDate.set(null);
    }
  }

  get rankingStartDateValue(): Date | null {
    return this.rankingSyncStartDate();
  }

  set rankingStartDateValue(value: Date | null) {
    this.rankingSyncStartDate.set(value);
  }

  eventCategoryOptions = computed(() => [
    { label: this.translateService.instant('all.sync.dashboard.scheduling.competition'), value: 'competition' },
    { label: this.translateService.instant('all.sync.dashboard.scheduling.tournament'), value: 'tournament' },
  ]);

  syncLevelOptions = computed(() => {
    const category = this.filter.controls.eventCategory.value;
    const options = [
      { label: this.translateService.instant('all.sync.dashboard.scheduling.syncLevel.event'), value: 'event' },
      { label: this.translateService.instant('all.sync.dashboard.scheduling.syncLevel.subEvent'), value: 'subEvent' },
      { label: this.translateService.instant('all.sync.dashboard.scheduling.syncLevel.draw'), value: 'draw' },
    ];
    if (category === 'competition') {
      options.push({
        label: this.translateService.instant('all.sync.dashboard.scheduling.syncLevel.encounter'),
        value: 'encounter',
      });
    }
    return options;
  });

  isSelected(id: string): boolean {
    return this.syncPlansService.isSelected(id);
  }

  isAllSelected(): boolean {
    return this.syncPlansService.isAllSelected();
  }

  toggleSelection(id: string): void {
    this.syncPlansService.toggleSelection(id);
  }

  toggleSelectAll(): void {
    if (this.syncPlansService.isAllSelected()) {
      this.syncPlansService.deselectAll();
    } else {
      this.syncPlansService.selectAll();
    }
  }

  toggleExpansion(id: string): void {
    this.syncPlansService.toggleHierarchyExpansion(id);
  }

  getIndentStyle(level: number): { 'padding-left': string } {
    return { 'padding-left': `${level * 24}px` };
  }

  scheduleSyncForSelected(): void {
    const count = this.syncPlansService.selectedCount();
    const syncLevel = this.filter.controls.syncLevel.value;

    this.confirmationService.confirm({
      message: this.translateService.instant('all.sync.dashboard.scheduling.confirmSync', { count, level: syncLevel }),
      header: this.translateService.instant('all.sync.dashboard.scheduling.scheduleSync'),
      icon: 'pi pi-sync',
      accept: () => {
        this.actionLoading.set(true);
        const sync$ = this.syncPlansService.getScheduleSyncObservable();
        if (!sync$) return;
        sync$.subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('all.common.success'),
              detail: this.translateService.instant('all.sync.dashboard.scheduling.syncScheduled', { count }),
            });
            this.syncPlansService.deselectAll();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('all.common.error'),
              detail: this.translateService.instant('all.sync.dashboard.scheduling.syncError'),
            });
          },
          complete: () => this.actionLoading.set(false),
        });
      },
    });
  }

  openRankingSyncDialog(): void {
    this.rankingSyncDialogState.set(true);
  }

  scheduleRankingSync(): void {
    this.actionLoading.set(true);
    const startDate = this.rankingSyncStartDate();
    const formattedStartDate = startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined;

    this.syncApiService
      .triggerRankingSync(formattedStartDate)
      .pipe(delay(600))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('all.common.success'),
            detail: formattedStartDate
              ? this.translateService.instant('all.sync.dashboard.actions.rankingSyncQueuedFrom', { date: formattedStartDate })
              : this.translateService.instant('all.sync.dashboard.actions.rankingSyncQueued'),
          });
          this.rankingDialogVisible = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('all.common.error'),
            detail: this.translateService.instant('all.sync.dashboard.actions.rankingSyncError'),
          });
        },
        complete: () => this.actionLoading.set(false),
      });
  }
}
