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
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './team-matching-dashboard.component.html',
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
