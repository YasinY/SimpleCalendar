import type { Settings } from '@shared/settings';

export interface CalendarLaunchOptions {
  args: string[];
  legacyEvents: unknown[] | null;
  settings: Partial<Settings> | null;
  visible: boolean;
}
