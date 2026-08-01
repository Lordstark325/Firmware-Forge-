const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const net = require('net');
const { SerialPort } = require('serialport');

let win;
let monitor;
let activeProcess;
let androidLog;

function createWindow() {
  win = new BrowserWindow({
    width: 1320, height: 850, minWidth: 1000, minHeight: 700,
    backgroundColor: '#07100e',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL || (app.isPackaged ? null : 'http://127.0.0.1:5173');
  if (devUrl) win.loadURL(devUrl); else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  const smokePath = process.argv.find(arg => arg.startsWith('--assessment-smoke='))?.slice('--assessment-smoke='.length) || process.env.FF_PDF_SMOKE_PATH;
  if (smokePath) {
    await createAssessmentPdf({ filename: 'esp32-test.bin', chip: 'ESP32-S3', mac: 'AA:BB:CC:DD:EE:FF', flashLabel: '16MB', bytes: 16777216, createdAt: new Date().toISOString(), sha256: 'a'.repeat(64), port: 'COM6' }, smokePath);
    app.quit(); return;
  }
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

function emit(line) { if (win && !win.isDestroyed()) win.webContents.send('operation:log', line); }
function libraryDirectory() { const dir = path.join(app.getPath('userData'), 'firmware-library'); fs.mkdirSync(dir, { recursive: true }); return dir; }
function libraryIndexPath() { return path.join(libraryDirectory(), 'index.json'); }
function readLibrary() { try { return JSON.parse(fs.readFileSync(libraryIndexPath(), 'utf8')); } catch { return []; } }
function writeLibrary(items) { fs.writeFileSync(libraryIndexPath(), JSON.stringify(items, null, 2), 'utf8'); }
function safeName(value) { return String(value || 'unknown').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 50) || 'unknown'; }
function html(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function assessmentHtml(item) {
  const facts = [
    ['ESP chip family', item.chip || 'Unknown', 'Detected'], ['MAC address', item.mac || 'Unknown', 'Detected'],
    ['Flash capacity', item.flashLabel || `${item.bytes || 0} bytes`, 'Detected'], ['USB adapter / port', item.port || 'Unknown', item.port ? 'Detected' : 'Unknown'],
    ['Backup filename', item.filename || 'Unknown', 'Recorded'], ['Backup size', `${item.bytes || 0} bytes`, 'Recorded'],
    ['Backup date', item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown', 'Recorded'], ['SHA-256', item.sha256 || 'Unknown', 'Verified']
  ];
  const unknowns = [['Exact ESP32 board/model','Not provided'],['Attached relays, sensors, motors, and displays','Not provided'],['GPIO assignments and electrical characteristics','Not provided'],['Mesh technology (ESP-MESH, ESP-NOW, BLE Mesh, Thread, other)','Not detected'],['Desired tablet platform (Android, iPad, or both)','Not provided'],['Original ESP-IDF or Arduino source project','Not available from compiled backup']];
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#14251e;font:11px Arial,sans-serif}.hero{background:#082019;color:#fff;padding:25px;border-radius:12px}.eyebrow{color:#66e9a9;font-size:9px;letter-spacing:2px}.hero h1{font-size:27px;margin:8px 0}.hero p{color:#b9d2c7;margin:0}.meta{margin-top:12px;color:#7e9c8f}.section{margin-top:19px}h2{font-size:15px;margin:0 0 9px;color:#153d2d}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.fact{border:1px solid #cfddd7;border-radius:7px;padding:10px;min-height:55px}.fact small{display:block;color:#668076;margin-bottom:5px}.fact b{overflow-wrap:anywhere}.badge{float:right;color:#147a4c;background:#e5f8ee;border-radius:10px;padding:2px 6px;font-size:8px}.unknown{border-left:3px solid #d5a83f;background:#fff9e9;padding:8px 10px;margin:6px 0}.warning{background:#fff0ed;border:1px solid #df9a8c;padding:12px;border-radius:7px;line-height:1.5}.api{border-collapse:collapse;width:100%}.api td,.api th{border:1px solid #cfddd7;padding:8px;text-align:left}.api th{background:#edf6f2}.footer{margin-top:20px;border-top:1px solid #cfddd7;padding-top:8px;color:#6a8177;font-size:9px}</style></head><body><div class="hero"><div class="eyebrow">FIRMWARE FORGE / DEVICE ASSESSMENT</div><h1>ESP Device Assessment Report</h1><p>Recovery image inventory and integration readiness assessment</p><div class="meta">Generated ${html(new Date().toLocaleString())}</div></div><div class="section"><h2>Detected and verified facts</h2><div class="grid">${facts.map(([k,v,s])=>`<div class="fact"><span class="badge">${html(s)}</span><small>${html(k)}</small><b>${html(v)}</b></div>`).join('')}</div></div><div class="section"><h2>Gateway and management capability</h2><table class="api"><tr><th>Capability</th><th>Assessment</th></tr><tr><td>Device discovery and status</td><td>Supported by Firmware Forge USB inspection and authenticated phone gateway.</td></tr><tr><td>Commands and configuration</td><td>Gateway transport supports authenticated device operations. Firmware-level configuration requires a compatible API in the target firmware.</td></tr><tr><td>OTA updates</td><td>Not detected from the raw backup. Replacement/source firmware must expose a validated OTA endpoint.</td></tr><tr><td>HTTPS / WebSocket / MQTT</td><td>Not detected. The current local phone bridge uses a temporary pairing token; production remote control should add transport encryption and certificate validation.</td></tr></table></div><div class="section"><h2>Information required before firmware modification</h2>${unknowns.map(([k,v])=>`<div class="unknown"><b>${html(k)}</b><br>${html(v)}</div>`).join('')}</div><div class="section"><h2>Recovery and security warning</h2><div class="warning">Keep the original BIN unchanged. It is a compiled recovery image, not editable source code, and may contain Wi-Fi credentials, tokens, calibration data, and device configuration. Work only on copies and verify the SHA-256 checksum before restoration.</div></div><div class="footer">Generated locally by Firmware Forge. Detected facts come from the connected device and backup record; all other fields are explicitly marked unknown or not provided.</div></body></html>`;
}
async function createAssessmentPdf(item, target) {
  const report = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try { await report.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(assessmentHtml(item))}`); const pdf = await report.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0, bottom: 0, left: 0, right: 0 } }); fs.writeFileSync(target, pdf); } finally { report.destroy(); }
}
function esptoolCommand() {
  const bundled = app.isPackaged ? path.join(process.resourcesPath, 'tools', 'esptool.exe') : path.join(__dirname, '..', 'tools', 'esptool.exe');
  return fs.existsSync(bundled) ? { command: bundled, prefix: [] } : { command: 'python', prefix: ['-m', 'esptool'] };
}
function friendlyEspError(output, fallback) {
  const text = String(output || fallback || 'ESP operation failed.');
  if (/failed to connect|no serial data received|wrong boot mode/i.test(text)) return new Error('The ESP32 did not enter download mode. Hold BOOT, tap RESET/EN, release BOOT, then click Inspect ESP again.\n\n' + text);
  if (/access is denied|permissionerror|could not open.*port|resource busy/i.test(text)) return new Error('The serial port is busy or unavailable. Close Arduino Serial Monitor, PlatformIO, PuTTY, or any other program using this COM port, then retry.\n\n' + text);
  if (/not recognized|enoent|cannot find/i.test(text)) return new Error('The bundled ESP utility is missing. Reinstall Firmware Forge 0.4.1 or newer.\n\n' + text);
  return new Error(text);
}
function esptool(args) {
  if (activeProcess) return Promise.reject(new Error('Another device operation is already running.'));
  return new Promise((resolve, reject) => {
    const runtime = esptoolCommand();
    emit(`$ esptool ${args.join(' ')}\n`);
    const child = spawn(runtime.command, [...runtime.prefix, ...args], { windowsHide: true });
    activeProcess = child;
    let output = '';
    child.stdout.on('data', d => { const s = d.toString(); output += s; emit(s); });
    child.stderr.on('data', d => { const s = d.toString(); output += s; emit(s); });
    child.on('error', err => { activeProcess = null; reject(friendlyEspError('', err.message)); });
    child.on('close', code => {
      activeProcess = null;
      if (code === 0) resolve(output); else reject(friendlyEspError(output, `esptool exited with code ${code}`));
    });
  });
}

function tool(command, args, options = {}) {
  if (activeProcess) return Promise.reject(new Error('Another device operation is already running.'));
  return new Promise((resolve, reject) => {
    emit(`$ ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { windowsHide: true, ...options });
    activeProcess = child;
    let output = '';
    child.stdout.on('data', d => { const s = d.toString(); output += s; emit(s); });
    child.stderr.on('data', d => { const s = d.toString(); output += s; emit(s); });
    child.on('error', err => { activeProcess = null; reject(new Error(`${command} is not installed or not on PATH. ${err.message}`)); });
    child.on('close', code => { activeProcess = null; code === 0 ? resolve(output) : reject(new Error(output || `${command} exited with code ${code}`)); });
  });
}

async function adb(serial, args) { return tool('adb', serial ? ['-s', serial, ...args] : args); }

function quiet(command, args, timeout = 1800) {
  return new Promise(resolve => execFile(command, args, { windowsHide: true, timeout }, (error, stdout) => resolve(error ? '' : String(stdout || ''))));
}

function parseAdb(output) {
  return output.split(/\r?\n/).slice(1).filter(Boolean).map(line => {
    const [serial, state] = line.trim().split(/\s+/, 2);
    const field = key => line.match(new RegExp(`${key}:([^\\s]+)`))?.[1] || '';
    return { serial, state, product: field('product'), model: field('model').replaceAll('_', ' '), device: field('device') };
  });
}

function gatewayRequest(host, token, pathName, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port: 8765, path: pathName, method, timeout: 5000, headers: { Authorization: `Bearer ${token}` } }, res => {
      let body = ''; res.on('data', d => body += d); res.on('end', () => {
        let parsed; try { parsed = JSON.parse(body); } catch { return reject(new Error('Phone returned an invalid gateway response.')); }
        if (res.statusCode !== 200) reject(new Error(parsed.error || `Gateway returned ${res.statusCode}`)); else resolve(parsed);
      });
    });
    req.on('timeout', () => req.destroy(new Error('Phone gateway timed out.'))); req.on('error', reject); req.end();
  });
}

async function gatewayRelay(host, token) {
  await gatewayRequest(host, token, '/v1/bridge/start', 'POST');
  const server = net.createServer(local => {
    const remote = net.connect({ host, port: 8766 }, () => remote.write(`TOKEN ${token}\n`));
    remote.on('error', e => local.destroy(e)); local.on('error', () => remote.destroy()); local.pipe(remote); remote.pipe(local);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, port: server.address().port };
}

async function withGatewayPort(host, token, action) {
  const relay = await gatewayRelay(host, token);
  try { return await action(`socket://127.0.0.1:${relay.port}`); }
  finally { relay.server.close(); await gatewayRequest(host, token, '/v1/bridge/stop', 'POST').catch(() => {}); }
}

ipcMain.handle('gateway:status', async (_e, { host, token }) => gatewayRequest(host, token, '/v1/status'));
ipcMain.handle('gateway:inspect', async (_e, { host, token }) => withGatewayPort(host, token, async portUrl => {
  const output = await esptool(['--port', portUrl, '--baud', '115200', 'chip-id']);
  return { chip: output.match(/Chip is (.+)/i)?.[1]?.trim() || 'ESP device', mac: output.match(/MAC:\s*([0-9a-f:]+)/i)?.[1] || 'Unknown', raw: output };
}));
ipcMain.handle('gateway:backup', async (_e, { host, token, baud = 115200, size = '0x400000' }) => {
  const chosen = await dialog.showSaveDialog(win, { title: 'Save gateway flash backup', defaultPath: `esp32-gateway-backup-${new Date().toISOString().slice(0,10)}.bin`, filters: [{ name: 'Firmware image', extensions: ['bin'] }] });
  if (chosen.canceled) return null;
  await withGatewayPort(host, token, portUrl => esptool(['--port', portUrl, '--baud', String(baud), 'read-flash', '0x0', size, chosen.filePath]));
  const hash = crypto.createHash('sha256').update(fs.readFileSync(chosen.filePath)).digest('hex'); return { path: chosen.filePath, sha256: hash, bytes: fs.statSync(chosen.filePath).size };
});
ipcMain.handle('gateway:flash', async (_e, { host, token, file, address = '0x0', baud = 115200 }) => {
  if (!file || !fs.existsSync(file)) throw new Error('Select a valid firmware file.');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  await withGatewayPort(host, token, portUrl => esptool(['--port', portUrl, '--baud', String(baud), 'write-flash', '--verify', address, file]));
  return { sha256: hash, bytes: fs.statSync(file).size };
});

ipcMain.handle('devices:watch', async () => {
  if (activeProcess) return { busy: true, devices: [] };
  const [ports, adbOut, fastbootOut, pnpOut] = await Promise.all([
    SerialPort.list().catch(() => []),
    quiet('adb', ['devices', '-l']),
    quiet('fastboot', ['devices']),
    quiet('powershell.exe', ['-NoProfile', '-Command', "Get-CimInstance Win32_PnPEntity | Where-Object {$_.PNPClass -in @('USB','Ports','Modem')} | Select-Object Name,DeviceID,PNPClass | ConvertTo-Json -Compress"], 3500)
  ]);
  const devices = [];
  for (const d of parseAdb(adbOut)) devices.push({ id: `adb:${d.serial}`, kind: 'android', confidence: 'confirmed', protocol: 'ADB', name: d.model || d.serial, detail: d.state, serial: d.serial });
  for (const line of fastbootOut.split(/\r?\n/).filter(Boolean)) { const serial = line.trim().split(/\s+/)[0]; devices.push({ id: `fastboot:${serial}`, kind: 'android', confidence: 'confirmed', protocol: 'Fastboot', name: 'Android bootloader', detail: serial, serial }); }
  const espVendors = new Set(['10c4', '1a86', '0403', '303a']);
  for (const p of ports) {
    const vendor = String(p.vendorId || '').toLowerCase();
    devices.push({ id: `serial:${p.path}`, kind: espVendors.has(vendor) ? 'esp-candidate' : 'serial', confidence: 'candidate', protocol: 'Serial', name: p.friendlyName || p.manufacturer || p.path, detail: `${p.path}${p.vendorId ? ` VID:${p.vendorId} PID:${p.productId}` : ''}`, port: p.path });
  }
  try {
    const parsed = pnpOut ? JSON.parse(pnpOut) : [];
    for (const p of (Array.isArray(parsed) ? parsed : [parsed])) {
      const name = p.Name || 'USB device'; const id = p.DeviceID || name;
      if (devices.some(d => id.includes(d.detail) || d.name === name)) continue;
      const routerish = /router|modem|mobile broadband|rndis|openwrt|ethernet gadget/i.test(name);
      devices.push({ id: `usb:${id}`, kind: routerish ? 'router-candidate' : 'unknown', confidence: 'candidate', protocol: p.PNPClass || 'USB', name, detail: routerish ? 'Possible router/modem - model adapter required' : 'Unclassified USB hardware' });
    }
  } catch {}
  return { busy: false, devices };
});

ipcMain.handle('ports:list', async () => SerialPort.list());
ipcMain.handle('esp:inspect', async (_e, { port, baud = 115200 }) => {
  const output = await esptool(['--port', port, '--baud', String(baud), 'flash-id']);
  const chip = output.match(/Chip is (.+)/i)?.[1]?.trim() || 'ESP device';
  const mac = output.match(/MAC:\s*([0-9a-f:]+)/i)?.[1] || 'Unknown';
  const flashLabel = output.match(/Detected flash size:\s*([^\r\n]+)/i)?.[1]?.trim() || 'Unknown';
  const sizeMatch = flashLabel.match(/([\d.]+)\s*(KB|MB)/i); let flashSizeBytes = 0;
  if (sizeMatch) flashSizeBytes = Math.round(Number(sizeMatch[1]) * (sizeMatch[2].toUpperCase() === 'MB' ? 1048576 : 1024));
  return { chip, mac, flashLabel, flashSizeBytes, flashSizeHex: flashSizeBytes ? `0x${flashSizeBytes.toString(16)}` : null, raw: output };
});
ipcMain.handle('esp:backup', async (_e, { port, baud = 460800, size = '0x400000', chip = 'ESP device', mac = 'Unknown', flashLabel = '' }) => {
  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const filename = `esp32-${safeName(mac)}-${createdAt.replace(/[:.]/g, '-')}.bin`;
  const target = path.join(libraryDirectory(), filename);
  await esptool(['--port', port, '--baud', String(baud), 'read-flash', '0x0', size, target]);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  const entry = { id, filename, path: target, sha256, bytes: fs.statSync(target).size, createdAt, chip, mac, flashLabel, port };
  const items = [entry, ...readLibrary().filter(item => item.id !== id)]; writeLibrary(items);
  return entry;
});
ipcMain.handle('library:list', async () => readLibrary().filter(item => fs.existsSync(item.path)));
ipcMain.handle('library:export', async (_e, id) => {
  const item = readLibrary().find(entry => entry.id === id); if (!item || !fs.existsSync(item.path)) throw new Error('The library backup file is missing.');
  const chosen = await dialog.showSaveDialog(win, { title: 'Export firmware backup', defaultPath: item.filename, filters: [{ name: 'Firmware image', extensions: ['bin'] }] });
  if (chosen.canceled) return null; fs.copyFileSync(item.path, chosen.filePath); return chosen.filePath;
});
ipcMain.handle('library:report', async (_e, id) => {
  const item = readLibrary().find(entry => entry.id === id); if (!item) throw new Error('The library record is missing.');
  const chosen = await dialog.showSaveDialog(win, { title: 'Save device assessment report', defaultPath: `${path.parse(item.filename).name}-assessment.pdf`, filters: [{ name: 'PDF document', extensions: ['pdf'] }] });
  if (chosen.canceled) return null; await createAssessmentPdf(item, chosen.filePath); return chosen.filePath;
});
ipcMain.handle('library:open', async () => shell.openPath(libraryDirectory()));
ipcMain.handle('esp:flash', async (_e, { port, baud = 460800, file, address = '0x0', erase = false }) => {
  if (!file || !fs.existsSync(file)) throw new Error('Select a valid firmware file.');
  if (erase) await esptool(['--port', port, '--baud', String(baud), 'erase-flash']);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  await esptool(['--port', port, '--baud', String(baud), 'write-flash', '--verify', address, file]);
  return { sha256: hash, bytes: fs.statSync(file).size };
});
ipcMain.handle('esp:erase', async (_e, { port, baud = 460800 }) => esptool(['--port', port, '--baud', String(baud), 'erase-flash']));
ipcMain.handle('file:firmware', async () => {
  const chosen = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Firmware images', extensions: ['bin', 'hex', 'uf2'] }] });
  return chosen.canceled ? null : chosen.filePaths[0];
});
ipcMain.handle('file:backup', async () => dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Firmware image', extensions: ['bin'] }] }).then(r => r.canceled ? null : r.filePaths[0]));
ipcMain.handle('file:show', async (_e, target) => shell.showItemInFolder(target));
ipcMain.handle('serial:start', async (_e, { port, baud = 115200 }) => {
  if (monitor?.isOpen) await new Promise(r => monitor.close(r));
  monitor = new SerialPort({ path: port, baudRate: Number(baud), autoOpen: false });
  monitor.on('data', data => win?.webContents.send('serial:data', data.toString('utf8')));
  monitor.on('error', err => win?.webContents.send('serial:data', `\n[serial error] ${err.message}\n`));
  await new Promise((resolve, reject) => monitor.open(err => err ? reject(err) : resolve()));
  return true;
});
ipcMain.handle('serial:stop', async () => {
  if (monitor?.isOpen) await new Promise((resolve, reject) => monitor.close(err => err ? reject(err) : resolve()));
  return true;
});

ipcMain.handle('android:list', async () => {
  const output = await adb(null, ['devices', '-l']);
  return parseAdb(output);
});
ipcMain.handle('android:inspect', async (_e, serial) => {
  const props = await adb(serial, ['shell', 'getprop']);
  const get = key => props.match(new RegExp(`\\[${key.replaceAll('.', '\\.') }\\]: \\[(.*?)\\]`))?.[1] || 'Unknown';
  const battery = await adb(serial, ['shell', 'dumpsys', 'battery']);
  return {
    serial, manufacturer: get('ro.product.manufacturer'), model: get('ro.product.model'),
    android: get('ro.build.version.release'), sdk: get('ro.build.version.sdk'), build: get('ro.build.display.id'),
    fingerprint: get('ro.build.fingerprint'), securityPatch: get('ro.build.version.security_patch'),
    verifiedBoot: get('ro.boot.verifiedbootstate'), bootloader: get('ro.bootloader'),
    battery: battery.match(/level:\s*(\d+)/)?.[1] || 'Unknown'
  };
});
ipcMain.handle('android:reboot', async (_e, { serial, mode }) => adb(serial, ['reboot', ...(mode && mode !== 'system' ? [mode] : [])]));
ipcMain.handle('android:pick-apk', async () => dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Android package', extensions: ['apk'] }] }).then(r => r.canceled ? null : r.filePaths[0]));
ipcMain.handle('android:install-apk', async (_e, { serial, file }) => {
  if (!file || !fs.existsSync(file)) throw new Error('Select a valid APK file.');
  return adb(serial, ['install', '-r', file]);
});
ipcMain.handle('android:log-start', async (_e, serial) => {
  if (androidLog) androidLog.kill();
  androidLog = spawn('adb', ['-s', serial, 'logcat', '-v', 'time'], { windowsHide: true });
  androidLog.stdout.on('data', d => win?.webContents.send('android:log', d.toString()));
  androidLog.stderr.on('data', d => win?.webContents.send('android:log', d.toString()));
  androidLog.on('error', e => win?.webContents.send('android:log', `ADB error: ${e.message}\n`));
  androidLog.on('close', () => { androidLog = null; });
  return true;
});
ipcMain.handle('android:log-stop', async () => { if (androidLog) androidLog.kill(); androidLog = null; return true; });
ipcMain.handle('fastboot:list', async () => {
  const output = await tool('fastboot', ['devices']);
  return output.split(/\r?\n/).filter(Boolean).map(line => ({ serial: line.trim().split(/\s+/)[0] }));
});
ipcMain.handle('fastboot:pick-image', async () => dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Android partition image', extensions: ['img', 'bin'] }] }).then(r => r.canceled ? null : r.filePaths[0]));
ipcMain.handle('fastboot:flash', async (_e, { serial, partition, file }) => {
  const allowed = ['boot', 'vendor_boot', 'recovery', 'system', 'vendor', 'product', 'dtbo', 'vbmeta'];
  if (!allowed.includes(partition)) throw new Error('Partition is not on the allowed list.');
  if (!file || !fs.existsSync(file)) throw new Error('Select a valid partition image.');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  await tool('fastboot', ['-s', serial, 'flash', partition, file]);
  return { sha256: hash, bytes: fs.statSync(file).size };
});
