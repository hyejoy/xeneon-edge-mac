const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const DATA_FILE = path.join(app.getPath('userData'), 'data.json');
const EMPTY = { plans: [], memos: [], location: null };

function load() {
  try { return { ...EMPTY, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }; }
  catch (e) { if (e.code === 'ENOENT') return { ...EMPTY }; throw e; } // 깨진 파일을 빈 데이터로 덮어쓰지 않도록 throw
}

function save(data) {
  if (!data || !Array.isArray(data.plans)) throw new Error('invalid data');
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE); // 저장 중 꺼져도 기존 파일이 깨지지 않게
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('data-changed', data));
}

const win = (file, opts) => {
  const w = new BrowserWindow({ backgroundColor: '#07090f', ...opts, webPreferences: { preload: path.join(__dirname, 'preload.js') } });
  w.loadFile(path.join(__dirname, 'src', file));
  return w;
};

let admin;
function openAdmin() {
  if (admin && !admin.isDestroyed()) return admin.focus();
  admin = win('admin.html', { width: 1000, height: 760, title: 'Admin' });
}

function openDashboard() {
  // 제논 엣지 = 2560x720(약 3.5:1). 없으면 주 모니터에 창으로 띄워 미리보기
  const edge = screen.getAllDisplays().find((d) => /xeneon/i.test(d.label || '') || d.size.width / d.size.height > 3);
  if (!edge) return win('dashboard.html', { width: 1280, height: 360 });
  const { x, y, width, height } = edge.bounds;
  win('dashboard.html', { x, y, width, height, frame: false, fullscreen: true });
}

app.whenReady().then(() => {
  ipcMain.handle('load', load);
  ipcMain.handle('save', (_e, data) => save(data));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu', submenu: [{ label: 'Admin 열기', accelerator: 'CmdOrCtrl+,', click: openAdmin }, { type: 'separator' }, { role: 'quit' }] },
    { role: 'editMenu' },
    { role: 'viewMenu' },
  ]));
  openDashboard();
});

app.on('activate', openAdmin); // Dock 아이콘 클릭 → Admin

app.on('window-all-closed', () => app.quit());
