import type { Settings } from '../../../src/shared/settings';

export interface CalendarLaunchOptions {
  args: string[];
  legacyEvents: unknown[] | null;
  settings: Partial<Settings> | null;
  visible: boolean;
}
