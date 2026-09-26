import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StartupSequence } from '@main/startup/StartupSequence';
import type { SplashFactory } from '@main/startup/splashFactory';
import type { SplashPresenter } from '@main/startup/splashPresenter';
import type { UpdateRunner } from '@main/updates/updateRunner';
import { UPDATE_PHASES, type UpdatePhase } from '@shared/updatePhase';

const MINIMUM_DURATION_MS = 1000;
const HALF_DURATION_MS = MINIMUM_DURATION_MS / 2;
const BACKGROUND_COLOR = '#ffffff';

interface Fixture {
  splash: SplashPresenter & { close: ReturnType<typeof vi.fn> };
  splashFactory: SplashFactory & { create: ReturnType<typeof vi.fn> };
  updateRunner: UpdateRunner & { run: ReturnType<typeof vi.fn> };
  openMainWindow: ReturnType<typeof vi.fn>;
  onFinished: ReturnType<typeof vi.fn>;
  resolveShown: () => void;
  resolveLoaded: () => void;
  run: (autoUpdate?: boolean) => Promise<void>;
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function createFixture(phase: UpdatePhase = UPDATE_PHASES.UP_TO_DATE): Fixture {
  const shown = deferred();
  const loaded = deferred();
  const splash = { report: vi.fn(), shown: vi.fn(() => shown.promise), close: vi.fn() };
  const splashFactory = { create: vi.fn(() => splash) };
  const updateRunner = { run: vi.fn(async () => phase) };
  const openMainWindow = vi.fn(() => loaded.promise);
  const onFinished = vi.fn();
  const sequence = new StartupSequence(splashFactory, updateRunner, MINIMUM_DURATION_MS);
  return {
    splash,
    splashFactory,
    updateRunner,
    openMainWindow,
    onFinished,
    resolveShown: shown.resolve,
    resolveLoaded: loaded.resolve,
    run: (autoUpdate = true) => sequence.run({ autoUpdate, backgroundColor: BACKGROUND_COLOR, openMainWindow, onFinished })
  };
}

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StartupSequence', () => {
  it('creates the splash with the background color and opens the main window only once the splash is shown', async () => {
    const fixture = createFixture();

    void fixture.run();
    await settle();
    expect(fixture.splashFactory.create).toHaveBeenCalledExactlyOnceWith(BACKGROUND_COLOR);
    expect(fixture.openMainWindow).not.toHaveBeenCalled();
    fixture.resolveShown();
    await settle();

    expect(fixture.openMainWindow).toHaveBeenCalledTimes(1);
    expect(fixture.updateRunner.run).toHaveBeenCalledExactlyOnceWith(fixture.splash);
  });

  it('closes the splash and finishes once the minimum duration passed and the window loaded', async () => {
    const fixture = createFixture();
    const run = fixture.run();
    fixture.resolveShown();
    fixture.resolveLoaded();

    await vi.advanceTimersByTimeAsync(HALF_DURATION_MS);
    expect(fixture.splash.close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(HALF_DURATION_MS);

    await run;
    expect(fixture.splash.close).toHaveBeenCalledTimes(1);
    expect(fixture.onFinished).toHaveBeenCalledTimes(1);
  });

  it('waits for the main window to load even after the minimum duration', async () => {
    const fixture = createFixture();
    const run = fixture.run();
    fixture.resolveShown();

    await vi.advanceTimersByTimeAsync(MINIMUM_DURATION_MS);
    expect(fixture.onFinished).not.toHaveBeenCalled();
    fixture.resolveLoaded();

    await run;
    expect(fixture.onFinished).toHaveBeenCalledTimes(1);
  });

  it('skips the update check when automatic updates are disabled', async () => {
    const fixture = createFixture();
    fixture.resolveShown();
    fixture.resolveLoaded();

    const run = fixture.run(false);
    await vi.advanceTimersByTimeAsync(MINIMUM_DURATION_MS);
    await run;

    expect(fixture.updateRunner.run).not.toHaveBeenCalled();
    expect(fixture.splash.close).toHaveBeenCalledTimes(1);
    expect(fixture.onFinished).toHaveBeenCalledTimes(1);
  });

  it('keeps the splash open and does not finish while an update is installing', async () => {
    const fixture = createFixture(UPDATE_PHASES.INSTALLING);
    fixture.resolveShown();
    fixture.resolveLoaded();

    const run = fixture.run();
    await vi.advanceTimersByTimeAsync(MINIMUM_DURATION_MS);
    await run;

    expect(fixture.splash.close).not.toHaveBeenCalled();
    expect(fixture.onFinished).not.toHaveBeenCalled();
  });
});
