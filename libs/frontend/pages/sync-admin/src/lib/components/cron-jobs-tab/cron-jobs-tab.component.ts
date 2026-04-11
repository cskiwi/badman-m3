import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import cronstrue from 'cronstrue/i18n';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { CronJobModel, CronJobsTabService } from './cron-jobs-tab.service';

@Component({
  selector: 'app-cron-jobs-tab',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SkeletonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TranslateModule,
  ],
  providers: [MessageService, CronJobsTabService],
  templateUrl: './cron-jobs-tab.component.html',
})
export class CronJobsTabComponent {
  readonly cronJobsService = inject(CronJobsTabService);
  private readonly messageService = inject(MessageService);
  private readonly translateService = inject(TranslateService);

  cronJobs = this.cronJobsService.cronJobs;
  loading = this.cronJobsService.loading;
  actionLoading = signal(false);

  /** Map app locale to cronstrue locale */
  private readonly cronLocale = computed(() => {
    const lang = this.translateService.currentLang || this.translateService.defaultLang || 'en';
    return lang.split('_')[0].split('-')[0];
  });

  getCronDescription(expression: string): string {
    try {
      return cronstrue.toString(expression, { locale: this.cronLocale() });
    } catch {
      return expression;
    }
  }

  // Edit dialog
  editDialogVisible = signal(false);
  editingJob = signal<CronJobModel | null>(null);
  editCronTime = signal('');

  get editDialogOpen(): boolean {
    return this.editDialogVisible();
  }

  set editDialogOpen(value: boolean) {
    this.editDialogVisible.set(value);
    if (!value) {
      this.editingJob.set(null);
      this.editCronTime.set('');
    }
  }

  get editCronValue(): string {
    return this.editCronTime();
  }

  set editCronValue(value: string) {
    this.editCronTime.set(value);
  }

  triggerJob(job: CronJobModel): void {
    this.actionLoading.set(true);
    this.cronJobsService.triggerCronJob(job.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('all.common.success'),
          detail: `Triggered ${job.name}`,
        });
        this.cronJobsService.loadCronJobs();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('all.common.error'),
          detail: `Failed to trigger ${job.name}`,
        });
      },
      complete: () => this.actionLoading.set(false),
    });
  }

  toggleActive(job: CronJobModel): void {
    this.cronJobsService.updateCronJob(job.id, { active: !job.active }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('all.common.success'),
          detail: `${job.name} ${job.active ? 'disabled' : 'enabled'}`,
        });
        this.cronJobsService.loadCronJobs();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('all.common.error'),
          detail: `Failed to update ${job.name}`,
        });
      },
    });
  }

  openEditDialog(job: CronJobModel): void {
    this.editingJob.set(job);
    this.editCronTime.set(job.cronTime);
    this.editDialogVisible.set(true);
  }

  saveEdit(): void {
    const job = this.editingJob();
    if (!job) return;

    this.actionLoading.set(true);
    this.cronJobsService.updateCronJob(job.id, { cronTime: this.editCronTime() }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('all.common.success'),
          detail: `Updated schedule for ${job.name}`,
        });
        this.editDialogOpen = false;
        this.cronJobsService.loadCronJobs();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('all.common.error'),
          detail: `Failed to update ${job.name}`,
        });
      },
      complete: () => this.actionLoading.set(false),
    });
  }
}
