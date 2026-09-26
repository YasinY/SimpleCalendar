import { SplashWindow } from './SplashWindow';
import type { SplashFactory } from './splashFactory';

export const splashWindowFactory: SplashFactory = {
  create: (backgroundColor) => new SplashWindow(backgroundColor)
};
