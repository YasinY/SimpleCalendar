import type { EventDialogHandlers } from './dialogs/eventDialogHandlers';
import type { EventEditor } from './dialogs/eventEditor';
import type { SettingsDialogHandlers } from './dialogs/settingsDialogHandlers';
import type { SettingsEditor } from './dialogs/settingsEditor';
import type { MonthRenderer } from './views/monthRenderer';
import type { MonthViewHandlers } from './views/monthViewHandlers';
import type { TimeGridHandlers } from './views/timeGridHandlers';
import type { TimeGridRenderer } from './views/timeGridRenderer';
import type { WeatherBadgeOptions } from './weather/weatherBadgeOptions';
import type { WeatherPresenter } from './weather/weatherPresenter';

export interface CalendarAppFactories {
  createMonthView(handlers: MonthViewHandlers): MonthRenderer;
  createTimeGridView(handlers: TimeGridHandlers): TimeGridRenderer;
  createEventDialog(handlers: EventDialogHandlers): EventEditor;
  createSettingsDialog(handlers: SettingsDialogHandlers): SettingsEditor;
  createWeatherBadge(options: WeatherBadgeOptions): WeatherPresenter;
}
