import type { UpdateStatus } from './updateStatus';

export type UpdateStatusListener = (status: UpdateStatus) => void;

export interface SplashApi {
  getVersion(): Promise<string>;
  onStatus(listener: UpdateStatusListener): void;
}
