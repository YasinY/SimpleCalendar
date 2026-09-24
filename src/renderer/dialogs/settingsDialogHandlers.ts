import type { SettingsPatch } from './settingsPatch';

export interface SettingsDialogHandlers {
  onSave: (patch: SettingsPatch) => void;
}
