import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ClubPlayersTabService } from './club-players-tab.service';

@Component({
  selector: 'app-club-players-tab',
  standalone: true,
  providers: [ClubPlayersTabService],
  imports: [
    RouterModule,
    TranslateModule,
    BadgeModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    TableModule,
    TooltipModule,
    SkeletonModule,
  ],
  template: `
    @if (service.loading()) {
      <p-card>
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <p-skeleton width="10rem" height="1.5rem"></p-skeleton>
            <p-skeleton width="12rem" height="2.5rem"></p-skeleton>
          </div>
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="flex items-center gap-4 p-3 border-b border-surface">
              <p-skeleton shape="circle" size="2rem"></p-skeleton>
              <div class="flex-1 space-y-2">
                <p-skeleton width="8rem" height="1rem"></p-skeleton>
                <p-skeleton width="5rem" height="0.75rem"></p-skeleton>
              </div>
              <p-skeleton width="4rem" height="1rem"></p-skeleton>
              <p-skeleton width="3rem" height="1.5rem" borderRadius="1rem"></p-skeleton>
            </div>
          }
        </div>
      </p-card>
    } @else {
      <p-card>
        <p-table
          #dt
          [value]="service.players()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          [sortField]="'fullName'"
          [sortOrder]="1"
          [globalFilterFields]="['fullName', 'team.name']"
          [scrollable]="true"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="caption">
            <div class="flex justify-between items-center">
              <h4 class="m-0">{{ 'all.club.managePlayers' | translate }}</h4>
              <span class="p-input-icon-left">
                <i class="pi pi-search"></i>
                <input
                  pInputText
                  type="text"
                  placeholder="{{ 'all.common.search' | translate }}..."
                  (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                  class="ml-auto"
                />
              </span>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="fullName">{{ 'all.player.name' | translate }} <p-sortIcon field="fullName"></p-sortIcon></th>
              <th pSortableColumn="team.name">{{ 'all.team.name' | translate }} <p-sortIcon field="team.name"></p-sortIcon></th>
              <th>{{ 'all.player.stats' | translate }}</th>
              <th>{{ 'all.common.actions' | translate }}</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-player>
            <tr>
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <i class="pi pi-user text-primary-600 text-sm"></i>
                  </div>
                  <div>
                    <div class="font-medium">{{ player.fullName }}</div>
                    <div class="text-sm text-surface-500">ID: {{ player.id.substring(0, 8) }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <span>{{ player.team?.name || 'N/A' }}</span>
                  @if (player.team?.abbreviation) {
                    <p-badge [value]="player.team.abbreviation" severity="secondary" size="small"></p-badge>
                  }
                </div>
              </td>
              <td>
                <div class="flex gap-2">
                  <div class="text-center">
                    <div class="font-bold text-primary-600">{{ service.getPlayerStats(player.id).gamesPlayed || 0 }}</div>
                    <div class="text-xs text-surface-500">{{ 'all.player.games' | translate }}</div>
                  </div>
                  <div class="text-center">
                    <div class="font-bold text-green-600">{{ service.getPlayerStats(player.id).wins || 0 }}</div>
                    <div class="text-xs text-surface-500">{{ 'all.player.wins' | translate }}</div>
                  </div>
                  <div class="text-center">
                    <div class="font-bold text-blue-600">{{ service.getPlayerWinRate(player.id) }}%</div>
                    <div class="text-xs text-surface-500">{{ 'all.player.winRate' | translate }}</div>
                  </div>
                </div>
              </td>
              <td>
                <button
                  pButton
                  icon="pi pi-eye"
                  class="p-button-text p-button-rounded p-button-sm"
                  [routerLink]="['/player', player.id]"
                  [pTooltip]="'all.common.viewDetails' | translate"
                ></button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" class="text-center py-8 text-surface-500">
                <i class="pi pi-users text-4xl mb-2 block"></i>
                <p>{{ 'all.player.noPlayers' | translate }}</p>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubPlayersTabComponent {
  readonly service = inject(ClubPlayersTabService);

  clubId = input.required<string>();
  season = input.required<number>();

  constructor() {
    effect(() => {
      this.service.setClubId(this.clubId());
    });

    effect(() => {
      this.service.setSeason(this.season());
    });
  }
}
