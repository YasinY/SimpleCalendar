import type { SplashFactory } from './splashFactory';
import type { StartupOptions } from './startupOptions';
import type { UpdateRunner } from '@main/updates/updateRunner';
import { UPDATE_PHASES, type UpdatePhase } from '@shared/updatePhase';

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

export class StartupSequence {
  readonly #splashFactory: SplashFactory;
  readonly #updateRunner: UpdateRunner;
  readonly #minimumDurationMs: number;

  constructor(splashFactory: SplashFactory, updateRunner: UpdateRunner, minimumDurationMs: number) {
    this.#splashFactory = splashFactory;
    this.#updateRunner = updateRunner;
    this.#minimumDurationMs = minimumDurationMs;
  }

  async run({ autoUpdate, backgroundColor, openMainWindow, onFinished }: StartupOptions): Promise<void> {
    const splash = this.#splashFactory.create(backgroundColor);
    const minimumElapsed = wait(this.#minimumDurationMs);
    await splash.shown();
    const mainWindowLoaded = openMainWindow();
    const phase: UpdatePhase = autoUpdate ? await this.#updateRunner.run(splash) : UPDATE_PHASES.UP_TO_DATE;
    if (phase === UPDATE_PHASES.INSTALLING) return;
    await Promise.all([minimumElapsed, mainWindowLoaded]);
    splash.close();
    onFinished();
  }
}
