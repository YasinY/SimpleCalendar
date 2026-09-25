import { NO_DAY_OFFSET } from '@renderer/constants';
import { shiftIsoDate } from '@shared/isoDate';

export function resolveDropDate(zoneDate: string, dayOffset: number): string {
  return dayOffset === NO_DAY_OFFSET ? zoneDate : shiftIsoDate(zoneDate, -dayOffset);
}
