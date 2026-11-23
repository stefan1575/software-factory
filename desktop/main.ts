import { app, BrowserWindow, nativeTheme, session } from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const PAGE = fileURLToPath(new URL('./window/index.html', import.meta.url));

async function openWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: 'Software Factory',
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#121418' : '#f4f5f7',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  await window.loadFile(PAGE);
  return window;
}

/** `--shoot <folder>` saves the window in light and dark, then quits. */
async function shoot(folder: string): Promise<void> {
  await mkdir(folder, { recursive: true });
  const window = await openWindow();
  window.showInactive();
  for (const theme of ['light', 'dark'] as const) {
    nativeTheme.themeSource = theme;
    await setTimeout(500);
    await writeFile(join(folder, `${theme}.png`), (await window.webContents.capturePage()).toPNG());
  }
  app.exit();
}

/** Electron is never ready while the module that asks is still loading, so this is not awaited at the top. */
async function start(): Promise<void> {
  await app.whenReady();
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, answer) => {
    answer(false);
  });
  const at = process.argv.indexOf('--shoot');
  const folder = at === -1 ? undefined : process.argv[at + 1];
  if (folder !== undefined) await shoot(folder);
  else if (!app.requestSingleInstanceLock()) app.quit();
  else {
    const window = await openWindow();
    app.on('second-instance', () => {
      if (window.isMinimized()) window.restore();
      window.focus();
    });
    app.on('window-all-closed', () => {
      app.quit();
    });
    window.show();
  }
}

start().catch((error: unknown) => {
  console.error(error);
  app.exit(1);
});
