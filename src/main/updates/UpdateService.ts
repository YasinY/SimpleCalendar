import type { UpdaterClient } from './updaterClient';

const UPDATE_DOWNLOADED_EVENT = 'update-downloaded';
const UPDATE_ERROR_EVENT = 'error';
const UPDATE_ERROR_MESSAGE = 'update check failed';
const SILENT_INSTALL = true;
const RUN_AFTER_INSTALL = true;

export class UpdateService {
  readonly #updater: UpdaterClient;

  constructor(updater: UpdaterClient) {
    this.#updater = updater;
  }

  start(): void {
    const updater = this.#updater;
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.on(UPDATE_DOWNLOADED_EVENT, () => updater.quitAndInstall(SILENT_INSTALL, RUN_AFTER_INSTALL));
    updater.on(UPDATE_ERROR_EVENT, (error) => console.error(UPDATE_ERROR_MESSAGE, error));
    void updater.checkForUpdates().catch(() => undefined);
  }
}
