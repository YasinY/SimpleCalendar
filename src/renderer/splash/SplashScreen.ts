import { NO_PERCENT, PERCENT_UNIT, SPLASH_CSS_CLASSES, STATUS_TEXTS, VERSION_PREFIX } from './splashConstants';
import type { SplashElements } from './splashElements';
import { describeUpdateStatus } from './updateStatusText';
import { UPDATE_PHASES } from '@shared/updatePhase';
import type { UpdateStatus } from '@shared/updateStatus';

export class SplashScreen {
  readonly #elements: SplashElements;

  constructor(elements: SplashElements) {
    this.#elements = elements;
    elements.status.textContent = STATUS_TEXTS.STARTING;
  }

  showVersion(version: string): void {
    this.#elements.version.textContent = VERSION_PREFIX + version;
  }

  apply(status: UpdateStatus): void {
    const { logo, status: statusLabel, progress, progressBar } = this.#elements;
    statusLabel.textContent = describeUpdateStatus(status);
    logo.classList.toggle(SPLASH_CSS_CLASSES.LOGO_BUSY, status.phase !== UPDATE_PHASES.UP_TO_DATE);
    const downloading = status.phase === UPDATE_PHASES.DOWNLOADING;
    progress.hidden = !downloading;
    if (!downloading) return;
    progressBar.style.width = (status.percent ?? NO_PERCENT) + PERCENT_UNIT;
  }
}
