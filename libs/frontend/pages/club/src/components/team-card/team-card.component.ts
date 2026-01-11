import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Team } from '@app/models';
import { PhoneNumberPipe } from '@app/frontend-utils';
import { TeamCardService } from './team-card.service';

@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [RouterModule, TranslateModule, BadgeModule, ButtonModule, SkeletonModule, PhoneNumberPipe],
  providers: [TeamCardService],
  template: `
    <div class="border-surface rounded-border border">
      <div class="flex items-center justify-between bg-highlight p-2">
        <span class="font-semibold text-primary my-2">{{ team().name }}</span>
        <div class="flex items-center gap-2">
          @if (team().abbreviation) {
            <p-badge [value]="team().abbreviation!" />
          }
          @if (canEdit()) {
            <button
              pButton
              icon="pi pi-pencil"
              class="p-button-text p-button-rounded p-button-sm"
              (click)="editClicked.emit(team())"
            ></button>
          }
        </div>
      </div>
      <div class="p-4">
        <div class="space-y-1 text-sm text-muted-color-emphasis mb-2">
          @if (team().captain) {
            <div class="flex items-center font-semibold gap-1">
              <i class="pi pi-user text-xs"></i>
              <span> {{ team().captain!.fullName }}</span>
            </div>
          }
          @if (team().email) {
            <div class="flex items-center gap-1">
              <i class="pi pi-envelope text-xs"></i>
              <a
                [href]="'mailto:' + team().email"
                class="hover:text-primary-600 hover:underline no-underline text-muted-color"
                >{{ team().email }}</a
              >
            </div>
          }
          @if (team().phone) {
            <div class="flex items-center gap-1">
              <i class="pi pi-phone text-xs"></i>
              <a [href]="'tel:' + team().phone" class="hover:text-primary-600 hover:underline no-underline text-muted-color">{{
                team().phone! | phoneNumber
              }}</a>
            </div>
          }
        </div>

        <!-- Players List -->
        <div>
          @if (team().teamPlayerMemberships && team().teamPlayerMemberships!.length > 0) {
            <div class="text-sm text-muted-color-emphasis">
              <!-- Clickable header -->
              <div (click)="togglePlayers()" class="w-full flex items-center gap-2 rounded-lg cursor-pointer">
                <i class="pi" [class.pi-chevron-right]="!expanded" [class.pi-chevron-down]="expanded"></i>
                {{ 'all.team.players' | translate }} ({{ team().teamPlayerMemberships!.length }})
              </div>

              <!-- Expandable content -->
              <div
                class="grid grid-cols-2 gap-2 overflow-hidden transition-all duration-300"
                [class.h-0]="!expanded"
                [class.opacity-0]="!expanded"
                [class.h-auto]="expanded"
                [class.opacity-100]="expanded"
                [class.mt-2]="expanded"
              >
                @for (membership of team().teamPlayerMemberships; track membership.id) {
                  @if (membership.player) {
                    <a
                      [routerLink]="['/player', membership.player.id]"
                      class="flex items-center gap-2 p-1 rounded-lg hover:bg-highlight-emphasis text-color transition-colors cursor-pointer"
                    >
                      <i class="pi pi-user text-xs text-muted-color"></i>
                      <span class="truncate">{{ membership.player.firstName }} {{ membership.player.lastName[0] }}.</span>
                    </a>
                  }
                }
              </div>
            </div>
          }
        </div>

        <!-- Team Stats -->
        <div class="grid grid-cols-3 gap-2 text-center my-3 border-t border-surface pt-3">
          @if (service.loading()) {
            <div class="p-2">
              <p-skeleton width="2rem" height="1.25rem" styleClass="mx-auto mb-1" />
              <p-skeleton width="3rem" height="0.75rem" styleClass="mx-auto" />
            </div>
            <div class="p-2">
              <p-skeleton width="2rem" height="1.25rem" styleClass="mx-auto mb-1" />
              <p-skeleton width="3rem" height="0.75rem" styleClass="mx-auto" />
            </div>
            <div class="p-2">
              <p-skeleton width="2rem" height="1.25rem" styleClass="mx-auto mb-1" />
              <p-skeleton width="3rem" height="0.75rem" styleClass="mx-auto" />
            </div>
          } @else {
            <div class="p-2">
              <div class="font-bold text-primary-600">{{ service.stats().gamesPlayed }}</div>
              <div class="text-xs text-surface-600">{{ 'all.team.games' | translate }}</div>
            </div>
            <div class="p-2">
              <div class="font-bold text-green-600">{{ service.stats().gamesWon }}</div>
              <div class="text-xs text-surface-600">{{ 'all.team.wins' | translate }}</div>
            </div>
            <div class="p-2">
              <div class="font-bold text-blue-600">{{ service.winRate() }}%</div>
              <div class="text-xs text-surface-600">{{ 'all.team.winRate' | translate }}</div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamCardComponent {
  readonly service = inject(TeamCardService);

  team = input.required<Team>();
  canEdit = input<boolean>(false);

  editClicked = output<Team>();

  expanded = false;

  constructor() {
    effect(() => {
      const team = this.team();
      if (team?.id) {
        this.service.setTeamId(team.id);
      }
    });
  }

  togglePlayers() {
    this.expanded = !this.expanded;
  }
}
