import type { UpdateStatusReporter } from './updateStatusReporter';
import type { UpdatePhase } from '@shared/updatePhase';

export interface UpdateRunner {
  run(reporter: UpdateStatusReporter): Promise<UpdatePhase>;
}
