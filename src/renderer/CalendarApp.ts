import {
  CSS_CLASSES,
  DATASET_KEYS,
  DEFAULT_VIEW_MODE,
  TRANSITION_DIRECTIONS,
  VIEW_MODES,
  type TransitionDirection
} from './constants';
import { buildDayColumns, buildMonthGrid, getWeekDays } from './date/dateUtils';
import { VIEW_MODE_CONFIG, resolveViewMode, type ViewModeConfig } from './date/viewModes';
import { runWithTransition } from './dom/transitions';
import { groupByDate } from './events/eventGrouping';
import { moveEventTo } from './events/eventMove';
import { buildHolidayMap } from './holidays/holidayDates';
import type { CalendarAppFactories } from './calendarAppFactories';
import type { CalendarElements } from './calendarElements';
import type { EventEditor } from './dialogs/eventEditor';
import type { SettingsEditor } from './dialogs/settingsEditor';
import type { SettingsPatch } from './dialogs/settingsPatch';
import type { EventsByDate } from './views/eventsByDate';
import type { MonthRenderer } from './views/monthRenderer';
import type { MoveTarget } from './views/moveTarget';
import type { TimeGridRenderer } from './views/timeGridRenderer';
import type { WeatherPresenter } from './weather/weatherPresenter';
import { DEFAULT_SETTINGS } from '../shared/settingsDefaults';
import type { CalendarApi } from '../shared/calendarApi';
import type { CalendarEvent } from '../shared/calendarEvent';
import type { EventInput } from '../shared/eventInput';
import type { Settings } from '../shared/settings';
import type { ViewMode } from '../shared/viewMode';

const PREVIOUS_STEP = -1;
const NEXT_STEP = 1;

export class CalendarApp {
  readonly #api: CalendarApi;
  readonly #elements: CalendarElements;
  readonly #monthView: MonthRenderer;
  readonly #timeGridView: TimeGridRenderer;
  readonly #eventDialog: EventEditor;
  readonly #settingsDialog: SettingsEditor;
  readonly #weather: WeatherPresenter;
  #viewMode: ViewMode = DEFAULT_VIEW_MODE;
  #viewDate: Date = VIEW_MODE_CONFIG[DEFAULT_VIEW_MODE].normalize(new Date());
  #events: CalendarEvent[] = [];
  #settings: Settings = DEFAULT_SETTINGS;

  constructor(api: CalendarApi, elements: CalendarElements, factories: CalendarAppFactories) {
    this.#api = api;
    this.#elements = elements;

    this.#monthView = factories.createMonthView({
      onDayActivate: (isoDate) => this.#eventDialog.openForDate(isoDate),
      onEventActivate: (eventId) => this.#openEvent(eventId),
      onEventDrop: (eventId, target) => void this.#moveEvent(eventId, target)
    });

    this.#timeGridView = factories.createTimeGridView({
      onEventActivate: (eventId) => this.#openEvent(eventId),
      onSlotActivate: (isoDate, time) => this.#eventDialog.openForDate(isoDate, time),
      onEventDrop: (eventId, target) => void this.#moveEvent(eventId, target)
    });

    this.#eventDialog = factories.createEventDialog({
      onSubmit: (payload) => void this.#saveEvent(payload),
      onDelete: (eventId) => void this.#deleteEvent(eventId)
    });

    this.#settingsDialog = factories.createSettingsDialog({
      onSave: (patch) => void this.#saveSettings(patch)
    });

    this.#weather = factories.createWeatherBadge({
      onLocationResolved: (location) => void this.#api.updateSettings({ weatherLocation: location })
    });

    this.#bindNavigation();
    this.#bindViewSwitcher();
    elements.settingsButton.addEventListener('click', () => this.#settingsDialog.open(this.#settings));
  }

  async start(): Promise<void> {
    this.#settings = await this.#api.getSettings();
    this.#viewMode = resolveViewMode(this.#settings.viewMode);
    this.#viewDate = this.#config.normalize(new Date());
    this.#timeGridView.start();
    this.#weather.start();
    void this.#weather.configure(this.#settings.weatherCity, this.#settings.weatherLocation);
    await this.#reloadEvents();
  }

  get #config(): ViewModeConfig {
    return VIEW_MODE_CONFIG[this.#viewMode];
  }

  #bindNavigation(): void {
    const { previous, next, today } = this.#elements;
    previous.addEventListener('click', () => this.#shift(PREVIOUS_STEP, TRANSITION_DIRECTIONS.BACKWARD));
    next.addEventListener('click', () => this.#shift(NEXT_STEP, TRANSITION_DIRECTIONS.FORWARD));
    today.addEventListener('click', () => this.#jumpToToday());
  }

  #bindViewSwitcher(): void {
    for (const button of this.#elements.viewButtons) {
      button.addEventListener('click', () => this.#switchView(resolveViewMode(button.dataset[DATASET_KEYS.VIEW_MODE])));
    }
  }

  #shift(step: number, direction: TransitionDirection): void {
    void this.#navigateTo(this.#config.shift(this.#viewDate, step), direction);
  }

  #jumpToToday(): void {
    const target = this.#config.normalize(new Date());
    const direction = target > this.#viewDate ? TRANSITION_DIRECTIONS.FORWARD : TRANSITION_DIRECTIONS.BACKWARD;
    void this.#navigateTo(target, direction);
  }

  async #navigateTo(target: Date, direction: TransitionDirection): Promise<void> {
    this.#viewDate = target;
    await this.#reloadEvents(direction);
  }

  #switchView(viewMode: ViewMode): void {
    if (viewMode === this.#viewMode) return;
    const today = new Date();
    const anchor = this.#config.contains(this.#viewDate, today) ? today : this.#viewDate;
    this.#viewMode = viewMode;
    this.#viewDate = this.#config.normalize(anchor);
    void this.#api.updateSettings({ viewMode });
    void this.#reloadEvents(TRANSITION_DIRECTIONS.SWITCH);
  }

  #openEvent(eventId: string): void {
    const event = this.#findEvent(eventId);
    if (!event) return;
    this.#eventDialog.openForEvent(event);
  }

  #findEvent(eventId: string): CalendarEvent | undefined {
    return this.#events.find((candidate) => candidate.id === eventId);
  }

  async #moveEvent(eventId: string, target: MoveTarget): Promise<void> {
    const event = this.#findEvent(eventId);
    if (!event) return;
    await this.#api.saveEvent(moveEventTo(event, target));
    await this.#reloadEvents();
  }

  async #saveEvent(payload: EventInput): Promise<void> {
    if (payload.title.length === 0) return;
    await this.#api.saveEvent(payload);
    this.#eventDialog.close();
    await this.#reloadEvents();
  }

  async #deleteEvent(eventId: string): Promise<void> {
    await this.#api.deleteEvent(eventId);
    this.#eventDialog.close();
    await this.#reloadEvents();
  }

  async #saveSettings(patch: SettingsPatch): Promise<void> {
    const cityChanged = patch.weatherCity !== this.#settings.weatherCity;
    this.#settings = await this.#api.updateSettings(patch);
    this.#settingsDialog.close();
    this.#render();
    if (cityChanged) void this.#weather.configure(this.#settings.weatherCity, this.#settings.weatherLocation);
  }

  async #reloadEvents(direction?: TransitionDirection): Promise<void> {
    this.#events = await this.#api.getEvents(this.#config.range(this.#viewDate));
    if (!direction) {
      this.#render();
      return;
    }
    runWithTransition(direction, () => this.#render());
  }

  #render(): void {
    const { main, year } = this.#config.buildTitle(this.#viewDate);
    const { monthName, yearLabel } = this.#elements;
    monthName.textContent = main;
    yearLabel.textContent = year;
    this.#markActiveViewButton();

    const isMonthView = this.#viewMode === VIEW_MODES.MONTH;
    this.#mountView(isMonthView ? this.#monthView.element : this.#timeGridView.element);

    const eventsByDate = groupByDate(this.#events);
    if (isMonthView) {
      this.#renderMonth(eventsByDate);
      return;
    }
    this.#renderTimeGrid(eventsByDate);
  }

  #mountView(viewElement: HTMLElement): void {
    const container = this.#elements.calendar;
    if (container.firstElementChild === viewElement) return;
    container.replaceChildren(viewElement);
  }

  #renderMonth(eventsByDate: EventsByDate): void {
    const grid = buildMonthGrid(this.#viewDate, new Date());
    this.#monthView.render(grid, eventsByDate, buildHolidayMap(grid.years, this.#settings.holidayRegion));
  }

  #renderTimeGrid(eventsByDate: EventsByDate): void {
    const dates = this.#viewMode === VIEW_MODES.WEEK ? getWeekDays(this.#viewDate) : [this.#viewDate];
    const layout = buildDayColumns(dates, new Date());
    this.#timeGridView.render(layout, eventsByDate, buildHolidayMap(layout.years, this.#settings.holidayRegion));
  }

  #markActiveViewButton(): void {
    for (const button of this.#elements.viewButtons) {
      button.classList.toggle(CSS_CLASSES.SEGMENTED_ACTIVE, button.dataset[DATASET_KEYS.VIEW_MODE] === this.#viewMode);
    }
  }
}
