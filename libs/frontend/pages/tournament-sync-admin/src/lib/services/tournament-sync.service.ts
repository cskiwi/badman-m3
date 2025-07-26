import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface TournamentSyncJob {
  id: string;
  name: string;
  data: any;
  opts: any;
  progress: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  returnvalue?: any;
  timestamp: number;
  status: 'waiting' | 'active' | 'completed' | 'failed';
}

export interface TournamentSyncStatus {
  service: string;
  status: string;
  timestamp: string;
  version: string;
  queue: QueueStats;
}

export interface TournamentSyncHealth {
  status: string;
  checks: {
    queue: string;
    redis: string;
  };
  timestamp: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TournamentSyncApiService {
  private http = inject(HttpClient);
  
  // Tournament sync worker runs on port 3001
  private readonly baseUrl = 'http://localhost:3001/api';

  /**
   * Get tournament sync worker status and queue statistics
   */
  getStatus(): Observable<TournamentSyncStatus> {
    return this.http.get<TournamentSyncStatus>(`${this.baseUrl}/status`);
  }

  /**
   * Get tournament sync worker health check
   */
  getHealth(): Observable<TournamentSyncHealth> {
    return this.http.get<TournamentSyncHealth>(`${this.baseUrl}/health`);
  }

  /**
   * Trigger tournament discovery sync
   */
  triggerDiscoverySync(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/sync/discovery`, {});
  }

  /**
   * Trigger competition structure sync
   */
  triggerCompetitionSync(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/sync/competitions`, {});
  }

  /**
   * Trigger tournament structure sync
   */
  triggerTournamentSync(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/sync/tournaments`, {});
  }

  /**
   * Get recent jobs from the queue
   */
  getRecentJobs(limit: number = 20, status?: string): Observable<TournamentSyncJob[]> {
    let params = `?limit=${limit}`;
    if (status) {
      params += `&status=${status}`;
    }
    return this.http.get<TournamentSyncJob[]>(`${this.baseUrl}/jobs${params}`);
  }
}