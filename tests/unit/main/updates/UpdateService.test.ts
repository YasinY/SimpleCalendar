import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpdateService } from '@main/updates/UpdateService';
import type { UpdaterClient } from '@main/updates/updaterClient';

const UPDATE_DOWNLOADED_EVENT = 'update-downloaded';
const UPDATE_ERROR_EVENT = 'error';
const UPDATE_ERROR_MESSAGE = 'update check failed';
const UPDATE_ERROR = new Error('offline');
const SILENT_INSTALL = true;
const RUN_AFTER_INSTALL = true;

type UpdaterListener = (...args: unknown[]) => void;

function createFakeUpdater(checkResult: Promise<unknown>) {
  const listeners = new Map<string, UpdaterListener>();
  return {
    listeners,
    autoDownload: false,
    autoInstallOnAppQuit: false,
    on: vi.fn((eventName: string, listener: UpdaterListener) => {
      listeners.set(eventName, listener);
    }),
    checkForUpdates: vi.fn(() => checkResult),
    quitAndInstall: vi.fn()
  };
}

function startService(checkResult: Promise<unknown> = Promise.resolve(null)) {
  const updater = createFakeUpdater(checkResult);
  new UpdateService(updater as unknown as UpdaterClient).start();
  return updater;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('UpdateService', () => {
  it('enables automatic download and install on quit and checks for updates', () => {
    const updater = startService();

    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('swallows a failed update check', async () => {
    const updater = startService(Promise.reject(UPDATE_ERROR));

    await expect(flushPromises()).resolves.toBeUndefined();
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('installs silently and restarts once an update was downloaded', () => {
    const updater = startService();

    updater.listeners.get(UPDATE_DOWNLOADED_EVENT)?.();

    expect(updater.quitAndInstall).toHaveBeenCalledWith(SILENT_INSTALL, RUN_AFTER_INSTALL);
  });

  it('logs updater errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const updater = startService();

    updater.listeners.get(UPDATE_ERROR_EVENT)?.(UPDATE_ERROR);

    expect(consoleError).toHaveBeenCalledWith(UPDATE_ERROR_MESSAGE, UPDATE_ERROR);
  });
});
