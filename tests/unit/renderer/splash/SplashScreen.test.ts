import { beforeEach, describe, expect, it } from 'vitest';
import { querySplashElements } from '@renderer/splash/querySplashElements';
import { SplashScreen } from '@renderer/splash/SplashScreen';
import type { SplashElements } from '@renderer/splash/splashElements';
import { UPDATE_PHASES } from '@shared/updatePhase';
import { mountSplashDocument } from '@tests/support/indexDocument';

const BUSY_CLASS = 'logo--busy';
const VERSION = '1.2.3';
const NEW_VERSION = '2.0.0';
const PERCENT = 43;

interface Fixture {
  screen: SplashScreen;
  elements: SplashElements;
}

function createFixture(): Fixture {
  const elements = querySplashElements();
  return { screen: new SplashScreen(elements), elements };
}

describe('SplashScreen', () => {
  beforeEach(() => {
    mountSplashDocument();
  });

  it('shows the starting text initially', () => {
    const { elements } = createFixture();

    expect(elements.status.textContent).toBe('Starte …');
    expect(elements.progress.hidden).toBe(true);
  });

  it('shows the app version', () => {
    const { screen, elements } = createFixture();

    screen.showVersion(VERSION);

    expect(elements.version.textContent).toBe('Version 1.2.3');
  });

  it('marks the logo busy while checking and hides the progress', () => {
    const { screen, elements } = createFixture();

    screen.apply({ phase: UPDATE_PHASES.CHECKING, version: null, percent: null });

    expect(elements.status.textContent).toBe('Suche nach Updates …');
    expect(elements.logo.classList.contains(BUSY_CLASS)).toBe(true);
    expect(elements.progress.hidden).toBe(true);
  });

  it('shows the download progress', () => {
    const { screen, elements } = createFixture();

    screen.apply({ phase: UPDATE_PHASES.DOWNLOADING, version: NEW_VERSION, percent: PERCENT });

    expect(elements.progress.hidden).toBe(false);
    expect(elements.progressBar.style.width).toBe('43%');
  });

  it('shows an empty progress bar without a known percentage', () => {
    const { screen, elements } = createFixture();

    screen.apply({ phase: UPDATE_PHASES.DOWNLOADING, version: NEW_VERSION, percent: null });

    expect(elements.progressBar.style.width).toBe('0%');
  });

  it('settles the logo and hides the progress when up to date', () => {
    const { screen, elements } = createFixture();
    screen.apply({ phase: UPDATE_PHASES.DOWNLOADING, version: NEW_VERSION, percent: PERCENT });

    screen.apply({ phase: UPDATE_PHASES.UP_TO_DATE, version: null, percent: null });

    expect(elements.status.textContent).toBe('Alles aktuell');
    expect(elements.logo.classList.contains(BUSY_CLASS)).toBe(false);
    expect(elements.progress.hidden).toBe(true);
  });
});
