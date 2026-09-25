import type { Theme } from './theme';
import type { ViewMode } from './viewMode';
import type { WeatherLocation } from './weatherLocation';

export interface Settings {
  holidayRegion: string;
  theme: Theme;
  weatherCity: string;
  weatherLocation: WeatherLocation | null;
  viewMode: ViewMode;
  autoUpdate: boolean;
}
