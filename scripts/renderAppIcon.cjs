const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('node:fs');
const path = require('node:path');

const ICON_SIZE = 512;
const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'icon.png');
const RENDER_SETTLE_MS = 300;
const ALPHA_OFFSET = 3;

const ICON_MARKUP = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  html, body { margin: 0; width: ${ICON_SIZE}px; height: ${ICON_SIZE}px; background: transparent; overflow: hidden; }
  svg { display: block; width: ${ICON_SIZE}px; height: ${ICON_SIZE}px; }
</style>
</head>
<body>
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="5" width="25" height="23" rx="3" fill="#ffffff" stroke="#3c3c43" stroke-width="1"/>
  <path d="M3 8a3 3 0 0 1 3-3h19a3 3 0 0 1 3 3v4H3z" fill="#ff3b30"/>
  <rect x="8" y="2" width="3" height="4" rx="1" fill="#3c3c43"/>
  <rect x="20" y="2" width="3" height="4" rx="1" fill="#3c3c43"/>
  <rect x="9" y="16" width="13" height="3" rx="1" fill="#3c3c43"/>
  <rect x="9" y="21" width="13" height="3" rx="1" fill="#3c3c43"/>
</svg>
</body>
</html>`;

function toDataUrl(markup) {
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(markup);
}

async function renderIcon() {
  const window = new BrowserWindow({
    width: ICON_SIZE,
    height: ICON_SIZE,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true }
  });
  await window.loadURL(toDataUrl(ICON_MARKUP));
  await new Promise((resolve) => setTimeout(resolve, RENDER_SETTLE_MS));
  const image = await window.webContents.capturePage();
  writeFileSync(OUTPUT_PATH, image.toPNG());
  const cornerAlpha = image.toBitmap()[ALPHA_OFFSET];
  process.stdout.write('app icon written: ' + OUTPUT_PATH + ' (' + image.getSize().width + 'x' + image.getSize().height + ', corner alpha ' + cornerAlpha + ')\n');
  window.destroy();
}

app.whenReady().then(async () => {
  try {
    await renderIcon();
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
