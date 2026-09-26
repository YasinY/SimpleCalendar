import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashWindow } from '@main/startup/SplashWindow';
import { SPLASH_ENTRY_PATH, SPLASH_PRELOAD_PATH, SPLASH_WINDOW_OPTIONS } from '@main/startup/startupConstants';
import { IPC_CHANNELS } from '@shared/ipcChannels';
import { UPDATE_PHASES } from '@shared/updatePhase';
import type { UpdateStatus } from '@shared/updateStatus';
import { FakeBrowserWindow, invokeListener, resetElectronMock, webContentsListeners, windowListeners } from '@tests/support/electronMock';

vi.mock('electron', async () => (await import('@tests/support/electronMock')).electronMock);

const BACKGROUND_COLOR = '#1c1c1e';
const READY_TO_SHOW = 'ready-to-show';
const DID_FINISH_LOAD = 'did-finish-load';
const FIRST_INDEX = 0;
const STATUS: UpdateStatus = { phase: UPDATE_PHASES.CHECKING, version: null, percent: null };

function browserWindow(): FakeBrowserWindow {
  return FakeBrowserWindow.instances[FIRST_INDEX];
}

describe('SplashWindow', () => {
  beforeEach(() => {
    resetElectronMock();
  });

  it('creates a frameless window with the background color and loads the splash page', () => {
    new SplashWindow(BACKGROUND_COLOR);

    expect(browserWindow().options).toMatchObject({
      ...SPLASH_WINDOW_OPTIONS,
      backgroundColor: BACKGROUND_COLOR,
      webPreferences: { preload: SPLASH_PRELOAD_PATH, contextIsolation: true, nodeIntegration: false }
    });
    expect(browserWindow().removeMenu).toHaveBeenCalledTimes(1);
    expect(browserWindow().loadFile).toHaveBeenCalledWith(SPLASH_ENTRY_PATH);
  });

  it('shows the window once it is ready and resolves shown', async () => {
    const splash = new SplashWindow(BACKGROUND_COLOR);
    const shown = splash.shown();

    invokeListener(windowListeners, READY_TO_SHOW);

    expect(browserWindow().show).toHaveBeenCalledTimes(1);
    await expect(shown).resolves.toBeUndefined();
  });

  it('sends reported statuses to the renderer', () => {
    const splash = new SplashWindow(BACKGROUND_COLOR);

    splash.report(STATUS);

    expect(browserWindow().webContents.send).toHaveBeenCalledExactlyOnceWith(IPC_CHANNELS.SPLASH_STATUS, STATUS);
  });

  it('resends the last status after the page finished loading', () => {
    const splash = new SplashWindow(BACKGROUND_COLOR);
    splash.report(STATUS);

    invokeListener(webContentsListeners, DID_FINISH_LOAD);

    expect(browserWindow().webContents.send).toHaveBeenCalledTimes(2);
    expect(browserWindow().webContents.send).toHaveBeenLastCalledWith(IPC_CHANNELS.SPLASH_STATUS, STATUS);
  });

  it('sends nothing after loading when no status was reported yet', () => {
    new SplashWindow(BACKGROUND_COLOR);

    invokeListener(webContentsListeners, DID_FINISH_LOAD);

    expect(browserWindow().webContents.send).not.toHaveBeenCalled();
  });

  it('closes the window', () => {
    const splash = new SplashWindow(BACKGROUND_COLOR);

    splash.close();

    expect(browserWindow().close).toHaveBeenCalledTimes(1);
  });

  it('ignores reports and close requests once the window is destroyed', () => {
    const splash = new SplashWindow(BACKGROUND_COLOR);
    browserWindow().isDestroyed.mockReturnValue(true);

    splash.report(STATUS);
    splash.close();

    expect(browserWindow().webContents.send).not.toHaveBeenCalled();
    expect(browserWindow().close).not.toHaveBeenCalled();
  });
});
