import type { UpdateStatus } from '@shared/updateStatus';

export interface UpdateStatusReporter {
  report(status: UpdateStatus): void;
}
