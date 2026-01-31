import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { lastValueFrom } from 'rxjs';

const TRIGGER_EVENT_SYNC_MUTATION = gql`
  mutation TriggerEventSync($eventId: ID!, $includeSubComponents: Boolean!) {
    triggerEventSync(eventId: $eventId, includeSubComponents: $includeSubComponents) {
      message
      success
    }
  }
`;

const TRIGGER_SUB_EVENT_SYNC_MUTATION = gql`
  mutation TriggerSubEventSync($subEventId: ID!, $includeSubComponents: Boolean!) {
    triggerSubEventSync(subEventId: $subEventId, includeSubComponents: $includeSubComponents) {
      message
      success
    }
  }
`;

const TRIGGER_DRAW_SYNC_MUTATION = gql`
  mutation TriggerDrawSync($drawId: ID!, $includeSubComponents: Boolean!) {
    triggerDrawSync(drawId: $drawId, includeSubComponents: $includeSubComponents) {
      message
      success
    }
  }
`;

const TRIGGER_GAME_SYNC_MUTATION = gql`
  mutation TriggerGameSync($drawId: ID!, $matchCodes: [String!]) {
    triggerGameSync(drawId: $drawId, matchCodes: $matchCodes) {
      message
      success
    }
  }
`;

export type SyncLevel = 'event' | 'sub-event' | 'draw' | 'game';

export interface SyncButtonConfig {
  level: SyncLevel;
  // Internal IDs (GUIDs) for sync mutations
  eventId?: string;
  subEventId?: string;
  drawId?: string;
  // Display names for the UI
  eventName?: string;
  subEventName?: string;
  drawName?: string;
}

@Component({
  selector: 'app-sync-button',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    ButtonModule,
    MenuModule,
    SplitButtonModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    @if (config(); as cfg) {
      <p-splitbutton
        [icon]="getSyncIcon(cfg.level)"
        size="small"
        severity="secondary"
        [disabled]="loading()"
        (onClick)="handleSyncClick(cfg.level)"
        [label]="getSyncLabel(cfg.level) | translate"
        [model]="getSyncItems(cfg.level)"
      />
    }

    <!-- Game Sync Dialog -->
    <p-dialog
      [visible]="gameSyncDialogVisible()"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '30rem' }"
      [header]="'Sync Specific Games' | translate"
      (onHide)="closeGameSyncDialog()"
    >
      @if (config(); as cfg) {
        <div class="space-y-4">
          @if (cfg.eventName) {
            <div>
              <label class="block text-sm font-medium text-muted-color mb-2">{{ 'Event' | translate }}</label>
              <p class="text-color font-semibold">{{ cfg.eventName }}</p>
            </div>
          }

          @if (cfg.subEventName) {
            <div>
              <label class="block text-sm font-medium text-muted-color mb-2">{{ 'Sub Event' | translate }}</label>
              <p class="text-color">{{ cfg.subEventName }}</p>
            </div>
          }

          @if (cfg.drawName) {
            <div>
              <label class="block text-sm font-medium text-muted-color mb-2">{{ 'Draw' | translate }}</label>
              <p class="text-color">{{ cfg.drawName }}</p>
            </div>
          }

          <div>
            <label for="matchCodes" class="block text-sm font-medium text-muted-color mb-2">{{ 'Match Codes (Optional)' | translate }}</label>
            <input
              id="matchCodes"
              pInputText
              [(ngModel)]="matchCodes"
              placeholder="Enter match codes separated by commas (e.g., M1_G1, M1_G2)"
              class="w-full"
            />
            <small class="text-xs text-muted-color mt-1">{{ 'Leave empty to sync all games' | translate }}</small>
          </div>

          <div class="flex justify-end gap-2">
            <p-button [label]="'Cancel' | translate" severity="secondary" [text]="true" (onClick)="closeGameSyncDialog()" />
            <p-button [label]="'Sync Games' | translate" [loading]="loading()" (onClick)="executeGameSync()" />
          </div>
        </div>
      }
    </p-dialog>

    <!-- Toast Messages -->
    <p-toast />

    <!-- Confirmation Dialog -->
    <p-confirmdialog />
  `,
})
export class SyncButtonComponent {
  private readonly apollo = inject(Apollo);
  private readonly messageService = inject(MessageService);
  public translate = inject(TranslateService);

  // Inputs
  config = input.required<SyncButtonConfig>();

  // State
  loading = signal(false);
  gameSyncDialogVisible = signal(false);
  matchCodes = '';

  // Helper methods for template
  getSyncIcon(level: SyncLevel): string {
    return level === 'game' ? 'pi pi-download' : 'pi pi-refresh';
  }

  getSyncLabel(level: SyncLevel): string {
    const labels = {
      event: 'all.sync.dashboard.actions.fullSync',
      'sub-event': 'all.sync.dashboard.actions.fullSync',
      draw: 'all.sync.dashboard.actions.fullSync',
      game: 'all.sync.dashboard.actions.fullSync',
    };
    return labels[level];
  }

  getSyncItems(level: SyncLevel): any[] {
    const baseItems = {
      event: [
        {
          label: this.translate.instant('all.sync.dashboard.actions.sync'),
          icon: 'pi pi-refresh',
          command: () => {
            console.log('Full event sync selected');
            this.syncEvent();
          },
        },
      ],
      'sub-event': [
        {
          label: this.translate.instant('all.sync.dashboard.actions.sync'),
          icon: 'pi pi-refresh',
          command: () => this.syncSubEvent(),
        },
      ],
      draw: [
        {
          label: this.translate.instant('all.sync.dashboard.actions.sync'),
          icon: 'pi pi-refresh',
          command: () => this.syncDraw(),
        },
      ],
      game: [
        {
          label: this.translate.instant('all.sync.dashboard.actions.sync'),
          icon: 'pi pi-download',
          command: () => this.syncGames(),
        },
        {
          label: this.translate.instant('all.sync.dashboard.actions.sync'),
          icon: 'pi pi-list',
          command: () => this.openGameSyncDialog(),
        },
      ],
    };

    return baseItems[level] || [];
  }

  handleSyncClick(level: SyncLevel): void {
    switch (level) {
      case 'event':
        this.syncEvent(true);
        break;
      case 'sub-event':
        this.syncSubEvent(true);
        break;
      case 'draw':
        this.syncDraw(true);
        break;
      case 'game':
        this.syncGames();
        break;
    }
  }

  // Sync methods
  async syncEvent(includeSubComponents = false): Promise<void> {
    const cfg = this.config();
    if (!cfg?.eventId) return;

    this.loading.set(true);
    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ triggerEventSync: { message: string; success: boolean } }>({
          mutation: TRIGGER_EVENT_SYNC_MUTATION,
          variables: {
            eventId: cfg.eventId,
            includeSubComponents,
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: result.data?.triggerEventSync.message || `Event sync started for ${cfg.eventName}`,
      });
    } catch (e: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to sync ${cfg.eventName}`,
      });
    } finally {
      this.loading.set(false);
    }
  }

  async syncSubEvent(includeSubComponents = false): Promise<void> {
    const cfg = this.config();
    if (!cfg?.subEventId) return;

    this.loading.set(true);
    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ triggerSubEventSync: { message: string; success: boolean } }>({
          mutation: TRIGGER_SUB_EVENT_SYNC_MUTATION,
          variables: {
            subEventId: cfg.subEventId,
            includeSubComponents,
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: result.data?.triggerSubEventSync.message || `Sub-event sync started for ${cfg.subEventName}`,
      });
    } catch (e: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to sync sub-event ${cfg.subEventName}`,
      });
    } finally {
      this.loading.set(false);
    }
  }

  async syncDraw(includeSubComponents = false): Promise<void> {
    const cfg = this.config();
    if (!cfg?.drawId) return;

    this.loading.set(true);
    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ triggerDrawSync: { message: string; success: boolean } }>({
          mutation: TRIGGER_DRAW_SYNC_MUTATION,
          variables: {
            drawId: cfg.drawId,
            includeSubComponents,
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: result.data?.triggerDrawSync.message || `Draw sync started for ${cfg.drawName}`,
      });
    } catch (e: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to sync draw ${cfg.drawName}`,
      });
    } finally {
      this.loading.set(false);
    }
  }

  async syncGames(): Promise<void> {
    const cfg = this.config();
    if (!cfg?.drawId) return;

    this.loading.set(true);
    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ triggerGameSync: { message: string; success: boolean } }>({
          mutation: TRIGGER_GAME_SYNC_MUTATION,
          variables: {
            drawId: cfg.drawId,
            matchCodes: undefined,
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: result.data?.triggerGameSync.message || 'Game sync started',
      });
    } catch (e: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to sync games',
      });
    } finally {
      this.loading.set(false);
    }
  }

  // Dialog methods
  openGameSyncDialog(): void {
    this.matchCodes = '';
    this.gameSyncDialogVisible.set(true);
  }

  closeGameSyncDialog(): void {
    this.gameSyncDialogVisible.set(false);
  }

  async executeGameSync(): Promise<void> {
    const cfg = this.config();
    if (!cfg?.drawId) return;

    this.loading.set(true);
    try {
      const matchCodesArray = this.matchCodes ? this.matchCodes.split(',').map((code) => code.trim()) : undefined;

      const result = await lastValueFrom(
        this.apollo.mutate<{ triggerGameSync: { message: string; success: boolean } }>({
          mutation: TRIGGER_GAME_SYNC_MUTATION,
          variables: {
            drawId: cfg.drawId,
            matchCodes: matchCodesArray,
          },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: result.data?.triggerGameSync.message || 'Specific game sync started',
      });

      this.closeGameSyncDialog();
    } catch (e: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to sync specific games',
      });
    } finally {
      this.loading.set(false);
    }
  }
}
