
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  QueryList,
} from '@angular/core';
import { DividerModule } from 'primeng/divider';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { takeUntil } from 'rxjs';

@Component({
    selector: 'app-page-header',
    imports: [DividerModule],
    templateUrl: './page-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent implements AfterContentInit {
  private destroy$ = injectDestroy();
  public hasAvatar?: boolean;

  @ContentChildren('avatar') content?: QueryList<ElementRef>;

  ngAfterContentInit(): void {
    if (!this.content) return;

    this.hasAvatar = this.content.length > 0;
    this.content.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (!this.content) return;
      this.hasAvatar = this.content.length > 0;
    });
  }
}
