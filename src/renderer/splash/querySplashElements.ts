import { SPLASH_ELEMENT_IDS } from './splashConstants';
import type { SplashElements } from './splashElements';
import { requireElementById } from '@renderer/dom/elements';

export function querySplashElements(): SplashElements {
  return {
    logo: requireElementById(SPLASH_ELEMENT_IDS.LOGO),
    status: requireElementById(SPLASH_ELEMENT_IDS.STATUS),
    progress: requireElementById(SPLASH_ELEMENT_IDS.PROGRESS),
    progressBar: requireElementById(SPLASH_ELEMENT_IDS.PROGRESS_BAR),
    version: requireElementById(SPLASH_ELEMENT_IDS.VERSION)
  };
}
