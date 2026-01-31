
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  contentChildren,
  computed
} from '@angular/core';
import { DividerModule } from 'primeng/divider';

@Component({
    selector: 'app-page-header',
    imports: [DividerModule],
    templateUrl: './page-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  readonly content = contentChildren<ElementRef>('avatar');

  public hasAvatar = computed(() => this.content().length > 0);
}
