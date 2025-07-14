
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '@app/frontend-modules-auth/service';
import { Player } from '@app/models';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { distinctUntilChanged, map, of, startWith } from 'rxjs';
import { DetailService } from './page-partner.service';
import { PartnerGridComponent } from './partner-grid/partner-grid.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';

@Component({
    selector: 'app-page-partner',
    imports: [
    CardModule,
    ProgressBarModule,
    ButtonModule,
    RouterModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    PartnerGridComponent,
    DatePickerModule,
    SelectModule,
    FloatLabelModule
],
    templateUrl: './page-partner.component.html',
    styleUrl: './page-partner.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PagePartnerComponent {
  private readonly dataService = new DetailService();
  private readonly playerId = injectParams('playerId');
  private readonly translateService = inject(TranslateService);

  // selectors

  filter = this.dataService.filter;

  memberships = this.dataService.memberships;
  error = this.dataService.error;
  loading = this.dataService.loading;

  auth = inject(AuthService);

  // Options for PrimeNG selects
  linkTypeOptions = [
    { value: null, label: this.translateService.instant('all.partner.filters.all') },
    { value: 'competition', label: this.translateService.instant('all.partner.filters.competition') },
    { value: 'tournament', label: this.translateService.instant('all.partner.filters.tournament') }
  ];

  gameTypeOptions = [
    { value: null, label: this.translateService.instant('all.partner.filters.all') },
    { value: 'MX', label: this.translateService.instant('all.partner.filters.mix') },
    { value: 'D', label: this.translateService.instant('all.partner.filters.double') }
  ];

  // create signal from minGames filter
  minGames = toSignal<number>(
    this.filter.get('minGames')?.valueChanges.pipe(
      map((v) => v ?? 0),
      distinctUntilChanged((a, b) => a === b),
      startWith(this.filter.get('minGames')?.value ?? 0),
    ) ?? of(2),
  );

  partners = computed(() => {
    const playerStats = new Map<string, { player: Player; winRate: number; amountOfGames: number }>();

    this.memberships()?.forEach((membership) => {
      membership.game.gamePlayerMemberships
        .filter((m) => m.team === membership.team && m.player !== membership.player)
        .forEach((m) => {
          const playerId = m.gamePlayer.id;
          if (!playerStats.has(playerId)) {
            playerStats.set(playerId, { player: m.gamePlayer, winRate: 0, amountOfGames: 0 });
          }
          const stats = playerStats.get(playerId);

          if (stats == null) {
            return;
          }

          stats.amountOfGames += 1;
          stats.winRate =
            Math.round(
              (((stats.winRate / 100) * (stats.amountOfGames - 1) + (membership.game.winner == m.team ? 1 : 0)) / stats.amountOfGames) * 100 * 100,
            ) / 100;
        });
    });

    return Array.from(playerStats.values()).filter((p) => p.amountOfGames >= (this.minGames() ?? 0));
  });

  constructor() {
    effect(() => {
      this.filter.get('playerId')?.setValue(this.playerId());
    });
  }
}
