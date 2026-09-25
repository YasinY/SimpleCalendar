import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipcChannels';
import type { CalendarApi } from '@shared/calendarApi';
import type { DateRange } from '@shared/dateRange';
import type { EventInput } from '@shared/eventInput';
import type { OccurrenceRef } from '@shared/occurrenceRef';
import type { Settings } from '@shared/settings';

function notifyMain(channel: string): () => void {
  return () => ipcRenderer.send(channel);
}

const calendarApi: CalendarApi = {
  getEvents: (range: DateRange) => ipcRenderer.invoke(IPC_CHANNELS.GET_EVENTS, range),
  saveEvent: (event: EventInput) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_EVENT, event),
  saveOccurrence: (event: EventInput) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_OCCURRENCE, event),
  deleteEvent: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_EVENT, id),
  deleteOccurrence: (ref: OccurrenceRef) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_OCCURRENCE, ref),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  updateSettings: (patch: Partial<Settings>) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, patch),
  minimizeWindow: notifyMain(IPC_CHANNELS.WINDOW_MINIMIZE),
  toggleMaximizeWindow: notifyMain(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),
  hideWindow: notifyMain(IPC_CHANNELS.WINDOW_HIDE)
};

contextBridge.exposeInMainWorld('calendarApi', calendarApi);
