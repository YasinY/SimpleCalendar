import { Menu, Tray, nativeImage } from 'electron';
import { TRAY_ICON_PATH, TRAY_LABELS, TRAY_TOOLTIP } from '@main/constants';
import type { TrayHandlers } from './trayHandlers';

export class TrayManager {
  #tray: Tray | null = null;

  create({ onOpen, onQuit }: TrayHandlers): Tray {
    if (this.#tray) return this.#tray;
    this.#tray = new Tray(nativeImage.createFromPath(TRAY_ICON_PATH));
    this.#tray.setToolTip(TRAY_TOOLTIP);
    this.#tray.setContextMenu(Menu.buildFromTemplate([
      { label: TRAY_LABELS.OPEN, click: onOpen },
      { type: 'separator' },
      { label: TRAY_LABELS.QUIT, click: onQuit }
    ]));
    this.#tray.on('click', onOpen);
    return this.#tray;
  }

  destroy(): void {
    if (!this.#tray) return;
    this.#tray.destroy();
    this.#tray = null;
  }
}
