export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface SyncJob {
  id: string;
  name: string;
  data: string;
  progress: number;
  processedOn?: Date;
  finishedOn?: Date;
  failedReason?: string;
  status: string;
}

export interface SyncStatus {
  status: string;
  timestamp: string;
  queues: QueueStats;
}

export interface SyncTriggerResponse {
  message: string;
  success: boolean;
}