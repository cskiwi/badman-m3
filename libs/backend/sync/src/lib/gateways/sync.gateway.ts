import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface SyncJob {
  id: string;
  name: string;
  data: string;
  progress: number;
  processedOn?: Date;
  finishedOn?: Date;
  failedReason?: string;
  status: string;
  timestamp: number;
  createdAt?: Date;
  parentId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['*'],
    credentials: true,
  },
  namespace: '/sync',
})
export class SyncGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server?: Server;

  private logger: Logger = new Logger('SyncGateway');
  private connectedClients = new Map<string, Socket>();

  afterInit() {
    this.logger.log('Sync WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // For now, allow all connections (TODO: implement proper authentication)
      this.connectedClients.set(client.id, client);
      this.logger.log(`Client ${client.id} connected to sync updates`);

      // Join sync room for updates
      client.join('sync-updates');

      // Send welcome message
      client.emit('connection-established', {
        message: 'Connected to sync updates',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.error(`Error during client connection: ${error?.message ?? 'Unknown error'}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected from sync updates`);
  }

  @SubscribeMessage('subscribe-queue-stats')
  handleSubscribeQueueStats(@ConnectedSocket() client: Socket) {
    client.join('queue-stats');
    this.logger.log(`Client ${client.id} subscribed to queue stats`);
    return { success: true, message: 'Subscribed to queue stats' };
  }

  @SubscribeMessage('subscribe-job-updates')
  handleSubscribeJobUpdates(@ConnectedSocket() client: Socket) {
    client.join('job-updates');
    this.logger.log(`Client ${client.id} subscribed to job updates`);
    return { success: true, message: 'Subscribed to job updates' };
  }

  @SubscribeMessage('unsubscribe-queue-stats')
  handleUnsubscribeQueueStats(@ConnectedSocket() client: Socket) {
    client.leave('queue-stats');
    this.logger.log(`Client ${client.id} unsubscribed from queue stats`);
    return { success: true, message: 'Unsubscribed from queue stats' };
  }

  @SubscribeMessage('unsubscribe-job-updates')
  handleUnsubscribeJobUpdates(@ConnectedSocket() client: Socket) {
    client.leave('job-updates');
    this.logger.log(`Client ${client.id} unsubscribed from job updates`);
    return { success: true, message: 'Unsubscribed from job updates' };
  }

  // Methods to emit updates from the service
  emitQueueStatsUpdate(stats: QueueStats) {
    this.server?.to('queue-stats').emit('queue-stats-updated', {
      stats,
      timestamp: new Date().toISOString(),
    });
  }

  emitJobUpdate(job: SyncJob) {
    this.server?.to('job-updates').emit('job-updated', {
      job,
      timestamp: new Date().toISOString(),
    });
  }

  emitJobCreated(job: SyncJob) {
    this.server?.to('job-updates').emit('job-created', {
      job,
      timestamp: new Date().toISOString(),
    });
  }

  emitJobCompleted(job: SyncJob) {
    this.server?.to('job-updates').emit('job-completed', {
      job,
      timestamp: new Date().toISOString(),
    });
  }

  emitJobFailed(job: SyncJob) {
    this.server?.to('job-updates').emit('job-failed', {
      job,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit general sync status updates
  emitSyncStatusUpdate(status: { status: string; message?: string }) {
    this.server?.to('sync-updates').emit('sync-status-updated', {
      ...status,
      timestamp: new Date().toISOString(),
    });
  }
}
