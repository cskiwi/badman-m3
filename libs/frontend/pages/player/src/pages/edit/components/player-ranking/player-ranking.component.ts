import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { Player, RankingPlace } from '@app/models';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';

const ALL_RANKING_QUERY = gql`
  query AllRanking($id: ID!, $args: RankingPlaceArgs) {
    player(id: $id) {
      id
      rankingPlaces(args: $args) {
        id
        rankingDate
        single
        mix
        double
        singlePoints
        mixPoints
        doublePoints
        updatePossible
      }
    }
  }
`;

const NEW_RANKING_PLACE_MUTATION = gql`
  mutation NewRankingPlace($data: RankingPlaceNewInput!) {
    newRankingPlace(data: $data) {
      id
    }
  }
`;

const UPDATE_RANKING_PLACE_MUTATION = gql`
  mutation UpdateRankingPlace($data: RankingPlaceUpdateInput!) {
    updateRankingPlace(data: $data) {
      id
    }
  }
`;

const REMOVE_RANKING_PLACE_MUTATION = gql`
  mutation RemoveRankingPlace($id: ID!) {
    removeRankingPlace(id: $id)
  }
`;

@Component({
  selector: 'app-player-ranking',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AccordionModule,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    MessageModule,
    ProgressBarModule,
    ToggleSwitchModule,
    TranslateModule,
    DatePipe,
    TranslateModule,
  ],
  templateUrl: './player-ranking.component.html',
  styleUrl: './player-ranking.component.scss',
})
export class PlayerRankingComponent {
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly rankingSystemService = inject(RankingSystemService);

  readonly player = input<Player | null>(null);

  readonly loading = signal(false);
  readonly rankingGroups = signal<[RankingPlace | undefined, RankingPlace[]][]>([]);
  readonly dialogVisible = signal(false);
  readonly editingPlace = signal<Partial<RankingPlace> | null>(null);

  readonly isNewPlace = computed(() => !this.editingPlace()?.id);

  readonly editForm: FormGroup = this.fb.group({
    rankingDate: [null, Validators.required],
    updatePossible: [false],
    single: [null, [Validators.required, Validators.min(1)]],
    double: [null, [Validators.required, Validators.min(1)]],
    mix: [null, [Validators.required, Validators.min(1)]],
    singlePoints: [null],
    doublePoints: [null],
    mixPoints: [null],
  });

  constructor() {
    effect(() => {
      const player = this.player();
      const systemId = this.rankingSystemService.systemId();
      if (player?.id && systemId) {
        this.loadRankingPlaces(player.id, systemId);
      }
    });
  }

  private async loadRankingPlaces(playerId: string, systemId: string): Promise<void> {
    this.loading.set(true);
    try {
      const result = await lastValueFrom(
        this.apollo.query<{ player: { rankingPlaces: RankingPlace[] } }>({
          query: ALL_RANKING_QUERY,
          variables: {
            id: playerId,
            args: { where: [{ systemId: { eq: systemId } }] },
          },
          fetchPolicy: 'network-only',
        }),
      );

      const places = result.data?.player?.rankingPlaces ?? [];
      this.rankingGroups.set(this.groupPlaces(places));
    } finally {
      this.loading.set(false);
    }
  }

  private groupPlaces(places: RankingPlace[]): [RankingPlace | undefined, RankingPlace[]][] {
    const sorted = [...places].sort((a, b) => {
      const dateA = a.rankingDate ? new Date(a.rankingDate).getTime() : 0;
      const dateB = b.rankingDate ? new Date(b.rankingDate).getTime() : 0;
      return dateB - dateA;
    });

    const groupMap = new Map<string, RankingPlace[]>();
    let currentKey: string | null = null;

    for (const place of sorted) {
      if (place.updatePossible && place.rankingDate) {
        const key = new Date(place.rankingDate).toISOString();
        groupMap.set(key, [place]);
        currentKey = key;
      } else {
        if (currentKey && groupMap.has(currentKey)) {
          groupMap.get(currentKey)!.push(place);
        } else {
          const ungroupedKey = '__ungrouped__';
          if (!groupMap.has(ungroupedKey)) {
            groupMap.set(ungroupedKey, []);
          }
          groupMap.get(ungroupedKey)!.push(place);
        }
      }
    }

    return [...groupMap.values()].map((group) => [group.find((p) => p.updatePossible), group]);
  }

  openEditDialog(place?: RankingPlace): void {
    const systemId = this.rankingSystemService.systemId();
    const playerId = this.player()?.id;

    this.editingPlace.set(place ? { ...place, playerId, systemId } : { playerId, systemId });

    this.editForm.patchValue({
      rankingDate: place?.rankingDate ? new Date(place.rankingDate) : null,
      updatePossible: place?.updatePossible ?? false,
      single: place?.single ?? null,
      double: place?.double ?? null,
      mix: place?.mix ?? null,
      singlePoints: place?.singlePoints ?? null,
      doublePoints: place?.doublePoints ?? null,
      mixPoints: place?.mixPoints ?? null,
    });
    this.editForm.markAsPristine();
    this.dialogVisible.set(true);
  }

  async onSave(): Promise<void> {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const editing = this.editingPlace();
    if (!editing) return;

    const payload = { ...editing, ...this.editForm.value };

    try {
      if (editing.id) {
        await lastValueFrom(
          this.apollo.mutate({
            mutation: UPDATE_RANKING_PLACE_MUTATION,
            variables: { data: payload },
          }),
        );
      } else {
        await lastValueFrom(
          this.apollo.mutate({
            mutation: NEW_RANKING_PLACE_MUTATION,
            variables: { data: payload },
          }),
        );
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: editing.id ? 'Ranking place updated' : 'Ranking place created',
      });

      this.dialogVisible.set(false);
      const systemId = this.rankingSystemService.systemId();
      if (this.player()?.id && systemId) {
        await this.loadRankingPlaces(this.player()!.id!, systemId);
      }
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save ranking place',
      });
    }
  }

  async onDelete(): Promise<void> {
    const editing = this.editingPlace();
    if (!editing?.id) return;

    try {
      await lastValueFrom(
        this.apollo.mutate({
          mutation: REMOVE_RANKING_PLACE_MUTATION,
          variables: { id: editing.id },
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Ranking place removed',
      });

      this.dialogVisible.set(false);
      const systemId = this.rankingSystemService.systemId();
      if (this.player()?.id && systemId) {
        await this.loadRankingPlaces(this.player()!.id!, systemId);
      }
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to remove ranking place',
      });
    }
  }
}
