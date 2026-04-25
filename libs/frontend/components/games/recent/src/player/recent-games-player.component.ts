import { AfterViewInit, Component, ElementRef, OnDestroy, afterRenderEffect, computed, effect, inject, input, signal, viewChild } from '@angular/core';

import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TierBadgeComponent } from '@app/frontend-components/tier-badge';
import { IS_MOBILE } from '@app/frontend-utils';
import { DayjsFormatPipe } from '@app/frontend-utils/dayjs/fmt';
import { Game } from '@app/models';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { PlayerRecentGamesService } from './recent-games-player.service';
@Component({
  selector: 'app-recent-games-player',
  imports: [
    NgClass,
    DayjsFormatPipe,
    RouterLink,
    FormsModule,
    SkeletonModule,
    ButtonModule,
    SelectButtonModule,
    TagModule,
    TranslateModule,
    TierBadgeComponent,
  ],
  templateUrl: './recent-games-player.component.html',
  styleUrl: './recent-games-player.component.scss',
})
export class RecentGamesPlayerComponent implements AfterViewInit, OnDestroy {
  for = input.required<string | string[]>();
  isMobile = inject(IS_MOBILE);
  private readonly translate = inject(TranslateService);

  readonly scrollSentinel = viewChild<ElementRef>('scrollSentinel');
  private intersectionObserver?: IntersectionObserver;

  // Track when we should scroll and animate new games
  private pendingScrollToIndex = signal<number | null>(null);

  private readonly _playerGamesService = new PlayerRecentGamesService();

  games = this._playerGamesService.games;
  loading = this._playerGamesService.loading;
  loadingMore = this._playerGamesService.loadingMore;
  hasMore = this._playerGamesService.hasMore;

  /** Selected game type filter: 'all' | 'S' | 'D' | 'MX'. */
  readonly selectedGameType = signal<'all' | 'S' | 'D' | 'MX'>('all');

  /** Server-backed counts of played games per game type. */
  readonly gameTypeCounts = this._playerGamesService.counts;

  /** Options for the p-selectbutton filter; labels include counts. */
  readonly filterOptions = computed(() => {
    const counts = this.gameTypeCounts();
    const t = (key: string) => this.translate.instant(key);
    return [
      { label: `${t('all.game.filter.all')} · ${counts.total}`, value: 'all' as const },
      { label: `${t('all.game.filter.singles')} · ${counts.singles}`, value: 'S' as const },
      { label: `${t('all.game.filter.doubles')} · ${counts.doubles}`, value: 'D' as const },
      { label: `${t('all.game.filter.mixed')} · ${counts.mixed}`, value: 'MX' as const },
    ];
  });

  /** Games filtered by the selected game type. */
  readonly filteredGames = computed(() => {
    const type = this.selectedGameType();
    const all = this.games();
    return type === 'all' ? all : all.filter((g) => g?.gameType === type);
  });

  selectGameType(type: 'all' | 'S' | 'D' | 'MX'): void {
    this.selectedGameType.set(type);
  }

  /** IDs of games whose expanded panel is open. */
  private readonly expandedIds = signal<Set<string>>(new Set());

  isExpanded(gameId: string | undefined | null): boolean {
    if (!gameId) return false;
    return this.expandedIds().has(gameId);
  }

  toggleExpanded(gameId: string | undefined | null, event?: Event): void {
    if (!gameId) return;
    event?.stopPropagation();
    this.expandedIds.update((s) => {
      const next = new Set(s);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  }

  /** Members of one team on a game; preserves ordering and excludes missing players. */
  getTeamMembers(game: Game, team: 1 | 2) {
    return (game?.gamePlayerMemberships ?? []).filter((m) => m?.team === team);
  }

  constructor() {
    effect(() => {
      // take the first playerId if multiple are provided
      let id = this.for();
      if (Array.isArray(id)) {
        id = id[0];
      }

      // Set page size and reset pagination when player changes
      this._playerGamesService.setPageSize(this.isMobile() ? 5 : 10);
      this._playerGamesService.filter.patchValue({ playerId: id, take: this.isMobile() ? 5 : 10 });
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
      if (!this.isMobile() && this.scrollSentinel()) {
        this.setupIntersectionObserver();
      }
    });
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private setupIntersectionObserver(): void {
    const scrollSentinel = this.scrollSentinel();
    if (!scrollSentinel) return;

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

    this.intersectionObserver.observe(scrollSentinel.nativeElement);
  }

  /**
   * Load more games (for both infinite scroll and load more button)
   */
  async loadMore(): Promise<void> {
    const currentGameCount = this.games().length;

    // Wait for the service to load more games
    await this._playerGamesService.loadMore();

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
    return team1Score !== undefined && team2Score !== undefined && (team1Score > 0 || team2Score > 0);
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
   * Checks if a player is the current player being viewed
   * @param playerId The player ID to check
   * @returns true if this is the current player
   */
  isCurrentPlayer(playerId: string): boolean {
    const currentPlayerId = Array.isArray(this.for()) ? this.for()[0] : this.for();
    return playerId === currentPlayerId;
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
   * Gets ranking points for a specific player in a game
   * @param game The game object
   * @param playerId The player ID
   * @returns Ranking points for the player or 0 if not found
   */
  getPlayerPoints(game: Game, playerId: string): number {
    if (!game?.rankingPoints) return 0;

    const rankingPoint = game.rankingPoints.find((rp) => rp.playerId === playerId);
    return rankingPoint?.points || 0;
  }

  /**
   * Determines if a team gained or lost points
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns 'gain' | 'loss' | 'neutral'
   */
  getPointsDirection(game: Game, team: number): 'gain' | 'loss' | 'neutral' {
    const points = this.getTeamPoints(game, team);
    if (points > 0) return 'gain';
    if (points < 0) return 'loss';
    return 'neutral';
  }

  /**
   * Gets the appropriate icon for points change
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns Icon class string
   */
  getPointsIcon(game: Game, team: number): string {
    const direction = this.getPointsDirection(game, team);
    switch (direction) {
      case 'gain':
        return 'pi pi-arrow-up';
      case 'loss':
        return 'pi pi-arrow-down';
      default:
        return 'pi pi-minus';
    }
  }

  /**
   * Gets the appropriate color class for points
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns Color class string
   */
  getPointsColorClass(game: Game, team: number): string {
    const direction = this.getPointsDirection(game, team);
    switch (direction) {
      case 'gain':
        return 'text-green-600 dark:text-green-400';
      case 'loss':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-color-secondary';
    }
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
   * Gets the magnitude description for points change
   * @param points The points value
   * @returns Description of the points change magnitude
   */
  getPointsMagnitude(points: number): 'small' | 'medium' | 'large' {
    const absPoints = Math.abs(points);
    if (absPoints === 0) return 'small';
    if (absPoints <= 10) return 'small';
    if (absPoints <= 25) return 'medium';
    return 'large';
  }

  /**
   * Gets a simplified styling class for points badge
   * @param game The game object
   * @param team Team number (1 or 2)
   * @returns CSS class for enhanced styling
   */
  getPointsEnhancedStyling(game: Game, team: number): string {
    // This method is kept for backward compatibility but styling is now handled in CSS
    return '';
  }

  /**
   * Gets the player's level for the game based on game type
   * @param game The game object
   * @param playerId The player ID
   * @returns The player's level for this game type or null if not found
   */
  getPlayerLevel(game: Game, playerId: string): number | null {
    if (!game?.gamePlayerMemberships || !game?.gameType) return null;

    const membership = game.gamePlayerMemberships.find((m) => m.gamePlayer?.id === playerId);

    if (!membership) return null;

    // Map gameType to the appropriate level field
    switch (game.gameType) {
      case 'S': // Singles
        return membership.single ?? null;
      case 'D': // Doubles
        return membership.double ?? null;
      case 'MX': // Mixed Doubles
        return membership.mix ?? null;
      default:
        return null;
    }
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
   * Gets the home team name for a competition game
   * @param game The game object
   * @returns Home team name, abbreviation, or 'Home' as fallback
   */
  getHomeTeamName(game: Game): string {
    const homeTeam = game?.competitionEncounter?.homeTeam;
    return homeTeam?.name || homeTeam?.abbreviation || 'Home';
  }

  /**
   * Gets the away team name for a competition game
   * @param game The game object
   * @returns Away team name, abbreviation, or 'Away' as fallback
   */
  getAwayTeamName(game: Game): string {
    const awayTeam = game?.competitionEncounter?.awayTeam;
    return awayTeam?.name || awayTeam?.abbreviation || 'Away';
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
    // This is a simplified approach - in practice, this mapping might need more logic
    // based on how the game data is structured in your system
    return team === 1 ? this.getHomeTeamName(game) : this.getAwayTeamName(game);
  }

  /**
   * Gets the team number (1 or 2) that the current player is on
   * @param game The game object
   * @returns Team number or null if not found
   */
  getCurrentPlayerTeam(game: Game): number | null {
    if (!game?.gamePlayerMemberships) return null;

    const currentPlayerId = Array.isArray(this.for()) ? this.for()[0] : this.for();
    const membership = game.gamePlayerMemberships.find((m) => m.gamePlayer?.id === currentPlayerId);

    return membership?.team ?? null;
  }

  /**
   * Checks if the current player won the game
   * @param game The game object
   * @returns true if won, false if lost, null if no winner or player not found
   */
  didCurrentPlayerWin(game: Game): boolean | null {
    const playerTeam = this.getCurrentPlayerTeam(game);
    if (playerTeam === null || !game.winner) return null;

    return game.winner === playerTeam;
  }

  /**
   * Gets the current player's points for this game
   * @param game The game object
   * @returns Points for the current player
   */
  getCurrentPlayerPoints(game: Game): number {
    const forValue = this.for();
    const currentPlayerId = Array.isArray(forValue) ? forValue[0] : forValue;
    return this.getPlayerPoints(game, currentPlayerId);
  }
}
