const BROWSER_PROCESS_TYPE = 'browser';
const ELECTRON_MODULE = 'electron';
const OFFSCREEN_POSITION = { x: -20000, y: -20000 };

function moveWindowsOffscreenOnShow() {
  const { BrowserWindow } = require(ELECTRON_MODULE);
  const originalShow = BrowserWindow.prototype.show;
  BrowserWindow.prototype.show = function show() {
    this.setPosition(OFFSCREEN_POSITION.x, OFFSCREEN_POSITION.y);
    return originalShow.call(this);
  };
}

if (process.type === BROWSER_PROCESS_TYPE) {
  setImmediate(moveWindowsOffscreenOnShow);
}
