import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Entry } from '@app/models';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-poule-draw',
  imports: [TranslateModule, TooltipModule],
  templateUrl: './poule-draw.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PouleDrawComponent {
  entries = input.required<Entry[]>();
}
