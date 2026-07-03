const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Stream Control
  toggleStream:   () => ipcRenderer.invoke('toggle-stream'),
  checkStatus:    () => ipcRenderer.invoke('check-status'),

  // File Management
  listRecords:    () => ipcRenderer.invoke('list-records'),
  listUploads:    () => ipcRenderer.invoke('list-uploads'),

  // Network
  getNetworkStats: () => ipcRenderer.invoke('get-network-stats'),

  // Navigation
  navigate: (page) => ipcRenderer.invoke('navigate', page),

  // Real-time events dari Main Process
  onBlackmagicStatus: (cb) => ipcRenderer.on('blackmagic-status', (_, data) => cb(data)),
});
