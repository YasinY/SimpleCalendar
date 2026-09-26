import { describe, expect, it } from 'vitest';
import { describeUpdateStatus } from '@renderer/splash/updateStatusText';
import { UPDATE_PHASES } from '@shared/updatePhase';

const VERSION = '2.0.0';
const PERCENT = 43;

describe('describeUpdateStatus', () => {
  it('describes the update check', () => {
    expect(describeUpdateStatus({ phase: UPDATE_PHASES.CHECKING, version: null, percent: null })).toBe('Suche nach Updates …');
  });

  it('describes a download with version and progress', () => {
    expect(describeUpdateStatus({ phase: UPDATE_PHASES.DOWNLOADING, version: VERSION, percent: PERCENT })).toBe('Lade Update 2.0.0 … 43 %');
  });

  it('describes a download without progress', () => {
    expect(describeUpdateStatus({ phase: UPDATE_PHASES.DOWNLOADING, version: VERSION, percent: null })).toBe('Lade Update 2.0.0');
  });

  it('leaves out an unknown version', () => {
    expect(describeUpdateStatus({ phase: UPDATE_PHASES.INSTALLING, version: null, percent: null })).toBe('Installiere Update ');
  });

  it('describes the installation', () => {
    expect(describeUpdateStatus({ phase: UPDATE_PHASES.INSTALLING, version: VERSION, percent: null })).toBe('Installiere Update 2.0.0');
  });

  it('describes an up to date app', () => {
    expect(describeUpdateStatus({ phase: UPDATE_PHASES.UP_TO_DATE, version: null, percent: null })).toBe('Alles aktuell');
  });
});
