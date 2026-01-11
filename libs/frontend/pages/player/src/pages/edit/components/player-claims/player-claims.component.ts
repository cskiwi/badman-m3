import { Component, computed, inject, signal, effect, input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';

import { lastValueFrom } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

import { Claim, Player } from '@app/models';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@app/frontend-modules-auth/service';

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
  selector: 'app-player-claims',
  standalone: true,
  imports: [ReactiveFormsModule, CardModule, ButtonModule, CheckboxModule, MessageModule, ProgressBarModule, TranslateModule],
  templateUrl: './player-claims.component.html',
})
export class PlayerClaimsComponent {
  private readonly apollo = inject(Apollo);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);

  // Inputs
  readonly player = input<Player | null>(null);

  // Loading and error states
  readonly loadingClaims = signal(false);
  readonly savingClaims = signal(false);
  readonly error = signal<string | null>(null);

  // Global claims data
  readonly globalClaims = signal<Claim[]>([]);

  readonly claimsByCategory = computed(() => {
    const claims = this.globalClaims();
    const grouped = new Map<string, Claim[]>();

    claims.forEach((claim) => {
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
        claims: claims.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      }));
  });

  readonly loading = computed(() => this.loadingClaims());
  readonly saving = computed(() => this.savingClaims());

  // Form setup
  readonly claimsForm: FormGroup;

  constructor() {
    this.claimsForm = this.fb.group({});

    // Load claims on component init
    this.loadGlobalClaims();

    // Set up form controls when claims are loaded
    effect(() => {
      const claims = this.globalClaims();
      if (claims.length > 0) {
        this.setupFormControls(claims);
      }
    });

    // Update form values when player data changes
    effect(() => {
      const player = this.player();
      if (player?.claims) {
        this.updateFormValues(player.claims);
      }
    });

    // Handle form control disabled state based on permissions
    effect(() => {
      const canEdit = this.canEditClaims();
      Object.keys(this.claimsForm.controls).forEach((claimId) => {
        const control = this.claimsForm.get(claimId);
        if (control) {
          if (canEdit) {
            control.enable();
          } else {
            control.disable();
          }
        }
      });
    });
  }

  private async loadGlobalClaims(): Promise<void> {
    this.loadingClaims.set(true);
    this.error.set(null);

    try {
      const result = await lastValueFrom(
        this.apollo.query<{ claims: Claim[] }>({
          query: GET_GLOBAL_CLAIMS,
        }),
      );

      this.globalClaims.set(result?.data?.claims || []);
    } catch (err) {
      this.error.set('Failed to load claims data');
      this.globalClaims.set([]);
    } finally {
      this.loadingClaims.set(false);
    }
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
    const categoryGroup = this.claimsByCategory().find((group) => group.category === categoryName);
    if (categoryGroup) {
      categoryGroup.claims.forEach((claim) => {
        if (claim.id) {
          this.claimsForm.get(claim.id)?.setValue(true);
        }
      });
    }
  }

  selectNoneInCategory(categoryName: string): void {
    const categoryGroup = this.claimsByCategory().find((group) => group.category === categoryName);
    if (categoryGroup) {
      categoryGroup.claims.forEach((claim) => {
        if (claim.id) {
          this.claimsForm.get(claim.id)?.setValue(false);
        }
      });
    }
  }

  async saveClaims(): Promise<void> {
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
              query: gql`
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
              `,
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

      return Promise.resolve();
    } catch (err) {
      this.error.set('Failed to update player claims');
      return Promise.reject(err);
    } finally {
      this.savingClaims.set(false);
    }
  }

  get isDirty(): boolean {
    return this.claimsForm.dirty;
  }

  get isValid(): boolean {
    return this.claimsForm.valid;
  }

  canEditClaims(): boolean {
    const player = this.player();
    // Use AuthService for permission check
    return this.authService.hasAnyPermission(['edit-any:player', `${player?.id}_edit:player`]);
  }
}
