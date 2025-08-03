import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';

export type SyncStatusType = 'synced' | 'syncing' | 'queued' | 'failed' | 'never-synced';

export interface SyncStatusConfig {
  entityType: 'tournament' | 'competition' | 'event' | 'draw';
  entityCode: string;
  entityName: string;
  lastSync?: Date | null;
  currentStatus?: SyncStatusType; // Allow parent to override status
}

@Component({
  selector: 'app-sync-status-indicator',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    BadgeModule,
    ChipModule,
    TooltipModule,
    DatePipe,
  ],
  template: `
    @if (config(); as cfg) {
      <div class="flex items-center gap-2">
        <!-- Sync Status Badge -->
        <p-chip
          [label]="statusLabel() | translate"
          [icon]="statusIcon()"
          [class]="statusClass()"
          size="small"
          [pTooltip]="statusTooltip() | translate"
          tooltipPosition="top"
        />
        
        <!-- Last Sync Info -->
        @if (cfg.lastSync) {
          <small class="text-muted-color text-xs">
            {{ 'all.sync.lastSync' | translate }}: {{ cfg.lastSync | date: 'short' }}
          </small>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      
      .sync-status-synced {
        --p-chip-background: var(--p-green-100);
        --p-chip-color: var(--p-green-800);
        --p-chip-border-color: var(--p-green-200);
      }
      
      .sync-status-syncing {
        --p-chip-background: var(--p-blue-100);
        --p-chip-color: var(--p-blue-800);
        --p-chip-border-color: var(--p-blue-200);
        animation: pulse 2s infinite;
      }
      
      .sync-status-queued {
        --p-chip-background: var(--p-orange-100);
        --p-chip-color: var(--p-orange-800);
        --p-chip-border-color: var(--p-orange-200);
      }
      
      .sync-status-failed {
        --p-chip-background: var(--p-red-100);
        --p-chip-color: var(--p-red-800);
        --p-chip-border-color: var(--p-red-200);
      }
      
      .sync-status-never-synced {
        --p-chip-background: var(--p-gray-100);
        --p-chip-color: var(--p-gray-800);
        --p-chip-border-color: var(--p-gray-200);
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `,
  ],
})
export class SyncStatusIndicatorComponent {
  // Inputs
  config = input.required<SyncStatusConfig>();
  
  // Computed sync status based on configuration
  syncStatus = computed((): SyncStatusType => {
    const cfg = this.config();
    if (!cfg) return 'never-synced';
    // Use provided status if available
    if (cfg.currentStatus) {
      return cfg.currentStatus;
    }
    
    // Check last sync status
    if (!cfg.lastSync) {
      return 'never-synced';
    }
    
    // If last sync was recent (within last hour), consider it synced
    const now = new Date();
    const lastSync = new Date(cfg.lastSync);
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync < 24) { // Changed from 1 hour to 24 hours for testing
      return 'synced';
    }
    
    // Default to synced if we have a last sync date
    return 'synced';
  });
  
  // Computed properties for display
  statusLabel = computed(() => {
    const status = this.syncStatus();
    const translations = {
      'synced': 'all.sync.status.synced',
      'syncing': 'all.sync.status.syncing',
      'queued': 'all.sync.status.queued',
      'failed': 'all.sync.status.failed',
      'never-synced': 'all.sync.status.neverSynced',
    };
    return translations[status];
  });
  
  statusIcon = computed(() => {
    const status = this.syncStatus();
    const icons = {
      'synced': 'pi pi-check-circle',
      'syncing': 'pi pi-spin pi-spinner',
      'queued': 'pi pi-clock',
      'failed': 'pi pi-exclamation-triangle',
      'never-synced': 'pi pi-minus-circle',
    };
    return icons[status];
  });
  
  statusClass = computed(() => {
    const status = this.syncStatus();
    return `sync-status-${status}`;
  });
  
  statusTooltip = computed(() => {
    const status = this.syncStatus();
    const baseTooltips = {
      'synced': 'all.sync.tooltip.synced',
      'syncing': 'all.sync.tooltip.syncing',
      'queued': 'all.sync.tooltip.queued',
      'failed': 'all.sync.tooltip.failed',
      'never-synced': 'all.sync.tooltip.neverSynced',
    };
    return baseTooltips[status];
  });
  
  lastSyncText = computed(() => {
    const cfg = this.config();
    return cfg?.lastSync ? cfg.lastSync.toLocaleString() : '';
  });
  
}