export interface Tournament {
  id: string;
  visualCode: string;
  name: string;
  type: 'competition' | 'tournament';
  status: string;
  startDate: Date;
  endDate: Date;
  lastSyncAt?: Date;
  syncStatus: 'never' | 'syncing' | 'success' | 'error';
}