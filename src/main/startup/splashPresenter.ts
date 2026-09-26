import type { UpdateStatusReporter } from '@main/updates/updateStatusReporter';

export interface SplashPresenter extends UpdateStatusReporter {
  shown(): Promise<void>;
  close(): void;
}
