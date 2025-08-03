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
  timestamp?: number;
  createdAt?: Date;
  parentId?: string;
  children?: SyncJob[];
  expanded?: boolean; // For UI state management
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