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
  templateUrl: './club-tournaments-tab.component.html',
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
