import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { type Game } from '@app/models';
import { GameStatus } from '@app/models-enum';
import { TranslateModule } from '@ngx-translate/core';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DataViewModule } from 'primeng/dataview';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  setsWon: number;
  setsLost: number;
  setWinRate: number;
  pointsWon: number;
  pointsLost: number;
  pointWinRate: number;
  lastGame?: Game;
  recentForm: ('W' | 'L')[];
  tournaments: number;
}

@Component({
  selector: 'app-player-head-to-head',
  imports: [
    DecimalPipe,
    RouterModule,
    TranslateModule,
    CardModule,
    DataViewModule,
    TableModule,
    TagModule,
    ButtonModule,
    ProgressBarModule,
    AvatarModule,
    BadgeModule,
    TooltipModule,
    DatePipe,
  ],
  templateUrl: './player-head-to-head.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerHeadToHeadComponent {
  games = input.required<Game[]>();
  playerId = input.required<string>();

  headToHeadRecords = computed(() => {
    const games = this.games().filter((game) => game.status === GameStatus.NORMAL && game.gamePlayerMemberships);

    const recordsMap = new Map<string, HeadToHeadRecord>();

    games.forEach((game) => {
      const playerId = this.playerId();
      const playerMembership = game.gamePlayerMemberships?.find((gpm) => gpm.gamePlayer.id === playerId);

      if (!playerMembership) return;

      // Get opponents
      const opponentMemberships = game.gamePlayerMemberships?.filter((gpm) => gpm.gamePlayer.id !== playerId) || [];

      opponentMemberships.forEach((opponentMembership) => {
        const opponentId = opponentMembership.gamePlayer.id;
        const opponentName = opponentMembership.gamePlayer.fullName;

        if (!recordsMap.has(opponentId)) {
          recordsMap.set(opponentId, {
            opponentId,
            opponentName,
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            winRate: 0,
            setsWon: 0,
            setsLost: 0,
            setWinRate: 0,
            pointsWon: 0,
            pointsLost: 0,
            pointWinRate: 0,
            recentForm: [],
            tournaments: 0,
          });
        }

        const record = recordsMap.get(opponentId)!;
        record.gamesPlayed++;

        const isWinner = game.winner === playerMembership.team;
        if (isWinner) {
          record.gamesWon++;
          record.recentForm.unshift('W');
        } else {
          record.gamesLost++;
          record.recentForm.unshift('L');
        }

        // Keep only last 5 results
        if (record.recentForm.length > 5) {
          record.recentForm = record.recentForm.slice(0, 5);
        }

        // Calculate sets and points
        const sets = [
          { team1: game.set1Team1, team2: game.set1Team2 },
          { team1: game.set2Team1, team2: game.set2Team2 },
          { team1: game.set3Team1, team2: game.set3Team2 },
        ].filter((set) => set.team1 !== null && set.team2 !== null);

        sets.forEach((set) => {
          const playerPoints = playerMembership.team === 1 ? set.team1! : set.team2!;
          const opponentPoints = playerMembership.team === 1 ? set.team2! : set.team1!;

          record.pointsWon += playerPoints;
          record.pointsLost += opponentPoints;

          if (playerPoints > opponentPoints) {
            record.setsWon++;
          } else {
            record.setsLost++;
          }
        });

        // Update last game
        if (!record.lastGame || (game.playedAt && record.lastGame.playedAt && new Date(game.playedAt) > new Date(record.lastGame.playedAt))) {
          record.lastGame = game;
        }
      });
    });

    // Calculate rates and sort
    return Array.from(recordsMap.values())
      .map((record) => ({
        ...record,
        winRate: record.gamesPlayed > 0 ? (record.gamesWon / record.gamesPlayed) * 100 : 0,
        setWinRate: record.setsWon + record.setsLost > 0 ? (record.setsWon / (record.setsWon + record.setsLost)) * 100 : 0,
        pointWinRate: record.pointsWon + record.pointsLost > 0 ? (record.pointsWon / (record.pointsWon + record.pointsLost)) * 100 : 0,
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  });

  favorableMatchups = computed(() => {
    return this.headToHeadRecords().filter((record) => record.winRate > 50).length;
  });

  difficultMatchups = computed(() => {
    return this.headToHeadRecords().filter((record) => record.winRate < 50).length;
  });

  bestOpponent = computed(() => {
    return (
      this.headToHeadRecords()
        .filter((record) => record.gamesPlayed >= 3)
        .sort((a, b) => b.winRate - a.winRate)[0] || null
    );
  });

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  getWinRateSeverity(winRate: number): 'success' | 'warn' | 'danger' | 'info' {
    if (winRate >= 70) return 'success';
    if (winRate >= 50) return 'info';
    if (winRate >= 30) return 'warn';
    return 'danger';
  }
}
