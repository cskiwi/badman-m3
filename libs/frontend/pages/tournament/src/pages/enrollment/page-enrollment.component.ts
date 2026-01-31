import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { AuthService } from '@app/frontend-modules-auth/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { EnrollmentService } from './page-enrollment.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Player } from '@app/models';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-page-enrollment',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    ButtonModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    AutoCompleteModule,
    MessageModule,
    SkeletonModule,
    TagModule,
    TableModule,
    TooltipModule,
    DialogModule,
  ],
  templateUrl: './page-enrollment.component.html',
  styleUrl: './page-enrollment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageEnrollmentComponent {
  private readonly auth = inject(AuthService);
  private readonly dataService = new EnrollmentService();

  readonly subEventId = injectParams('subEventId');
  readonly tournamentId = injectParams('tournamentId');

  // Form for player enrollment
  enrollForm = new FormGroup({
    preferredPartner: new FormControl<Player | null>(null),
    notes: new FormControl<string>(''),
  });

  // Form for guest enrollment
  guestForm = new FormGroup({
    guestName: new FormControl<string>('', [Validators.required, Validators.maxLength(255)]),
    guestEmail: new FormControl<string>('', [Validators.required, Validators.email]),
    guestPhone: new FormControl<string>(''),
    preferredPartner: new FormControl<Player | null>(null),
    notes: new FormControl<string>(''),
  });

  // Player search results
  playerSuggestions = signal<Player[]>([]);
  searching = signal(false);

  // Guest dialog visibility
  showGuestDialog = signal(false);

  // Selectors from service
  subEvent = this.dataService.subEvent;
  tournamentEvent = this.dataService.tournamentEvent;
  loading = this.dataService.loading;
  error = this.dataService.error;
  enrolling = this.dataService.enrolling;
  enrollError = this.dataService.enrollError;

  isEnrollmentOpen = this.dataService.isEnrollmentOpen;
  allowsGuests = this.dataService.allowsGuests;
  isDoubles = this.dataService.isDoubles;
  isFull = this.dataService.isFull;

  lookingForPartner = this.dataService.lookingForPartner;
  confirmedEnrollments = this.dataService.confirmedEnrollments;
  waitingListEnrollments = this.dataService.waitingListEnrollments;

  // Check if current user is already enrolled
  currentUserEnrollment = computed(() => {
    const userId = this.auth.user()?.id;
    if (!userId) return null;
    return this.dataService.enrollments().find((e) => e.playerId === userId);
  });

  isLoggedIn = computed(() => this.auth.loggedIn());

  constructor() {
    effect(() => {
      this.dataService.filter.get('subEventId')?.setValue(this.subEventId());
    });
  }

  // Search players for partner selection
  async searchPartners(event: AutoCompleteCompleteEvent): Promise<void> {
    this.searching.set(true);
    try {
      const results = await this.dataService.searchPlayers(event.query);
      // Filter out current user
      const userId = this.auth.user()?.id;
      this.playerSuggestions.set(results.filter((p) => p.id !== userId));
    } finally {
      this.searching.set(false);
    }
  }

  // Enroll current player
  async enroll(): Promise<void> {
    const partner = this.enrollForm.get('preferredPartner')?.value;
    const notes = this.enrollForm.get('notes')?.value || undefined;

    const result = await this.dataService.enrollPlayer(partner?.id, notes);
    if (result) {
      this.enrollForm.reset();
    }
  }

  // Open guest enrollment dialog
  openGuestDialog(): void {
    this.guestForm.reset();
    this.showGuestDialog.set(true);
  }

  // Enroll guest
  async enrollGuest(): Promise<void> {
    if (this.guestForm.invalid) return;

    const { guestName, guestEmail, guestPhone, preferredPartner, notes } = this.guestForm.value;

    const result = await this.dataService.enrollGuest(
      guestName!,
      guestEmail!,
      guestPhone || undefined,
      preferredPartner?.id,
      notes || undefined,
    );

    if (result) {
      this.showGuestDialog.set(false);
      this.guestForm.reset();
    }
  }

  // Cancel enrollment
  async cancelEnrollment(enrollmentId: string): Promise<void> {
    if (confirm('Are you sure you want to cancel your enrollment?')) {
      await this.dataService.cancelEnrollment(enrollmentId);
    }
  }

  // Get status tag severity
  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warn';
      case 'WAITING_LIST':
        return 'info';
      case 'CANCELLED':
      case 'WITHDRAWN':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
