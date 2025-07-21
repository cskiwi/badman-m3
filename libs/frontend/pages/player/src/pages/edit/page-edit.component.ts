import { Component, computed, inject, signal, effect, resource } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { lastValueFrom } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';

import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { Claim, Player } from '@app/models';
import { MessageService } from 'primeng/api';
import { injectParams } from 'ngxtension/inject-params';

const GET_PLAYER_WITH_CLAIMS = gql`
  query GetPlayerWithClaims($id: ID!) {
    player(id: $id) {
      id
      fullName
      claims {
        id
        name
        description
        type
      }
    }
  }
`;

const GET_GLOBAL_CLAIMS = gql`
  query GetGlobalClaims {
    claims(args: { where: { type: { eq: "global" } } }) {
      id
      name
      description
      type
      category
    }
  }
`;

const UPDATE_PLAYER_CLAIMS = gql`
  mutation UpdatePlayerClaims($playerId: ID!, $claimIds: [ID!]!) {
    updatePlayerClaims(playerId: $playerId, claimIds: $claimIds) {
      id
      claims {
        id
        name
        description
        type
      }
    }
  }
`;

@Component({
  selector: 'app-page-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    CheckboxModule,
    MessageModule,
    ProgressBarModule,
    ToastModule,
    PageHeaderComponent,
  ],
  providers: [MessageService],
  templateUrl: './page-edit.component.html',
  styleUrl: './page-edit.component.scss',
})
export class PageEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  // Get player ID from route
  private readonly playerId = injectParams('playerId');

  // Loading and error states
  readonly loadingPlayer = signal(false);
  readonly loadingClaims = signal(false);
  readonly savingClaims = signal(false);
  readonly error = signal<string | null>(null);

  // Player data resource
  private readonly playerResource = resource({
    params: () => ({ playerId: this.playerId() }),
    loader: async ({ params }) => {
      if (!params.playerId) return null;

      this.loadingPlayer.set(true);
      this.error.set(null);

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ player: Player }>({
            query: GET_PLAYER_WITH_CLAIMS,
            variables: { id: params.playerId },
          }),
        );

        return result?.data?.player || null;
      } catch (err) {
        this.error.set('Failed to load player data');
        return null;
      } finally {
        this.loadingPlayer.set(false);
      }
    },
  });

  // Global claims resource
  private readonly globalClaimsResource = resource({
    loader: async () => {
      this.loadingClaims.set(true);

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ claims: Claim[] }>({
            query: GET_GLOBAL_CLAIMS,
          }),
        );

        return result?.data?.claims || [];
      } catch (err) {
        this.error.set('Failed to load claims data');
        return [];
      } finally {
        this.loadingClaims.set(false);
      }
    },
  });

  // Public computed properties
  readonly player = computed(() => this.playerResource.value());
  readonly globalClaims = computed(() => this.globalClaimsResource.value() || []);
  readonly claimsByCategory = computed(() => {
    const claims = this.globalClaims();
    const grouped = new Map<string, Claim[]>();
    
    claims.forEach(claim => {
      const category = claim.category || 'Other';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(claim);
    });
    
    // Convert to array and sort categories
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, claims]) => ({
        category,
        claims: claims.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      }));
  });
  readonly loading = computed(() => this.loadingPlayer() || this.loadingClaims());
  readonly saving = computed(() => this.savingClaims());

  // Form setup
  readonly claimsForm: FormGroup;

  constructor() {
    this.claimsForm = this.fb.group({});

    // Set up form controls when claims are loaded
    effect(() => {
      const claims = this.globalClaims();
      if (claims.length > 0) {
        this.setupFormControls(claims);
      }
    });

    // Update form values when player data is loaded
    effect(() => {
      const player = this.player();
      if (player?.claims) {
        this.updateFormValues(player.claims);
      }
    });
  }

  private setupFormControls(claims: Claim[]): void {
    claims.forEach((claim) => {
      if (claim.id) {
        this.claimsForm.addControl(claim.id, this.fb.control(false));
      }
    });
  }

  private updateFormValues(playerClaims: Claim[]): void {
    // Reset all controls to false first
    Object.keys(this.claimsForm.controls).forEach((claimId) => {
      this.claimsForm.get(claimId)?.setValue(false);
    });

    // Set true for claims the player has
    playerClaims.forEach((claim) => {
      if (claim.id && this.claimsForm.get(claim.id)) {
        this.claimsForm.get(claim.id)?.setValue(true);
      }
    });
  }

  selectAll(): void {
    Object.keys(this.claimsForm.controls).forEach((claimId) => {
      this.claimsForm.get(claimId)?.setValue(true);
    });
  }

  selectNone(): void {
    Object.keys(this.claimsForm.controls).forEach((claimId) => {
      this.claimsForm.get(claimId)?.setValue(false);
    });
  }

  selectAllInCategory(categoryName: string): void {
    const categoryGroup = this.claimsByCategory().find(group => group.category === categoryName);
    if (categoryGroup) {
      categoryGroup.claims.forEach(claim => {
        if (claim.id) {
          this.claimsForm.get(claim.id)?.setValue(true);
        }
      });
    }
  }

  selectNoneInCategory(categoryName: string): void {
    const categoryGroup = this.claimsByCategory().find(group => group.category === categoryName);
    if (categoryGroup) {
      categoryGroup.claims.forEach(claim => {
        if (claim.id) {
          this.claimsForm.get(claim.id)?.setValue(false);
        }
      });
    }
  }

  async onSubmit(): Promise<void> {
    const player = this.player();
    if (!player?.id) {
      this.error.set('No player selected');
      return;
    }

    this.savingClaims.set(true);
    this.error.set(null);

    try {
      // Get selected claim IDs
      const selectedClaimIds = Object.entries(this.claimsForm.value)
        .filter(([_, selected]) => selected)
        .map(([claimId]) => claimId);

      await lastValueFrom(
        this.apollo.mutate({
          mutation: UPDATE_PLAYER_CLAIMS,
          variables: {
            playerId: player.id,
            claimIds: selectedClaimIds,
          },
          refetchQueries: [
            {
              query: GET_PLAYER_WITH_CLAIMS,
              variables: { id: player.id },
            },
          ],
        }),
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Player claims updated successfully',
      });

      // Navigate back to player detail page
      this.router.navigate(['..'], { relativeTo: this.route });
    } catch (err) {
      this.error.set('Failed to update player claims');
    } finally {
      this.savingClaims.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
