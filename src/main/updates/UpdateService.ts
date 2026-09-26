import type { ProgressInfo, UpdateInfo } from 'electron-updater';
import type { UpdateRunner } from './updateRunner';
import type { UpdateStatusReporter } from './updateStatusReporter';
import type { UpdaterClient } from './updaterClient';
import { UPDATE_PHASES, type UpdatePhase } from '@shared/updatePhase';

const UPDATER_EVENTS = {
  AVAILABLE: 'update-available',
  NOT_AVAILABLE: 'update-not-available',
  PROGRESS: 'download-progress',
  DOWNLOADED: 'update-downloaded',
  ERROR: 'error'
} as const;
const UPDATE_ERROR_MESSAGE = 'update check failed';
const SILENT_INSTALL = true;
const RUN_AFTER_INSTALL = true;
const NO_VERSION = null;
const NO_PERCENT = null;
const DOWNLOAD_START_PERCENT = 0;

type Settle = (phase: UpdatePhase) => void;

export class UpdateService implements UpdateRunner {
  readonly #updater: UpdaterClient;
  readonly #checkTimeoutMs: number;
  readonly #installDelayMs: number;
  #reporter: UpdateStatusReporter | null = null;
  #settle: Settle | null = null;
  #downloadingVersion: string | null = NO_VERSION;

  constructor(updater: UpdaterClient, checkTimeoutMs: number, installDelayMs: number) {
    this.#updater = updater;
    this.#checkTimeoutMs = checkTimeoutMs;
    this.#installDelayMs = installDelayMs;
  }

  run(reporter: UpdateStatusReporter): Promise<UpdatePhase> {
    this.#reporter = reporter;
    const updater = this.#updater;
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    return new Promise<UpdatePhase>((resolve) => {
      const checkTimeout = setTimeout(() => this.#onCheckTimeout(), this.#checkTimeoutMs);
      this.#settle = (phase) => {
        clearTimeout(checkTimeout);
        resolve(phase);
      };
      this.#report(UPDATE_PHASES.CHECKING, NO_VERSION, NO_PERCENT);
      updater.on(UPDATER_EVENTS.AVAILABLE, (info: UpdateInfo) => this.#onAvailable(info));
      updater.on(UPDATER_EVENTS.PROGRESS, (progress: ProgressInfo) => this.#onProgress(progress));
      updater.on(UPDATER_EVENTS.DOWNLOADED, (info: UpdateInfo) => this.#onDownloaded(info));
      updater.on(UPDATER_EVENTS.NOT_AVAILABLE, () => this.#finishUpToDate());
      updater.on(UPDATER_EVENTS.ERROR, (error: Error) => this.#onError(error));
      updater
        .checkForUpdates()
        .then((result) => this.#onCheckResult(result))
        .catch(() => this.#finishUpToDate());
    });
  }

  #report(phase: UpdatePhase, version: string | null, percent: number | null): void {
    this.#reporter?.report({ phase, version, percent });
  }

  #finishUpToDate(): void {
    this.#report(UPDATE_PHASES.UP_TO_DATE, NO_VERSION, NO_PERCENT);
    this.#settle?.(UPDATE_PHASES.UP_TO_DATE);
  }

  #onCheckTimeout(): void {
    if (this.#downloadingVersion !== NO_VERSION) return;
    this.#finishUpToDate();
  }

  #onCheckResult(result: unknown): void {
    if (result !== null) return;
    this.#finishUpToDate();
  }

  #onAvailable(info: UpdateInfo): void {
    this.#downloadingVersion = info.version;
    this.#report(UPDATE_PHASES.DOWNLOADING, info.version, DOWNLOAD_START_PERCENT);
  }

  #onProgress(progress: ProgressInfo): void {
    this.#report(UPDATE_PHASES.DOWNLOADING, this.#downloadingVersion, Math.round(progress.percent));
  }

  #onDownloaded(info: UpdateInfo): void {
    this.#report(UPDATE_PHASES.INSTALLING, info.version, NO_PERCENT);
    this.#settle?.(UPDATE_PHASES.INSTALLING);
    setTimeout(() => this.#updater.quitAndInstall(SILENT_INSTALL, RUN_AFTER_INSTALL), this.#installDelayMs);
  }

  #onError(error: Error): void {
    console.error(UPDATE_ERROR_MESSAGE, error);
    this.#finishUpToDate();
  }
}
