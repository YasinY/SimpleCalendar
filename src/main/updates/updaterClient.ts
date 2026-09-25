import type { AppUpdater } from 'electron-updater';

export type UpdaterClient = Pick<AppUpdater, 'autoDownload' | 'autoInstallOnAppQuit' | 'on' | 'checkForUpdates' | 'quitAndInstall'>;
