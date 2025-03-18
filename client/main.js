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
  
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
