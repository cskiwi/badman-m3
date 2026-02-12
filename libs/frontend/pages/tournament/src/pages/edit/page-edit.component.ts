import { Component, computed, inject, signal, resource, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';

import { lastValueFrom } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';

import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { TournamentEvent } from '@app/models';
import { MessageService } from 'primeng/api';
import { injectParams } from 'ngxtension/inject-params';
import { TranslateModule } from '@ngx-translate/core';

import { TournamentInfoComponent } from './components/tournament-info/tournament-info.component';
import { TournamentSettingsComponent } from './components/tournament-settings/tournament-settings.component';

const GET_TOURNAMENT_WITH_DETAILS = gql`
  query GetTournamentWithDetails($id: ID!) {
    tournamentEvent(id: $id) {
      id
      name
      slug
      firstDay
      openDate
      closeDate
      official
      enrollmentOpenDate
      enrollmentCloseDate
      allowGuestEnrollments
      schedulePublished
    }
  }
`;

@Component({
  selector: 'app-page-edit',
  standalone: true,
  imports: [
    ButtonModule,
    ProgressBarModule,
    ToastModule,
    TabsModule,
    PageHeaderComponent,
    TranslateModule,
    TournamentInfoComponent,
    TournamentSettingsComponent,
  ],
  providers: [MessageService],
  templateUrl: './page-edit.component.html',
})
export class PageEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apollo = inject(Apollo);
  private readonly messageService = inject(MessageService);

  private readonly tournamentId = injectParams('tournamentId');

  private readonly infoComponent = viewChild(TournamentInfoComponent);
  private readonly settingsComponent = viewChild(TournamentSettingsComponent);

  readonly loadingTournament = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeTabIndex = signal('0');

  private readonly tournamentResource = resource({
    params: () => ({ tournamentId: this.tournamentId() }),
    loader: async ({ params }) => {
      if (!params.tournamentId) return null;

      this.loadingTournament.set(true);
      this.error.set(null);

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ tournamentEvent: TournamentEvent }>({
            query: GET_TOURNAMENT_WITH_DETAILS,
            variables: { id: params.tournamentId },
            fetchPolicy: 'network-only',
          }),
        );

        return result?.data?.tournamentEvent || null;
      } catch (err) {
        this.error.set('Failed to load tournament data');
        return null;
      } finally {
        this.loadingTournament.set(false);
      }
    },
  });

  readonly tournament = computed(() => this.tournamentResource.value());
  readonly loading = computed(() => this.loadingTournament());

  async saveCurrentTab(): Promise<void> {
    const activeTab = this.activeTabIndex();

    try {
      switch (activeTab) {
        case '0': {
          const infoComponent = this.infoComponent();
          if (infoComponent?.isDirty) {
            await infoComponent.saveInfo();
          }
          break;
        }

        case '1': {
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
    const settingsComponent = this.settingsComponent();

    if (infoComponent?.isDirty) {
      promises.push(infoComponent.saveInfo());
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
    const settingsComponent = this.settingsComponent();

    return (infoComponent?.isDirty ?? false) || (settingsComponent?.isDirty ?? false);
  }

  onActiveIndexChange(event: any): void {
    this.activeTabIndex.set(event.index?.toString() || '0');
  }
}
