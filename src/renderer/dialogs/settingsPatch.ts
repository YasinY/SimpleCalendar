import type { Settings } from '../../shared/settings';

export type SettingsPatch = Pick<Settings, 'holidayRegion' | 'theme' | 'weatherCity'>;
