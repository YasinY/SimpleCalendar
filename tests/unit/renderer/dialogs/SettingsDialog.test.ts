import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { SettingsDialog } from '../../../../src/renderer/dialogs/SettingsDialog';
import { DiscardPrompt } from '../../../../src/renderer/dialogs/DiscardPrompt';
import type { SettingsPatch } from '../../../../src/renderer/dialogs/settingsPatch';
import { HIDDEN_ATTRIBUTE, THEME_OPTIONS, THEMES, VIEW_MODES } from '../../../../src/renderer/constants';
import { REGION_OPTIONS } from '../../../../src/renderer/holidays/holidayConstants';
import type { SelectOption } from '../../../../src/renderer/selectOption';
import type { Settings } from '../../../../src/shared/settings';
import { mountIndexDocument, requireById } from '../../../support/indexDocument';

const OVERLAY_ID = 'settingsOverlay';
const DISCARD_OVERLAY_ID = 'discardOverlay';
const REGION = 'HH';
const CITY = 'Hamburg';
const PADDED_CITY = '  ' + CITY + '  ';

const SELECTORS = {
  FORM: '[data-settings-form]',
  REGION_SELECT: '[data-settings-region]',
  THEME_SELECT: '[data-settings-theme]',
  CITY_INPUT: '[data-settings-city]',
  CANCEL_BUTTON: '[data-settings-cancel]'
} as const;

const SETTINGS: Settings = {
  holidayRegion: REGION,
  theme: THEMES.DARK,
  weatherCity: CITY,
  weatherLocation: null,
  viewMode: VIEW_MODES.MONTH
};

interface DialogFixture {
  dialog: SettingsDialog;
  overlay: HTMLElement;
  form: HTMLFormElement;
  regionSelect: HTMLSelectElement;
  themeSelect: HTMLSelectElement;
  cityInput: HTMLInputElement;
  onSave: Mock<(patch: SettingsPatch) => void>;
}

function query<T extends Element>(root: HTMLElement, selector: string): T {
  return root.querySelector(selector) as T;
}

function createFixture(): DialogFixture {
  const overlay = requireById(OVERLAY_ID);
  const onSave = vi.fn<(patch: SettingsPatch) => void>();
  const dialog = new SettingsDialog(overlay, { onSave }, new DiscardPrompt(requireById(DISCARD_OVERLAY_ID)));
  return {
    dialog,
    overlay,
    form: query(overlay, SELECTORS.FORM),
    regionSelect: query(overlay, SELECTORS.REGION_SELECT),
    themeSelect: query(overlay, SELECTORS.THEME_SELECT),
    cityInput: query(overlay, SELECTORS.CITY_INPUT),
    onSave
  };
}

function optionValues(select: HTMLSelectElement): string[] {
  return Array.from(select.options, (option) => option.value);
}

function toValues(options: SelectOption[]): string[] {
  return options.map(({ value }) => value);
}

describe('SettingsDialog', () => {
  beforeEach(() => {
    mountIndexDocument();
  });

  it('fills the region and theme selects on construction', () => {
    const { regionSelect, themeSelect } = createFixture();

    expect(optionValues(regionSelect)).toEqual(toValues(REGION_OPTIONS));
    expect(optionValues(themeSelect)).toEqual(toValues(THEME_OPTIONS));
  });

  it('opens with the fields filled from the settings and focuses the city', () => {
    const { dialog, overlay, regionSelect, themeSelect, cityInput } = createFixture();

    dialog.open(SETTINGS);

    expect(overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(false);
    expect(regionSelect.value).toBe(REGION);
    expect(themeSelect.value).toBe(THEMES.DARK);
    expect(cityInput.value).toBe(CITY);
    expect(document.activeElement).toBe(cityInput);
  });

  it('saves the selected values with a trimmed city on submit', () => {
    const { dialog, form, cityInput, onSave } = createFixture();
    dialog.open(SETTINGS);
    cityInput.value = PADDED_CITY;

    const submitEvent = new Event('submit', { cancelable: true });
    form.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ holidayRegion: REGION, theme: THEMES.DARK, weatherCity: CITY });
  });

  it('hides the overlay on close', () => {
    const { dialog, overlay } = createFixture();
    dialog.open(SETTINGS);

    dialog.close();

    expect(overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
  });

  it('closes via the cancel button', () => {
    const { dialog, overlay } = createFixture();
    dialog.open(SETTINGS);

    query<HTMLButtonElement>(overlay, SELECTORS.CANCEL_BUTTON).click();

    expect(overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
  });
});
