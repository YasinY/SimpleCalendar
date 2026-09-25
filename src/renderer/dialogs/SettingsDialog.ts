import { THEME_OPTIONS } from '@renderer/constants';
import { requireElement } from '@renderer/dom/elements';
import { fillSelect } from '@renderer/dom/selectOptions';
import { REGION_OPTIONS } from '@renderer/holidays/holidayConstants';
import { DialogOverlay } from './DialogOverlay';
import type { DiscardPrompt } from './DiscardPrompt';
import type { SettingsDialogHandlers } from './settingsDialogHandlers';
import type { SettingsEditor } from './settingsEditor';
import type { Settings } from '@shared/settings';

const SELECTORS = {
  FORM: '[data-settings-form]',
  REGION_SELECT: '[data-settings-region]',
  THEME_SELECT: '[data-settings-theme]',
  CITY_INPUT: '[data-settings-city]',
  AUTO_UPDATE_INPUT: '[data-settings-auto-update]',
  CANCEL_BUTTON: '[data-settings-cancel]'
} as const;

export class SettingsDialog implements SettingsEditor {
  readonly #overlay: DialogOverlay;
  readonly #form: HTMLFormElement;
  readonly #regionSelect: HTMLSelectElement;
  readonly #themeSelect: HTMLSelectElement;
  readonly #cityInput: HTMLInputElement;
  readonly #autoUpdateInput: HTMLInputElement;
  readonly #handlers: SettingsDialogHandlers;

  constructor(overlayElement: HTMLElement, handlers: SettingsDialogHandlers, discardPrompt: DiscardPrompt) {
    this.#overlay = new DialogOverlay(overlayElement, {
      cancelSelector: SELECTORS.CANCEL_BUTTON,
      discardPrompt,
      onDismiss: () => this.close()
    });
    this.#form = requireElement(overlayElement, SELECTORS.FORM);
    this.#regionSelect = requireElement(overlayElement, SELECTORS.REGION_SELECT);
    this.#themeSelect = requireElement(overlayElement, SELECTORS.THEME_SELECT);
    this.#cityInput = requireElement(overlayElement, SELECTORS.CITY_INPUT);
    this.#autoUpdateInput = requireElement(overlayElement, SELECTORS.AUTO_UPDATE_INPUT);
    this.#handlers = handlers;
    fillSelect(this.#regionSelect, REGION_OPTIONS);
    fillSelect(this.#themeSelect, THEME_OPTIONS);
    this.#bindInteractions();
  }

  open(settings: Settings): void {
    this.#regionSelect.value = settings.holidayRegion;
    this.#themeSelect.value = settings.theme;
    this.#cityInput.value = settings.weatherCity;
    this.#autoUpdateInput.checked = settings.autoUpdate;
    this.#overlay.show();
    this.#cityInput.focus();
  }

  close(): void {
    this.#overlay.hide();
  }

  #bindInteractions(): void {
    this.#form.addEventListener('submit', (domEvent) => {
      domEvent.preventDefault();
      this.#handlers.onSave({
        holidayRegion: this.#regionSelect.value,
        theme: this.#themeSelect.value as Settings['theme'],
        weatherCity: this.#cityInput.value.trim(),
        autoUpdate: this.#autoUpdateInput.checked
      });
    });
  }
}
