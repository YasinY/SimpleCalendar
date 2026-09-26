import { readFileSync } from 'node:fs';
import path from 'node:path';

const RENDERER_DIR = path.resolve(__dirname, '../../src/renderer');
const INDEX_HTML_FILE = 'index.html';
const SPLASH_HTML_FILE = 'splash.html';
const BODY_PATTERN = /<body>([\s\S]*)<\/body>/;
const SCRIPT_TAG_PATTERN = /<script[\s\S]*?<\/script>/g;
const FIRST_GROUP = 1;
const EMPTY_MARKUP = '';

function readBodyMarkup(fileName: string): string {
  const html = readFileSync(path.join(RENDERER_DIR, fileName), 'utf8');
  return (BODY_PATTERN.exec(html)?.[FIRST_GROUP] ?? EMPTY_MARKUP).replace(SCRIPT_TAG_PATTERN, EMPTY_MARKUP);
}

const indexBodyMarkup = readBodyMarkup(INDEX_HTML_FILE);
const splashBodyMarkup = readBodyMarkup(SPLASH_HTML_FILE);

export function mountIndexDocument(): void {
  document.body.innerHTML = indexBodyMarkup;
}

export function mountSplashDocument(): void {
  document.body.innerHTML = splashBodyMarkup;
}

export function requireById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(id);
  return element as T;
}
