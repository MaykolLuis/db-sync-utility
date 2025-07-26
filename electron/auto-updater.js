const { app, dialog, BrowserWindow } = require('electron');
// Replace electron-is-dev with custom implementation
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Try to load electron-updater, but make it optional
let autoUpdater = null;
try {
  const { autoUpdater: updater } = require('electron-updater');
  autoUpdater = updater;
} catch (error) {
  console.log('electron-updater not available, auto-updates disabled');
}

class AutoUpdateManager {
  constructor() {
    this.mainWindow = null;
    this.updateCheckInProgress = false;
    this.updateDownloaded = false;
    
    // Configure autoUpdater if available
    this.setupAutoUpdater();
  }

  setupAutoUpdater() {
    // Don't proceed if autoUpdater is not available or in development mode
    if (!autoUpdater) {
      console.log('Auto-updater not available');
      return;
    }
    
    if (isDev) {
      console.log('Auto-updater disabled in development mode');
      return;
    }

    // Configure update server (GitHub Releases by default)
    try {
      autoUpdater.checkForUpdatesAndNotify();
      
      // Set update check interval (check every 4 hours)
      setInterval(() => {
        if (!this.updateCheckInProgress && !this.updateDownloaded) {
          this.checkForUpdates();
        }
      }, 4 * 60 * 60 * 1000); // 4 hours
    } catch (error) {
      console.error('Error setting up auto-updater:', error);
    }

    // Event listeners - only set up if autoUpdater is available
    if (autoUpdater) {
      autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
        this.updateCheckInProgress = true;
        this.sendStatusToRenderer('checking-for-update');
      });

      autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        this.updateCheckInProgress = false;
        this.sendStatusToRenderer('update-available', {
          version: info.version,
          releaseDate: info.releaseDate,
          releaseNotes: info.releaseNotes
        });
        this.showUpdateAvailableDialog(info);
      });

      autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available. Current version:', info.version);
        this.updateCheckInProgress = false;
        this.sendStatusToRenderer('update-not-available');
      });

      autoUpdater.on('error', (err) => {
        console.error('Error in auto-updater:', err);
        this.updateCheckInProgress = false;
        this.sendStatusToRenderer('update-error', { error: err.toString() });
      });
      
      autoUpdater.on('download-progress', (progressObj) => {
        this.sendStatusToRenderer('download-progress', progressObj);
      });
      
      autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        this.updateDownloaded = true;
        this.sendStatusToRenderer('update-downloaded', {
          version: info.version,
          releaseDate: info.releaseDate
        });
        this.showUpdateDownloadedDialog(info);
      });
    }
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  sendStatusToRenderer(event, data = {}) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { event, data });
    }
  }

  async checkForUpdates(silent = true) {
    if (!autoUpdater) {
      console.log('Auto-updater not available, skipping update check');
      return;
    }
    
    if (isDev) {
      console.log('Skipping update check in development mode');
      return;
    }

    if (this.updateCheckInProgress) {
      console.log('Update check already in progress');
      return;
    }

    try {
      this.updateCheckInProgress = true;
      if (!silent) {
        this.sendStatusToRenderer('checking-for-update');
      }
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Error checking for updates:', error);
      this.updateCheckInProgress = false;
      this.sendStatusToRenderer('update-error', { error: error.toString() });
    }
  }

  async downloadUpdate() {
    if (!autoUpdater) {
      console.log('Auto-updater not available, cannot download update');
      return;
    }
    
    try {
      console.log('Starting update download...');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Error downloading update:', error);
      this.showErrorDialog('Chyba při stahování aktualizace', error.message);
    }
  }

  quitAndInstall() {
    if (this.updateDownloaded) {
      console.log('Quitting and installing update...');
      autoUpdater.quitAndInstall();
    } else {
      console.log('No update downloaded to install');
    }
  }

  showUpdateAvailableDialog(info) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const options = {
      type: 'info',
      title: 'Aktualizace k dispozici',
      message: `Nová verze ${info.version} je k dispozici!`,
      detail: `Aktuální verze: ${app.getVersion()}\nNová verze: ${info.version}\n\nChcete stáhnout aktualizaci nyní?`,
      buttons: ['Stáhnout nyní', 'Připomenout později', 'Přeskočit tuto verzi'],
      defaultId: 0,
      cancelId: 1
    };

    dialog.showMessageBox(this.mainWindow, options).then((response) => {
      switch (response.response) {
        case 0: // Download now
          this.downloadUpdate();
          break;
        case 1: // Remind later
          console.log('User chose to be reminded later');
          break;
        case 2: // Skip this version
          console.log('User chose to skip this version');
      }
    }).catch(err => {
      console.error('Error showing update dialog:', err);
    });
  }

  showUpdateDownloadedDialog(info) {
    if (!autoUpdater || !this.mainWindow || this.mainWindow.isDestroyed()) return;

    const options = {
      type: 'info',
      title: 'Aktualizace stažena',
      message: `Aktualizace na verzi ${info.version} byla stažena!`,
      detail: 'Aplikace se restartuje pro dokončení instalace aktualizace.',
      buttons: ['Restartovat nyní', 'Restartovat později'],
      defaultId: 0,
      cancelId: 1
    };

    dialog.showMessageBox(this.mainWindow, options).then((response) => {
      if (response.response === 0) {
        this.quitAndInstall();
      } else {
        console.log('User chose to restart later');
      }
    });
  }

  showErrorDialog(title, message) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    dialog.showErrorBox(title, message);
  }

  // Manual update check triggered by user
  async manualUpdateCheck() {
    return this.checkForUpdates(false);
  }

  // Get current update status
  getUpdateStatus() {
    return {
      checking: this.updateCheckInProgress,
      downloaded: this.updateDownloaded,
      currentVersion: app.getVersion()
    };
  }
}

module.exports = new AutoUpdateManager();
