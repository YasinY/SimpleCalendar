import type { SplashPresenter } from './splashPresenter';

export interface SplashFactory {
  create(backgroundColor: string): SplashPresenter;
}
