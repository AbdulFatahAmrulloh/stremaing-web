const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ffmpegManager = require('./ffmpegManager');
const fileRepository = require('./fileRepository');
const networkInfo = require('./networkInfo');
const blackmagic = require('./blackmagicService');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'MGW Video Decoder Dashboard',
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.setMenuBarVisibility(false);

  blackmagic.startMonitoring((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('blackmagic-status', status);
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  ffmpegManager.stopRecordingForcefully();
  blackmagic.stopMonitoring();
  if (process.platform !== 'darwin') app.quit();
});

// === IPC HANDLERS ===
ipcMain.handle('toggle-stream', async () => ffmpegManager.toggleStream());
ipcMain.handle('check-status', async () => ffmpegManager.getStatus());
ipcMain.handle('list-records', async () => fileRepository.getRecords());
ipcMain.handle('list-uploads', async () => fileRepository.getUploads());
ipcMain.handle('get-network-stats', async () => networkInfo.getStats());

ipcMain.handle('navigate', async (event, page) => {
  const pages = {
    'index':   path.join(__dirname, '../renderer/index.html'),
    'upload':  path.join(__dirname, '../renderer/upload.html'),
    'network': path.join(__dirname, '../renderer/network.html'),
    'images':  path.join(__dirname, '../renderer/images.html'),
  };
  if (pages[page]) mainWindow.loadFile(pages[page]);
});
