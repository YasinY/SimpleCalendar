import { cpSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'out');
const RENDERER_OUT = path.join(OUT_DIR, 'renderer');
const MAIN_OUT = path.join(OUT_DIR, 'main');
const STATIC_RENDERER_FILES = ['index.html', 'styles.css'];
const ELECTRON_TARGET = 'chrome140';
const NODE_TARGET = 'node22';

const mainOptions = {
  entryPoints: [path.join(ROOT, 'src/main/main.ts'), path.join(ROOT, 'src/main/preload.ts')],
  outdir: MAIN_OUT,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: NODE_TARGET,
  external: ['electron'],
  sourcemap: true,
  logLevel: 'info'
};

const rendererOptions = {
  entryPoints: [path.join(ROOT, 'src/renderer/app.ts')],
  outdir: RENDERER_OUT,
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: ELECTRON_TARGET,
  sourcemap: true,
  logLevel: 'info'
};

export function copyStaticFiles() {
  mkdirSync(RENDERER_OUT, { recursive: true });
  for (const file of STATIC_RENDERER_FILES) {
    cpSync(path.join(ROOT, 'src/renderer', file), path.join(RENDERER_OUT, file));
  }
}

export async function buildOnce() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  copyStaticFiles();
  await Promise.all([build(mainOptions), build(rendererOptions)]);
}

export async function watch(onRebuild) {
  copyStaticFiles();
  const rebuildPlugin = {
    name: 'notify-rebuild',
    setup(pluginBuild) {
      pluginBuild.onEnd((result) => {
        copyStaticFiles();
        if (result.errors.length === 0) onRebuild();
      });
    }
  };
  const contexts = await Promise.all([
    context({ ...mainOptions, plugins: [rebuildPlugin] }),
    context({ ...rendererOptions, plugins: [rebuildPlugin] })
  ]);
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  return contexts;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildOnce().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
