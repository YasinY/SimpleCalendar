export const IPC_CHANNELS = {
  GET_EVENTS: 'events:get',
  SAVE_EVENT: 'events:save',
  SAVE_OCCURRENCE: 'events:save-occurrence',
  DELETE_EVENT: 'events:delete',
  DELETE_OCCURRENCE: 'events:delete-occurrence',
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_TOGGLE_MAXIMIZE: 'window:toggle-maximize',
  WINDOW_HIDE: 'window:hide',
  GET_APP_VERSION: 'app:get-version',
  SPLASH_STATUS: 'splash:status'
} as const;
