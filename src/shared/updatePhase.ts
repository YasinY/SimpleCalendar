export const UPDATE_PHASES = {
  CHECKING: 'checking',
  DOWNLOADING: 'downloading',
  INSTALLING: 'installing',
  UP_TO_DATE: 'up-to-date'
} as const;

export type UpdatePhase = (typeof UPDATE_PHASES)[keyof typeof UPDATE_PHASES];
