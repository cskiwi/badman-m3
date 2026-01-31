import { Component, computed, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import dayjs, { Dayjs } from 'dayjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { getRankingPeriods } from '../../../../../../../../utils/src/lib/get-ranking-periods';
import { RankingBreakdownService } from '../../page-ranking-breakdown.service';
import { RankingSystem } from '@app/models';
import { DayjsFormatPipe } from '@app/frontend-utils/dayjs/fmt';

@Component({
  selector: 'app-period-selection',
  templateUrl: './period-selection.component.html',
  styleUrl: './period-selection.component.scss',
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    DatePickerModule,
    MenuModule,
    TooltipModule,
    DayjsFormatPipe,
  ],
})
export class PeriodSelectionComponent {
  private readonly breakdownService = inject(RankingBreakdownService);

  system = input.required<RankingSystem>();
  filter = this.breakdownService.filter;

  viewingDate = signal(dayjs());

  start = computed(() => this.filter.get('start')?.value as Dayjs | null);
  end = computed(() => this.filter.get('end')?.value as Dayjs | null);

  updates = computed(() => {
    const sys = this.system();
    const viewing = this.viewingDate();
    if (!sys || !viewing) {
      return [];
    }

    try {
      return getRankingPeriods(
        sys,
        viewing.startOf('month').subtract(1, 'day'),
        viewing.endOf('month').add(1, 'day'),
      );
    } catch {
      return [];
    }
  });

  highlightedDates = computed(() => {
    return this.updates().map((u: { date: Dayjs; updatePossible: boolean }) => u.date.toDate());
  });

  quickActionItems = computed(() => [
    {
      label: 'all.ranking.breakdown.period.last-point-update',
      command: () => this.lastPointUpdate(),
    },
    {
      label: 'all.ranking.breakdown.period.last-ranking-update',
      command: () => this.lastRankingUpdate(),
    },
    { separator: true },
    {
      label: 'all.ranking.breakdown.period.next-point-update',
      command: () => this.nextPointUpdate(),
    },
    {
      label: 'all.ranking.breakdown.period.next-ranking-update',
      command: () => this.nextRankingUpdate(),
    },
  ]);

  lastPointUpdate() {
    this.customPeriod(dayjs(this.system().calculationLastUpdate));
  }

  lastRankingUpdate() {
    this.customPeriod(dayjs(this.system().updateLastUpdate));
  }

  nextPointUpdate() {
    const sys = this.system();
    this.customPeriod(
      dayjs(sys.calculationLastUpdate).add(
        sys.calculationIntervalAmount ?? 1,
        sys.calculationIntervalUnit as dayjs.ManipulateType,
      ),
    );
  }

  nextRankingUpdate() {
    const sys = this.system();
    this.customPeriod(
      dayjs(sys.updateLastUpdate).add(sys.updateIntervalAmount ?? 1, sys.updateIntervalUnit as dayjs.ManipulateType),
    );
  }

  onDateSelect(date: Date) {
    this.customPeriod(dayjs(date));
  }

  onMonthChange(event: { month: number; year: number }) {
    this.viewingDate.set(dayjs().month(event.month - 1).year(event.year));
  }

  customPeriod(targetDate: Dayjs | null) {
    if (!targetDate) {
      return;
    }

    const sys = this.system();
    const endPeriod = targetDate;
    const startPeriod = endPeriod.subtract(sys.periodAmount ?? 1, sys.periodUnit as dayjs.ManipulateType);
    const gamePeriod = startPeriod.subtract(
      sys.updateIntervalAmount ?? 1,
      sys.updateIntervalUnit as dayjs.ManipulateType,
    );
    const nextPeriod = startPeriod.add(
      sys.calculationIntervalAmount ?? 1,
      sys.calculationIntervalUnit as dayjs.ManipulateType,
    );

    this.filter.patchValue({
      start: startPeriod,
      end: endPeriod,
      game: gamePeriod,
      next: nextPeriod,
    });
  }

  isHighlighted(date: { day: number; month: number; year: number }): boolean {
    const checkDate = dayjs().year(date.year).month(date.month).date(date.day);
    return this.updates().some((u: { date: Dayjs; updatePossible: boolean }) => u.date.isSame(checkDate, 'day'));
  }

  getDateClass(date: { day: number; month: number; year: number }): string {
    const checkDate = dayjs().year(date.year).month(date.month).date(date.day);
    const update = this.updates().find((u: { date: Dayjs; updatePossible: boolean }) => u.date.isSame(checkDate, 'day'));
    if (update) {
      return update.updatePossible ? 'ranking-update-date' : 'point-update-date';
    }
    return '';
  }
}
