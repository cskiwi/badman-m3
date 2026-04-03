import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, TemplateRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { Club, Player, Team } from '@app/models';
import { AuthService } from '@app/frontend-modules-auth/service';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { sortTeams } from '@app/utils/sorts';
import { getSeason } from '@app/utils/comp';
import { lastValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageService } from 'primeng/api';
import { AssemblyComponent } from './components/assembly/assembly.component';
import { AssemblyService } from './page-assembly.service';

@Component({
  selector: 'app-page-assembly',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgTemplateOutlet,
    TranslateModule,
    ButtonModule,
    MenuModule,
    DialogModule,
    ToastModule,
    SelectModule,
    AutoCompleteModule,
    FloatLabelModule,
    PageHeaderComponent,
    AssemblyComponent,
  ],
  providers: [MessageService, AssemblyService],
  templateUrl: './page-assembly.component.html',
  styleUrl: './page-assembly.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageAssemblyComponent implements OnInit {
  private readonly apollo = inject(Apollo);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly systemService = inject(RankingSystemService);
  private readonly messageService = inject(MessageService);

  readonly dataService = inject(AssemblyService);

  // Filter state
  seasons = signal<number[]>([getSeason()]);
  selectedSeason = signal<number>(getSeason());
  clubSuggestions = signal<Club[]>([]);
  selectedClub = signal<Club | null>(null);
  teams = signal<{ type: string; teams: Team[] }[]>([]);
  selectedTeamId = signal<string | null>(null);
  encounters = signal<{ id: string; label: string }[]>([]);
  selectedEncounterId = signal<string | null>(null);

  pdfLoading = signal(false);
  saveLoading = signal(false);
  showValidationDialog = signal(false);
  pendingAction = signal<'download' | 'save' | null>(null);

  loggedIn = this.authService.loggedIn;

  validationOverview = signal<{
    valid: boolean;
    template: TemplateRef<HTMLElement>;
  } | null>(null);

  saveMenuItems = computed(() => [
    {
      label: 'Save',
      icon: 'pi pi-save',
      disabled: this.saveLoading(),
      command: () => this.save(),
    },
  ]);

  async ngOnInit() {
    await this.loadSeasons();
    await this.restoreFromUrl();
  }

  // Filter methods
  private async loadSeasons() {
    try {
      const result = await lastValueFrom(
        this.apollo.query<{ competitionEvents: { season: number }[] }>({
          query: gql`
            query CompetitionYearsCompetition {
              competitionEvents(args: { where: [{ official: { eq: true } }], order: { season: DESC } }) {
                season
              }
            }
          `,
        }),
      );
      if (result.data?.competitionEvents?.length) {
        const uniqueSeasons = [...new Set(result.data.competitionEvents.map((e) => e.season))];
        this.seasons.set(uniqueSeasons);
      }
    } catch {
      // Keep default season
    }
  }

  private async restoreFromUrl() {
    const params = this.route.snapshot.queryParamMap;
    const season = params.get('season');
    const clubId = params.get('club');
    const teamId = params.get('team');
    const encounterId = params.get('encounter');

    if (season) {
      this.selectedSeason.set(Number(season));
    }

    if (clubId) {
      // Load club by ID
      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: Club }>({
            query: gql`
              query GetClub($id: ID!) {
                club(id: $id) {
                  id
                  name
                  slug
                  clubId
                }
              }
            `,
            variables: { id: clubId },
          }),
        );
        if (result.data?.club) {
          this.selectedClub.set(result.data?.club);
          this.dataService.formGroup.get('club')?.setValue(clubId);
          await this.loadTeams(clubId);
        }
      } catch {
        // Club not found
      }
    }

    if (teamId) {
      this.selectedTeamId.set(teamId);
      this.dataService.formGroup.get('team')?.setValue(teamId);
      await this.loadEncounters(teamId);
    }

    if (encounterId) {
      this.selectedEncounterId.set(encounterId);
      this.dataService.formGroup.get('encounter')?.setValue(encounterId);
    }

    // Trigger initial data load if team is selected
    if (teamId) {
      this.dataService.loadData(encounterId ?? undefined);
    }
  }

  async searchClub(event: { query: string }) {
    try {
      const result = await lastValueFrom(
        this.apollo.query<{ clubs: Club[] }>({
          query: gql`
            query GetClubs($args: ClubArgs) {
              clubs(args: $args) {
                id
                name
                slug
                clubId
              }
            }
          `,
          variables: {
            args: {
              where: [{ name: { ilike: `%${event.query}%` } }],
            },
          },
        }),
      );
      this.clubSuggestions.set(result.data?.clubs ?? []);
    } catch {
      this.clubSuggestions.set([]);
    }
  }

  async onClubSelect(club: Club) {
    this.selectedClub.set(club);
    this.dataService.formGroup.get('club')?.setValue(club.id);
    this.selectedTeamId.set(null);
    this.selectedEncounterId.set(null);
    this.teams.set([]);
    this.encounters.set([]);
    this.updateUrl();
    await this.loadTeams(club.id);
  }

  onClubClear() {
    this.selectedClub.set(null);
    this.dataService.formGroup.get('club')?.setValue(null);
    this.selectedTeamId.set(null);
    this.selectedEncounterId.set(null);
    this.teams.set([]);
    this.encounters.set([]);
    this.updateUrl();
  }

  async onSeasonChange(season: number) {
    this.selectedSeason.set(season);
    this.dataService.formGroup.get('season')?.setValue(season);
    // Reload teams if club is selected
    const club = this.selectedClub();
    if (club?.id) {
      this.selectedTeamId.set(null);
      this.selectedEncounterId.set(null);
      this.encounters.set([]);
      await this.loadTeams(club.id);
    }
    this.updateUrl();
  }

  async onTeamChange(teamId: string) {
    this.selectedTeamId.set(teamId);
    this.dataService.formGroup.get('team')?.setValue(teamId);
    this.selectedEncounterId.set(null);
    this.encounters.set([]);
    this.updateUrl();
    await this.loadEncounters(teamId);
    this.dataService.loadData();
  }

  onEncounterChange(encounterId: string | null) {
    this.selectedEncounterId.set(encounterId);
    this.dataService.formGroup.get('encounter')?.setValue(encounterId);
    this.updateUrl();
    this.dataService.loadData(encounterId ?? undefined);
  }

  private async loadTeams(clubId: string) {
    try {
      const result = await lastValueFrom(
        this.apollo.query<{ teams: Team[] }>({
          query: gql`
            query GetTeamsForClub($args: TeamArgs) {
              teams(args: $args) {
                id
                name
                type
                teamNumber
                season
                captainId
              }
            }
          `,
          variables: {
            args: {
              where: [{ clubId: { eq: clubId }, season: { eq: this.selectedSeason() } }],
            },
          },
        }),
      );
      const teamsList = [...(result.data?.teams ?? [])].sort(sortTeams);
      // Group by type
      const grouped = teamsList.reduce(
        (acc, team) => {
          const type = team.type ?? 'Other';
          if (!acc[type]) acc[type] = [];
          acc[type].push(team);
          return acc;
        },
        {} as { [key: string]: Team[] },
      );
      this.teams.set(Object.keys(grouped).map((type) => ({ type, teams: grouped[type] })));
    } catch {
      this.teams.set([]);
    }
  }

  private async loadEncounters(teamId: string) {
    try {
      const result = await lastValueFrom(
        this.apollo.query<{
          competitionEncounters: Array<{
            id: string;
            date?: string;
            homeTeam?: { id: string; name?: string };
            awayTeam?: { id: string; name?: string };
          }>;
        }>({
          query: gql`
            query GetEncountersForTeam($args: CompetitionEncounterArgs) {
              competitionEncounters(args: $args) {
                id
                date
                homeTeam {
                  id
                  name
                }
                awayTeam {
                  id
                  name
                }
              }
            }
          `,
          variables: {
            args: {
              where: [{ OR: [{ homeTeamId: { eq: teamId } }, { awayTeamId: { eq: teamId } }] }],
              order: { date: 'ASC' },
            },
          },
        }),
      );
      const encounterList = result.data?.competitionEncounters ?? [];
      this.encounters.set(
        encounterList.map((e) => ({
          id: e.id,
          label: `${e.date ? new Date(e.date).toLocaleDateString('nl-BE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''} ${e.homeTeam?.name ?? ''} vs ${e.awayTeam?.name ?? ''}`,
        })),
      );
    } catch {
      this.encounters.set([]);
    }
  }

  private updateUrl() {
    const queryParams: Record<string, string | null> = {
      season: `${this.selectedSeason()}`,
      club: this.selectedClub()?.id ?? null,
      team: this.selectedTeamId(),
      encounter: this.selectedEncounterId(),
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  templateUpdated(template: { valid: boolean; template: TemplateRef<HTMLElement> }) {
    this.validationOverview.set(template);
  }

  async download() {
    const overview = this.validationOverview();
    if (!overview?.valid) {
      if (!overview) return;
      this.pendingAction.set('download');
      this.showValidationDialog.set(true);
    } else {
      await this.getPdf();
    }
  }

  async save() {
    const overview = this.validationOverview();
    this.saveLoading.set(true);
    try {
      if (!overview?.valid) {
        if (!overview) return;
        this.pendingAction.set('save');
        this.showValidationDialog.set(true);
      } else {
        await this.executeSave();
      }
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save',
        life: 2000,
      });
    } finally {
      this.saveLoading.set(false);
    }
  }

  async onDialogConfirm() {
    this.showValidationDialog.set(false);
    const action = this.pendingAction();
    this.pendingAction.set(null);
    if (action === 'download') {
      await this.getPdf();
    } else if (action === 'save') {
      await this.executeSave();
    }
  }

  onDialogCancel() {
    this.showValidationDialog.set(false);
    this.pendingAction.set(null);
    this.saveLoading.set(false);
  }

  private async getPdf() {
    this.pdfLoading.set(true);
    // Auto reset after 5 seconds
    setTimeout(() => this.pdfLoading.set(false), 5000);

    const formGroup = this.dataService.formGroup;
    const encounterId = formGroup.get('encounter')?.value;
    let fileName = `${new Date().toISOString().slice(0, 16).replace('T', ' ')}.pdf`;

    if (encounterId) {
      try {
        const result = await lastValueFrom(
          this.apollo.query<{
            competitionEncounter: { id: string; date?: string; homeTeam?: { id: string; name?: string }; awayTeam?: { id: string; name?: string } };
          }>({
            query: gql`
              query GetEncounterQuery($id: ID!) {
                competitionEncounter(id: $id) {
                  id
                  date
                  homeTeam {
                    id
                    name
                  }
                  awayTeam {
                    id
                    name
                  }
                }
              }
            `,
            variables: { id: encounterId },
          }),
        );
        const encounter = result.data?.competitionEncounter;
        if (encounter?.date) {
          const date = new Date(encounter.date).toISOString().slice(0, 16).replace('T', ' ');
          fileName = `${date} - ${encounter.homeTeam?.name} vs ${encounter.awayTeam?.name}.pdf`;
        }
      } catch {
        // Use default filename
      }
    }

    // TODO: Integrate PdfService when available
    // For now, log the assembly data
    console.log('PDF download requested:', fileName, this.getAssemblyData());
    this.pdfLoading.set(false);
  }

  private async executeSave() {
    this.saveLoading.set(true);
    try {
      const data = this.getAssemblyData();
      await lastValueFrom(
        this.apollo.mutate({
          mutation: gql`
            mutation CreateAssemblyMutation($assembly: AssemblyInput!) {
              createAssembly(assembly: $assembly)
            }
          `,
          variables: { assembly: data },
        }),
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Saved',
        life: 2000,
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save',
        life: 2000,
      });
    } finally {
      this.saveLoading.set(false);
    }
  }

  private getAssemblyData() {
    const fg = this.dataService.formGroup;
    return {
      systemId: this.systemService.systemId() ?? null,
      captainId: fg.get('captain')?.value,
      teamId: fg.get('team')?.value,
      encounterId: fg.get('encounter')?.value,
      single1: fg.get('single1')?.value?.id,
      single2: fg.get('single2')?.value?.id,
      single3: fg.get('single3')?.value?.id,
      single4: fg.get('single4')?.value?.id,
      double1: fg.get('double1')?.value?.map((r: { id: string }) => r.id),
      double2: fg.get('double2')?.value?.map((r: { id: string }) => r.id),
      double3: fg.get('double3')?.value?.map((r: { id: string }) => r.id),
      double4: fg.get('double4')?.value?.map((r: { id: string }) => r.id),
      subtitudes: fg.get('subtitudes')?.value?.map((r: { id: string }) => r.id),
    };
  }
}
