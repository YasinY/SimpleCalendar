import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CoverageReport } from 'monocart-coverage-reports';
import { MAIN_RAW_COVERAGE_DIR, RENDERER_RAW_COVERAGE_DIR, REPORT_DIR } from './coveragePaths';

const REPORT_NAME = 'SimpleCalendar E2E';
const BUNDLE_PATH_PATTERN = /[\\/]out[\\/](main|renderer)[\\/]/;
const SOURCE_PATH_PATTERN = /(^|[\\/])src[\\/](main|renderer|shared)[\\/]/;
const NODE_MODULES_SEGMENT = 'node_modules';
const SOURCE_ROOT = 'src/';
const UNCOVERED_COUNT = 0;
const LINE_LIST_SEPARATOR = ', ';

const RUNTIME_DEAD_LINES: Record<string, number[]> = {
  'src/main/reminders/reminderRules.ts': [20, 21],
  'src/main/reminders/ReminderScheduler.ts': [18],
  'src/main/storage/schema.ts': [27, 36],
  'src/main/tray/TrayManager.ts': [9],
  'src/main/updates/UpdateService.ts': [20],
  'src/renderer/events/eventPill.ts': [19]
};

interface RawCoverageEntry {
  url: string;
  functions: unknown[];
  source?: string;
}

interface NodeCoverageFile {
  result: RawCoverageEntry[];
}

interface FileResult {
  sourcePath: string;
  data: { lines: Record<string, number | string> };
}

function readJsonFiles<T>(directory: string): T[] {
  return readdirSync(directory).map((name) => JSON.parse(readFileSync(path.join(directory, name), 'utf8')) as T);
}

function isBundleEntry(entry: RawCoverageEntry): boolean {
  return BUNDLE_PATH_PATTERN.test(entry.url);
}

function withSource(entry: RawCoverageEntry): RawCoverageEntry {
  if (entry.source !== undefined) return entry;
  return { ...entry, source: readFileSync(fileURLToPath(entry.url), 'utf8') };
}

function collectEntries(): RawCoverageEntry[] {
  const mainEntries = readJsonFiles<NodeCoverageFile>(MAIN_RAW_COVERAGE_DIR).flatMap((file) => file.result);
  const rendererEntries = readJsonFiles<RawCoverageEntry[]>(RENDERER_RAW_COVERAGE_DIR).flat();
  return [...mainEntries, ...rendererEntries].filter(isBundleEntry).map(withSource);
}

function toSourceRelativePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const index = normalized.lastIndexOf(SOURCE_ROOT);
  return index === -1 ? normalized : normalized.slice(index);
}

function isIncomplete(count: number | string): boolean {
  return typeof count === 'string' || count === UNCOVERED_COUNT;
}

function incompleteLines({ data }: FileResult): number[] {
  return Object.entries(data.lines)
    .filter(([, count]) => isIncomplete(count))
    .map(([line]) => Number(line))
    .sort((first, second) => first - second);
}

function sameLines(first: number[], second: number[]): boolean {
  return first.length === second.length && first.every((line, index) => line === second[index]);
}

function findUnexpectedGaps(files: FileResult[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    const actual = incompleteLines(file);
    const expected = RUNTIME_DEAD_LINES[file.sourcePath] ?? [];
    if (sameLines(actual, expected)) continue;
    failures.push(file.sourcePath + ': incomplete lines ' + actual.join(LINE_LIST_SEPARATOR) + ', expected ' + expected.join(LINE_LIST_SEPARATOR));
  }
  return failures;
}

export async function generateCoverageReport(): Promise<void> {
  const report = new CoverageReport({
    name: REPORT_NAME,
    outputDir: REPORT_DIR,
    reports: [['v8'], ['console-details'], ['json-summary']],
    sourceFilter: (sourcePath) => SOURCE_PATH_PATTERN.test(sourcePath) && !sourcePath.includes(NODE_MODULES_SEGMENT),
    sourcePath: toSourceRelativePath,
    cleanCache: true
  });
  await report.add(collectEntries());
  const results = await report.generate();
  if (!results) throw new Error('e2e coverage produced no results');

  const failures = findUnexpectedGaps(results.files as unknown as FileResult[]);
  if (failures.length === 0) return;
  throw new Error('e2e coverage has unexpected gaps:\n' + failures.join('\n'));
}
