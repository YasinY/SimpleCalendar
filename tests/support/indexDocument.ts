import { readFileSync } from 'node:fs';
import path from 'node:path';

const INDEX_HTML_PATH = path.resolve(__dirname, '../../src/renderer/index.html');
const BODY_PATTERN = /<body>([\s\S]*)<\/body>/;
const SCRIPT_TAG_PATTERN = /<script[\s\S]*?<\/script>/g;
const FIRST_GROUP = 1;
const EMPTY_MARKUP = '';

const bodyMarkup = (BODY_PATTERN.exec(readFileSync(INDEX_HTML_PATH, 'utf8'))?.[FIRST_GROUP] ?? EMPTY_MARKUP).replace(SCRIPT_TAG_PATTERN, EMPTY_MARKUP);

export function mountIndexDocument(): void {
  document.body.innerHTML = bodyMarkup;
}

export function requireById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(id);
  return element as T;
}
