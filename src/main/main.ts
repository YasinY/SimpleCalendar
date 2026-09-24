import { app } from 'electron';
import { USER_DATA_ENV_VARIABLE } from './constants';
import { MainApplication } from './MainApplication';
import { TrayManager } from './tray/TrayManager';

const userDataOverride = process.env[USER_DATA_ENV_VARIABLE];
if (userDataOverride) app.setPath('userData', userDataOverride);

new MainApplication(new TrayManager()).run();
