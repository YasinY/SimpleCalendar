import { BrowserWindow } from 'electron';
import { SPLASH_ENTRY_PATH, SPLASH_PRELOAD_PATH, SPLASH_WINDOW_OPTIONS } from './startupConstants';
import type { SplashPresenter } from './splashPresenter';
import { IPC_CHANNELS } from '@shared/ipcChannels';
import type { UpdateStatus } from '@shared/updateStatus';

const READY_TO_SHOW_EVENT = 'ready-to-show';
const DID_FINISH_LOAD_EVENT = 'did-finish-load';

export class SplashWindow implements SplashPresenter {
  readonly #window: BrowserWindow;
  readonly #shown: Promise<void>;
  #lastStatus: UpdateStatus | null = null;

  constructor(backgroundColor: string) {
    const window = new BrowserWindow({
      ...SPLASH_WINDOW_OPTIONS,
      backgroundColor,
      webPreferences: {
        preload: SPLASH_PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });
    window.removeMenu();
    this.#shown = new Promise((resolve) => {
      window.once(READY_TO_SHOW_EVENT, () => {
        window.show();
        resolve();
      });
    });
    window.webContents.on(DID_FINISH_LOAD_EVENT, () => this.#resendLastStatus());
    void window.loadFile(SPLASH_ENTRY_PATH);
    this.#window = window;
  }

  shown(): Promise<void> {
    return this.#shown;
  }

  report(status: UpdateStatus): void {
    this.#lastStatus = status;
    this.#send(status);
  }

  close(): void {
    if (this.#window.isDestroyed()) return;
    this.#window.close();
  }

  #resendLastStatus(): void {
    if (this.#lastStatus === null) return;
    this.#send(this.#lastStatus);
  }

  #send(status: UpdateStatus): void {
    if (this.#window.isDestroyed()) return;
    this.#window.webContents.send(IPC_CHANNELS.SPLASH_STATUS, status);
  }
}
