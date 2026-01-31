import { computed, effect, inject, Injectable, signal, OnDestroy } from '@angular/core';
import { AuthService } from '@app/frontend-modules-auth/service';
import { io, Socket } from 'socket.io-client';
import { QueueStats, SyncJob, SyncStatus } from '../models/sync.models';

interface WebSocketMessage {
  timestamp: string;
}

interface QueueStatsMessage extends WebSocketMessage {
  stats: QueueStats;
}

interface JobUpdateMessage extends WebSocketMessage {
  job: SyncJob;
}

interface SyncStatusMessage extends WebSocketMessage {
  status: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WebSocketSyncService implements OnDestroy {
  private readonly auth = inject(AuthService);

  private socket: Socket | null = null;
  private connectionStatus = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  // Job update handler delegate
  private jobUpdateHandler: ((job: SyncJob) => void) | null = null;

  // Data signals
  private _queueStats = signal<QueueStats | null>(null);
  private _recentJobs = signal<SyncJob[]>([]);
  private _syncStatus = signal<SyncStatus | null>(null);

  // Loading states
  private _queueStatsLoading = signal(false);
  private _recentJobsLoading = signal(false);
  private _tournamentsLoading = signal(false);

  // Public computed selectors
  queueStats = computed(() => this._queueStats());
  recentJobs = computed(() => this._recentJobs()); // Deprecated - jobs managed by dashboard service
  syncStatus = computed(() => this._syncStatus());

  queueStatsLoading = computed(() => this._queueStatsLoading());
  recentJobsLoading = computed(() => this._recentJobsLoading());
  tournamentsLoading = computed(() => this._tournamentsLoading());

  // Combined loading state
  loading = computed(() => this.queueStatsLoading() || this.recentJobsLoading() || this.tournamentsLoading());

  // Connection status
  isConnected = computed(() => this.connectionStatus() === 'connected');
  isConnecting = computed(() => this.connectionStatus() === 'connecting');
  isDisconnected = computed(() => this.connectionStatus() === 'disconnected');
  
  // Computed to determine if we should be connected
  shouldBeConnected = computed(() => {
    const loggedIn = this.auth.loggedIn();
    const hasToken = !!this.auth.token();
    return loggedIn && hasToken;
  });

  constructor() {
    // Auto-connect when user is authenticated using effect
    effect(() => {
      const shouldConnect = this.shouldBeConnected();
      const currentlyConnected = this.isConnected();

      if (shouldConnect && !currentlyConnected) {
        this.connect();
      } else if (!shouldConnect && this.socket) {
        this.disconnect();
      }
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    // If socket exists but is not connected, disconnect first
    if (this.socket && !this.socket.connected) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.socket?.connected) {
      console.warn('WebSocket already connected');
      return;
    }

    const token = this.auth.token();
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    this.connectionStatus.set('connecting');

    // Create socket connection to the /sync namespace
    this.socket = io(`${this.getServerUrl()}/sync`, {
      path: '/socket.io',
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true, // Force a new connection
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatus.set('disconnected');
  }

  /**
   * Force reconnect - disconnect and reconnect
   */
  forceReconnect(): void {
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 100);
  }

  /**
   * Subscribe to queue statistics updates
   */
  subscribeToQueueStats(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe-queue-stats');
    } else {
      console.warn('Cannot subscribe to queue stats - WebSocket not connected');
    }
  }

  /**
   * Subscribe to job updates
   */
  subscribeToJobUpdates(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe-job-updates');
    } else {
      console.warn('Cannot subscribe to job updates - WebSocket not connected');
    }
  }

  /**
   * Unsubscribe from queue statistics updates
   */
  unsubscribeFromQueueStats(): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe-queue-stats');
    }
  }

  /**
   * Unsubscribe from job updates
   */
  unsubscribeFromJobUpdates(): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe-job-updates');
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.connectionStatus.set('connected');

      // Auto-subscribe to updates
      this.subscribeToQueueStats();
      this.subscribeToJobUpdates();
    });

    this.socket.on('disconnect', () => {
      this.connectionStatus.set('disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      this.connectionStatus.set('disconnected');
    });

    this.socket.on('reconnect_attempt', () => {
      this.connectionStatus.set('connecting');
    });

    this.socket.on('reconnect_failed', () => {
      this.connectionStatus.set('disconnected');
    });

    this.socket.on('reconnect', () => {
      this.connectionStatus.set('connected');
    });

    // Data update events
    this.socket.on('queue-stats-updated', (data: QueueStatsMessage) => {
      this._queueStats.set(data.stats);
    });

    this.socket.on('job-updated', (data: JobUpdateMessage) => {
      this.handleJobUpdate(data.job);
    });

    this.socket.on('job-created', (data: JobUpdateMessage) => {
      this.handleJobUpdate(data.job);
    });

    this.socket.on('job-completed', (data: JobUpdateMessage) => {
      this.handleJobUpdate(data.job);
    });

    this.socket.on('job-failed', (data: JobUpdateMessage) => {
      this.handleJobUpdate(data.job);
    });

    this.socket.on('sync-status-updated', (data: SyncStatusMessage) => {
      this._syncStatus.set({
        status: data.status,
        timestamp: data.timestamp,
        queues: this._queueStats() || { waiting: 0, active: 0, completed: 0, failed: 0 },
      });
    });
  }

  /**
   * Set job update handler from dashboard service
   */
  setJobUpdateHandler(handler: (job: SyncJob) => void): void {
    this.jobUpdateHandler = handler;
  }

  /**
   * Handle job updates by delegating to dashboard service
   */
  private handleJobUpdate(job: SyncJob): void {
    if (this.jobUpdateHandler) {
      this.jobUpdateHandler(job);
    }
  }


  /**
   * Set initial data (fallback for when WebSocket is not available)
   */
  setInitialQueueStats(stats: QueueStats): void {
    this._queueStats.set(stats);
  }

  setInitialJobs(jobs: SyncJob[]): void {
    // Deprecated - jobs now managed by dashboard service
    this._recentJobs.set(jobs);
  }

  setInitialSyncStatus(status: SyncStatus): void {
    this._syncStatus.set(status);
  }

  /**
   * Set loading states
   */
  setQueueStatsLoading(loading: boolean): void {
    this._queueStatsLoading.set(loading);
  }

  setRecentJobsLoading(loading: boolean): void {
    this._recentJobsLoading.set(loading);
  }

  setTournamentsLoading(loading: boolean): void {
    this._tournamentsLoading.set(loading);
  }

  /**
   * Get server URL from environment or default to localhost
   */
  private getServerUrl(): string {
    // In development, use the same origin as the frontend (Angular dev server will proxy)
    // In production, use the same origin
    return window.location.origin;
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.disconnect();
  }
}
