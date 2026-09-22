const path = require('node:path');
const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const policy = require('./policy');

app.setName('CH2CH 관리앱');
// Separate from the legacy desktop app. Diagnostic profiles may be isolated by CLI.
const customProfile = app.commandLine.getSwitchValue('user-data-dir');
app.setPath('userData', customProfile ? path.resolve(customProfile) : path.join(app.getPath('appData'), 'CH2CH-Client'));
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
let windowRef;
let server = '';
let lastError = '';

function requireSetup(event) {
  if (!policy.isTrustedSetup(event, windowRef?.webContents)) throw new Error('허용되지 않은 앱 요청입니다.');
}
async function showSetup(error = '') {
  lastError = error;
  if (windowRef && !windowRef.isDestroyed()) await windowRef.loadURL(policy.setupUrl);
}
async function connect(value) {
  server = policy.normalizeServer(value);
  policy.writeConfig(app.getPath('userData'), server);
  lastError = '';
  try { await windowRef.loadURL(server + '/'); }
  catch { await showSetup('서버에 연결하지 못했습니다. 웹 주소와 서버 실행 상태를 확인해 주세요. 기존 서비스는 변경하지 않았습니다.'); }
}
ipcMain.handle('client-config', event => { requireSetup(event); return { ...policy.readConfig(app.getPath('userData')), error: lastError }; });
ipcMain.handle('client-connect', async (event, value) => {
  requireSetup(event);
  try {
    policy.normalizeServer(value);
    // Resolve IPC while the setup frame is still alive, then navigate.
    setImmediate(() => { void connect(value).catch(() => showSetup('연결 설정을 저장하지 못했습니다. 앱을 다시 실행해 주세요.')); });
    return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
});

function createWindow() {
  windowRef = new BrowserWindow({ width: 1280, height: 900, minWidth: 400, minHeight: 640, show: false,
    title: 'CH2CH 관리앱', backgroundColor: '#f7f2e8',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') }
  });
  windowRef.once('ready-to-show', () => windowRef.show());
  const contents = windowRef.webContents;
  contents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  contents.session.setPermissionCheckHandler(() => false);
  contents.on('will-attach-webview', event => event.preventDefault());
  const navigate = (event, url) => {
    if (policy.isSetup(url) || policy.isSameServer(url, server)) return;
    event.preventDefault();
    if (policy.isExternal(url)) void shell.openExternal(url).catch(() => {});
  };
  contents.on('will-navigate', navigate);
  contents.on('will-redirect', navigate);
  contents.setWindowOpenHandler(({ url }) => {
    if (policy.isSameServer(url, server)) void contents.loadURL(url).catch(() => showSetup('페이지를 열지 못했습니다. 서버 연결을 확인해 주세요.'));
    else if (policy.isExternal(url)) void shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  contents.on('render-process-gone', () => { void showSetup('화면을 다시 불러와야 합니다. 아래에서 다시 연결해 주세요.'); });
  windowRef.on('closed', () => { windowRef = null; });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: '앱', submenu: [
      { label: '서버 주소 변경', accelerator: 'CmdOrCtrl+,', click: () => showSetup() },
      { label: '대시보드', click: () => server ? connect(server) : showSetup() },
      { label: '브라우저에서 열기', click: () => { if (server) void shell.openExternal(server).catch(() => {}); } },
      { type: 'separator' },
      { label: '로그인 정보 지우기', click: async () => {
        const answer = await dialog.showMessageBox(windowRef, { type: 'question', buttons: ['취소', '앱 로그인 정보 지우기'], defaultId: 0, cancelId: 0, message: '이 앱의 로그인 쿠키와 웹 저장값을 지웁니다.', detail: '서버 자료와 일반 브라우저의 로그인은 변경하지 않습니다.' });
        if (answer.response !== 1) return;
        await showSetup();
        await contents.session.clearStorageData();
        await showSetup('앱 로그인 정보를 지웠습니다. 다시 연결하면 로그인이 필요합니다.');
      } },
      { type: 'separator' }, { role: 'quit', label: '앱 종료 (서버는 유지)' }
    ] },
    { label: '보기', submenu: [{ role: 'reload', label: '새로고침' }, { role: 'resetZoom', label: '기본 크기' }, { role: 'zoomIn', label: '확대' }, { role: 'zoomOut', label: '축소' }, { role: 'togglefullscreen', label: '전체 화면' }] },
    { label: '편집', submenu: [{ role: 'undo', label: '실행 취소' }, { role: 'redo', label: '다시 실행' }, { type: 'separator' }, { role: 'cut', label: '잘라내기' }, { role: 'copy', label: '복사' }, { role: 'paste', label: '붙여넣기' }, { role: 'selectAll', label: '모두 선택' }] }
  ]));
  // Always show the chosen address first: never connect to production automatically.
  void showSetup();
}
if (singleInstance) {
  app.whenReady().then(createWindow);
  app.on('second-instance', () => { if (windowRef) { if (windowRef.isMinimized()) windowRef.restore(); windowRef.focus(); } });
  app.on('activate', () => { if (!windowRef) createWindow(); });
}
app.on('window-all-closed', () => app.quit());
// Deliberately no child processes, Runner startup, port binding or service shutdown.
