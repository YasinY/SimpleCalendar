import { AUSTRIAN_HOLIDAYS } from './austrianHolidays';
import { GERMAN_HOLIDAYS } from './germanHolidays';
import { HOLIDAY_COUNTRIES } from './holidayRegions';
import { SWISS_HOLIDAYS } from './swissHolidays';
import type { Holiday } from './holiday';
import type { HolidayCountry } from './holidayCountry';
import type { SelectOption } from '@renderer/selectOption';
import type { SelectOptionGroup } from '@renderer/selectOptionGroup';

export { HOLIDAY_RULE, type HolidayRule } from './holidayRule';

function toRegionGroup(country: HolidayCountry): SelectOptionGroup {
  const nationwide: SelectOption = { value: country.code, label: country.nationwideLabel };
  const states: SelectOption[] = country.states.map(({ code, name }) => ({ value: code, label: name }));
  return { label: country.name, options: [nationwide, ...states] };
}

export const REGION_GROUPS: SelectOptionGroup[] = HOLIDAY_COUNTRIES.map(toRegionGroup);

export const REGION_OPTIONS: SelectOption[] = REGION_GROUPS.flatMap((group) => group.options);

export const HOLIDAYS: Holiday[] = [...GERMAN_HOLIDAYS, ...AUSTRIAN_HOLIDAYS, ...SWISS_HOLIDAYS];
