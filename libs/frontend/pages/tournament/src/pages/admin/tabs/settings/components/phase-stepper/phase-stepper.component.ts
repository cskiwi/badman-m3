import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TournamentEvent } from '@app/models';
import { TournamentPhase } from '@app/models-enum';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { TooltipModule } from 'primeng/tooltip';

interface PhaseStep {
  phase: TournamentPhase;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-phase-stepper',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    StepperModule,
    TooltipModule,
  ],
  templateUrl: './phase-stepper.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhaseStepperComponent {
  tournament = input.required<TournamentEvent>();
  updating = input<boolean>(false);

  advancePhaseRequested = output<void>();
  goBackPhaseRequested = output<void>();

  // Phase steps
  readonly phaseSteps: PhaseStep[] = [
    {
      phase: TournamentPhase.DRAFT,
      label: 'all.tournament.phases.draft',
      icon: 'pi pi-file-edit',
      description: 'all.tournament.phases.draftDesc',
    },
    {
      phase: TournamentPhase.ENROLLMENT_OPEN,
      label: 'all.tournament.phases.enrollmentOpen',
      icon: 'pi pi-user-plus',
      description: 'all.tournament.phases.enrollmentOpenDesc',
    },
    {
      phase: TournamentPhase.ENROLLMENT_CLOSED,
      label: 'all.tournament.phases.enrollmentClosed',
      icon: 'pi pi-lock',
      description: 'all.tournament.phases.enrollmentClosedDesc',
    },
    {
      phase: TournamentPhase.DRAWS_MADE,
      label: 'all.tournament.phases.drawsMade',
      icon: 'pi pi-sitemap',
      description: 'all.tournament.phases.drawsMadeDesc',
    },
    {
      phase: TournamentPhase.SCHEDULED,
      label: 'all.tournament.phases.scheduled',
      icon: 'pi pi-calendar',
      description: 'all.tournament.phases.scheduledDesc',
    },
    {
      phase: TournamentPhase.IN_PROGRESS,
      label: 'all.tournament.phases.inProgress',
      icon: 'pi pi-play',
      description: 'all.tournament.phases.inProgressDesc',
    },
    {
      phase: TournamentPhase.COMPLETED,
      label: 'all.tournament.phases.completed',
      icon: 'pi pi-check-circle',
      description: 'all.tournament.phases.completedDesc',
    },
  ];

  // Current phase index
  currentPhaseIndex = computed(() => {
    const phase = this.tournament()?.phase;
    return this.phaseSteps.findIndex((s) => s.phase === phase);
  });

  // Can advance to next phase
  canAdvance = computed(() => {
    const idx = this.currentPhaseIndex();
    return idx >= 0 && idx < this.phaseSteps.length - 1;
  });

  // Can go back to previous phase
  canGoBack = computed(() => {
    const idx = this.currentPhaseIndex();
    return idx > 0;
  });

  advancePhase(): void {
    this.advancePhaseRequested.emit();
  }

  goBackPhase(): void {
    this.goBackPhaseRequested.emit();
  }
}
