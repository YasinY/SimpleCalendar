import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashWindow } from '@main/startup/SplashWindow';
import { splashWindowFactory } from '@main/startup/splashWindowFactory';
import { FakeBrowserWindow, resetElectronMock } from '@tests/support/electronMock';

vi.mock('electron', async () => (await import('@tests/support/electronMock')).electronMock);

const BACKGROUND_COLOR = '#ffffff';
const FIRST_INDEX = 0;

describe('splashWindowFactory', () => {
  beforeEach(() => {
    resetElectronMock();
  });

  it('creates a splash window with the given background color', () => {
    const splash = splashWindowFactory.create(BACKGROUND_COLOR);

    expect(splash).toBeInstanceOf(SplashWindow);
    expect(FakeBrowserWindow.instances[FIRST_INDEX].options).toMatchObject({ backgroundColor: BACKGROUND_COLOR });
  });
});
