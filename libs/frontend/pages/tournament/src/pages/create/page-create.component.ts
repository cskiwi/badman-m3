import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { TranslateModule } from '@ngx-translate/core';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { CreateTournamentService } from './page-create.service';

@Component({
  selector: 'app-page-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    PageHeaderComponent,
    ButtonModule,
    CardModule,
    InputTextModule,
    DatePickerModule,
    CheckboxModule,
    MessageModule,
    ProgressBarModule,
  ],
  templateUrl: './page-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageCreateComponent {
  private readonly router = inject(Router);
  private readonly dataService = new CreateTournamentService();

  readonly clubId = injectQueryParams('clubId');

  form = new FormGroup({
    name: new FormControl<string>('', [Validators.required, Validators.maxLength(255)]),
    tournamentDays: new FormControl<Date[] | null>(null),
    openDate: new FormControl<Date | null>(null),
    closeDate: new FormControl<Date | null>(null),
    official: new FormControl<boolean>(false),
  });

  // Selectors
  club = this.dataService.club;
  loading = this.dataService.loading;
  error = this.dataService.error;
  creating = this.dataService.creating;
  createError = this.dataService.createError;

  constructor() {
    effect(() => {
      const clubId = this.clubId();
      if (clubId) {
        this.dataService.setClubId(clubId);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const { name, tournamentDays, openDate, closeDate, official } = this.form.value;

    // Derive firstDay from the tournament days range (first date in the array)
    const firstDay = tournamentDays && tournamentDays.length > 0 ? tournamentDays[0] : undefined;

    const result = await this.dataService.createTournament({
      name: name!,
      firstDay: firstDay || undefined,
      openDate: openDate || undefined,
      closeDate: closeDate || undefined,
      official: official || false,
    });

    if (result) {
      // Navigate to the new tournament
      this.router.navigate(['/tournament', result.slug || result.id]);
    }
  }

  cancel(): void {
    const clubId = this.clubId();
    if (clubId) {
      this.router.navigate(['/club', clubId]);
    } else {
      this.router.navigate(['/tournament']);
    }
  }
}
