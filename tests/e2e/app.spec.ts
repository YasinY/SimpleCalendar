import { expect, test } from './support/calendarFixture';

const TITLE_ISO_DATE_LENGTH = 10;
const MILLISECONDS_PER_MINUTE = 60000;

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * MILLISECONDS_PER_MINUTE);
  return local.toISOString().slice(0, TITLE_ISO_DATE_LENGTH);
}

test('shows the current month with a highlighted today cell', async ({ calendar: { page } }) => {
  await expect(page.locator('#monthName')).not.toBeEmpty();
  await expect(page.locator('.day--today')).toHaveCount(1);
  await expect(page.locator('.day--today')).toHaveAttribute('data-date', todayIso());
});

test('creates, edits and deletes an event through the dialog', async ({ calendar: { page } }) => {
  const today = page.locator('.day--today');
  await today.dblclick();
  await expect(page.locator('#dialogOverlay')).toBeVisible();

  await page.locator('[data-dialog-title]').fill('Playwright Termin');
  await page.locator('[data-dialog-time]').fill('10:00');
  await page.locator('[data-dialog-end-time]').fill('12:00');
  await page.locator('[data-dialog-notes]').fill('Notiz aus dem Test');
  await page.locator('[data-dialog-submit]').click();

  const pill = today.locator('.event');
  await expect(pill).toHaveCount(1);
  await expect(pill.locator('.event__title')).toHaveText('Playwright Termin');
  await expect(pill.locator('.event__time')).toHaveText('10:00–12:00');
  await expect(pill).toHaveAttribute('title', /Notiz aus dem Test/);

  await pill.click();
  await page.locator('[data-dialog-title]').fill('Umbenannt');
  await page.locator('[data-dialog-submit]').click();
  await expect(pill.locator('.event__title')).toHaveText('Umbenannt');

  await pill.click();
  await page.locator('[data-dialog-delete]').click();
  await expect(today.locator('.event')).toHaveCount(0);
});

test('asks before discarding unsaved dialog input', async ({ calendar: { page } }) => {
  const dialogOverlay = page.locator('#dialogOverlay');
  const discardOverlay = page.locator('#discardOverlay');
  const backdropCorner = { position: { x: 5, y: 200 } };

  await page.locator('.day--today').dblclick();
  await dialogOverlay.dblclick(backdropCorner);
  await expect(dialogOverlay).toBeHidden();

  await page.locator('.day--today').dblclick();
  await page.locator('[data-dialog-title]').fill('Nicht verlieren');
  await dialogOverlay.click(backdropCorner);
  await expect(dialogOverlay).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(discardOverlay).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(discardOverlay).toBeHidden();
  await expect(page.locator('[data-dialog-title]')).toHaveValue('Nicht verlieren');

  await dialogOverlay.dblclick(backdropCorner);
  await page.locator('[data-discard-confirm]').click();
  await expect(discardOverlay).toBeHidden();
  await expect(dialogOverlay).toBeHidden();

  await page.locator('.day--today').dblclick();
  await page.locator('[data-dialog-title]').fill('Bewusst verworfen');
  await page.locator('[data-dialog-cancel]').click();
  await expect(discardOverlay).toBeHidden();
  await expect(dialogOverlay).toBeHidden();
});

test('switches between month, week and day view', async ({ calendar: { page } }) => {
  await page.locator('[data-view-mode="week"]').click();
  await expect(page.locator('.time-grid')).toBeVisible();
  await expect(page.locator('.time-grid__column')).toHaveCount(7);
  await expect(page.locator('.now-line')).toHaveCount(1);

  await page.locator('[data-view-mode="day"]').click();
  await expect(page.locator('.time-grid__column')).toHaveCount(1);

  await page.locator('[data-view-mode="month"]').click();
  await expect(page.locator('.month-view')).toBeVisible();
});

test('navigates forward and back to today', async ({ calendar: { page } }) => {
  const title = page.locator('#monthName');
  const initial = await title.textContent();
  await page.locator('#nextPeriod').click();
  await expect(title).not.toHaveText(initial ?? '');
  await page.locator('#todayButton').click();
  await expect(title).toHaveText(initial ?? '');
});

test('stores the holiday region from the settings dialog', async ({ calendar: { page } }) => {
  await page.locator('#settingsButton').click();
  await expect(page.locator('#settingsOverlay')).toBeVisible();

  await page.locator('[data-settings-region]').selectOption('BY');
  await page.locator('#settingsOverlay button[type="submit"]').click();
  await expect(page.locator('#settingsOverlay')).toBeHidden();

  await page.locator('#settingsButton').click();
  await expect(page.locator('[data-settings-region]')).toHaveValue('BY');
  await page.locator('[data-settings-cancel]').click();
});
