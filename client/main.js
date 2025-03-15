const { app, BrowserWindow } = require('electron');

let win;
app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: { nodeIntegration: true }
  });

  win.loadURL(`http://localhost:4200/`); // Load Angular App
});
