import path from 'node:path';

const COVERAGE_DIR_ENV_VARIABLE = 'E2E_COVERAGE_DIR';
const DEFAULT_COVERAGE_DIR = 'coverage-e2e';
const RAW_DIR_NAME = 'raw';
const REPORT_DIR_NAME = 'report';
const MAIN_RAW_DIR_NAME = 'main';
const RENDERER_RAW_DIR_NAME = 'renderer';

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
export const COVERAGE_DIR = path.resolve(PROJECT_ROOT, process.env[COVERAGE_DIR_ENV_VARIABLE] ?? DEFAULT_COVERAGE_DIR);
export const REPORT_DIR = path.join(COVERAGE_DIR, REPORT_DIR_NAME);
export const RAW_COVERAGE_DIR = path.join(COVERAGE_DIR, RAW_DIR_NAME);
export const MAIN_RAW_COVERAGE_DIR = path.join(RAW_COVERAGE_DIR, MAIN_RAW_DIR_NAME);
export const RENDERER_RAW_COVERAGE_DIR = path.join(RAW_COVERAGE_DIR, RENDERER_RAW_DIR_NAME);
