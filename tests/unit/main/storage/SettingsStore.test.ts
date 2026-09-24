import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SettingsStore } from '../../../../src/main/storage/SettingsStore';
import { DEFAULT_SETTINGS } from '../../../../src/shared/settingsDefaults';

let directory: string;
let filePath: string;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'simplecalendar-settings-'));
  filePath = path.join(directory, 'settings.json');
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('SettingsStore', () => {
  it('starts with defaults when nothing is stored', () => {
    expect(SettingsStore.load(filePath, DEFAULT_SETTINGS).getAll()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored values over defaults and ignores unknown keys', () => {
    writeFileSync(filePath, JSON.stringify({ theme: 'dark', bogus: true }));
    const settings = SettingsStore.load(filePath, DEFAULT_SETTINGS).getAll();
    expect(settings.theme).toBe('dark');
    expect(settings.holidayRegion).toBe('');
    expect('bogus' in settings).toBe(false);
  });

  it('persists partial updates and drops unknown keys', () => {
    const store = SettingsStore.load(filePath, DEFAULT_SETTINGS);
    store.update({ weatherCity: 'Hamburg', nope: 1 } as unknown as Record<string, unknown>);
    const reloaded = SettingsStore.load(filePath, DEFAULT_SETTINGS).getAll();
    expect(reloaded.weatherCity).toBe('Hamburg');
    expect('nope' in reloaded).toBe(false);
  });

  it('ignores patches that are not plain objects', () => {
    const store = SettingsStore.load(filePath, DEFAULT_SETTINGS);
    expect(store.update(null)).toEqual(DEFAULT_SETTINGS);
    expect(store.update(['x'])).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when the stored json is not a plain object', () => {
    writeFileSync(filePath, JSON.stringify([1, 2]));
    expect(SettingsStore.load(filePath, DEFAULT_SETTINGS).getAll()).toEqual(DEFAULT_SETTINGS);

    writeFileSync(filePath, JSON.stringify('text'));
    expect(SettingsStore.load(filePath, DEFAULT_SETTINGS).getAll()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults on a corrupt file', () => {
    writeFileSync(filePath, '{not json');
    expect(SettingsStore.load(filePath, DEFAULT_SETTINGS).getAll()).toEqual(DEFAULT_SETTINGS);
  });
});
