import { Component, output, input } from '@angular/core';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { BadgeModule } from 'primeng/badge';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslateModule } from '@ngx-translate/core';
import { CartItem } from '../../page-general-enrollment.service';

@Component({
  selector: 'app-enrollment-cart',
  standalone: true,
  imports: [
    CardModule,
    ButtonModule,
    DividerModule,
    BadgeModule,
    ProgressSpinnerModule,
    TranslateModule
],
  templateUrl: './enrollment-cart.component.html',
})
export class EnrollmentCartComponent {
  readonly items = input<CartItem[]>([]);
  readonly isSubmitting = input(false);
  readonly clearCart = output<void>();
  readonly submitCart = output<void>();
  readonly removeItem = output<string>();

  /**
   * Get event type icon
   */
  getEventTypeIcon(eventType: string): string {
    switch (eventType) {
      case 'SINGLE':
        return 'pi-user';
      case 'DOUBLE':
        return 'pi-users';
      case 'MIXED':
        return 'pi-users';
      default:
        return 'pi-calendar';
    }
  }

  /**
   * Handle remove item
   */
  onRemoveItem(subEventId: string): void {
    this.removeItem.emit(subEventId);
  }

  /**
   * Handle clear cart
   */
  onClearCart(): void {
    // TODO: The 'emit' function requires a mandatory void argument
    this.clearCart.emit();
  }

  /**
   * Handle submit cart
   */
  onSubmitCart(): void {
    // TODO: The 'emit' function requires a mandatory void argument
    this.submitCart.emit();
  }
}
