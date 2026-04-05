import { inject, Injectable, signal, computed } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';

export interface CronJobModel {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  jobFunction: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  lastStatus?: string;
  lastError?: string;
  runCount?: number;
  failureCount?: number;
  createdAt: string;
  updatedAt: string;
}

const GET_CRON_JOBS = gql`
  query GetCronJobs {
    cronJobs {
      id
      name
      description
      cronExpression
      jobFunction
      isActive
      lastRun
      nextRun
      lastStatus
      lastError
      runCount
      failureCount
      createdAt
      updatedAt
    }
  }
`;

const TRIGGER_CRON_JOB = gql`
  mutation TriggerCronJob($id: ID!) {
    triggerCronJob(id: $id) {
      id
      name
      lastRun
      nextRun
      lastStatus
      lastError
      runCount
      failureCount
    }
  }
`;

const UPDATE_CRON_JOB = gql`
  mutation UpdateCronJob($id: ID!, $input: UpdateCronJobInput!) {
    updateCronJob(id: $id, input: $input) {
      id
      name
      description
      cronExpression
      isActive
      nextRun
    }
  }
`;

@Injectable()
export class CronJobsTabService {
  private readonly apollo = inject(Apollo);

  private _cronJobs = signal<CronJobModel[]>([]);
  private _loading = signal(true);

  cronJobs = computed(() => this._cronJobs());
  loading = computed(() => this._loading());

  constructor() {
    this.loadCronJobs();
  }

  loadCronJobs(): void {
    this._loading.set(true);
    this.apollo
      .query<{ cronJobs: CronJobModel[] }>({
        query: GET_CRON_JOBS,
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.cronJobs ?? []))
      .subscribe({
        next: (jobs) => {
          this._cronJobs.set(jobs);
          this._loading.set(false);
        },
        error: (err) => {
          console.warn('Failed to load cron jobs:', err);
          this._loading.set(false);
        },
      });
  }

  triggerCronJob(id: string): Observable<CronJobModel> {
    return this.apollo
      .mutate<{ triggerCronJob: CronJobModel }>({
        mutation: TRIGGER_CRON_JOB,
        variables: { id },
      })
      .pipe(map((result) => result.data!.triggerCronJob));
  }

  updateCronJob(id: string, input: { cronExpression?: string; isActive?: boolean; description?: string }): Observable<CronJobModel> {
    return this.apollo
      .mutate<{ updateCronJob: CronJobModel }>({
        mutation: UPDATE_CRON_JOB,
        variables: { id, input },
      })
      .pipe(map((result) => result.data!.updateCronJob));
  }
}
