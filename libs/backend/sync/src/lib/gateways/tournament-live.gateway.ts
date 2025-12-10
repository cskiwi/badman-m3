import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Interfaces for tournament live data
interface CourtStatusUpdate {
  courtId: string;
  courtName: string;
  status: 'available' | 'in_progress' | 'blocked';
  currentGameId?: string;
  nextGameId?: string;
}

interface GameUpdate {
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
  startTime?: Date;
  endTime?: Date;
}

interface ScheduleUpdate {
  tournamentEventId: string;
  type: 'slot_added' | 'slot_removed' | 'game_assigned' | 'game_unassigned' | 'schedule_published';
  slotId?: string;
  gameId?: string;
}

interface TournamentStats {
  gamesInProgress: number;
  gamesCompleted: number;
  gamesRemaining: number;
  courtsAvailable: number;
  courtsInUse: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['*'],
    credentials: true,
  },
  namespace: '/tournament-live',
})
export class TournamentLiveGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server?: Server;

  private logger: Logger = new Logger('TournamentLiveGateway');
  private connectedClients = new Map<string, Socket>();
  private clientTournaments = new Map<string, Set<string>>(); // clientId -> tournamentIds

  afterInit() {
    this.logger.log('Tournament Live WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      this.connectedClients.set(client.id, client);
      this.clientTournaments.set(client.id, new Set());
      this.logger.log(`Client ${client.id} connected to tournament live updates`);

      client.emit('connection-established', {
        message: 'Connected to tournament live updates',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error(`Error during client connection: ${error?.message ?? 'Unknown error'}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.clientTournaments.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected from tournament live updates`);
  }

  // ============ CLIENT SUBSCRIPTIONS ============

  @SubscribeMessage('subscribe-tournament')
  handleSubscribeTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentEventId: string },
  ) {
    const roomName = `tournament:${data.tournamentEventId}:live`;
    client.join(roomName);

    // Track subscription
    const subs = this.clientTournaments.get(client.id);
    if (subs) {
      subs.add(data.tournamentEventId);
    }

    this.logger.log(`Client ${client.id} subscribed to tournament ${data.tournamentEventId}`);
    return { success: true, message: `Subscribed to tournament ${data.tournamentEventId}` };
  }

  @SubscribeMessage('unsubscribe-tournament')
  handleUnsubscribeTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentEventId: string },
  ) {
    const roomName = `tournament:${data.tournamentEventId}:live`;
    client.leave(roomName);

    // Remove from tracking
    const subs = this.clientTournaments.get(client.id);
    if (subs) {
      subs.delete(data.tournamentEventId);
    }

    this.logger.log(`Client ${client.id} unsubscribed from tournament ${data.tournamentEventId}`);
    return { success: true, message: `Unsubscribed from tournament ${data.tournamentEventId}` };
  }

  @SubscribeMessage('subscribe-court')
  handleSubscribeCourt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentEventId: string; courtId: string },
  ) {
    const roomName = `tournament:${data.tournamentEventId}:court:${data.courtId}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} subscribed to court ${data.courtId}`);
    return { success: true, message: `Subscribed to court ${data.courtId}` };
  }

  @SubscribeMessage('unsubscribe-court')
  handleUnsubscribeCourt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentEventId: string; courtId: string },
  ) {
    const roomName = `tournament:${data.tournamentEventId}:court:${data.courtId}`;
    client.leave(roomName);
    this.logger.log(`Client ${client.id} unsubscribed from court ${data.courtId}`);
    return { success: true, message: `Unsubscribed from court ${data.courtId}` };
  }

  // ============ EMIT METHODS (called from resolvers/services) ============

  /**
   * Emit when a court's status changes (game started, completed, blocked, etc.)
   */
  emitCourtStatusUpdate(tournamentEventId: string, update: CourtStatusUpdate) {
    const tournamentRoom = `tournament:${tournamentEventId}:live`;
    const courtRoom = `tournament:${tournamentEventId}:court:${update.courtId}`;

    const payload = {
      ...update,
      timestamp: new Date().toISOString(),
    };

    // Emit to both tournament room and specific court room
    this.server?.to(tournamentRoom).emit('court-status-updated', payload);
    this.server?.to(courtRoom).emit('court-status-updated', payload);
  }

  /**
   * Emit when a game starts
   */
  emitGameStarted(tournamentEventId: string, game: GameUpdate) {
    const roomName = `tournament:${tournamentEventId}:live`;
    this.server?.to(roomName).emit('game-started', {
      ...game,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit when a game's score is updated
   */
  emitScoreUpdated(tournamentEventId: string, game: GameUpdate) {
    const roomName = `tournament:${tournamentEventId}:live`;
    this.server?.to(roomName).emit('score-updated', {
      ...game,
      timestamp: new Date().toISOString(),
    });

    // Also emit to specific court room if courtId is present
    if (game.courtId) {
      const courtRoom = `tournament:${tournamentEventId}:court:${game.courtId}`;
      this.server?.to(courtRoom).emit('score-updated', {
        ...game,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Emit when a game is completed
   */
  emitGameCompleted(tournamentEventId: string, game: GameUpdate) {
    const roomName = `tournament:${tournamentEventId}:live`;
    this.server?.to(roomName).emit('game-completed', {
      ...game,
      timestamp: new Date().toISOString(),
    });

    // Also emit to specific court room if courtId is present
    if (game.courtId) {
      const courtRoom = `tournament:${tournamentEventId}:court:${game.courtId}`;
      this.server?.to(courtRoom).emit('game-completed', {
        ...game,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Emit when a game is cancelled/reset
   */
  emitGameCancelled(tournamentEventId: string, gameId: string, courtId?: string) {
    const roomName = `tournament:${tournamentEventId}:live`;
    this.server?.to(roomName).emit('game-cancelled', {
      gameId,
      courtId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit schedule updates (new slots, game assignments, etc.)
   */
  emitScheduleUpdate(update: ScheduleUpdate) {
    const roomName = `tournament:${update.tournamentEventId}:live`;
    this.server?.to(roomName).emit('schedule-updated', {
      ...update,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit overall tournament stats update
   */
  emitTournamentStats(tournamentEventId: string, stats: TournamentStats) {
    const roomName = `tournament:${tournamentEventId}:live`;
    this.server?.to(roomName).emit('tournament-stats-updated', {
      tournamentEventId,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit check-in update
   */
  emitCheckInUpdate(tournamentEventId: string, data: {
    enrollmentId: string;
    status: 'checked_in' | 'no_show' | 'pending';
    playerName?: string;
  }) {
    const roomName = `tournament:${tournamentEventId}:live`;
    this.server?.to(roomName).emit('checkin-updated', {
      tournamentEventId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit announcement to all clients watching a tournament
   */
  emitAnnouncement(tournamentEventId: string, message: string, type: 'info' | 'warning' | 'urgent' = 'info') {
    const roomName = `tournament:${tournamentEventId}:live`;
    this.server?.to(roomName).emit('announcement', {
      tournamentEventId,
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  }

  // ============ UTILITY METHODS ============

  /**
   * Get the number of clients connected to a tournament
   */
  async getTournamentViewerCount(tournamentEventId: string): Promise<number> {
    const roomName = `tournament:${tournamentEventId}:live`;
    const room = this.server?.sockets.adapter.rooms.get(roomName);
    return room?.size ?? 0;
  }

  /**
   * Get all tournament IDs that have active viewers
   */
  getActiveTournaments(): string[] {
    const tournaments = new Set<string>();
    for (const subs of this.clientTournaments.values()) {
      for (const tournamentId of subs) {
        tournaments.add(tournamentId);
      }
    }
    return Array.from(tournaments);
  }
}
