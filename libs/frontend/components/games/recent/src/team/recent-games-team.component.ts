import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  afterRenderEffect,
  signal,
} from '@angular/core';

import { IS_MOBILE } from '@app/frontend-utils';
import { Game } from '@app/models';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { TeamRecentGamesService } from './recent-games-team.service';
import { DividerModule } from 'primeng/divider';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TranslateModule } from '@ngx-translate/core';
import { DayjsFormatPipe } from '@app/ngx-dayjs/fmt';

@Component({
  selector: 'app-recent-games-team',
  imports: [
    DayjsFormatPipe,
    CardModule,
    ChipModule,
    ProgressBarModule,
    DividerModule,
    RouterLink,
    SkeletonModule,
    ButtonModule,
    BadgeModule,
    TranslateModule,
  ],
  templateUrl: './recent-games-team.component.html',
  styleUrl: './recent-games-team.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentGamesTeamComponent implements AfterViewInit, OnDestroy {
  for = input.required<string | string[]>();
  isMobile = inject(IS_MOBILE);

  @ViewChild('scrollSentinel', { static: false }) scrollSentinel?: ElementRef;
  private intersectionObserver?: IntersectionObserver;

  // Track when we should scroll and animate new games
  private pendingScrollToIndex = signal<number | null>(null);

  private readonly _teamGamesService = new TeamRecentGamesService();

  games = this._teamGamesService.games;
  loading = this._teamGamesService.loading;
  loadingMore = this._teamGamesService.loadingMore;
  hasMore = this._teamGamesService.hasMore;

  constructor() {
    effect(() => {
      // Convert single ID to array if needed
      let teamIds = this.for();
      if (typeof teamIds === 'string') {
        teamIds = [teamIds];
      }

      // Set page size and reset pagination when teams change
      this._teamGamesService.setPageSize(this.isMobile() ? 5 : 10);
      this._teamGamesService.filter.patchValue({ teamIds: teamIds, take: this.isMobile() ? 5 : 10 });
    });

    // Effect to handle scrolling after render
    afterRenderEffect(() => {
      const scrollToIndex = this.pendingScrollToIndex();
      if (scrollToIndex !== null && this.isMobile()) {
        const gameElements = document.querySelectorAll('.game-card');
        const totalGames = this.games().length;

        if (gameElements.length >= totalGames && totalGames > scrollToIndex) {
          // Scroll to the first newly added game
          const firstNewGame = gameElements[scrollToIndex];
          if (firstNewGame) {
            firstNewGame.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }

          // Clear the pending scroll
          this.pendingScrollToIndex.set(null);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Set up intersection observer for infinite scroll on large screens
    setTimeout(() => {
      if (!this.isMobile() && this.scrollSentinel) {
        this.setupIntersectionObserver();
      }
    });
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private setupIntersectionObserver(): void {
    if (!this.scrollSentinel) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && this.hasMore() && !this.loading() && !this.loadingMore()) {
            this.loadMore();
          }
        });
      },
      {
        rootMargin: '100px', // Load more when sentinel is 100px from viewport
      },
    );

    this.intersectionObserver.observe(this.scrollSentinel.nativeElement);
  }

  /**
   * Load more games (for both infinite scroll and load more button)
   */
  async loadMore(): Promise<void> {
    const currentGameCount = this.games().length;

    // Wait for the service to load more games
    await this._teamGamesService.loadMore();

    // On mobile, scroll to the newly loaded games
    if (this.isMobile() && this.games().length > currentGameCount) {
      this.pendingScrollToIndex.set(currentGameCount);
    }
  }

  /**
   * Checks if a set was actually played
   * @param team1Score Score of team 1
   * @param team2Score Score of team 2
   * @returns true if the set was played (both scores are defined)
   */
  isSetPlayed(team1Score: number | undefined, team2Score: number | undefined): boolean {
    return team1Score !== undefined && team2Score !== undefined && team1Score > 0 && team2Score > 0;
  }

  /**
   * Determines which team won a specific set
   * @param team1Score Score of team 1
   * @param team2Score Score of team 2
   * @returns 1 if team 1 won, 2 if team 2 won, 0 if tie
   */
  getSetWinner(team1Score: number | undefined, team2Score: number | undefined): number {
    if (!this.isSetPlayed(team1Score, team2Score)) return 0;
    if ((team1Score ?? 0) > (team2Score ?? 0)) return 1;
    if ((team2Score ?? 0) > (team1Score ?? 0)) return 2;
    return 0;
  }

  /**
   * Determines which team won the overall match
   * @param game The game object
   * @returns 1 if team 1 won, 2 if team 2 won, 0 if tie
   */
  getMatchWinner(game: Game): number {
    let team1Wins = 0;
    let team2Wins = 0;

    // Only count sets that were actually played
    if (this.isSetPlayed(game.set1Team1, game.set1Team2)) {
      const set1Winner = this.getSetWinner(game.set1Team1, game.set1Team2);
      if (set1Winner === 1) team1Wins++;
      if (set1Winner === 2) team2Wins++;
    }

    if (this.isSetPlayed(game.set2Team1, game.set2Team2)) {
      const set2Winner = this.getSetWinner(game.set2Team1, game.set2Team2);
      if (set2Winner === 1) team1Wins++;
      if (set2Winner === 2) team2Wins++;
    }

    if (this.isSetPlayed(game.set3Team1, game.set3Team2)) {
      const set3Winner = this.getSetWinner(game.set3Team1, game.set3Team2);
      if (set3Winner === 1) team1Wins++;
      if (set3Winner === 2) team2Wins++;
    }

    if (team1Wins > team2Wins) return 1;
    if (team2Wins > team1Wins) return 2;
    return 0;
  }

  /**
   * Calculates total points for a team using ranking points
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns Total points for the team
   */
  getTeamPoints(game: Game, team: number): number {
    if (!game?.gamePlayerMemberships) return 0;

    // Get player IDs for the specified team
    const teamPlayerIds = game.gamePlayerMemberships
      .filter((membership) => membership.team === team)
      .map((membership) => membership.gamePlayer?.id)
      .filter((id) => id !== undefined);

    // Sum ranking points for players in this team
    return (
      game.rankingPoints
        ?.filter((rankingPoint) => teamPlayerIds.includes(rankingPoint.playerId))
        .reduce((total, rankingPoint) => total + (rankingPoint.points || 0), 0) || 0
    );
  }

  /**
   * Formats points with appropriate prefix
   * @param points The points value
   * @returns Formatted string with + or - prefix
   */
  formatPoints(points: number): string {
    if (points > 0) return `+${points}`;
    if (points < 0) return `${points}`;
    return `${points}`;
  }

  /**
   * Checks if a game is a competition game
   * @param game The game object
   * @returns true if the game has competition encounter information
   */
  isCompetitionGame(game: Game): boolean {
    return !!game?.competitionEncounter;
  }

  /**
   * Gets the team name for a specific team number
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns Team name based on whether it's home or away
   */
  getTeamName(game: Game, team: number): string {
    if (!this.isCompetitionGame(game)) return '';

    // For competitions, we need to determine which team (1 or 2) corresponds to home/away
    const homeTeam = game?.competitionEncounter?.homeTeam;
    const awayTeam = game?.competitionEncounter?.awayTeam;

    const homeName = homeTeam?.name || homeTeam?.abbreviation || 'Home';
    const awayName = awayTeam?.name || awayTeam?.abbreviation || 'Away';

    return team === 1 ? homeName : awayName;
  }
}
