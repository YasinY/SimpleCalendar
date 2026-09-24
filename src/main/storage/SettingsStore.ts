import { readJsonFile, writeJsonFile } from './jsonFile';
import { isPlainObject, pickKnownKeys } from './settingsNormalization';
import type { Settings } from '../../shared/settings';

export class SettingsStore {
  readonly #filePath: string;
  readonly #knownKeys: string[];
  #settings: Settings;

  constructor(filePath: string, defaults: Settings, settings: Settings) {
    this.#filePath = filePath;
    this.#knownKeys = Object.keys(defaults);
    this.#settings = settings;
  }

  static load(filePath: string, defaults: Settings): SettingsStore {
    const stored = readJsonFile<unknown>(filePath, {});
    const known = isPlainObject(stored) ? pickKnownKeys(stored, Object.keys(defaults)) : {};
    return new SettingsStore(filePath, defaults, { ...defaults, ...known });
  }

  getAll(): Settings {
    return { ...this.#settings };
  }

  update(patch: unknown): Settings {
    if (!isPlainObject(patch)) return this.getAll();
    this.#settings = { ...this.#settings, ...pickKnownKeys(patch, this.#knownKeys) };
    writeJsonFile(this.#filePath, this.#settings);
    return this.getAll();
  }
}
