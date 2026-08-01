const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('firmwareAPI', {
  listPorts: () => ipcRenderer.invoke('ports:list'),
  watchDevices: () => ipcRenderer.invoke('devices:watch'),
  gatewayStatus: (host, token) => ipcRenderer.invoke('gateway:status', { host, token }),
  gatewayInspect: (host, token) => ipcRenderer.invoke('gateway:inspect', { host, token }),
  gatewayBackup: (args) => ipcRenderer.invoke('gateway:backup', args),
  gatewayFlash: (args) => ipcRenderer.invoke('gateway:flash', args),
  inspect: (port, baud) => ipcRenderer.invoke('esp:inspect', { port, baud }),
  backup: (args) => ipcRenderer.invoke('esp:backup', args),
  libraryList: () => ipcRenderer.invoke('library:list'),
  libraryExport: (id) => ipcRenderer.invoke('library:export', id),
  libraryReport: (id) => ipcRenderer.invoke('library:report', id),
  libraryOpen: () => ipcRenderer.invoke('library:open'),
  flash: (args) => ipcRenderer.invoke('esp:flash', args),
  erase: (args) => ipcRenderer.invoke('esp:erase', args),
  pickFirmware: () => ipcRenderer.invoke('file:firmware'),
  pickBackup: () => ipcRenderer.invoke('file:backup'),
  openPath: (path) => ipcRenderer.invoke('file:show', path),
  startMonitor: (args) => ipcRenderer.invoke('serial:start', args),
  stopMonitor: () => ipcRenderer.invoke('serial:stop'),
  onLog: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('operation:log', listener);
    return () => ipcRenderer.removeListener('operation:log', listener);
  },
  onSerial: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('serial:data', listener);
    return () => ipcRenderer.removeListener('serial:data', listener);
  },
  androidList: () => ipcRenderer.invoke('android:list'),
  androidInspect: (serial) => ipcRenderer.invoke('android:inspect', serial),
  androidReboot: (serial, mode) => ipcRenderer.invoke('android:reboot', { serial, mode }),
  androidPickApk: () => ipcRenderer.invoke('android:pick-apk'),
  androidInstallApk: (serial, file) => ipcRenderer.invoke('android:install-apk', { serial, file }),
  androidStartLog: (serial) => ipcRenderer.invoke('android:log-start', serial),
  androidStopLog: () => ipcRenderer.invoke('android:log-stop'),
  fastbootList: () => ipcRenderer.invoke('fastboot:list'),
  fastbootPickImage: () => ipcRenderer.invoke('fastboot:pick-image'),
  fastbootFlash: (args) => ipcRenderer.invoke('fastboot:flash', args),
  onAndroidLog: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('android:log', listener);
    return () => ipcRenderer.removeListener('android:log', listener);
  }
});
