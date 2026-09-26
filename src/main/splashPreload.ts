import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipcChannels';
import type { SplashApi, UpdateStatusListener } from '@shared/splashApi';
import type { UpdateStatus } from '@shared/updateStatus';

const splashApi: SplashApi = {
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
  onStatus: (listener: UpdateStatusListener) => {
    ipcRenderer.on(IPC_CHANNELS.SPLASH_STATUS, (_event, status: UpdateStatus) => listener(status));
  }
};

contextBridge.exposeInMainWorld('splashApi', splashApi);
