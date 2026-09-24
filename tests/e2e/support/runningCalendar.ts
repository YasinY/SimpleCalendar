import type { ElectronApplication, Page } from '@playwright/test';

export interface RunningCalendar {
  app: ElectronApplication;
  page: Page;
  userData: string;
}
