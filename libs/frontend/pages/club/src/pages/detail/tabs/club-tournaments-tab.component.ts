import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TournamentEvent } from '@app/models';
import { TournamentPhase } from '@app/models-enum';
import { ClubTournamentsTabService } from './club-tournaments-tab.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-club-tournaments-tab',
  standalone: true,
  imports: [TranslateModule, SkeletonModule, TableModule, ButtonModule, TagModule, TooltipModule, RouterLink, DatePipe],
  providers: [ClubTournamentsTabService],
  template: `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold m-0">{{ 'all.club.tournaments.title' | translate }}</h3>
      @if (canCreate()) {
        <p-button
          icon="pi pi-plus"
          [label]="'all.club.tournaments.create' | translate"
          (onClick)="createTournament.emit()"
          severity="primary"
          size="small"
        />
      }
    </div>

    @if (service.loading()) {
      <div class="space-y-2">
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <p-skeleton height="3rem" />
        }
      </div>
    } @else if (service.tournaments().length > 0) {
      <p-table
        [value]="service.tournaments()"
        [paginator]="service.tournaments().length > 10"
        [rows]="10"
        styleClass="p-datatable-sm p-datatable-striped"
        [rowHover]="true"
      >
        <ng-template #header>
          <tr>
            <th>{{ 'all.common.name' | translate }}</th>
            <th>{{ 'all.club.tournaments.date' | translate }}</th>
            <th>{{ 'all.club.tournaments.phase' | translate }}</th>
            <th>{{ 'all.club.tournaments.official' | translate }}</th>
            <th class="w-20"></th>
          </tr>
        </ng-template>
        <ng-template #body let-tournament>
          <tr>
            <td>
              <a [routerLink]="['/tournament', tournament.slug || tournament.id]" class="text-primary hover:underline">
                {{ tournament.name || tournament.tournamentNumber }}
              </a>
            </td>
            <td>
              @if (tournament.firstDay) {
                {{ tournament.firstDay | date: 'mediumDate' }}
              } @else {
                <span class="text-surface-400">-</span>
              }
            </td>
            <td>
              <p-tag [value]="getPhaseLabel(tournament.phase)" [severity]="getPhaseSeverity(tournament.phase)" />
            </td>
            <td>
              @if (tournament.official) {
                <i class="pi pi-check-circle text-green-500" pTooltip="{{ 'all.club.tournaments.officialTooltip' | translate }}"></i>
              } @else {
                <i class="pi pi-minus-circle text-surface-400"></i>
              }
            </td>
            <td>
              <a [routerLink]="['/tournament', tournament.slug || tournament.id]" class="p-button p-button-text p-button-sm">
                <i class="pi pi-eye"></i>
              </a>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="5" class="text-center py-4 text-surface-500">
              {{ 'all.club.tournaments.noTournaments' | translate }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    } @else {
      <div class="text-center py-8 text-surface-500">
        <i class="pi pi-calendar text-4xl mb-2 block"></i>
        <p>{{ 'all.club.tournaments.noTournaments' | translate }}</p>
        @if (canCreate()) {
          <p-button
            icon="pi pi-plus"
            [label]="'all.club.tournaments.createFirst' | translate"
            (onClick)="createTournament.emit()"
            severity="secondary"
            class="mt-4"
          />
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubTournamentsTabComponent {
  readonly service = inject(ClubTournamentsTabService);

  clubId = input.required<string>();
  canCreate = input<boolean>(false);

  createTournament = output<void>();

  constructor() {
    effect(() => {
      this.service.setClubId(this.clubId());
    });
  }

  getPhaseLabel(phase: TournamentPhase): string {
    const labels: Record<TournamentPhase, string> = {
      [TournamentPhase.DRAFT]: 'Draft',
      [TournamentPhase.ENROLLMENT_OPEN]: 'Enrollment Open',
      [TournamentPhase.ENROLLMENT_CLOSED]: 'Enrollment Closed',
      [TournamentPhase.DRAWS_MADE]: 'Draws Made',
      [TournamentPhase.SCHEDULED]: 'Scheduled',
      [TournamentPhase.IN_PROGRESS]: 'In Progress',
      [TournamentPhase.COMPLETED]: 'Completed',
    };
    return labels[phase] || phase;
  }

  getPhaseSeverity(phase: TournamentPhase): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<TournamentPhase, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      [TournamentPhase.DRAFT]: 'secondary',
      [TournamentPhase.ENROLLMENT_OPEN]: 'info',
      [TournamentPhase.ENROLLMENT_CLOSED]: 'warn',
      [TournamentPhase.DRAWS_MADE]: 'warn',
      [TournamentPhase.SCHEDULED]: 'info',
      [TournamentPhase.IN_PROGRESS]: 'success',
      [TournamentPhase.COMPLETED]: 'contrast',
    };
    return severities[phase] || 'secondary';
  }
}
