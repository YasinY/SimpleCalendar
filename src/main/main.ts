import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { USER_DATA_ENV_VARIABLE } from './constants';
import { MainApplication } from './MainApplication';
import { resolveSplashMinimumDuration } from './startup/splashDuration';
import { splashWindowFactory } from './startup/splashWindowFactory';
import { INSTALL_DELAY_MS, UPDATE_CHECK_TIMEOUT_MS } from './startup/startupConstants';
import { StartupSequence } from './startup/StartupSequence';
import { TrayManager } from './tray/TrayManager';
import { UpdateService } from './updates/UpdateService';

const userDataOverride = process.env[USER_DATA_ENV_VARIABLE];
if (userDataOverride) app.setPath('userData', userDataOverride);

const updateService = new UpdateService(autoUpdater, UPDATE_CHECK_TIMEOUT_MS, INSTALL_DELAY_MS);
const startup = new StartupSequence(splashWindowFactory, updateService, resolveSplashMinimumDuration(process.env));
new MainApplication(new TrayManager(), startup).run();
