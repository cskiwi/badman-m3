import { Component, computed, inject, signal, resource, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';

import { lastValueFrom } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';

import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { CompetitionEvent } from '@app/models';
import { MessageService } from 'primeng/api';
import { injectParams } from 'ngxtension/inject-params';
import { TranslateModule } from '@ngx-translate/core';

import { CompetitionInfoComponent } from './components/competition-info/competition-info.component';
import { CompetitionDatesComponent } from './components/competition-dates/competition-dates.component';
import { CompetitionSettingsComponent } from './components/competition-settings/competition-settings.component';

const GET_COMPETITION_WITH_DETAILS = gql`
  query GetCompetitionWithDetails($id: ID!) {
    competitionEvent(id: $id) {
      id
      name
      slug
      season
      lastSync
      openDate
      closeDate
      changeOpenDate
      changeCloseDatePeriod1
      changeCloseRequestDatePeriod1
      changeCloseDatePeriod2
      changeCloseRequestDatePeriod2
      visualCode
      teamMatcher
      official
      type
      state
      country
      checkEncounterForFilledIn
      usedRankingAmount
      usedRankingUnit
      contactEmail
    }
  }
`;

@Component({
  selector: 'app-page-edit',
  standalone: true,
  imports: [
    CardModule,
    ButtonModule,
    MessageModule,
    ProgressBarModule,
    ToastModule,
    TabsModule,
    PageHeaderComponent,
    TranslateModule,
    CompetitionInfoComponent,
    CompetitionDatesComponent,
    CompetitionSettingsComponent,
  ],
  providers: [MessageService],
  templateUrl: './page-edit.component.html',
  styleUrl: './page-edit.component.scss',
})
export class PageEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apollo = inject(Apollo);
  private readonly messageService = inject(MessageService);

  // Get competition ID from route
  private readonly competitionId = injectParams('competitionId');

  // View children
  private readonly infoComponent = viewChild(CompetitionInfoComponent);
  private readonly datesComponent = viewChild(CompetitionDatesComponent);
  private readonly settingsComponent = viewChild(CompetitionSettingsComponent);

  // Loading and error states
  readonly loadingCompetition = signal(false);
  readonly error = signal<string | null>(null);

  // Current tab index
  readonly activeTabIndex = signal('0');

  // Competition data resource
  private readonly competitionResource = resource({
    params: () => ({ competitionId: this.competitionId() }),
    loader: async ({ params }) => {
      if (!params.competitionId) return null;

      this.loadingCompetition.set(true);
      this.error.set(null);

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ competitionEvent: CompetitionEvent }>({
            query: GET_COMPETITION_WITH_DETAILS,
            variables: { id: params.competitionId },
            fetchPolicy: 'network-only',
          }),
        );

        return result?.data?.competitionEvent || null;
      } catch (err) {
        this.error.set('Failed to load competition data');
        return null;
      } finally {
        this.loadingCompetition.set(false);
      }
    },
  });

  // Public computed properties
  readonly competition = computed(() => this.competitionResource.value());
  readonly loading = computed(() => this.loadingCompetition());

  async saveCurrentTab(): Promise<void> {
    const activeTab = this.activeTabIndex();

    try {
      switch (activeTab) {
        case '0': {
          // Info tab
          const infoComponent = this.infoComponent();
          if (infoComponent?.isDirty) {
            await infoComponent.saveInfo();
          }
          break;
        }

        case '1': {
          // Dates tab
          const datesComponent = this.datesComponent();
          if (datesComponent?.isDirty) {
            await datesComponent.saveDates();
          }
          break;
        }

        case '2': {
          // Settings tab
          const settingsComponent = this.settingsComponent();
          if (settingsComponent?.isDirty) {
            await settingsComponent.saveSettings();
          }
          break;
        }
      }
    } catch (err) {
      // Error handling is done in the individual components
    }
  }

  async saveAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    const infoComponent = this.infoComponent();
    const datesComponent = this.datesComponent();
    const settingsComponent = this.settingsComponent();

    if (infoComponent?.isDirty) {
      promises.push(infoComponent.saveInfo());
    }

    if (datesComponent?.isDirty) {
      promises.push(datesComponent.saveDates());
    }

    if (settingsComponent?.isDirty) {
      promises.push(settingsComponent.saveSettings());
    }

    if (promises.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'No Changes',
        detail: 'No changes to save',
      });
      return;
    }

    try {
      await Promise.all(promises);

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'All changes saved successfully',
      });

      // Navigate back to competition detail page
      this.router.navigate(['..'], { relativeTo: this.route });
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Some changes could not be saved',
      });
    }
  }

  cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  get hasUnsavedChanges(): boolean {
    const infoComponent = this.infoComponent();
    const datesComponent = this.datesComponent();
    const settingsComponent = this.settingsComponent();

    return (
      (infoComponent?.isDirty ?? false) ||
      (datesComponent?.isDirty ?? false) ||
      (settingsComponent?.isDirty ?? false)
    );
  }

  onActiveIndexChange(event: any): void {
    this.activeTabIndex.set(event.index?.toString() || '0');
  }
}
