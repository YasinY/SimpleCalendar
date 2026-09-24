import { mkdirSync, rmSync } from 'node:fs';
import { MAIN_RAW_COVERAGE_DIR, RAW_COVERAGE_DIR, RENDERER_RAW_COVERAGE_DIR } from './coveragePaths';

export default function globalSetup(): void {
  rmSync(RAW_COVERAGE_DIR, { recursive: true, force: true });
  mkdirSync(MAIN_RAW_COVERAGE_DIR, { recursive: true });
  mkdirSync(RENDERER_RAW_COVERAGE_DIR, { recursive: true });
}
