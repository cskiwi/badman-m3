import { Component, OnInit, OnDestroy, computed, signal, inject } from '@angular/core';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { TournamentSubEvent } from '@app/models';
import { GameType } from '@app/models-enum';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { PageGeneralEnrollmentService } from './page-general-enrollment.service';
import { SubEventSelectionGridComponent } from './components/sub-event-selection-grid/sub-event-selection-grid.component';
import { EnrollmentCartComponent } from './components/enrollment-cart/enrollment-cart.component';
import { EnrollmentFiltersComponent } from './components/enrollment-filters/enrollment-filters.component';
import { PartnerSelectionDialogComponent } from './components/partner-selection-dialog/partner-selection-dialog.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-page-general-enrollment',
  standalone: true,
  imports: [
    RouterModule,
    ProgressSpinnerModule,
    ButtonModule,
    BadgeModule,
    ToastModule,
    TranslateModule,
    PageHeaderComponent,
    SubEventSelectionGridComponent,
    EnrollmentCartComponent,
    EnrollmentFiltersComponent
],
  providers: [MessageService, DialogService],
  templateUrl: './page-general-enrollment.component.html',
})
export class PageGeneralEnrollmentComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Inject dependencies first
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(PageGeneralEnrollmentService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  private readonly translate = inject(TranslateService);
  private dialogRef?: DynamicDialogRef | null;

  // Signals from service (after service is injected)
  readonly loading = this.service.loading;
  readonly filteredSubEvents = this.service.filteredSubEvents;
  readonly cartItems = this.service.cartItems;
  readonly cartCount = this.service.cartCount;
  readonly cartId = this.service.cartId;
  readonly filters = this.service.filters;
  readonly userRanking = this.service.userRanking;
  readonly userGender = this.service.userGender;

  // Computed selected IDs for grid
  readonly selectedIds = computed(() => this.cartItems().map(item => item.subEventId));

  // Local state
  readonly tournamentId = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  ngOnInit(): void {
    // Get tournament ID from route
    const tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (tournamentId) {
      this.tournamentId.set(tournamentId);
      this.service.init(tournamentId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle sub-event selection
   */
  onSubEventSelect(subEvent: TournamentSubEvent): void {
    // Check if it requires partner selection for doubles or mixed
    if (subEvent.gameType === GameType.D || subEvent.gameType === GameType.MX) {
      this.openPartnerDialog(subEvent);
    } else {
      this.service.addToCart(subEvent);
      this.showMessage(this.translate.instant('all.enrollment.messages.addedToCart'));
    }
  }

  /**
   * Handle sub-event removal
   */
  onSubEventRemove(subEventId: string): void {
    const cartId = this.cartId();
    if (cartId) {
      this.service.removeFromCart(subEventId, cartId);
      this.showMessage(this.translate.instant('all.enrollment.messages.removedFromCart'));
    }
  }

  /**
   * Open partner selection dialog
   */
  private openPartnerDialog(subEvent: TournamentSubEvent): void {
    this.dialogRef = this.dialogService.open(PartnerSelectionDialogComponent, {
      header: this.translate.instant('all.enrollment.partnerSelection.title'),
      width: '500px',
      data: { subEvent },
    });

    if (this.dialogRef) {
      this.dialogRef.onClose.subscribe((result: { partnerId?: string; notes?: string } | null) => {
        if (result) {
          this.service.addToCart(
            subEvent,
            result.partnerId,
            result.notes,
          );
          this.showMessage(this.translate.instant('all.enrollment.messages.addedWithPartner'));
        }
      });
    }
  }

  /**
   * Handle filter changes
   */
  onFiltersChange(filters: { eventType: string[]; gameType: string[]; level: number[]; enrollmentStatus: 'OPEN' | 'AVAILABLE' | 'ALL'; searchText: string; showOnlyMyLevel: boolean }): void {
    this.service.updateFilters(filters);
  }

  /**
   * Clear cart
   */
  onClearCart(): void {
    const cartId = this.cartId();
    if (cartId) {
      this.service.clearCart(cartId);
      this.showMessage(this.translate.instant('all.enrollment.messages.cartCleared'));
    }
  }

  /**
   * Submit cart
   */
  onSubmitCart(): void {
    const cartId = this.cartId();
    if (!cartId) {
      this.showMessage(this.translate.instant('all.enrollment.messages.cartEmpty'), 'error');
      return;
    }

    this.isSubmitting.set(true);

    this.service
      .submitCart(cartId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enrollments) => {
          this.isSubmitting.set(false);

          if (enrollments && enrollments.length > 0) {
            this.showMessage(
              this.translate.instant('all.enrollment.messages.enrollmentSuccess', { count: enrollments.length }),
              'success',
            );
          } else {
            this.showMessage(this.translate.instant('all.enrollment.messages.enrollmentFailed'), 'error');
          }
        },
        error: (error) => {
          this.isSubmitting.set(false);
          console.error('Submit cart error:', error);
          this.showMessage(this.translate.instant('all.enrollment.messages.submitFailed'), 'error');
        },
      });
  }

  /**
   * Show toast message
   */
  private showMessage(
    message: string,
    type: 'success' | 'error' | 'warn' = 'success',
  ): void {
    this.messageService.add({
      severity: type,
      summary: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Warning',
      detail: message,
      life: 3000,
    });
  }

  /**
   * Navigate back to tournament detail
   */
  goBack(): void {
    const id = this.tournamentId();
    if (id) {
      this.router.navigate(['/tournament', id]);
    } else {
      this.router.navigate(['/tournament']);
    }
  }
}
