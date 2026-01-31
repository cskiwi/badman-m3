import { computed, effect, Injectable, OnDestroy, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

// Types for tournament live updates
export interface CourtStatusUpdate {
  courtId: string;
  courtName: string;
  status: 'available' | 'in_progress' | 'blocked';
  currentGameId?: string;
  nextGameId?: string;
  timestamp: string;
}

export interface GameUpdate {
  gameId: string;
  courtId?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  set1Team1?: number;
  set1Team2?: number;
  set2Team1?: number;
  set2Team2?: number;
  set3Team1?: number;
  set3Team2?: number;
  winner?: number;
  startTime?: string;
  endTime?: string;
  timestamp: string;
}

export interface ScheduleUpdate {
  tournamentEventId: string;
  type: 'slot_added' | 'slot_removed' | 'game_assigned' | 'game_unassigned' | 'schedule_published';
  slotId?: string;
  gameId?: string;
  timestamp: string;
}

export interface TournamentStats {
  tournamentEventId: string;
  gamesInProgress: number;
  gamesCompleted: number;
  gamesRemaining: number;
  courtsAvailable: number;
  courtsInUse: number;
  timestamp: string;
}

export interface CheckInUpdate {
  tournamentEventId: string;
  enrollmentId: string;
  status: 'checked_in' | 'no_show' | 'pending';
  playerName?: string;
  timestamp: string;
}

export interface Announcement {
  tournamentEventId: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
  timestamp: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

@Injectable({
  providedIn: 'root',
})
export class TournamentLiveService implements OnDestroy {
  private socket: Socket | null = null;
  private currentTournamentId = signal<string | null>(null);
  private _connectionStatus = signal<ConnectionStatus>('disconnected');

  // Data signals
  private _courtStatuses = signal<Map<string, CourtStatusUpdate>>(new Map());
  private _gamesInProgress = signal<Map<string, GameUpdate>>(new Map());
  private _recentCompletedGames = signal<GameUpdate[]>([]);
  private _tournamentStats = signal<TournamentStats | null>(null);
  private _announcements = signal<Announcement[]>([]);

  // Public computed selectors
  connectionStatus = computed(() => this._connectionStatus());
  isConnected = computed(() => this._connectionStatus() === 'connected');
  isConnecting = computed(() => this._connectionStatus() === 'connecting');

  courtStatuses = computed(() => Array.from(this._courtStatuses().values()));
  gamesInProgress = computed(() => Array.from(this._gamesInProgress().values()));
  recentCompletedGames = computed(() => this._recentCompletedGames());
  tournamentStats = computed(() => this._tournamentStats());
  announcements = computed(() => this._announcements());

  // Event callbacks - components can register handlers
  private courtStatusHandlers: ((update: CourtStatusUpdate) => void)[] = [];
  private gameStartedHandlers: ((update: GameUpdate) => void)[] = [];
  private scoreUpdatedHandlers: ((update: GameUpdate) => void)[] = [];
  private gameCompletedHandlers: ((update: GameUpdate) => void)[] = [];
  private gameCancelledHandlers: ((data: { gameId: string; courtId?: string; timestamp: string }) => void)[] = [];
  private scheduleUpdatedHandlers: ((update: ScheduleUpdate) => void)[] = [];
  private checkInUpdatedHandlers: ((update: CheckInUpdate) => void)[] = [];
  private announcementHandlers: ((announcement: Announcement) => void)[] = [];

  constructor() {
    // Auto-disconnect when tournament changes
    effect(() => {
      const tournamentId = this.currentTournamentId();
      if (!tournamentId && this.socket) {
        this.disconnect();
      }
    });
  }

  /**
   * Connect to tournament live updates
   */
  connectToTournament(tournamentEventId: string): void {
    // If already connected to a different tournament, disconnect first
    if (this.currentTournamentId() && this.currentTournamentId() !== tournamentEventId) {
      this.disconnect();
    }

    // If already connected to this tournament, just return
    if (this.currentTournamentId() === tournamentEventId && this.socket?.connected) {
      return;
    }

    this.currentTournamentId.set(tournamentEventId);
    this._connectionStatus.set('connecting');

    // Clear previous data
    this._courtStatuses.set(new Map());
    this._gamesInProgress.set(new Map());
    this._recentCompletedGames.set([]);
    this._tournamentStats.set(null);
    this._announcements.set([]);

    // Create socket connection to the /tournament-live namespace
    // Note: No authentication required for live display
    this.socket = io(`${this.getServerUrl()}/tournament-live`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
    });

    this.setupEventListeners(tournamentEventId);
  }

  /**
   * Disconnect from tournament live updates
   */
  disconnect(): void {
    const tournamentId = this.currentTournamentId();
    if (this.socket && tournamentId) {
      // Unsubscribe from tournament room before disconnecting
      this.socket.emit('unsubscribe-tournament', { tournamentEventId: tournamentId });
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentTournamentId.set(null);
    this._connectionStatus.set('disconnected');
  }

  /**
   * Subscribe to a specific court's updates
   */
  subscribeToCourtUpdates(courtId: string): void {
    const tournamentId = this.currentTournamentId();
    if (this.socket?.connected && tournamentId) {
      this.socket.emit('subscribe-court', { tournamentEventId: tournamentId, courtId });
    }
  }

  /**
   * Unsubscribe from a specific court's updates
   */
  unsubscribeFromCourtUpdates(courtId: string): void {
    const tournamentId = this.currentTournamentId();
    if (this.socket?.connected && tournamentId) {
      this.socket.emit('unsubscribe-court', { tournamentEventId: tournamentId, courtId });
    }
  }

  // ============ EVENT HANDLERS REGISTRATION ============

  onCourtStatusUpdate(handler: (update: CourtStatusUpdate) => void): () => void {
    this.courtStatusHandlers.push(handler);
    return () => {
      this.courtStatusHandlers = this.courtStatusHandlers.filter((h) => h !== handler);
    };
  }

  onGameStarted(handler: (update: GameUpdate) => void): () => void {
    this.gameStartedHandlers.push(handler);
    return () => {
      this.gameStartedHandlers = this.gameStartedHandlers.filter((h) => h !== handler);
    };
  }

  onScoreUpdated(handler: (update: GameUpdate) => void): () => void {
    this.scoreUpdatedHandlers.push(handler);
    return () => {
      this.scoreUpdatedHandlers = this.scoreUpdatedHandlers.filter((h) => h !== handler);
    };
  }

  onGameCompleted(handler: (update: GameUpdate) => void): () => void {
    this.gameCompletedHandlers.push(handler);
    return () => {
      this.gameCompletedHandlers = this.gameCompletedHandlers.filter((h) => h !== handler);
    };
  }

  onGameCancelled(handler: (data: { gameId: string; courtId?: string; timestamp: string }) => void): () => void {
    this.gameCancelledHandlers.push(handler);
    return () => {
      this.gameCancelledHandlers = this.gameCancelledHandlers.filter((h) => h !== handler);
    };
  }

  onScheduleUpdated(handler: (update: ScheduleUpdate) => void): () => void {
    this.scheduleUpdatedHandlers.push(handler);
    return () => {
      this.scheduleUpdatedHandlers = this.scheduleUpdatedHandlers.filter((h) => h !== handler);
    };
  }

  onCheckInUpdated(handler: (update: CheckInUpdate) => void): () => void {
    this.checkInUpdatedHandlers.push(handler);
    return () => {
      this.checkInUpdatedHandlers = this.checkInUpdatedHandlers.filter((h) => h !== handler);
    };
  }

  onAnnouncement(handler: (announcement: Announcement) => void): () => void {
    this.announcementHandlers.push(handler);
    return () => {
      this.announcementHandlers = this.announcementHandlers.filter((h) => h !== handler);
    };
  }

  // ============ PRIVATE METHODS ============

  private setupEventListeners(tournamentEventId: string): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this._connectionStatus.set('connected');
      // Subscribe to tournament room
      this.socket?.emit('subscribe-tournament', { tournamentEventId });
    });

    this.socket.on('disconnect', () => {
      this._connectionStatus.set('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Tournament live WebSocket connection error:', error);
      this._connectionStatus.set('disconnected');
    });

    this.socket.on('reconnect_attempt', () => {
      this._connectionStatus.set('connecting');
    });

    this.socket.on('reconnect', () => {
      this._connectionStatus.set('connected');
      // Re-subscribe after reconnection
      this.socket?.emit('subscribe-tournament', { tournamentEventId });
    });

    // Tournament live events
    this.socket.on('court-status-updated', (data: CourtStatusUpdate) => {
      const courts = new Map(this._courtStatuses());
      courts.set(data.courtId, data);
      this._courtStatuses.set(courts);
      this.courtStatusHandlers.forEach((h) => h(data));
    });

    this.socket.on('game-started', (data: GameUpdate) => {
      const games = new Map(this._gamesInProgress());
      games.set(data.gameId, data);
      this._gamesInProgress.set(games);
      this.gameStartedHandlers.forEach((h) => h(data));
    });

    this.socket.on('score-updated', (data: GameUpdate) => {
      const games = new Map(this._gamesInProgress());
      games.set(data.gameId, data);
      this._gamesInProgress.set(games);
      this.scoreUpdatedHandlers.forEach((h) => h(data));
    });

    this.socket.on('game-completed', (data: GameUpdate) => {
      // Remove from in-progress, add to completed
      const games = new Map(this._gamesInProgress());
      games.delete(data.gameId);
      this._gamesInProgress.set(games);

      // Add to recent completed (keep last 10)
      const completed = [data, ...this._recentCompletedGames()].slice(0, 10);
      this._recentCompletedGames.set(completed);

      this.gameCompletedHandlers.forEach((h) => h(data));
    });

    this.socket.on('game-cancelled', (data: { gameId: string; courtId?: string; timestamp: string }) => {
      // Remove from in-progress
      const games = new Map(this._gamesInProgress());
      games.delete(data.gameId);
      this._gamesInProgress.set(games);
      this.gameCancelledHandlers.forEach((h) => h(data));
    });

    this.socket.on('schedule-updated', (data: ScheduleUpdate) => {
      this.scheduleUpdatedHandlers.forEach((h) => h(data));
    });

    this.socket.on('tournament-stats-updated', (data: TournamentStats) => {
      this._tournamentStats.set(data);
    });

    this.socket.on('checkin-updated', (data: CheckInUpdate) => {
      this.checkInUpdatedHandlers.forEach((h) => h(data));
    });

    this.socket.on('announcement', (data: Announcement) => {
      // Add to announcements (keep last 20)
      const announcements = [data, ...this._announcements()].slice(0, 20);
      this._announcements.set(announcements);
      this.announcementHandlers.forEach((h) => h(data));
    });
  }

  private getServerUrl(): string {
    return window.location.origin;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
