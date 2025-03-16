const path = require('path');
const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  let win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: { nodeIntegration: true }
  });

  const appPath = `file://${path.join(__dirname, 'dist', 'client',  'browser', 'index.html')}`;
  win.loadURL(appPath);

  // Start the Node.js server
  nodeProcess = spawn('node', ['server.js'], { stdio: 'inherit' });

  win.on('closed', () => {
    if (nodeProcess) {
      nodeProcess.kill(); // Kill Node.js process when Electron is closed
    }
    app.quit(); // Ensure Electron fully exits
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
