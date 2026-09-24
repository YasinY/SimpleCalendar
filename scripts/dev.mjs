import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { watch } from './build.mjs';

const require = createRequire(import.meta.url);
const electronBinary = require('electron');
const ELECTRON_ARGS = ['.'];
const RESTART_DEBOUNCE_MS = 250;

let child = null;
let restartTimer = null;

function startElectron() {
  child = spawn(electronBinary, ELECTRON_ARGS, { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (child?.killed) return;
    process.exit(code ?? 0);
  });
}

function scheduleRestart() {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (child) {
      child.killed = true;
      child.kill();
    }
    startElectron();
  }, RESTART_DEBOUNCE_MS);
}

const contexts = await watch(scheduleRestart);

process.on('SIGINT', async () => {
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
  child?.kill();
  process.exit(0);
});
