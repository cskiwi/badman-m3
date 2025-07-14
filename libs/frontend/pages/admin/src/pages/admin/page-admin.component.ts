import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { AuthService } from '@app/frontend-modules-auth/service';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

export enum IndexType {
  PLAYERS = 'players',
  CLUBS = 'clubs',
  COMPETITION_EVENTS = 'competitionEvents',
  TOURNAMENT_EVENTS = 'tournamentEvents',
}

const INDEX_ALL_MUTATION = gql`
  mutation IndexAll($input: IndexInput) {
    indexAll(input: $input) {
      message
    }
  }
`;

@Component({
  selector: 'app-page-admin',
  imports: [
    PageHeaderComponent,
    TranslateModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    MessageModule,
    ProgressBarModule,
    ToastModule,
  ],
  templateUrl: './page-admin.component.html',
  styleUrl: './page-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class PageAdminComponent {
  private readonly apollo = inject(Apollo);
  private readonly messageService = inject(MessageService);
  private readonly auth = inject(AuthService);

  // Loading and error states
  loading = signal(false);
  error = signal<string | null>(null);

  // Form for selecting index types
  indexForm = new FormGroup({
    players: new FormControl(false),
    clubs: new FormControl(false),
    competitionEvents: new FormControl(false),
    tournamentEvents: new FormControl(false),
  });

  // Check if user has admin access
  user = this.auth.user;
  hasAdminAccess = computed(() => {
    const currentUser = this.user();
    return currentUser?.hasAnyPermission?.('index:all') ?? false;
  });

  // Available index types with labels
  indexTypes = [
    { key: 'players', label: 'Players', type: IndexType.PLAYERS },
    { key: 'clubs', label: 'Clubs', type: IndexType.CLUBS },
    { key: 'competitionEvents', label: 'Competition Events', type: IndexType.COMPETITION_EVENTS },
    { key: 'tournamentEvents', label: 'Tournament Events', type: IndexType.TOURNAMENT_EVENTS },
  ];

  selectAll() {
    this.indexForm.patchValue({
      players: true,
      clubs: true,
      competitionEvents: true,
      tournamentEvents: true,
    });
  }

  selectNone() {
    this.indexForm.patchValue({
      players: false,
      clubs: false,
      competitionEvents: false,
      tournamentEvents: false,
    });
  }

  async onSubmit() {
    if (!this.hasAdminAccess()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'You do not have permission to perform indexing operations.',
      });
      return;
    }

    const formValue = this.indexForm.value;
    const selectedTypes: IndexType[] = [];

    if (formValue.players) selectedTypes.push(IndexType.PLAYERS);
    if (formValue.clubs) selectedTypes.push(IndexType.CLUBS);
    if (formValue.competitionEvents) selectedTypes.push(IndexType.COMPETITION_EVENTS);
    if (formValue.tournamentEvents) selectedTypes.push(IndexType.TOURNAMENT_EVENTS);

    if (selectedTypes.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Selection',
        detail: 'Please select at least one type to index.',
      });
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await this.apollo
        .mutate({
          mutation: INDEX_ALL_MUTATION,
          variables: {
            input: {
              types: selectedTypes,
            },
          },
        })
        .toPromise();

      if (result?.data?.indexAll?.message) {
        this.messageService.add({
          severity: 'success',
          summary: 'Indexing Complete',
          detail: result.data.indexAll.message,
        });
      }
    } catch (error) {
      console.error('Indexing error:', error);
      this.error.set('Failed to perform indexing operation. Please try again.');
      this.messageService.add({
        severity: 'error',
        summary: 'Indexing Failed',
        detail: 'An error occurred while performing the indexing operation.',
      });
    } finally {
      this.loading.set(false);
    }
  }
}
