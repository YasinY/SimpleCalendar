import fs from 'node:fs';
import path from 'node:path';

const JSON_INDENT = 2;
const FILE_ENCODING = 'utf8';

export function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, FILE_ENCODING)) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, JSON_INDENT), FILE_ENCODING);
}
