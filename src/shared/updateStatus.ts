import type { UpdatePhase } from './updatePhase';

export interface UpdateStatus {
  phase: UpdatePhase;
  version: string | null;
  percent: number | null;
}
