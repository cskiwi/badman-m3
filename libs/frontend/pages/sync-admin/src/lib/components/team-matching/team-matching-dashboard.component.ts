
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';

// PrimeNG Components
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
  GetMatchedTeamsResponse,
  GetTeamMatchingStatsResponse,
  GetUnmatchedTeamsResponse,
  MatchedTeam,
  TeamSuggestion,
  UnmatchedTeam,
} from '../../models/team-matching.models';

const GET_TEAM_MATCHING_STATS = gql`
  query GetTeamMatchingStats {
    teamMatchingStats {
      totalUnmatchedTeams
      totalMatchedTeams
      pendingReviews
      autoMatchedHighConfidence
      autoMatchedMediumConfidence
      manuallyMatched
    }
  }
`;

const GET_UNMATCHED_TEAMS = gql`
  query GetUnmatchedTeams($filter: String, $tournamentCode: String, $limit: Int, $offset: Int) {
    unmatchedTeams(filter: $filter, tournamentCode: $tournamentCode, limit: $limit, offset: $offset) {
      items {
        id
        externalCode
        externalName
        tournamentCode
        tournamentName
        normalizedName
        clubName
        teamNumber
        gender
        strength
        suggestions {
          teamId
          teamName
          clubName
          score
          teamNumber
          gender
        }
        lastReviewedAt
      }
      total
    }
  }
`;

const GET_MATCHED_TEAMS = gql`
  query GetMatchedTeams($filter: String, $tournamentCode: String, $limit: Int, $offset: Int) {
    matchedTeams(filter: $filter, tournamentCode: $tournamentCode, limit: $limit, offset: $offset) {
      items {
        id
        externalCode
        externalName
        matchedTeamId
        matchedTeamName
        matchedClubName
        matchScore
        matchType
        matchedAt
        tournamentName
      }
      total
    }
  }
`;

@Component({
  selector: 'app-team-matching-dashboard',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    SkeletonModule,
    InputTextModule,
    SelectModule,
    ProgressBarModule,
    DialogModule,
    MessageModule,
    ConfirmDialogModule
],
  providers: [ConfirmationService],
  template: `
    <div class="p-4">
      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        @if (statsLoading()) {
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <p-card>
              <p-skeleton width="100%" height="1rem" class="mb-2" />
              <p-skeleton width="60%" height="2rem" />
            </p-card>
          }
        } @else if (stats()) {
          <p-card>
            <div class="text-center">
              <div class="text-sm text-gray-600 mb-1">Unmatched Teams</div>
              <div class="text-2xl font-bold text-orange-600">{{ stats()!.totalUnmatchedTeams }}</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-sm text-gray-600 mb-1">Matched Teams</div>
              <div class="text-2xl font-bold text-green-600">{{ stats()!.totalMatchedTeams }}</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-sm text-gray-600 mb-1">Pending Reviews</div>
              <div class="text-2xl font-bold text-red-600">{{ stats()!.pendingReviews }}</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-sm text-gray-600 mb-1">Auto High</div>
              <div class="text-2xl font-bold text-blue-600">{{ stats()!.autoMatchedHighConfidence }}</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-sm text-gray-600 mb-1">Auto Medium</div>
              <div class="text-2xl font-bold text-indigo-600">{{ stats()!.autoMatchedMediumConfidence }}</div>
            </div>
          </p-card>
          <p-card>
            <div class="text-center">
              <div class="text-sm text-gray-600 mb-1">Manual</div>
              <div class="text-2xl font-bold text-purple-600">{{ stats()!.manuallyMatched }}</div>
            </div>
          </p-card>
        }
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4 mb-6">
        <p-button label="Run Auto-Matching" icon="pi pi-cog" [loading]="autoMatchingLoading()" (onClick)="runAutoMatching()" severity="info" />
        <p-button label="Bulk Approve High Confidence"
          icon="pi pi-check"
          [loading]="bulkApproveLoading()"
          (onClick)="bulkApproveHighConfidence()"
          severity="success"
         />
        <p-button label="Export Unmatched" icon="pi pi-download" (onClick)="exportUnmatched()" severity="secondary" />
      </div>

      <!-- Tabs for Unmatched and Matched Teams -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Unmatched Teams -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex justify-between items-center p-4">
              <h3 class="text-xl font-bold m-0">Unmatched Teams</h3>
              <div class="flex gap-2">
                <input pInputText [formControl]="unmatchedSearchControl" placeholder="Search unmatched..." class="w-48" />
                <p-select [formControl]="unmatchedTournamentControl"
                  [options]="tournamentOptions"
                  placeholder="All Tournaments"
                  optionLabel="label"
                  optionValue="value"
                  class="w-48"
                 />
              </div>
            </div>
          </ng-template>

          <ng-template pTemplate="content">
            @if (unmatchedLoading()) {
              <div class="space-y-4">
                @for (i of [1, 2, 3]; track i) {
                  <div class="border rounded-lg p-4">
                    <p-skeleton width="200px" height="1.5rem" class="mb-2" />
                    <p-skeleton width="150px" height="1rem" class="mb-2" />
                    <p-skeleton width="100%" height="1rem" />
                  </div>
                }
              </div>
            } @else {
              <p-table
                [value]="unmatchedTeams()"
                [paginator]="true"
                [rows]="10"
                [totalRecords]="unmatchedTotalRecords()"
                [lazy]="true"
                (onLazyLoad)="onUnmatchedLazyLoad($event)"
                styleClass="p-datatable-sm"
              >
                <ng-template pTemplate="header">
                  <tr>
                    <th>External Team</th>
                    <th>Tournament</th>
                    <th>Best Suggestion</th>
                    <th>Actions</th>
                  </tr>
                </ng-template>

                <ng-template pTemplate="body" let-team>
                  <tr>
                    <td>
                      <div>
                        <div class="font-semibold">{{ team.externalName }}</div>
                        <div class="text-sm text-gray-600">{{ team.externalCode }}</div>
                        <div class="text-xs text-gray-500">
                          {{ team.clubName }}
                          @if (team.teamNumber) {
                            • Team {{ team.teamNumber }}
                          }
                          @if (team.gender) {
                            • {{ team.gender }}
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="text-sm">{{ team.tournamentName }}</div>
                    </td>
                    <td>
                      @if (team.suggestions && team.suggestions.length > 0) {
                        <div>
                          <div class="font-semibold text-sm">{{ team.suggestions[0].teamName }}</div>
                          <div class="text-xs text-gray-600">{{ team.suggestions[0].clubName }}</div>
                          <div class="flex items-center gap-2 mt-1">
                            <p-progressBar [value]="team.suggestions[0].score * 100" [style]="{ height: '6px', width: '60px' }" />
                            <span class="text-xs">{{ (team.suggestions[0].score * 100).toFixed(1) }}%</span>
                          </div>
                        </div>
                      } @else {
                        <span class="text-gray-400 text-sm">No suggestions</span>
                      }
                    </td>
                    <td>
                      <div class="flex gap-1">
                        <p-button icon="pi pi-eye" size="small" (onClick)="reviewTeam(team)" pTooltip="Review Matches" />
                        @if (team.suggestions && team.suggestions.length > 0) {
                          <p-button icon="pi pi-check"
                            size="small"
                            severity="success"
                            (onClick)="quickMatch(team, team.suggestions[0])"
                            pTooltip="Quick Match"
                           />
                        }
                        <p-button icon="pi pi-times" size="small" severity="secondary" (onClick)="skipTeam(team)" pTooltip="Skip" />
                      </div>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            }
          </ng-template>
        </p-card>

        <!-- Matched Teams -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex justify-between items-center p-4">
              <h3 class="text-xl font-bold m-0">Recently Matched Teams</h3>
              <div class="flex gap-2">
                <input pInputText [formControl]="matchedSearchControl" placeholder="Search matched..." class="w-48" />
              </div>
            </div>
          </ng-template>

          <ng-template pTemplate="content">
            @if (matchedLoading()) {
              <div class="space-y-4">
                @for (i of [1, 2, 3]; track i) {
                  <div class="border rounded-lg p-4">
                    <p-skeleton width="200px" height="1.5rem" class="mb-2" />
                    <p-skeleton width="150px" height="1rem" class="mb-2" />
                    <p-skeleton width="100%" height="1rem" />
                  </div>
                }
              </div>
            } @else {
              <p-table
                [value]="matchedTeams()"
                [paginator]="true"
                [rows]="10"
                [totalRecords]="matchedTotalRecords()"
                [lazy]="true"
                (onLazyLoad)="onMatchedLazyLoad($event)"
                styleClass="p-datatable-sm"
              >
                <ng-template pTemplate="header">
                  <tr>
                    <th>External Team</th>
                    <th>Matched Team</th>
                    <th>Match Info</th>
                    <th>Actions</th>
                  </tr>
                </ng-template>

                <ng-template pTemplate="body" let-match>
                  <tr>
                    <td>
                      <div>
                        <div class="font-semibold text-sm">{{ match.externalName }}</div>
                        <div class="text-xs text-gray-600">{{ match.externalCode }}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div class="font-semibold text-sm">{{ match.matchedTeamName }}</div>
                        <div class="text-xs text-gray-600">{{ match.matchedClubName }}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div class="flex items-center gap-2 mb-1">
                          <p-progressBar [value]="match.matchScore * 100" [style]="{ height: '6px', width: '50px' }" />
                          <span class="text-xs">{{ (match.matchScore * 100).toFixed(1) }}%</span>
                        </div>
                        <p-tag [value]="match.matchType" [severity]="getMatchTypeSeverity(match.matchType)" class="text-xs" />
                      </div>
                    </td>
                    <td>
                      <p-button icon="pi pi-times" size="small" severity="danger" (onClick)="unmatchTeam(match)" pTooltip="Unmatch" />
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            }
          </ng-template>
        </p-card>
      </div>
    </div>

    <!-- Team Review Dialog -->
    <p-dialog
      header="Review Team Matches"
      [modal]="true"
      [(visible)]="showReviewDialog"
      [style]="{ width: '80vw', maxWidth: '1000px' }"
      [draggable]="false"
      [resizable]="false"
    >
      @if (selectedTeam()) {
        <div class="mb-4">
          <h4 class="text-lg font-semibold mb-2">{{ selectedTeam()!.externalName }}</h4>
          <p class="text-gray-600 text-sm">{{ selectedTeam()!.clubName }} • {{ selectedTeam()!.tournamentName }}</p>
        </div>

        <p-table [value]="selectedTeam()!.suggestions">
          <ng-template pTemplate="header">
            <tr>
              <th>Team</th>
              <th>Club</th>
              <th>Match Score</th>
              <th>Details</th>
              <th>Action</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-suggestion>
            <tr>
              <td>{{ suggestion.teamName }}</td>
              <td>{{ suggestion.clubName }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <p-progressBar [value]="suggestion.score * 100" [style]="{ height: '8px', width: '80px' }" />
                  <span class="text-sm">{{ (suggestion.score * 100).toFixed(1) }}%</span>
                </div>
              </td>
              <td>
                <div class="text-sm">
                  @if (suggestion.teamNumber) {
                    Team {{ suggestion.teamNumber }}
                  }
                  @if (suggestion.gender) {
                    • {{ suggestion.gender }}
                  }
                </div>
              </td>
              <td>
                <p-button label="Match" size="small" (onClick)="matchTeamInDialog(selectedTeam()!, suggestion)" />
              </td>
            </tr>
          </ng-template>
        </p-table>

        <div class="flex justify-end gap-2 mt-4">
          <p-button label="Create New Team" severity="secondary" (onClick)="createNewTeam(selectedTeam()!)" />
          <p-button label="Skip for Now" severity="secondary" (onClick)="closeReviewDialog()" />
        </div>
      }
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class TeamMatchingDashboardComponent {
  private apollo = inject(Apollo);
  private confirmationService = inject(ConfirmationService);

  unmatchedSearchControl = new FormControl('');
  unmatchedTournamentControl = new FormControl<string | null>(null);
  matchedSearchControl = new FormControl('');

  autoMatchingLoading = signal(false);
  bulkApproveLoading = signal(false);
  selectedTeam = signal<UnmatchedTeam | null>(null);
  showReviewDialog = false;

  unmatchedCurrentPage = signal(0);
  matchedCurrentPage = signal(0);

  // Convert form controls to signals
  private unmatchedSearchSignal = toSignal(this.unmatchedSearchControl.valueChanges, { initialValue: '' });
  private unmatchedTournamentSignal = toSignal(this.unmatchedTournamentControl.valueChanges, { initialValue: null });
  private matchedSearchSignal = toSignal(this.matchedSearchControl.valueChanges, { initialValue: '' });

  // Resources
  private statsResource = resource({
    params: () => ({}),
    loader: async ({ abortSignal }) => {
      const result = await this.apollo
        .query<GetTeamMatchingStatsResponse>({
          query: GET_TEAM_MATCHING_STATS,
          context: { signal: abortSignal },
        })
        .toPromise();
      return result?.data;
    },
  });

  private unmatchedResource = resource({
    params: () => ({
      filter: this.unmatchedSearchSignal(),
      tournamentCode: this.unmatchedTournamentSignal(),
      limit: 10,
      offset: this.unmatchedCurrentPage() * 10,
    }),
    loader: async ({ params, abortSignal }) => {
      const result = await this.apollo
        .query<GetUnmatchedTeamsResponse>({
          query: GET_UNMATCHED_TEAMS,
          variables: params,
          context: { signal: abortSignal },
        })
        .toPromise();
      return result?.data;
    },
  });

  private matchedResource = resource({
    params: () => ({
      filter: this.matchedSearchSignal(),
      limit: 10,
      offset: this.matchedCurrentPage() * 10,
    }),
    loader: async ({ params, abortSignal }) => {
      const result = await this.apollo
        .query<GetMatchedTeamsResponse>({
          query: GET_MATCHED_TEAMS,
          variables: params,
          context: { signal: abortSignal },
        })
        .toPromise();
      return result?.data;
    },
  });

  // Computed selectors
  stats = computed(() => this.statsResource.value()?.teamMatchingStats);
  statsLoading = computed(() => this.statsResource.isLoading());

  unmatchedTeams = computed(() => this.unmatchedResource.value()?.unmatchedTeams?.items ?? []);
  unmatchedTotalRecords = computed(() => this.unmatchedResource.value()?.unmatchedTeams?.total ?? 0);
  unmatchedLoading = computed(() => this.unmatchedResource.isLoading());

  matchedTeams = computed(() => this.matchedResource.value()?.matchedTeams?.items ?? []);
  matchedTotalRecords = computed(() => this.matchedResource.value()?.matchedTeams?.total ?? 0);
  matchedLoading = computed(() => this.matchedResource.isLoading());

  tournamentOptions = [
    { label: 'All Tournaments', value: null },
    // TODO: Load from API
  ];

  onUnmatchedLazyLoad(event: TableLazyLoadEvent) {
    this.unmatchedCurrentPage.set(Math.floor((event.first ?? 0) / (event.rows ?? 1)));
  }

  onMatchedLazyLoad(event: TableLazyLoadEvent) {
    this.matchedCurrentPage.set(Math.floor((event.first ?? 0) / (event.rows ?? 1)));
  }

  async runAutoMatching() {
    this.autoMatchingLoading.set(true);
    try {
      // TODO: Implement auto-matching API call
      await new Promise((resolve) => setTimeout(resolve, 3000));
      // Refresh data
      this.statsResource.reload();
      this.unmatchedResource.reload();
      this.matchedResource.reload();
    } catch (error) {
      console.error('Failed to run auto-matching:', error);
    } finally {
      this.autoMatchingLoading.set(false);
    }
  }

  async bulkApproveHighConfidence() {
    this.bulkApproveLoading.set(true);
    try {
      // TODO: Implement bulk approve API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refresh data
      this.statsResource.reload();
      this.unmatchedResource.reload();
      this.matchedResource.reload();
    } catch (error) {
      console.error('Failed to bulk approve high confidence matches:', error);
    } finally {
      this.bulkApproveLoading.set(false);
    }
  }

  exportUnmatched() {
    // TODO: Implement export functionality
    console.log('Export unmatched teams');
  }

  reviewTeam(team: UnmatchedTeam) {
    this.selectedTeam.set(team);
    this.showReviewDialog = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async quickMatch(_team: UnmatchedTeam, _suggestion: TeamSuggestion) {
    try {
      // TODO: Implement quick match API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Refresh data
      this.unmatchedResource.reload();
      this.matchedResource.reload();
      this.statsResource.reload();
    } catch (error) {
      console.error('Failed to quick match team:', error);
    }
  }

  skipTeam(team: UnmatchedTeam) {
    // TODO: Implement skip team API call
    console.log('Skip team:', team);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async matchTeamInDialog(_team: UnmatchedTeam, _suggestion: TeamSuggestion) {
    try {
      // TODO: Implement match team API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.closeReviewDialog();
      // Refresh data
      this.unmatchedResource.reload();
      this.matchedResource.reload();
      this.statsResource.reload();
    } catch (error) {
      console.error('Failed to match team:', error);
    }
  }

  createNewTeam(team: UnmatchedTeam) {
    // TODO: Implement create new team functionality
    console.log('Create new team for:', team);
    this.closeReviewDialog();
  }

  unmatchTeam(match: MatchedTeam) {
    this.confirmationService.confirm({
      message: `Are you sure you want to unmatch "${match.externalName}" from "${match.matchedTeamName}"?`,
      header: 'Confirm Unmatch',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          // TODO: Implement unmatch team API call
          await new Promise((resolve) => setTimeout(resolve, 1000));
          // Refresh data
          this.matchedResource.reload();
          this.unmatchedResource.reload();
          this.statsResource.reload();
        } catch (error) {
          console.error('Failed to unmatch team:', error);
        }
      },
    });
  }

  closeReviewDialog() {
    this.showReviewDialog = false;
    this.selectedTeam.set(null);
  }

  getMatchTypeSeverity(matchType: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (matchType) {
      case 'automatic_high_confidence':
        return 'success';
      case 'automatic_medium_confidence':
        return 'info';
      case 'manual':
        return 'warn';
      default:
        return 'secondary';
    }
  }
}
