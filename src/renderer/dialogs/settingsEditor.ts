import type { Settings } from '../../shared/settings';

export interface SettingsEditor {
  open(settings: Settings): void;
  close(): void;
}
