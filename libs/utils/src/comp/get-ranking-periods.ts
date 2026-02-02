import dayjs, { Dayjs, ManipulateType } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isoWeek);

export function GetRankingPeriods<
  T extends Partial<{
    updateIntervalAmount: number;
    updateIntervalUnit: string;
    updateLastUpdate: Date;
    updateDayOfWeek: number;

    calculationIntervalAmount: number;
    calculationIntervalUnit: string;
    calculationDayOfWeek: number;
    calculationLastUpdate: Date;
  }>,
>(
  system: T,
  from: Dayjs,
  to: Dayjs,
  args?: {
    includeUpdate?: boolean;
    includeCalculation?: boolean;
  }
): { date: Dayjs; updatePossible: boolean }[] {
  if (
    ((args?.includeUpdate ?? true) && !system.updateIntervalAmount) ||
    !system.updateIntervalUnit ||
    !system.updateDayOfWeek
  ) {
    throw new Error('No update interval defined');
  }

  if (
    ((args?.includeCalculation ?? true) && !system.calculationIntervalAmount) ||
    !system.calculationIntervalUnit ||
    !system.calculationDayOfWeek
  ) {
    throw new Error('No calculation interval defined');
  }

  if (!from.isValid() || !to.isValid()) {
    throw new Error('Invalid date');
  }

  let lastUpdate = dayjs(system.updateLastUpdate);
  let lastCalculation = dayjs(system.calculationLastUpdate);
  const updates: {
    date: Dayjs;
    updatePossible: boolean;
  }[] = [];

  if (args?.includeUpdate ?? true) {
    // get the last update on the first iteration before the from date
    if (lastUpdate.isBefore(from, 'day')) {
      while (lastUpdate.isBefore(from, 'day')) {
        lastUpdate = lastUpdate.add(system.updateIntervalAmount!, system.updateIntervalUnit as ManipulateType);
      }
    }

    if (lastUpdate.isAfter(from, 'day')) {
      while (lastUpdate.isAfter(from, 'day')) {
        lastUpdate = lastUpdate.subtract(system.updateIntervalAmount!, system.updateIntervalUnit as ManipulateType);
      }
    }

    lastUpdate = lastUpdate.startOf(system.updateIntervalUnit as ManipulateType);
    while (lastUpdate.isSameOrBefore(to, 'day')) {
      lastUpdate = lastUpdate.add(system.updateIntervalAmount!, system.updateIntervalUnit as ManipulateType);

      if (system.updateIntervalUnit === 'months' || system.updateIntervalUnit === 'month') {
        lastUpdate = lastUpdate.isoWeekday(system.updateDayOfWeek! + 7);
        if (lastUpdate.date() > 7) {
          lastUpdate = lastUpdate.isoWeekday(-(7 - system.updateDayOfWeek!));
        }
      } else if (system.updateIntervalUnit === 'weeks' || system.updateIntervalUnit === 'week') {
        lastUpdate = lastUpdate.isoWeekday(system.updateDayOfWeek!);
      }
      // no logic for day

      if (lastUpdate.isSameOrBefore(to, 'day') && lastUpdate.isSameOrAfter(from, 'day')) {
        updates.push({
          date: lastUpdate,
          updatePossible: true,
        });
      }
    }
  }

  if (args?.includeCalculation ?? true) {
    // get the last calculation on the first iteration before the from date
    if (lastCalculation.isBefore(from, 'day')) {
      while (lastCalculation.isBefore(from, 'day')) {
        lastCalculation = lastCalculation.add(system.calculationIntervalAmount!, system.calculationIntervalUnit as ManipulateType);
      }
    }

    if (lastCalculation.isAfter(from, 'day')) {
      while (lastCalculation.isAfter(from, 'day')) {
        lastCalculation = lastCalculation.subtract(system.calculationIntervalAmount!, system.calculationIntervalUnit as ManipulateType);
      }
    }

    lastCalculation = lastCalculation.startOf(system.calculationIntervalUnit as ManipulateType);
    while (lastCalculation.isSameOrBefore(to, 'day')) {
      lastCalculation = lastCalculation.add(system.calculationIntervalAmount!, system.calculationIntervalUnit as ManipulateType);

      if (system.calculationIntervalUnit === 'months' || system.calculationIntervalUnit === 'month') {
        lastCalculation = lastCalculation.isoWeekday(system.calculationDayOfWeek! + 7);
        if (lastCalculation.date() > 7) {
          lastCalculation = lastCalculation.isoWeekday(-(7 - system.calculationDayOfWeek!));
        }
      } else if (system.calculationIntervalUnit === 'weeks' || system.calculationIntervalUnit === 'week') {
        lastCalculation = lastCalculation.isoWeekday(system.calculationDayOfWeek!);
      }
      // no logic for day

      // if update already exists, don't add it again
      if (updates.find((u) => u.date.isSame(lastCalculation, system.calculationIntervalUnit as ManipulateType))) {
        continue;
      }

      if (lastCalculation.isSameOrBefore(to, 'day') && lastCalculation.isSameOrAfter(from, 'day')) {
        updates.push({
          date: lastCalculation,
          updatePossible: false,
        });
      }
    }
  }

  // sort updates by date
  updates.sort((a, b) => {
    if (a.date.isBefore(b.date)) {
      return -1;
    }

    if (a.date.isAfter(b.date)) {
      return 1;
    }

    return 0;
  });

  return updates;
}
