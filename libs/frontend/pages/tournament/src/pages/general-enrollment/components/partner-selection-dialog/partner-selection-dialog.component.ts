import { Component, OnInit, inject } from '@angular/core';

import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import type { TournamentSubEvent, Player } from '@app/models';

export interface PartnerDialogData {
  subEvent: TournamentSubEvent;
}

export interface PartnerDialogResult {
  partnerId?: string;
  notes?: string;
}

const SEARCH_PARTNERS = gql`
  query SearchPartners($query: String!) {
    searchPartners(query: $query) {
      id
      firstName
      lastName
      fullName
    }
  }
`;

@Component({
  selector: 'app-partner-selection-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    AutoCompleteModule,
    TranslateModule
],
  templateUrl: './partner-selection-dialog.component.html',
})
export class PartnerSelectionDialogComponent implements OnInit {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly apollo = inject(Apollo);

  form = new FormGroup({
    partner: new FormControl<Player | null>(null),
    notes: new FormControl<string>('', [Validators.maxLength(500)]),
  });

  subEvent?: TournamentSubEvent;
  filteredPartners: Player[] = [];

  ngOnInit(): void {
    this.subEvent = this.config.data?.subEvent;
  }

  /**
   * Search for partners via GraphQL
   */
  searchPartners(event: { query: string }): void {
    const query = event.query?.trim();

    if (!query || query.length < 2) {
      this.filteredPartners = [];
      return;
    }

    this.apollo
      .query<{ searchPartners: Player[] }>({
        query: SEARCH_PARTNERS,
        variables: { query },
      })
      .subscribe({
        next: (result) => {
          this.filteredPartners = result.data?.searchPartners || [];
        },
        error: (error) => {
          console.error('Partner search error:', error);
          this.filteredPartners = [];
        },
      });
  }

  /**
   * Cancel dialog
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    if (this.form.valid) {
      const partner = this.form.value.partner;
      const result: PartnerDialogResult = {
        partnerId: partner?.id || undefined,
        notes: this.form.value.notes || undefined,
      };
      this.dialogRef.close(result);
    }
  }

  /**
   * Skip partner selection
   */
  onSkip(): void {
    const result: PartnerDialogResult = {
      notes: this.form.value.notes || undefined,
    };
    this.dialogRef.close(result);
  }
}
