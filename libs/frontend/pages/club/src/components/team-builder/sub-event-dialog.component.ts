import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { CompetitionSubEvent } from '@app/models';
import { TEAM_BUILDER_AUTO_SUB_EVENT } from '../../pages/detail/tabs/team-builder/types/team-builder.types';

interface SubEventGroup {
  levelType: string;
  subEvents: CompetitionSubEvent[];
}

@Component({
  selector: 'app-sub-event-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './sub-event-dialog.component.html',
})
export class SubEventDialogComponent {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  readonly autoValue = TEAM_BUILDER_AUTO_SUB_EVENT;
  readonly currentSubEvent: CompetitionSubEvent | undefined = this.config.data?.currentSubEvent;
  readonly options: { label: string; value: string }[] = this.config.data?.options ?? [];

  selectedId: string = this.config.data?.selectedValue ?? this.autoValue;

  get groupedOptions(): SubEventGroup[] {
    const groups = new Map<string, CompetitionSubEvent[]>();

    for (const option of this.options) {
      if (option.value === this.autoValue) continue;

      // Parse the label format: "[LIGA] 3e Liga (100-200)"
      const match = option.label.match(/^\[([^\]]+)\]\s*/);
      const levelType = match?.[1] ?? 'Other';
      const subEvent = this.config.data?.allSubEvents?.find((s: CompetitionSubEvent) => s.id === option.value);

      if (!subEvent) continue;

      if (!groups.has(levelType)) {
        groups.set(levelType, []);
      }
      groups.get(levelType)!.push(subEvent);
    }

    return Array.from(groups.entries()).map(([levelType, subEvents]) => ({
      levelType,
      subEvents: subEvents.sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
    }));
  }

  select(id: string) {
    this.selectedId = id;
  }

  apply() {
    this.dialogRef.close(this.selectedId);
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
