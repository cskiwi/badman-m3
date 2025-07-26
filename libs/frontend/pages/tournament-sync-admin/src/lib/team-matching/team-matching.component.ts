import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';

import { MessageService, ConfirmationService } from 'primeng/api';

interface UnmatchedTeam {
  id: string;
  tournamentCode: string;
  tournamentName: string;
  externalCode: string;
  externalName: string;
  normalizedName: string;
  clubName: string;
  teamNumber?: number;
  gender?: string;
  strength?: number;
  suggestions: TeamSuggestion[];
  status: 'pending' | 'reviewing' | 'matched' | 'rejected';
  createdAt: Date;
}

interface TeamSuggestion {
  teamId: string;
  teamName: string;
  clubName: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

interface MatchingStats {
  pendingReview: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  matched: number;
  rejected: number;
}

interface TournamentOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-team-matching',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    SkeletonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressBarModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './team-matching.component.html',
  styleUrl: './team-matching.component.scss'
})
export class TeamMatchingComponent implements OnInit {
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // State signals
  loading = signal(false);
  loadingStats = signal(false);
  loadingTeams = signal(false);

  stats = signal<MatchingStats | null>(null);
  unmatchedTeams = signal<UnmatchedTeam[]>([]);

  // Selection
  selectedTeams: UnmatchedTeam[] = [];
  selectedTeamForDetails: UnmatchedTeam | null = null;
  showDetailsDialog = false;

  // Filters
  searchTerm = '';
  selectedTournament: string | null = null;
  selectedStatus: string | null = null;
  selectedConfidence: string | null = null;

  // Options
  tournamentOptions = signal<TournamentOption[]>([]);
  
  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Pending', value: 'pending' },
    { label: 'Reviewing', value: 'reviewing' },
    { label: 'Matched', value: 'matched' },
    { label: 'Rejected', value: 'rejected' }
  ];

  confidenceOptions = [
    { label: 'All Confidence', value: null },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' }
  ];

  // Computed filtered teams
  filteredTeams = computed(() => {
    let filtered = this.unmatchedTeams();

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.externalName.toLowerCase().includes(search) ||
        t.clubName.toLowerCase().includes(search) ||
        t.tournamentName.toLowerCase().includes(search)
      );
    }

    if (this.selectedTournament) {
      filtered = filtered.filter(t => t.tournamentCode === this.selectedTournament);
    }

    if (this.selectedStatus) {
      filtered = filtered.filter(t => t.status === this.selectedStatus);
    }

    if (this.selectedConfidence) {
      filtered = filtered.filter(t => 
        t.suggestions.length > 0 && t.suggestions[0].confidence === this.selectedConfidence
      );
    }

    return filtered;
  });

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    await Promise.all([
      this.loadStats(),
      this.loadUnmatchedTeams(),
      this.loadTournamentOptions()
    ]);
  }

  private async loadStats(): Promise<void> {
    this.loadingStats.set(true);
    try {
      // TODO: Replace with actual API call
      const stats: MatchingStats = {
        pendingReview: 25,
        highConfidence: 8,
        mediumConfidence: 12,
        lowConfidence: 5,
        matched: 150,
        rejected: 10
      };
      this.stats.set(stats);
    } finally {
      this.loadingStats.set(false);
    }
  }

  async loadUnmatchedTeams(): Promise<void> {
    this.loadingTeams.set(true);
    try {
      // TODO: Replace with actual API call
      const teams: UnmatchedTeam[] = [
        {
          id: '1',
          tournamentCode: 'C3B7B9D5-902B-40B8-939B-30A14C01F5AC',
          tournamentName: 'PBO Competitie 2025-2026',
          externalCode: '158',
          externalName: 'Beveren 1H (41)',
          normalizedName: 'beveren 1h 41',
          clubName: 'Beveren',
          teamNumber: 1,
          gender: 'men',
          strength: 41,
          suggestions: [
            {
              teamId: 'team-001',
              teamName: 'Beveren 1 Heren',
              clubName: 'BC Beveren',
              score: 0.95,
              confidence: 'high'
            },
            {
              teamId: 'team-002',
              teamName: 'Beveren Heren 1',
              clubName: 'Badmintonclub Beveren',
              score: 0.88,
              confidence: 'high'
            }
          ],
          status: 'pending',
          createdAt: new Date(Date.now() - 86400000)
        }
      ];
      this.unmatchedTeams.set(teams);
    } finally {
      this.loadingTeams.set(false);
    }
  }

  private async loadTournamentOptions(): Promise<void> {
    // TODO: Load actual tournament options from API
    const options = [
      { label: 'All Tournaments', value: null },
      { label: 'PBO Competitie 2025-2026', value: 'C3B7B9D5-902B-40B8-939B-30A14C01F5AC' },
      { label: 'Lokerse Volvo International 2025', value: '3BAC39DE-2E82-4655-8269-4D83777598BA' }
    ];
    this.tournamentOptions.set(options);
  }

  async autoMatchHighConfidence(): Promise<void> {
    const highConfidenceTeams = this.unmatchedTeams().filter(t => 
      t.status === 'pending' && 
      t.suggestions.length > 0 && 
      t.suggestions[0].confidence === 'high'
    );

    if (highConfidenceTeams.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Teams',
        detail: 'No high confidence teams found to auto-match'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Auto-match ${highConfidenceTeams.length} high confidence teams?`,
      header: 'Auto-Match Confirmation',
      icon: 'pi pi-check',
      accept: async () => {
        this.loading.set(true);
        try {
          // TODO: Call bulk match API
          await new Promise(resolve => setTimeout(resolve, 2000));

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${highConfidenceTeams.length} teams auto-matched`
          });

          await this.loadUnmatchedTeams();
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to auto-match teams'
          });
        } finally {
          this.loading.set(false);
        }
      }
    });
  }

  async approveMatch(team: UnmatchedTeam, suggestion: TeamSuggestion): Promise<void> {
    try {
      // TODO: Call approve match API
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Team "${team.externalName}" matched with "${suggestion.teamName}"`
      });

      this.showDetailsDialog = false;
      await this.loadUnmatchedTeams();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to approve match'
      });
    }
  }

  async rejectTeam(team: UnmatchedTeam): Promise<void> {
    this.confirmationService.confirm({
      message: `Are you sure you want to reject team "${team.externalName}"?`,
      header: 'Reject Team',
      icon: 'pi pi-times',
      accept: async () => {
        try {
          // TODO: Call reject team API
          await new Promise(resolve => setTimeout(resolve, 1000));

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Team "${team.externalName}" rejected`
          });

          this.showDetailsDialog = false;
          await this.loadUnmatchedTeams();
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to reject team'
          });
        }
      }
    });
  }

  async createNewTeam(team: UnmatchedTeam): Promise<void> {
    // TODO: Open create new team dialog
    console.log('Create new team for:', team);
  }

  async bulkApprove(): Promise<void> {
    const approvableTeams = this.selectedTeams.filter(t => 
      t.status === 'pending' && t.suggestions.length > 0
    );

    if (approvableTeams.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Teams',
        detail: 'No approvable teams selected'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Approve best matches for ${approvableTeams.length} selected teams?`,
      header: 'Bulk Approve',
      icon: 'pi pi-check',
      accept: async () => {
        try {
          // TODO: Call bulk approve API
          await new Promise(resolve => setTimeout(resolve, 2000));

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${approvableTeams.length} teams approved`
          });

          this.selectedTeams = [];
          await this.loadUnmatchedTeams();
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to bulk approve teams'
          });
        }
      }
    });
  }

  async bulkReject(): Promise<void> {
    const rejectableTeams = this.selectedTeams.filter(t => t.status === 'pending');

    if (rejectableTeams.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Teams',
        detail: 'No rejectable teams selected'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Reject ${rejectableTeams.length} selected teams?`,
      header: 'Bulk Reject',
      icon: 'pi pi-times',
      accept: async () => {
        try {
          // TODO: Call bulk reject API
          await new Promise(resolve => setTimeout(resolve, 2000));

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${rejectableTeams.length} teams rejected`
          });

          this.selectedTeams = [];
          await this.loadUnmatchedTeams();
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to bulk reject teams'
          });
        }
      }
    });
  }

  viewTeamDetails(team: UnmatchedTeam): void {
    this.selectedTeamForDetails = team;
    this.showDetailsDialog = true;
  }

  onSearchChange(): void {
    // Trigger filtering
  }

  onFilterChange(): void {
    // Trigger filtering
  }

  getConfidenceSeverity(confidence: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (confidence) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'danger';
      default: return 'info';
    }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'matched': return 'success';
      case 'pending': return 'warning';
      case 'reviewing': return 'info';
      case 'rejected': return 'danger';
      default: return 'info';
    }
  }
}