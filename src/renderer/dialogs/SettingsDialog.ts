import { THEME_OPTIONS } from '@renderer/constants';
import { requireElement } from '@renderer/dom/elements';
import { fillGroupedSelect, fillSelect } from '@renderer/dom/selectOptions';
import { REGION_GROUPS } from '@renderer/holidays/holidayConstants';
import { CityPicker } from './cityPicker/CityPicker';
import { DialogOverlay } from './DialogOverlay';
import type { CityPickerOptions } from './cityPicker/cityPickerOptions';
import type { DiscardPrompt } from './DiscardPrompt';
import type { SettingsDialogHandlers } from './settingsDialogHandlers';
import type { SettingsEditor } from './settingsEditor';
import type { Settings } from '@shared/settings';

const SELECTORS = {
  FORM: '[data-settings-form]',
  REGION_SELECT: '[data-settings-region]',
  THEME_SELECT: '[data-settings-theme]',
  CITY_FIELD: '[data-settings-city-field]',
  CITY_INPUT: '[data-settings-city]',
  AUTO_UPDATE_INPUT: '[data-settings-auto-update]',
  VERSION_LABEL: '[data-settings-version]',
  CANCEL_BUTTON: '[data-settings-cancel]'
} as const;

const VERSION_LABEL_PREFIX = 'SimpleCalendar ';

export class SettingsDialog implements SettingsEditor {
  readonly #overlay: DialogOverlay;
  readonly #form: HTMLFormElement;
  readonly #regionSelect: HTMLSelectElement;
  readonly #themeSelect: HTMLSelectElement;
  readonly #cityInput: HTMLInputElement;
  readonly #cityPicker: CityPicker;
  readonly #autoUpdateInput: HTMLInputElement;
  readonly #versionLabel: HTMLElement;
  readonly #handlers: SettingsDialogHandlers;

  constructor(overlayElement: HTMLElement, handlers: SettingsDialogHandlers, discardPrompt: DiscardPrompt, cityPickerOptions: CityPickerOptions) {
    this.#overlay = new DialogOverlay(overlayElement, {
      cancelSelector: SELECTORS.CANCEL_BUTTON,
      discardPrompt,
      onDismiss: () => this.close()
    });
    this.#form = requireElement(overlayElement, SELECTORS.FORM);
    this.#regionSelect = requireElement(overlayElement, SELECTORS.REGION_SELECT);
    this.#themeSelect = requireElement(overlayElement, SELECTORS.THEME_SELECT);
    this.#cityInput = requireElement(overlayElement, SELECTORS.CITY_INPUT);
    this.#cityPicker = new CityPicker(requireElement(overlayElement, SELECTORS.CITY_FIELD), cityPickerOptions);
    this.#autoUpdateInput = requireElement(overlayElement, SELECTORS.AUTO_UPDATE_INPUT);
    this.#versionLabel = requireElement(overlayElement, SELECTORS.VERSION_LABEL);
    this.#handlers = handlers;
    fillGroupedSelect(this.#regionSelect, REGION_GROUPS);
    fillSelect(this.#themeSelect, THEME_OPTIONS);
    this.#bindInteractions();
  }

  open(settings: Settings): void {
    this.#regionSelect.value = settings.holidayRegion;
    this.#themeSelect.value = settings.theme;
    this.#cityPicker.reset(settings.weatherCity, settings.weatherLocation);
    this.#autoUpdateInput.checked = settings.autoUpdate;
    this.#overlay.show();
    this.#cityInput.focus();
  }

  close(): void {
    this.#overlay.hide();
  }

  showVersion(version: string): void {
    this.#versionLabel.textContent = VERSION_LABEL_PREFIX + version;
  }

  #bindInteractions(): void {
    this.#form.addEventListener('submit', (domEvent) => {
      domEvent.preventDefault();
      this.#handlers.onSave({
        holidayRegion: this.#regionSelect.value,
        theme: this.#themeSelect.value as Settings['theme'],
        weatherCity: this.#cityInput.value.trim(),
        weatherLocation: this.#cityPicker.location,
        autoUpdate: this.#autoUpdateInput.checked
      });
    });
  }
}
