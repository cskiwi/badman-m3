import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { Player } from '@app/models';
import { ClubPlayersTabService } from './club-players-tab.service';

@Component({
  selector: 'app-club-players-tab',
  standalone: true,
  providers: [ClubPlayersTabService],
  imports: [
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    MultiSelectModule,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './club-players-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubPlayersTabComponent {
  readonly service = inject(ClubPlayersTabService);

  clubId = input.required<string>();
  season = input.required<number>();

  searchQuery = signal<string>('');
  selectedTeamIds = signal<string[]>([]);

  filteredPlayers = computed(() => {
    const players = this.service.players();
    const selected = this.selectedTeamIds();
    const query = this.searchQuery().toLowerCase().trim();

    return players.filter((player) => {
      const matchesTeam = selected.length === 0 || player.teamPlayerMemberships?.some((m) => selected.includes(m.team?.id ?? ''));
      const matchesSearch = !query || (player.fullName || '').toLowerCase().includes(query);
      return matchesTeam && matchesSearch;
    });
  });

  getPlayerInitials(player: Player): string {
    if (!player.firstName && !player.lastName) return '?';
    return `${player.firstName?.charAt(0) ?? ''}${player.lastName?.charAt(0) ?? ''}`.toUpperCase();
  }

  constructor() {
    effect(() => {
      this.service.setClubId(this.clubId());
    });

    effect(() => {
      this.service.setSeason(this.season());
    });
  }
}
