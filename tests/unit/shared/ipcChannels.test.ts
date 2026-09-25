import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from '@shared/ipcChannels';

const EXPECTED_CHANNELS = {
  GET_EVENTS: 'events:get',
  SAVE_EVENT: 'events:save',
  SAVE_OCCURRENCE: 'events:save-occurrence',
  DELETE_EVENT: 'events:delete',
  DELETE_OCCURRENCE: 'events:delete-occurrence',
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_TOGGLE_MAXIMIZE: 'window:toggle-maximize',
  WINDOW_HIDE: 'window:hide'
};

describe('IPC_CHANNELS', () => {
  it('exposes the documented channel names', () => {
    expect(IPC_CHANNELS).toEqual(EXPECTED_CHANNELS);
  });

  it('uses unique channel names', () => {
    const channels = Object.values(IPC_CHANNELS);
    expect(new Set(channels).size).toBe(channels.length);
  });
});
