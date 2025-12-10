import { ChangeDetectionStrategy, Component, effect, inject, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { AuthService } from '@app/frontend-modules-auth/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { MyEnrollmentsService } from './page-my-enrollments.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-page-my-enrollments',
  standalone: true,
  imports: [
    DatePipe,
    RouterModule,
    TranslateModule,
    PageHeaderComponent,
    ButtonModule,
    CardModule,
    MessageModule,
    SkeletonModule,
    TagModule,
    TableModule,
    TooltipModule,
  ],
  templateUrl: './page-my-enrollments.component.html',
  styleUrl: './page-my-enrollments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageMyEnrollmentsComponent {
  private readonly auth = inject(AuthService);
  private readonly dataService = new MyEnrollmentsService();

  readonly tournamentId = injectParams('tournamentId');

  // Selectors from service
  tournament = this.dataService.tournament;
  enrollments = this.dataService.enrollments;
  loading = this.dataService.loading;
  error = this.dataService.error;
  cancelling = this.dataService.cancelling;
  cancelError = this.dataService.cancelError;

  isEnrollmentOpen = this.dataService.isEnrollmentOpen;
  confirmedEnrollments = this.dataService.confirmedEnrollments;
  pendingEnrollments = this.dataService.pendingEnrollments;
  waitingListEnrollments = this.dataService.waitingListEnrollments;
  availableSubEvents = this.dataService.availableSubEvents;

  isLoggedIn = computed(() => this.auth.loggedIn());

  constructor() {
    effect(() => {
      this.dataService.filter.get('tournamentEventId')?.setValue(this.tournamentId());
    });
  }

  // Cancel enrollment
  async cancelEnrollment(enrollmentId: string): Promise<void> {
    if (confirm('Are you sure you want to cancel this enrollment?')) {
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
