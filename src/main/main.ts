import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { USER_DATA_ENV_VARIABLE } from './constants';
import { MainApplication } from './MainApplication';
import { TrayManager } from './tray/TrayManager';
import { UpdateService } from './updates/UpdateService';

const userDataOverride = process.env[USER_DATA_ENV_VARIABLE];
if (userDataOverride) app.setPath('userData', userDataOverride);

new MainApplication(new TrayManager(), new UpdateService(autoUpdater)).run();
