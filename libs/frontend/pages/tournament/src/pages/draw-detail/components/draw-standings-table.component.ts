import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-draw-standings-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="standings">
      <h3 class="flex items-center gap-2 text-xl font-semibold mb-6">
        <i class="pi pi-chart-bar text-primary-500"></i>
        Standings
      </h3>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse rounded-border bg-highlight overflow-hidden">
          <thead class="bg-primary text-primary-contrast">
            <tr>
              <th class="p-3 text-left font-semibold">Position</th>
              <th class="p-3 text-left font-semibold">Player/Team</th>
              <th class="p-3 text-center font-semibold">Played</th>
              <th class="p-3 text-center font-semibold">Won</th>
              <th class="p-3 text-center font-semibold">Lost</th>
              <th class="p-3 text-center font-semibold">Games</th>
              <th class="p-3 text-center font-semibold">Sets</th>
              <th class="p-3 text-center font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            @for (standing of standings(); track standing.id) {
              <tr class="border-b border-surface-200 hover:bg-highlight-emphasis">
                <td class="p-3 font-semibold text-primary">{{ standing.position }}</td>
                <td class="p-3">
                  @if (standing.teamId) {
                    <span>Team {{ standing.teamId | slice: 0 : 8 }}</span>
                  } @else if (standing.player1 || standing.player2) {
                    <div class="flex flex-col gap-1">
                      @if (standing.player1) {
                        <span class="font-medium">{{ standing.player1.fullName }}</span>
                      }
                      @if (standing.player2) {
                        <span class="font-medium">{{ standing.player2.fullName }}</span>
                      }
                    </div>
                  } @else if (standing.player1Id || standing.player2Id) {
                    <div class="flex flex-col gap-1">
                      @if (standing.player1Id) {
                        <span class="text-xs text-muted-color">Player 1: {{ standing.player1Id | slice: 0 : 8 }}</span>
                      }
                      @if (standing.player2Id) {
                        <span class="text-xs text-muted-color">Player 2: {{ standing.player2Id | slice: 0 : 8 }}</span>
                      }
                    </div>
                  } @else {
                    <span>-</span>
                  }
                </td>
                <td class="p-3 text-center">{{ standing.played || '-' }}</td>
                <td class="p-3 text-center text-green-600 font-medium">{{ standing.won || '-' }}</td>
                <td class="p-3 text-center text-red-600 font-medium">{{ standing.lost || '-' }}</td>
                <td class="p-3 text-center text-sm">
                  @if (standing.gamesWon !== null && standing.gamesLost !== null) {
                    <span>{{ standing.gamesWon }} - {{ standing.gamesLost }}</span>
                  } @else {
                    <span>-</span>
                  }
                </td>
                <td class="p-3 text-center text-sm">
                  @if (standing.setsWon !== null && standing.setsLost !== null) {
                    <span>{{ standing.setsWon }} - {{ standing.setsLost }}</span>
                  } @else {
                    <span>-</span>
                  }
                </td>
                <td class="p-3 text-center font-semibold">{{ standing.points || '-' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class DrawStandingsTableComponent {
  standings = input.required<any[]>();
}