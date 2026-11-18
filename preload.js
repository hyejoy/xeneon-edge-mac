const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('store', {
  load: () => ipcRenderer.invoke('load'),
  save: (data) => ipcRenderer.invoke('save', data),
  onChange: (fn) => ipcRenderer.on('data-changed', (_e, data) => fn(data)),
});
