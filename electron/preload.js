const { contextBridge, ipcRenderer } = require('electron');

// Set up logging for debugging
const log = {
  info: (message, ...args) => console.log(`[Preload] ${message}`, ...args),
  error: (message, ...args) => console.error(`[Preload] ${message}`, ...args)
};

// Log when preload script is executed
log.info('Preload script starting');

// Verify IPC is available
if (!ipcRenderer) {
  log.error('ipcRenderer is not available!');
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Window controls for custom title bar
  windowControls: {
    minimize: () => {
      log.info('Minimizing window via IPC');
      try {
        ipcRenderer.send('window-control', 'minimize');
      } catch (error) {
        log.error('Error minimizing window:', error);
      }
    },
    maximize: () => {
      log.info('Maximizing window via IPC');
      try {
        ipcRenderer.send('window-control', 'maximize');
      } catch (error) {
        log.error('Error maximizing window:', error);
      }
    },
    unmaximize: () => {
      log.info('Unmaximizing window via IPC');
      try {
        ipcRenderer.send('window-control', 'unmaximize');
      } catch (error) {
        log.error('Error unmaximizing window:', error);
      }
    },
    close: () => {
      log.info('Closing window via IPC');
      try {
        ipcRenderer.send('window-control', 'close');
      } catch (error) {
        log.error('Error closing window:', error);
      }
    },
    getWindowState: () => {
      log.info('Getting window state via IPC');
      try {
        return ipcRenderer.invoke('get-window-state');
      } catch (error) {
        log.error('Error getting window state:', error);
        return { isMaximized: false, isMinimized: false };
      }
    },
    onWindowStateChange: (callback) => {
      log.info('Setting up window state change listener');
      try {
        ipcRenderer.on('window-state-changed', (event, state) => {
          log.info('Window state changed:', state);
          callback(state);
        });
      } catch (error) {
        log.error('Error setting up window state listener:', error);
      }
    }
  },
  // Native notification
  showNotification: (options) => {
    log.info('Showing native notification', options);
    return ipcRenderer.invoke('show-notification', options);
  },
  // File system operations
  ensureDataDirectory: () => ipcRenderer.invoke('ensure-data-directory'),
  readJsonFile: async (filePath) => {
    log.info('Reading JSON file:', filePath);
    const result = await ipcRenderer.invoke('read-json-file', filePath);
    // The main process now returns an object with data and metadata
    return result;
  },
  writeJsonFile: (filePath, data) => ipcRenderer.invoke('write-json-file', { filePath, data }),
  getFileStats: (filePath) => {
    log.info('Getting file stats for:', filePath);
    return ipcRenderer.invoke('get-file-stats', filePath);
  },
  openFolderPath: (folderPath) => {
    log.info('Opening folder in explorer:', folderPath);
    return ipcRenderer.invoke('open-folder-path', folderPath);
  },
  checkPathAccess: (pathToCheck) => {
    log.info('Checking path access:', pathToCheck);
    return ipcRenderer.invoke('check-path-access', pathToCheck);
  },
  // File copy operations
  copyFiles: async (sourcePath, targetPath, filePatterns = ['*.mv.db', '*.trace.db'], createDirectoryIfMissing = true) => {
    log.info(`Copying files from ${sourcePath} to ${targetPath}`);
    return await ipcRenderer.invoke('copy-files', { sourcePath, targetPath, filePatterns, createDirectoryIfMissing });
  },
  // Login handling
  send: (channel, data) => {
    log.info(`Sending message on channel: ${channel}`, data);
    const validChannels = ['login-success'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Backup creation
  createBackup: async (sourcePath, targetPaths) => {
    log.info(`Creating backups before copying from ${sourcePath} to targets`);
    return await ipcRenderer.invoke('create-backup', { sourcePath, targetPaths });
  },
  // Single file backup creation
  createSingleBackup: async (filePath) => {
    log.info(`Creating backup for single file: ${filePath}`);
    return await ipcRenderer.invoke('create-single-backup', filePath);
  },
  // Settings persistence
  saveSettingsToFile: (settingsData) => {
    log.info('Saving settings to file');
    return ipcRenderer.invoke('save-settings-to-file', settingsData);
  },
  loadSettingsFromFile: () => {
    log.info('Loading settings from file');
    return ipcRenderer.invoke('load-settings-from-file');
  },
  // Target locations persistence
  loadTargetLocations: () => {
    log.info('Loading target locations from file');
    return ipcRenderer.invoke('load-target-locations');
  },
  saveTargetLocations: (locations) => {
    log.info('Saving target locations to file');
    return ipcRenderer.invoke('save-target-locations', locations);
  },
  // Password management
  getPassword: () => {
    log.info('Getting stored password');
    return ipcRenderer.invoke('get-password');
  },
  setPassword: (newPassword) => {
    log.info('Setting new password');
    return ipcRenderer.invoke('set-password', newPassword);
  },
  verifyPassword: (password) => {
    log.info('Verifying password');
    return ipcRenderer.invoke('verify-password', password);
  },
  // Directory dialog handler
  openDirectoryDialog: async (options) => {
    try {
      log.info('Calling open-directory-dialog IPC');
      const result = await ipcRenderer.invoke('open-directory-dialog', options);
      log.info('Directory dialog result:', result);
      return result; // String path or undefined
    } catch (error) {
      log.error('Error in openDirectoryDialog:', error);
      return undefined;
    }
  },
  
  // Path access checker
  checkPathAccess: async (path) => {
    try {
      if (!path) {
        log.error('No path provided to checkPathAccess');
        return { accessible: false, error: 'No path provided' };
      }
      
      log.info('Checking path access for:', path);
      const result = await ipcRenderer.invoke('check-path-access', path);
      log.info('Path access result:', result);
      return result;
    } catch (error) {
      log.error('Error in checkPathAccess:', error);
      return { accessible: false, error: error.message };
    }
  },
  
  // Check if file is in use (locked)
  checkFileInUse: async (filePath) => {
    try {
      if (!filePath) {
        log.error('No file path provided to checkFileInUse');
        return { inUse: false, error: 'No file path provided' };
      }
      
      log.info('Checking if file is in use:', filePath);
      const result = await ipcRenderer.invoke('check-file-in-use', filePath);
      log.info('File in use result:', result);
      return result;
    } catch (error) {
      log.error('Error in checkFileInUse:', error);
      return { inUse: false, error: error.message };
    }
  },
  
  // Check for source file changes
  checkSourceChanges: async (sourcePath, lastCheckTime, targetPaths = []) => {
    try {
      if (!sourcePath) {
        log.error('No source path provided to checkSourceChanges');
        return { hasChanges: false, error: 'No source path provided', currentTime: Date.now() };
      }
      
      log.info(`Checking for changes in ${sourcePath} since ${new Date(lastCheckTime).toISOString()}`);
      log.info(`Target paths for comparison:`, targetPaths);
      const result = await ipcRenderer.invoke('check-source-changes', { sourcePath, lastCheckTime, targetPaths });
      log.info('Source changes check result:', result);
      return result;
    } catch (error) {
      log.error('Error in checkSourceChanges:', error);
      return { hasChanges: false, error: error.message, currentTime: Date.now() };
    }
  },
  
  // File system operations
  getFileStats: async (filePath) => {
    try {
      log.info('Getting file stats for:', filePath);
      const stats = await ipcRenderer.invoke('get-file-stats', filePath);
      log.info('File stats:', stats);
      return stats;
    } catch (error) {
      log.error('Error getting file stats:', error);
      throw error;
    }
  },
  
  // Validate source directory for required files
  validateSourceDirectory: async (dirPath) => {
    try {
      if (!dirPath) {
        log.error('No directory path provided to validateSourceDirectory');
        return {
          isValid: false,
          message: 'No directory path provided',
          files: [],
          missingFiles: ['configurations.mv.db', 'configurations.trace.db']
        };
      }
      
      log.info('Validating source directory:', dirPath);
      const result = await ipcRenderer.invoke('validate-source-directory', dirPath);
      log.info('Directory validation result:', result);
      return result;
    } catch (error) {
      log.error('Error in validateSourceDirectory:', error);
      return {
        isValid: false,
        message: `Error validating directory: ${error.message}`,
        files: [],
        missingFiles: ['configurations.mv.db', 'configurations.trace.db']
      };
    }
  },
  
  // Unsaved changes handling
  onCheckUnsavedChanges: (callback) => {
    log.info('Setting up unsaved changes check handler');
    ipcRenderer.on('check-unsaved-changes', async (event) => {
      const hasChanges = callback();
      event.sender.send('check-unsaved-changes-response', hasChanges);
    });
  },
  
  onSaveAndClose: (callback) => {
    log.info('Setting up save and close handler');
    ipcRenderer.on('save-and-close', async (event) => {
      try {
        const result = await callback();
        event.sender.send('save-and-close-response', { success: true, result });
      } catch (error) {
        event.sender.send('save-and-close-response', { success: false, error: error.message });
      }
    });
  },
  
  // Open folder in Windows Explorer
  openFolderPath: async (folderPath) => {
    try {
      log.info('Opening folder path:', folderPath);
      const result = await ipcRenderer.invoke('open-folder-path', folderPath);
      log.info('Open folder result:', result);
      return result;
    } catch (error) {
      log.error('Error opening folder path:', error);
      throw error;
    }
  },
  
  // Get directory size
  getDirectorySize: async (dirPath) => {
    try {
      log.info('Getting directory size for:', dirPath);
      const result = await ipcRenderer.invoke('get-directory-size', dirPath);
      log.info('Directory size result:', result);
      return result;
    } catch (error) {
      log.error('Error getting directory size:', error);
      throw error;
    }
  },
  
  // Dialog methods
  showSaveDialog: async (options) => {
    try {
      log.info('Showing save dialog with options:', options);
      const result = await ipcRenderer.invoke('show-save-dialog', options);
      log.info('Save dialog result:', result);
      return result;
    } catch (error) {
      log.error('Error showing save dialog:', error);
      return { canceled: true, filePath: null, error: error.message };
    }
  },
  
  showOpenDialog: async (options) => {
    try {
      log.info('Showing open dialog with options:', options);
      const result = await ipcRenderer.invoke('show-open-dialog', options);
      log.info('Open dialog result:', result);
      return result;
    } catch (error) {
      log.error('Error showing open dialog:', error);
      return { canceled: true, filePaths: [], error: error.message };
    }
  },
  
  // File operations
  writeFile: (filePath, content) => {
    log.info('Writing file:', filePath);
    try {
      return ipcRenderer.invoke('write-file', filePath, content);
    } catch (error) {
      log.error('Error writing file:', error);
      return Promise.resolve({ success: false, error: error.message });
    }
  },

  openFile: (filePath) => {
    log.info('Opening file:', filePath);
    try {
      return ipcRenderer.invoke('open-file', filePath);
    } catch (error) {
      log.error('Error opening file:', error);
      return Promise.resolve({ success: false, error: error.message });
    }
  },

  // Login handling
  send(channel, data) {
    log.info(`Sending IPC message: ${channel}`, data);
    try {
      ipcRenderer.send(channel, data);
    } catch (error) {
      log.error(`Error sending IPC message ${channel}:`, error);
    }
  },
  
  loginSuccess() {
    log.info('Login success triggered');
    try {
      ipcRenderer.send('login-success');
    } catch (error) {
      log.error('Error sending login-success:', error);
    }
  },

  // Network connectivity and offline support
  checkNetworkConnectivity() {
    log.info('Checking network connectivity');
    return ipcRenderer.invoke('check-network-connectivity').catch(error => {
      log.error('Error checking network connectivity:', error);
      return { success: false, error: error.message };
    });
  },

  checkPathAccessEnhanced(pathToCheck) {
    log.info('Enhanced path access check:', pathToCheck);
    return ipcRenderer.invoke('check-path-access-enhanced', pathToCheck).catch(error => {
      log.error('Error in enhanced path access check:', error);
      return { success: false, error: error.message };
    });
  },

  copyFilesWithRetry(sourcePath, targetPath, filePatterns, options) {
    log.info('Copy files with retry:', { sourcePath, targetPath, filePatterns, options });
    return ipcRenderer.invoke('copy-files-with-retry', sourcePath, targetPath, filePatterns, options).catch(error => {
      log.error('Error in copy files with retry:', error);
      return { success: false, error: error.message };
    });
  },

  checkNetworkDrives(drivePaths) {
    log.info('Checking network drives:', drivePaths);
    return ipcRenderer.invoke('check-network-drives', drivePaths).catch(error => {
      log.error('Error checking network drives:', error);
      return { success: false, error: error.message };
    });
  },

  // Auto-updater methods
  updater: {
    checkForUpdates() {
      log.info('Checking for updates');
      return ipcRenderer.invoke('updater-check-for-updates').catch(error => {
        log.error('Error checking for updates:', error);
        return { success: false, error: error.message };
      });
    },

    downloadUpdate() {
      log.info('Downloading update');
      return ipcRenderer.invoke('updater-download-update').catch(error => {
        log.error('Error downloading update:', error);
        return { success: false, error: error.message };
      });
    },

    quitAndInstall() {
      log.info('Quitting and installing update');
      return ipcRenderer.invoke('updater-quit-and-install').catch(error => {
        log.error('Error installing update:', error);
        return { success: false, error: error.message };
      });
    },

    getStatus() {
      log.info('Getting update status');
      return ipcRenderer.invoke('updater-get-status').catch(error => {
        log.error('Error getting update status:', error);
        return { success: false, error: error.message };
      });
    },

    onUpdateStatus(callback) {
      log.info('Setting up update status listener');
      ipcRenderer.on('update-status', (event, data) => {
        log.info('Update status received:', data);
        callback(data);
      });
    },

    removeUpdateStatusListener() {
      log.info('Removing update status listeners');
      ipcRenderer.removeAllListeners('update-status');
    }
  },

  // Crash reporting methods
  crashReporting: {
    reportCrash(errorData) {
      log.info('Reporting crash:', errorData);
      return ipcRenderer.invoke('crash-report', errorData).catch(error => {
        log.error('Error reporting crash:', error);
        return { success: false, error: error.message };
      });
    },

    getCrashReports(limit = 50) {
      log.info('Getting crash reports');
      return ipcRenderer.invoke('get-crash-reports', limit).catch(error => {
        log.error('Error getting crash reports:', error);
        return { success: false, error: error.message };
      });
    },

    deleteCrashReport(crashId) {
      log.info('Deleting crash report:', crashId);
      return ipcRenderer.invoke('delete-crash-report', crashId).catch(error => {
        log.error('Error deleting crash report:', error);
        return { success: false, error: error.message };
      });
    },

    addBreadcrumb(message, level = 'info', category) {
      log.info('Adding breadcrumb:', message, level, category);
      return ipcRenderer.invoke('add-breadcrumb', message, level, category).catch(error => {
        log.error('Error adding breadcrumb:', error);
        return { success: false, error: error.message };
      });
    },

    getBreadcrumbs() {
      log.info('Getting breadcrumbs');
      return ipcRenderer.invoke('get-breadcrumbs').catch(error => {
        log.error('Error getting breadcrumbs:', error);
        return { success: false, error: error.message };
      });
    }
  },

  // Authentication state management
  setAuthenticationState: async (isAuthenticated, username) => {
    log.info('Setting authentication state:', { isAuthenticated, username });
    try {
      return await ipcRenderer.invoke('set-authentication-state', { isAuthenticated, username });
    } catch (error) {
      log.error('Error setting authentication state:', error);
      return { success: false, error: error.message };
    }
  },

  getAuthenticationState: async () => {
    log.info('Getting authentication state');
    try {
      return await ipcRenderer.invoke('get-authentication-state');
    } catch (error) {
      log.error('Error getting authentication state:', error);
      return { success: false, isAuthenticated: false, username: null, error: error.message };
    }
  }
});

// Log when preload is complete
log.info('Preload script completed');
