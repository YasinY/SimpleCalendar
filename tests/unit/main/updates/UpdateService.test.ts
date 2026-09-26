import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateService } from '@main/updates/UpdateService';
import type { UpdaterClient } from '@main/updates/updaterClient';
import { UPDATE_PHASES, type UpdatePhase } from '@shared/updatePhase';
import type { UpdateStatus } from '@shared/updateStatus';

const UPDATER_EVENTS = {
  AVAILABLE: 'update-available',
  NOT_AVAILABLE: 'update-not-available',
  PROGRESS: 'download-progress',
  DOWNLOADED: 'update-downloaded',
  ERROR: 'error'
} as const;
const UPDATE_ERROR_MESSAGE = 'update check failed';
const UPDATE_ERROR = new Error('offline');
const SILENT_INSTALL = true;
const RUN_AFTER_INSTALL = true;
const CHECK_TIMEOUT_MS = 5000;
const INSTALL_DELAY_MS = 300;
const NEW_VERSION = '2.0.0';
const RAW_PERCENT = 42.6;
const ROUNDED_PERCENT = 43;
const DOWNLOAD_START_PERCENT = 0;
const CHECK_RESULT = { updateInfo: { version: NEW_VERSION } };
const CHECKING_STATUS = { phase: UPDATE_PHASES.CHECKING, version: null, percent: null };
const UP_TO_DATE_STATUS = { phase: UPDATE_PHASES.UP_TO_DATE, version: null, percent: null };

type UpdaterListener = (...args: unknown[]) => void;

function createFakeUpdater(checkResult: Promise<unknown>) {
  const listeners = new Map<string, UpdaterListener>();
  return {
    listeners,
    emit: (eventName: string, ...args: unknown[]) => listeners.get(eventName)?.(...args),
    autoDownload: false,
    autoInstallOnAppQuit: false,
    on: vi.fn((eventName: string, listener: UpdaterListener) => {
      listeners.set(eventName, listener);
    }),
    checkForUpdates: vi.fn(() => checkResult),
    quitAndInstall: vi.fn()
  };
}

function createReporter() {
  return { report: vi.fn<(status: UpdateStatus) => void>() };
}

function trackSettled(run: Promise<UpdatePhase>): { settled: () => UpdatePhase | null } {
  let phase: UpdatePhase | null = null;
  void run.then((result) => {
    phase = result;
  });
  return { settled: () => phase };
}

function startService(checkResult: Promise<unknown> = Promise.resolve(CHECK_RESULT)) {
  const updater = createFakeUpdater(checkResult);
  const reporter = createReporter();
  const run = new UpdateService(updater as unknown as UpdaterClient, CHECK_TIMEOUT_MS, INSTALL_DELAY_MS).run(reporter);
  return { updater, reporter, run, ...trackSettled(run) };
}

async function flushPromises(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('UpdateService', () => {
  it('enables automatic download and install on quit, reports checking and checks for updates', () => {
    const { updater, reporter } = startService();

    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
    expect(reporter.report).toHaveBeenCalledExactlyOnceWith(CHECKING_STATUS);
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('reports up to date when the check resolves without a result', async () => {
    const { run, reporter } = startService(Promise.resolve(null));

    await expect(run).resolves.toBe(UPDATE_PHASES.UP_TO_DATE);
    expect(reporter.report).toHaveBeenLastCalledWith(UP_TO_DATE_STATUS);
  });

  it('reports up to date when the check rejects', async () => {
    const { run } = startService(Promise.reject(UPDATE_ERROR));

    await expect(run).resolves.toBe(UPDATE_PHASES.UP_TO_DATE);
  });

  it('keeps waiting for updater events when the check resolves with a result', async () => {
    const { settled } = startService();

    await flushPromises();

    expect(settled()).toBeNull();
  });

  it('reports up to date when no update is available', async () => {
    const { updater, run, reporter } = startService();

    updater.emit(UPDATER_EVENTS.NOT_AVAILABLE);

    await expect(run).resolves.toBe(UPDATE_PHASES.UP_TO_DATE);
    expect(reporter.report).toHaveBeenLastCalledWith(UP_TO_DATE_STATUS);
  });

  it('reports the download start and rounded progress with the available version', () => {
    const { updater, reporter } = startService();

    updater.emit(UPDATER_EVENTS.AVAILABLE, { version: NEW_VERSION });
    updater.emit(UPDATER_EVENTS.PROGRESS, { percent: RAW_PERCENT });

    expect(reporter.report).toHaveBeenNthCalledWith(2, { phase: UPDATE_PHASES.DOWNLOADING, version: NEW_VERSION, percent: DOWNLOAD_START_PERCENT });
    expect(reporter.report).toHaveBeenNthCalledWith(3, { phase: UPDATE_PHASES.DOWNLOADING, version: NEW_VERSION, percent: ROUNDED_PERCENT });
  });

  it('reports installing, resolves and installs silently after the delay', async () => {
    const { updater, run, reporter } = startService();

    updater.emit(UPDATER_EVENTS.DOWNLOADED, { version: NEW_VERSION });

    await expect(run).resolves.toBe(UPDATE_PHASES.INSTALLING);
    expect(reporter.report).toHaveBeenLastCalledWith({ phase: UPDATE_PHASES.INSTALLING, version: NEW_VERSION, percent: null });
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
    vi.advanceTimersByTime(INSTALL_DELAY_MS);
    expect(updater.quitAndInstall).toHaveBeenCalledExactlyOnceWith(SILENT_INSTALL, RUN_AFTER_INSTALL);
  });

  it('logs updater errors and reports up to date', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { updater, run } = startService();

    updater.emit(UPDATER_EVENTS.ERROR, UPDATE_ERROR);

    await expect(run).resolves.toBe(UPDATE_PHASES.UP_TO_DATE);
    expect(consoleError).toHaveBeenCalledWith(UPDATE_ERROR_MESSAGE, UPDATE_ERROR);
  });

  it('reports up to date when the check times out without a download', async () => {
    const { run } = startService();

    vi.advanceTimersByTime(CHECK_TIMEOUT_MS);

    await expect(run).resolves.toBe(UPDATE_PHASES.UP_TO_DATE);
  });

  it('keeps waiting when the timeout fires during a download', async () => {
    const { updater, settled } = startService();
    updater.emit(UPDATER_EVENTS.AVAILABLE, { version: NEW_VERSION });

    vi.advanceTimersByTime(CHECK_TIMEOUT_MS);
    await flushPromises();

    expect(settled()).toBeNull();
  });
});
