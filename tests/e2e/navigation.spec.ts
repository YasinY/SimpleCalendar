import type { ElectronApplication, Page } from '@playwright/test';
import { DEFAULT_LAUNCH_OPTIONS, expect, test } from './support/calendarFixture';
import {
  SELECTORS,
  VIEW_BUTTONS,
  freezeClock,
  reloadWithoutElement,
  showView,
  waitForSettledView
} from './support/calendarViewHelpers';

const ACTIVE_BUTTON_CLASS = /segmented__button--active/;
const TIME_GRID_SELECTOR = '.time-grid';
const TRANSITION_LOG_KEY = 'transitionLog';
const WEEK_VIEW_MODE = 'week';

const WINDOW_BUTTONS = {
  MINIMIZE: '#windowMinimize',
  MAXIMIZE: '#windowMaximize',
  CLOSE: '#windowClose'
} as const;

const TRANSITIONS = {
  FORWARD: 'forward',
  BACKWARD: 'backward',
  SWITCH: 'switch'
} as const;

const TITLES = {
  AUGUST: 'August',
  SEPTEMBER: 'September',
  OCTOBER: 'Oktober',
  CURRENT_WEEK: '14. – 20. September',
  NEXT_WEEK: '21. – 27. September',
  PREVIOUS_WEEK: '7. – 13. September',
  WEEK_ACROSS_MONTHS: '28. September – 4. Oktober',
  TODAY: 'Mittwoch, 16. September',
  TOMORROW: 'Donnerstag, 17. September',
  YESTERDAY: 'Dienstag, 15. September',
  MONDAY_ACROSS_MONTHS: 'Montag, 28. September'
} as const;

type WindowState = 'isMinimized' | 'isMaximized' | 'isVisible';

function readWindowState(app: ElectronApplication, state: WindowState): Promise<boolean> {
  return app.evaluate(({ BrowserWindow }, query) => BrowserWindow.getAllWindows()[0][query](), state);
}

async function clickAndExpectTitle(page: Page, selector: string, title: string): Promise<void> {
  await page.locator(selector).click();
  await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(title);
  await waitForSettledView(page);
}

async function startTransitionLog(page: Page): Promise<void> {
  await page.evaluate((logKey) => {
    const log: string[] = [];
    Object.assign(window, { [logKey]: log });
    const root = document.documentElement;
    new MutationObserver(() => {
      const direction = root.dataset.transition;
      if (direction) log.push(direction);
    }).observe(root, { attributes: true });
  }, TRANSITION_LOG_KEY);
}

function readTransitionLog(page: Page): Promise<string[]> {
  return page.evaluate((logKey) => (window as unknown as Record<string, string[]>)[logKey], TRANSITION_LOG_KEY);
}

test.describe('period navigation', () => {
  test('moves forward and back by month', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await clickAndExpectTitle(page, SELECTORS.NEXT, TITLES.OCTOBER);
    await clickAndExpectTitle(page, SELECTORS.PREVIOUS, TITLES.SEPTEMBER);
    await clickAndExpectTitle(page, SELECTORS.PREVIOUS, TITLES.AUGUST);
  });

  test('moves forward and back by week', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.WEEK);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.CURRENT_WEEK);
    await clickAndExpectTitle(page, SELECTORS.NEXT, TITLES.NEXT_WEEK);
    await clickAndExpectTitle(page, SELECTORS.PREVIOUS, TITLES.CURRENT_WEEK);
    await clickAndExpectTitle(page, SELECTORS.PREVIOUS, TITLES.PREVIOUS_WEEK);
  });

  test('moves forward and back by day', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.DAY);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.TODAY);
    await clickAndExpectTitle(page, SELECTORS.NEXT, TITLES.TOMORROW);
    await clickAndExpectTitle(page, SELECTORS.PREVIOUS, TITLES.TODAY);
    await clickAndExpectTitle(page, SELECTORS.PREVIOUS, TITLES.YESTERDAY);
  });

  test('jumps back to today from the future and from the past', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await startTransitionLog(page);
    await clickAndExpectTitle(page, SELECTORS.NEXT, TITLES.OCTOBER);
    await clickAndExpectTitle(page, SELECTORS.TODAY, TITLES.SEPTEMBER);
    await clickAndExpectTitle(page, SELECTORS.PREVIOUS, TITLES.AUGUST);
    await clickAndExpectTitle(page, SELECTORS.TODAY, TITLES.SEPTEMBER);
    await expect.poll(() => readTransitionLog(page)).toEqual([
      TRANSITIONS.FORWARD,
      TRANSITIONS.BACKWARD,
      TRANSITIONS.BACKWARD,
      TRANSITIONS.FORWARD
    ]);
  });
});

test.describe('view switching', () => {
  test('keeps today when the current period contains it', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.WEEK);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.CURRENT_WEEK);
    await showView(page, VIEW_BUTTONS.DAY);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.TODAY);
  });

  test('takes the start of the period when it does not contain today', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await clickAndExpectTitle(page, SELECTORS.NEXT, TITLES.OCTOBER);
    await showView(page, VIEW_BUTTONS.WEEK);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.WEEK_ACROSS_MONTHS);
    await showView(page, VIEW_BUTTONS.DAY);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.MONDAY_ACROSS_MONTHS);
    await showView(page, VIEW_BUTTONS.MONTH);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.SEPTEMBER);
  });

  test('marks the active view button and ignores clicks on it', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await expect(page.locator(VIEW_BUTTONS.MONTH)).toHaveClass(ACTIVE_BUTTON_CLASS);
    await startTransitionLog(page);
    await page.locator(VIEW_BUTTONS.MONTH).click();
    await showView(page, VIEW_BUTTONS.WEEK);
    await expect(page.locator(VIEW_BUTTONS.WEEK)).toHaveClass(ACTIVE_BUTTON_CLASS);
    await expect(page.locator(VIEW_BUTTONS.MONTH)).not.toHaveClass(ACTIVE_BUTTON_CLASS);
    await expect(page.locator(VIEW_BUTTONS.DAY)).not.toHaveClass(ACTIVE_BUTTON_CLASS);
    expect(await readTransitionLog(page)).toEqual([TRANSITIONS.SWITCH]);
  });
});

test.describe('stored view mode', () => {
  test.use({ calendarLaunch: { ...DEFAULT_LAUNCH_OPTIONS, settings: { viewMode: WEEK_VIEW_MODE } } });

  test('starts in the stored view mode', async ({ calendar: { page } }) => {
    await expect(page.locator(TIME_GRID_SELECTOR)).toBeVisible();
    await expect(page.locator(VIEW_BUTTONS.WEEK)).toHaveClass(ACTIVE_BUTTON_CLASS);
  });
});

test.describe('window controls', () => {
  test('minimizes the window', async ({ calendar: { app, page } }) => {
    await page.locator(WINDOW_BUTTONS.MINIMIZE).click();
    await expect.poll(() => readWindowState(app, 'isMinimized')).toBe(true);
  });

  test('toggles the maximized state', async ({ calendar: { app, page } }) => {
    await page.locator(WINDOW_BUTTONS.MAXIMIZE).click();
    await expect.poll(() => readWindowState(app, 'isMaximized')).toBe(true);
    await page.locator(WINDOW_BUTTONS.MAXIMIZE).click();
    await expect.poll(() => readWindowState(app, 'isMaximized')).toBe(false);
  });

  test('hides the window on close', async ({ calendar: { app, page } }) => {
    await page.locator(WINDOW_BUTTONS.CLOSE).click();
    await expect.poll(() => readWindowState(app, 'isVisible')).toBe(false);
  });
});

test.describe('transitions', () => {
  test('animates navigation with a view transition', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await startTransitionLog(page);
    await clickAndExpectTitle(page, SELECTORS.NEXT, TITLES.OCTOBER);
    expect(await readTransitionLog(page)).toEqual([TRANSITIONS.FORWARD]);
  });

  test('renders without a view transition when reduced motion is preferred', async ({ calendar: { page } }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await freezeClock(page);
    await startTransitionLog(page);
    await clickAndExpectTitle(page, SELECTORS.NEXT, TITLES.OCTOBER);
    expect(await readTransitionLog(page)).toEqual([]);
  });
});

test.describe('edge cases', () => {
  test('renders without a view transition when the browser lacks support', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await page.evaluate(() => {
      delete (Document.prototype as { startViewTransition?: unknown }).startViewTransition;
    });
    await startTransitionLog(page);
    await clickAndExpectTitle(page, SELECTORS.NEXT, TITLES.OCTOBER);
    expect(await readTransitionLog(page)).toEqual([]);
  });

  test('skips window controls that are missing from the page', async ({ calendar: { app, page } }) => {
    await reloadWithoutElement(page, WINDOW_BUTTONS.CLOSE);
    await expect(page.locator(WINDOW_BUTTONS.CLOSE)).toHaveCount(0);
    await page.locator(WINDOW_BUTTONS.MINIMIZE).click();
    await expect.poll(() => readWindowState(app, 'isMinimized')).toBe(true);
  });
});
