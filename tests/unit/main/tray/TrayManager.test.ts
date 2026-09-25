import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Menu, Tray, nativeImage, type MenuItemConstructorOptions } from 'electron';
import { TRAY_ICON_PATH, TRAY_LABELS, TRAY_TOOLTIP } from '@main/constants';
import { TrayManager } from '@main/tray/TrayManager';

const CLICK_EVENT = 'click';
const SEPARATOR_TYPE = 'separator';
const MENU_ITEM_COUNT = 3;
const OPEN_ITEM_INDEX = 0;
const SEPARATOR_INDEX = 1;
const QUIT_ITEM_INDEX = 2;

vi.mock('electron', () => ({
  Tray: vi.fn(function (this: Record<string, unknown>) {
    this.setToolTip = vi.fn();
    this.setContextMenu = vi.fn();
    this.on = vi.fn();
    this.destroy = vi.fn();
  }),
  Menu: { buildFromTemplate: vi.fn(() => ({})) },
  nativeImage: { createFromPath: vi.fn(() => ({})) }
}));

const onOpen = vi.fn();
const onQuit = vi.fn();
const handlers = { onOpen, onQuit };

let manager: TrayManager;

function menuTemplate(): MenuItemConstructorOptions[] {
  return vi.mocked(Menu.buildFromTemplate).mock.calls[0][0] as MenuItemConstructorOptions[];
}

function clickMenuItem(item: MenuItemConstructorOptions): void {
  (item.click as () => void)();
}

beforeEach(() => {
  vi.clearAllMocks();
  manager = new TrayManager();
});

describe('TrayManager', () => {
  it('creates a tray with icon, tooltip, context menu and click handler', () => {
    const tray = manager.create(handlers);
    const icon = vi.mocked(nativeImage.createFromPath).mock.results[0].value;
    const menu = vi.mocked(Menu.buildFromTemplate).mock.results[0].value;

    expect(nativeImage.createFromPath).toHaveBeenCalledWith(TRAY_ICON_PATH);
    expect(Tray).toHaveBeenCalledWith(icon);
    expect(tray.setToolTip).toHaveBeenCalledWith(TRAY_TOOLTIP);
    expect(tray.setContextMenu).toHaveBeenCalledWith(menu);
    expect(tray.on).toHaveBeenCalledWith(CLICK_EVENT, onOpen);
  });

  it('builds a menu with open, separator and quit entries', () => {
    manager.create(handlers);
    const template = menuTemplate();

    expect(template).toHaveLength(MENU_ITEM_COUNT);
    expect(template[OPEN_ITEM_INDEX].label).toBe(TRAY_LABELS.OPEN);
    expect(template[SEPARATOR_INDEX].type).toBe(SEPARATOR_TYPE);
    expect(template[QUIT_ITEM_INDEX].label).toBe(TRAY_LABELS.QUIT);
  });

  it('invokes the handlers from the menu entries', () => {
    manager.create(handlers);
    const template = menuTemplate();

    clickMenuItem(template[OPEN_ITEM_INDEX]);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onQuit).not.toHaveBeenCalled();

    clickMenuItem(template[QUIT_ITEM_INDEX]);
    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it('returns the existing tray when created twice', () => {
    const first = manager.create(handlers);
    const second = manager.create(handlers);

    expect(second).toBe(first);
    expect(Tray).toHaveBeenCalledTimes(1);
  });

  it('destroys the tray and allows creating a new one afterwards', () => {
    const first = manager.create(handlers);
    manager.destroy();
    const second = manager.create(handlers);

    expect(first.destroy).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(first);
    expect(Tray).toHaveBeenCalledTimes(2);
  });

  it('does nothing when destroying without a tray', () => {
    expect(() => manager.destroy()).not.toThrow();
    expect(Tray).not.toHaveBeenCalled();
  });
});
