const { app, BrowserWindow, ipcMain, dialog, Notification, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
// Replace electron-is-dev with custom implementation
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const url = require('url');
const autoUpdateManager = require('./auto-updater');
const crashHandler = require('./crash-handler');

// Function to read JSON files
async function readJsonFile(filePath) {
  try {
    console.log(`Reading JSON file: ${filePath}`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    // Return appropriate default values based on the file being read
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      // For targetLocations.json, return an empty array
      if (filePath.includes('targetLocations.json')) {
        console.log(`Initializing ${filePath} with empty array`);
        return [];
      }
      // For presets.json, return an empty array
      if (filePath.includes('presets.json')) {
        console.log(`Initializing ${filePath} with empty array`);
        return [];
      }
      // For history.json, return an empty array
      if (filePath.includes('history.json')) {
        console.log(`Initializing ${filePath} with empty array`);
        return [];
      }
      // For other files, return an empty object
      console.log(`Initializing ${filePath} with empty object`);
      return {};
    }
    throw error;
  }
}

// Check if a file is in use (locked) by another process
function isFileInUse(filePath) {
  // First check if the file exists
  if (!fsSync.existsSync(filePath)) {
    console.log(`File ${filePath} does not exist`);
    return false;
  }
  
  try {
    // Try to open the file with read+write access but don't truncate it
    // This will fail if any other process has the file open with exclusive access
    const fd = fsSync.openSync(filePath, 'r+');
    fsSync.closeSync(fd);
    return false; // File is not in use
  } catch (err) {
    console.log(`File ${filePath} is locked: ${err.code}`);
    // These error codes indicate the file is locked or in use
    return ['EBUSY', 'EACCES', 'EPERM'].includes(err.code);
  }
}

// For debugging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let mainWindow;
let splashWindow;
let nextAppPort = 3000; // Default Next.js port

function createSplashWindow() {
  console.log('Creating splash window...');
  
  // Create splash window
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    transparent: true,
    resizable: false,
    backgroundColor: '#000000', // Set window background to black
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });
  
  // Load splash screen HTML
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  
  // Show splash when ready
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
    console.log('Splash screen shown');
    
    // Create main window after splash is shown with a delay
    // This ensures the splash screen is visible for a minimum time
    setTimeout(() => {
      createMainWindow();
    }, 3000); // 3 seconds minimum display time
  });
  
  // Handle splash window closed
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  console.log('Creating main window...');
  
  // Create the browser window with appropriate settings
  // Set the app theme color to black
  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  app.commandLine.appendSwitch('force-dark-mode');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#09090b', // Set window background to BFI dark theme color
    autoHideMenuBar: true, // Hide the menu bar
    menuBarVisible: false, // Ensure menu bar is not visible initially
    frame: false, // Use frameless window for custom styling
    titleBarStyle: 'hidden', // Hide the default title bar
    titleBarOverlay: false, // Don't use the system overlay
    darkTheme: true, // Force dark theme
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
      webSecurity: false, // Disable web security to allow local file loading
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    show: false, // Don't show until content is loaded
  });

  // Completely remove the menu
  mainWindow.setMenu(null);
  
  // Inject custom CSS to style the window border
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      :root {
        --window-border-color: #000000 !important;
      }
      html, body {
        border: 1px solid #000000 !important;
        box-sizing: border-box;
      }
      /* Custom title bar styling */
      .title-bar {
        height: 30px;
        background-color: #000000 !important;
        color: #FFFFFF !important;
        display: flex;
        justify-content: space-between;
        align-items: center;
        -webkit-app-region: drag;
        padding: 0 10px;
        width: 100%;
        box-sizing: border-box;
      }
      .window-controls {
        display: flex;
        -webkit-app-region: no-drag;
      }
      .window-control-button {
        width: 30px;
        height: 30px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        color: #ffffff;
        background: transparent;
        border: none;
        outline: none;
      }
      .window-control-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      #close-button:hover {
        background-color: #e11d48;
      }
    `);
  });

  // Determine the URL to load
  let startUrl;
  
  // Load the custom login HTML file - handle both dev and packaged scenarios
  const loginPath = path.join(__dirname, 'login.html');
  console.log(`Loading login page from: ${loginPath}`);
  console.log(`Login file exists: ${fsSync.existsSync(loginPath)}`);
  
  // Try to load the login file with error handling
  mainWindow.loadFile(loginPath).catch((error) => {
    console.error('Failed to load login.html:', error);
    // Fallback: create a simple login page inline
    const loginHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DB Sync Utility - Login</title>
        <style>
          body { font-family: Arial, sans-serif; background: #111827; color: white; padding: 50px; text-align: center; }
          input { padding: 10px; margin: 10px; background: #374151; color: white; border: 1px solid #6b7280; border-radius: 5px; }
          button { padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>DB Sync Utility</h1>
        <form id="loginForm">
          <input type="password" id="password" placeholder="Enter password" required>
          <br><button type="submit">Login</button>
        </form>
        <script>
          document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            if (password === 'admin') {
              window.electronAPI.loginSuccess();
            } else {
              alert('Invalid password');
            }
          });
        </script>
      </body>
      </html>
    `;
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loginHtml));
  });
  
  // Listen for login success message
  ipcMain.on('login-success', () => {
    console.log('Login successful, loading main app');
    console.log('isDev:', isDev);
    console.log('__dirname:', __dirname);
    console.log('process.resourcesPath:', process.resourcesPath);
    console.log('app.getAppPath():', app.getAppPath());
    
    // Preload the main app page to make transition faster
    if (isDev) {
      // Development mode - load from Next.js dev server
      const appUrl = `http://localhost:${nextAppPort}`;
      console.log(`Development mode: Loading main app from ${appUrl}`);
      
      // Use loadURL with no-cache option for faster loading
      mainWindow.loadURL(appUrl, {
        extraHeaders: 'pragma: no-cache\n'
      });
    } else {
      // Production mode - load from built files
      console.log('Production mode: Attempting to load main app');
      console.log('Current working directory:', process.cwd());
      console.log('App path:', app.getAppPath());
      console.log('__dirname:', __dirname);
      
      // Production mode - fix path resolution for packaged app
      console.log('Attempting to load main app from static files...');
      
      // In packaged app, files are in resources/app/out/
      // Try multiple possible paths based on the actual packaged structure
      const possiblePaths = [
        path.join(__dirname, '../out/index.html'),           // Development structure
        path.join(app.getAppPath(), 'out/index.html'),       // Packaged app structure
        path.join(process.resourcesPath, 'app/out/index.html') // Alternative packaged structure
      ];
      
      console.log('Trying paths in order:');
      possiblePaths.forEach((p, i) => {
        console.log(`${i + 1}. ${p} - exists: ${fsSync.existsSync(p)}`);
      });
      
      let foundPath = null;
      for (const testPath of possiblePaths) {
        if (fsSync.existsSync(testPath)) {
          foundPath = testPath;
          break;
        }
      }
      
      if (foundPath) {
        console.log(`Loading from found path: ${foundPath}`);
        mainWindow.loadFile(foundPath).then(() => {
          console.log('Static app loaded successfully');
        }).catch(error => {
          console.error('Failed to load static app:', error);
          console.log('Falling back to embedded app...');
          loadEmbeddedApp();
        });
      } else {
        console.log('No static files found, loading embedded app...');
        loadEmbeddedApp();
      }
    }
    
    function loadFallbackApp() {
      console.log('Loading fallback app...');
      // Create a simple fallback HTML that shows the app is working
      const fallbackHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>DB Sync Utility</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: white; }
            .container { max-width: 600px; margin: 0 auto; text-align: center; }
            .error { color: #ff6b6b; }
            .info { color: #51cf66; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>DB Sync Utility</h1>
            <p class="error">Main application files could not be loaded.</p>
            <p class="info">This appears to be a packaging issue. Please try:</p>
            <ul style="text-align: left;">
              <li>Reinstalling the application</li>
              <li>Running as administrator</li>
              <li>Checking antivirus software</li>
            </ul>
            <p><strong>Debug Info:</strong></p>
            <p>__dirname: ${__dirname}</p>
            <p>App Path: ${app.getAppPath()}</p>
            <p>Process CWD: ${process.cwd()}</p>
          </div>
        </body>
        </html>
      `;
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fallbackHtml));
    }
    
    function loadEmbeddedApp() {
      console.log('Loading embedded app as fallback...');
      const embeddedAppPath = path.join(__dirname, 'embedded-app.html');
      console.log('Embedded app path:', embeddedAppPath);
      
      if (fsSync.existsSync(embeddedAppPath)) {
        console.log('Embedded app exists, loading...');
        mainWindow.loadFile(embeddedAppPath).then(() => {
          console.log('Embedded app loaded successfully');
        }).catch(error => {
          console.error('Error loading embedded app:', error);
          loadFallbackApp();
        });
      } else {
        console.error('Embedded app not found, loading fallback');
        loadFallbackApp();
      }
    }
  });
  
  // For development, handle port fallback if needed
  if (isDev) {
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      // Only handle real errors (not aborted loads from redirects)
      if (errorCode > 0) {
        console.log(`Failed to load on port ${nextAppPort}: ${errorDescription}`);
        
        // Try the alternate port
        nextAppPort = nextAppPort === 3000 ? 3001 : 3000;
        const alternateUrl = `http://localhost:${nextAppPort}`;
        console.log(`Trying alternate port: ${alternateUrl}`);
        mainWindow.loadURL(alternateUrl);
      }
    });
  }
  
  
  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready to prevent blank screen flash
  mainWindow.once('ready-to-show', () => {
    // Close splash window if it exists
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    
    // Show and focus main window
    mainWindow.show();
    
    // Focus the window
    if (mainWindow) {
      mainWindow.focus();
    }
    
    // Initialize auto-updater with main window reference
    autoUpdateManager.setMainWindow(mainWindow);
    
    // Check for updates on app start (after 5 seconds delay)
    setTimeout(() => {
      autoUpdateManager.checkForUpdates(true);
    }, 5000);
    
    console.log('Main window shown, splash screen closed');
  });

  // Open DevTools for debugging (both dev and production)
  // Remove this line after debugging is complete
  mainWindow.webContents.openDevTools();
  
  // Also open DevTools automatically in development mode
  if (isDev) {
    console.log('Development mode: DevTools enabled');
  }

  // Handle window close with unsaved changes check
  mainWindow.on('close', async (event) => {
    // Prevent the window from closing immediately
    event.preventDefault();
    
    try {
      console.log('Window close event triggered, checking for unsaved changes...');
      
      // Ask the renderer if there are unsaved changes
      mainWindow.webContents.send('check-unsaved-changes');
      
      // Wait for response with timeout
      const hasUnsavedChanges = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('Timeout waiting for unsaved changes response, assuming no changes');
          resolve(false);
        }, 2000); // 2 second timeout
        
        ipcMain.once('check-unsaved-changes-response', (event, hasChanges) => {
          clearTimeout(timeout);
          console.log(`Received unsaved changes response: ${hasChanges}`);
          resolve(hasChanges);
        });
      });
      
      if (hasUnsavedChanges) {
        // Show confirmation dialog
        const response = await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons: ['Zahodit změny', 'Uložit a zavřít', 'Zrušit'],
          defaultId: 1,
          cancelId: 2,
          title: 'Neuložené změny',
          message: 'Máte neuložené změny v cílových lokacích.',
          detail: 'Chcete je uložit před zavřením aplikace?'
        });
        
        if (response.response === 0) {
          // Discard changes and close
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.destroy();
          }
        } else if (response.response === 1) {
          // Save changes and close
          try {
            mainWindow.webContents.send('save-and-close');
            
            // Wait for save response with timeout
            const saveResult = await new Promise((resolve) => {
              const timeout = setTimeout(() => {
                console.log('Timeout waiting for save response, forcing close');
                resolve({ success: false, error: 'Timeout' });
              }, 3000); // 3 second timeout
              
              ipcMain.once('save-and-close-response', (event, result) => {
                clearTimeout(timeout);
                console.log(`Received save response: ${JSON.stringify(result)}`);
                resolve(result);
              });
            });
            
            if (saveResult.success) {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.destroy();
              }
            } else {
              console.error('Error saving changes:', saveResult.error);
              if (saveResult.error === 'Timeout') {
                console.log('Save timed out, forcing window close');
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.destroy();
                }
              } else {
                dialog.showErrorBox('Chyba při ukládání', 'Nepodařilo se uložit změny. Aplikace nebude zavřena.');
              }
            }
          } catch (error) {
            console.error('Error saving changes:', error);
            dialog.showErrorBox('Chyba při ukládání', 'Nepodařilo se uložit změny. Aplikace nebude zavřena.');
          }
        }
        // If response is 2 (Cancel), do nothing - window stays open
      } else {
        // No unsaved changes, close normally
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy();
        }
      }
    } catch (error) {
      console.error('Error checking unsaved changes:', error);
      // If we can't check, just close normally
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
    }
  });
  
  // Set up window event handlers
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Listen for window state changes and notify renderer
  mainWindow.on('maximize', () => {
    console.log('Window maximized - notifying renderer');
    mainWindow.webContents.send('window-state-changed', { isMaximized: true });
  });
  
  mainWindow.on('unmaximize', () => {
    console.log('Window unmaximized - notifying renderer');
    mainWindow.webContents.send('window-state-changed', { isMaximized: false });
  });

  // Log when page has finished loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  // Log any page errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Page failed to load: ${errorDescription} (${errorCode})`);
  });

}

app.whenReady().then(() => {
  // Register custom protocol to handle absolute asset paths
  if (!isDev) {
    protocol.interceptFileProtocol('file', (request, callback) => {
      const url = request.url.substr(7); // Remove 'file://' prefix
      console.log(`Protocol intercepted: ${request.url}`);
      
      // Check if this is a request for _next assets with absolute path
      if (url.includes('/_next/')) {
        // Extract the _next part and serve from the correct location
        const assetPath = url.substring(url.indexOf('/_next/') + 1); // Remove leading slash
        const correctPath = path.join(app.getAppPath(), 'out', assetPath);
        console.log(`Redirecting ${url} to ${correctPath}`);
        callback({ path: correctPath });
        return;
      }
      
      // For all other requests, use the original path
      callback({ path: url });
    });
  }
  
  createSplashWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow();
  }
});

// Handle window control commands from renderer
ipcMain.on('window-control', (event, command) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  
  if (!window || window.isDestroyed()) {
    return;
  }

  try {
    switch (command) {
      case 'minimize':
        console.log('MAIN: Minimizing window');
        window.minimize();
        break;
        
      case 'maximize':
        console.log('MAIN: Maximizing window');
        if (!window.isMaximized()) {
          window.maximize();
        }
        break;
        
      case 'unmaximize':
        console.log('MAIN: Unmaximizing window');
        if (window.isMaximized()) {
          window.unmaximize();
        }
        break;
        
      case 'close':
        console.log('MAIN: Closing window');
        window.close();
        break;
    }
  } catch (error) {
    console.error(`Error executing window control command ${command}:`, error);
  }
});

// Handle window state requests
ipcMain.handle('get-window-state', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) {
    return { isMaximized: false, isMinimized: false };
  }
  return {
    isMaximized: window.isMaximized(),
    isMinimized: window.isMinimized()
  };
});

// Handle directory selection dialog
ipcMain.handle('open-directory-dialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Vyberte zdrojový adresář',
      buttonLabel: 'Vybrat',
      defaultPath: app.getPath('desktop'),
      ...options
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return undefined;
    }
    
    return result.filePaths[0];
  } catch (error) {
    console.error('Main process: Error opening directory dialog:', error);
    return undefined;
  }
});

// IPC handlers for file operations
ipcMain.handle('read-json-file', async (event, filePath, defaultValue = []) => {
  try {
    // Use the readJsonFileWithRecovery function for robust JSON file handling
    const result = await readJsonFileWithRecovery(filePath, defaultValue);
    return result;
  } catch (error) {
    console.error(`Error reading JSON file: ${error.message}`);
    throw error;
  }
});

// IPC handler for loading settings from file
ipcMain.handle('load-settings-from-file', async (event) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    console.log(`Loading settings from: ${settingsPath}`);
    // Read the file directly as a string instead of using readJsonFile
    const settingsData = await fs.readFile(settingsPath, 'utf8');
    console.log(`Settings file content: ${settingsData.substring(0, 100)}...`);
    return settingsData; // Return the raw string content
  } catch (error) {
    console.error(`Error loading settings from file: ${error.message}`);
    // Return empty string if file doesn't exist or is invalid
    return '';
  }
});

// IPC handler for saving settings to file
ipcMain.handle('save-settings-to-file', async (event, settingsData) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    console.log(`Saving settings to: ${settingsPath}`);
    
    // Ensure the settings is a string
    const settingsString = typeof settingsData === 'string' 
      ? settingsData 
      : JSON.stringify(settingsData, null, 2);
    
    // Write the settings to file
    await fs.writeFile(settingsPath, settingsString, 'utf8');
    console.log('Settings saved successfully');
    return { success: true };
  } catch (error) {
    console.error(`Error saving settings to file: ${error.message}`);
    throw error;
  }
});

// IPC handler for loading target locations
ipcMain.handle('load-target-locations', async (event) => {
  try {
    const dataDir = path.join(app.getPath('userData'), 'data');
    const targetLocationsPath = path.join(dataDir, 'targetLocations.json');
    console.log(`Loading target locations from: ${targetLocationsPath}`);
    
    // Check if file exists
    try {
      await fs.access(targetLocationsPath);
    } catch (error) {
      console.log('Target locations file does not exist, returning empty array');
      return [];
    }
    
    // Read and parse the file
    const fileContent = await fs.readFile(targetLocationsPath, 'utf8');
    const locations = JSON.parse(fileContent);
    console.log(`Loaded ${locations.length} target locations`);
    return locations;
  } catch (error) {
    console.error(`Error loading target locations: ${error.message}`);
    return [];
  }
});

// IPC handler for saving target locations
ipcMain.handle('save-target-locations', async (event, locations) => {
  try {
    const dataDir = path.join(app.getPath('userData'), 'data');
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    const targetLocationsPath = path.join(dataDir, 'targetLocations.json');
    console.log(`Saving ${locations.length} target locations to: ${targetLocationsPath}`);
    
    // Write the locations to file
    await fs.writeFile(targetLocationsPath, JSON.stringify(locations, null, 2), 'utf8');
    console.log('Target locations saved successfully');
    return { success: true };
  } catch (error) {
    console.error(`Error saving target locations: ${error.message}`);
    throw error;
  }
});

// IPC handler for getting file stats
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    console.log(`Getting file stats for: ${filePath}`);
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime
    };
  } catch (error) {
    console.error(`Error getting file stats: ${error.message}`);
    return {
      error: error.message,
      code: error.code,
      exists: false
    };
  }
});

// Validate source directory for required SQLite files
ipcMain.handle('validate-source-directory', async (event, dirPath) => {
  const requiredFiles = ['configurations.mv.db', 'configurations.trace.db'];
  const result = {
    isValid: true,
    message: 'Všechny požadované soubory byly nalezeny',
    files: [],
    missingFiles: []
  };

  if (!dirPath) {
    return {
      isValid: false,
      message: 'Nebyl zadán žádný adresář',
      files: [],
      missingFiles: requiredFiles
    };
  }

  try {
    // Check if directory exists and is accessible
    try {
      await fs.access(dirPath, fsSync.constants.R_OK);
    } catch (error) {
      console.error('Directory access error:', error);
      return {
        isValid: false,
        message: `Nelze číst z adresáře: ${error.message}`,
        files: [],
        missingFiles: requiredFiles
      };
    }

    // Read directory contents
    const files = await fs.readdir(dirPath);
    result.files = files;
    
    // Create a case-insensitive set of available files
    const filesLower = new Set(files.map(f => f.toLowerCase()));
    
    // Check for required files (case-insensitive)
    const missing = [];
    for (const requiredFile of requiredFiles) {
      const found = Array.from(filesLower).some(file => file === requiredFile.toLowerCase());
      if (!found) {
        missing.push(requiredFile);
      } else {
        // Find the actual case-sensitive filename
        const actualFile = files.find(f => f.toLowerCase() === requiredFile.toLowerCase()) || requiredFile;
        console.log(`Found required file: ${actualFile}`);
      }
    }

    if (missing.length > 0) {
      result.isValid = false;
      result.missingFiles = missing;
      result.message = missing.length === 1 
        ? `Chybí požadovaný soubor: ${missing[0]}`
        : `Chybí ${missing.length} požadované soubory: ${missing.join(', ')}`;
    } else {
      console.log('All required files found in directory:', dirPath);
    }

    return result;
  } catch (error) {
    console.error('Error validating source directory:', error);
    return {
      isValid: false,
      message: `Chyba při čtení adresáře: ${error.message}`,
      files: [],
      missingFiles: requiredFiles
    };
  }
});

// Duplicate window control handler removed - using the updated handler above

// Remove existing handler if it exists
ipcMain.removeHandler('get-file-stats');

// Get detailed file stats
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    console.log('Raw stats for', filePath, ':', {
      size: stats.size,
      mtime: stats.mtime,
      birthtime: stats.birthtime,
      atime: stats.atime,
      ctime: stats.ctime,
      mode: stats.mode
    });
    
    // Convert Date objects to ISO strings for proper serialization
    return {
      size: stats.size,
      mtime: stats.mtime.getTime(), // Convert to timestamp
      birthtime: stats.birthtime.getTime(),
      atime: stats.atime.getTime(),
      ctime: stats.ctime.getTime(),
      mode: stats.mode,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    console.error('Error getting file stats:', error);
    throw error;
  }
});
// Helper function to ensure data directory exists
const ensureDataDirectory = async () => {
  const dataDir = path.join(app.getPath('userData'), 'data');
  const backupsDir = path.join(dataDir, 'backups');
  
  try {
    // Create data directory with proper permissions
    await fs.mkdir(dataDir, { recursive: true, mode: 0o755 });
    // Create backups directory
    await fs.mkdir(backupsDir, { recursive: true, mode: 0o755 });
    
    console.log('Data directory ensured at:', dataDir);
    return dataDir;
  } catch (err) {
    console.error('Error creating data directory:', err);
    // Try to continue with userData directory if data directory creation fails
    return app.getPath('userData');
  }
};

// Helper function to retry an async operation
const retryOperation = async (operation, maxRetries = 3, delay = 100) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError; // If all retries fail, throw the last error
};

// Helper function to safely rename files on Windows
const safeRename = async (oldPath, newPath) => {
  try {
    // First try direct rename
    return await fs.rename(oldPath, newPath);
  } catch (error) {
    if (process.platform === 'win32' && (error.code === 'EPERM' || error.code === 'EBUSY')) {
      // On Windows, if rename fails, try copying and then deleting
      try {
        await fs.copyFile(oldPath, newPath);
        await fs.unlink(oldPath);
        return;
      } catch (copyError) {
        console.error('Copy and delete failed:', copyError);
        throw copyError;
      }
    }
    throw error; // Re-throw if it's not a Windows-specific error
  }
};

/**
 * Copy files from source directory to target directory
 * @param {string} sourcePath - Source directory path
 * @param {string} targetPath - Target directory path
 * @param {Array<string>} filePatterns - Optional array of file patterns to copy (e.g. ['*.mv.db', '*.trace.db'])
 * @returns {Promise<{success: boolean, copiedFiles: Array, error: string}>}
 */
async function copyFiles(sourcePath, targetPath, filePatterns = ['*.mv.db', '*.trace.db'], createDirectoryIfMissing = true) {
  console.log(`Copying files from ${sourcePath} to ${targetPath}`);
  console.log(`File patterns: ${filePatterns.join(', ')}`);
  
  const copiedFiles = [];
  const errors = [];
  
  try {
    // Check if target directory exists
    let targetExists = false;
    try {
      await fs.access(targetPath, fsSync.constants.F_OK);
      targetExists = true;
    } catch (err) {
      targetExists = false;
    }
    
    // If directory doesn't exist and we shouldn't create it automatically, return special result
    if (!targetExists && !createDirectoryIfMissing) {
      return {
        success: false,
        copiedFiles: [],
        error: 'DIRECTORY_NOT_EXISTS',
        targetPath: targetPath
      };
    }
    
    // Create target directory if it doesn't exist
    if (!targetExists) {
      await fs.mkdir(targetPath, { recursive: true });
      console.log(`Created target directory: ${targetPath}`);
    }
    
    // Read source directory
    const files = await fs.readdir(sourcePath);
    console.log(`Found ${files.length} files in source directory`);
    
    // Filter files based on patterns
    const filesToCopy = [];
    for (const file of files) {
      // Check if file matches any of the patterns
      const shouldCopy = filePatterns.some(pattern => {
        // Convert glob pattern to regex
        const regexPattern = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        return new RegExp(`^${regexPattern}$`).test(file);
      });
      
      if (shouldCopy) {
        filesToCopy.push(file);
      }
    }
    
    console.log(`Will copy ${filesToCopy.length} files: ${filesToCopy.join(', ')}`);
    
    // Copy each file
    for (const file of filesToCopy) {
      const sourceFile = path.join(sourcePath, file);
      const targetFile = path.join(targetPath, file);
      
      try {
        // Check if source file exists and is accessible
        await fs.access(sourceFile, fsSync.constants.R_OK);
        
        // Check if target file is locked
        const isLocked = await isFileInUse(targetFile);
        if (isLocked) {
          errors.push(`File ${file} is locked in target location`);
          continue;
        }
        
        // Get file stats before copying
        const fileStats = await fs.stat(sourceFile);
        const fileSize = fileStats.size;
        
        // Copy the file
        await fs.copyFile(sourceFile, targetFile);
        
        // Add to copied files with size information
        copiedFiles.push({
          name: file,
          size: fileSize
        });
        
        // Log file size in human-readable format
        const sizeInKB = Math.round(fileSize / 1024);
        const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
        console.log(`Successfully copied ${file} - Size: ${fileSize} bytes (${sizeInKB} KB, ${sizeInMB} MB)`);
      } catch (err) {
        console.error(`Error copying file ${file}:`, err);
        errors.push(`Failed to copy ${file}: ${err.message}`);
      }
    }
    
    // Log summary of copied files
    if (copiedFiles.length > 0) {
      console.log('Summary of copied files:');
      copiedFiles.forEach(file => {
        console.log(`- ${file.name}: ${file.size} bytes`);
      });
    }
    
    // Return result with detailed file information
    return {
      success: errors.length === 0,
      copiedFiles,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  } catch (err) {
    console.error('Error in copyFiles:', err);
    return {
      success: false,
      copiedFiles,
      error: err.message
    };
  }
}

/**
 * Create backups of target files before copying
 * @param {string} sourcePath - Source directory path
 * @param {Array<string>} targetPaths - Array of target directory paths
 * @returns {Promise<{success: boolean, error: string}>}
 */
async function createBackupBeforeCopy(sourcePath, targetPaths) {
  console.log(`Creating backups before copying from ${sourcePath} to ${targetPaths.join(', ')}`);
  
  try {
    // For each target path, create a backup of existing files that would be overwritten
    for (const targetPath of targetPaths) {
      // Get list of files to be copied from source
      const sourceFiles = await fs.readdir(sourcePath);
      const filePatterns = ['*.mv.db', '*.trace.db']; // Default patterns
      
      // Filter source files based on patterns
      const filesToBackup = [];
      for (const file of sourceFiles) {
        // Check if file matches any of the patterns
        const shouldBackup = filePatterns.some(pattern => {
          // Convert glob pattern to regex
          const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          return new RegExp(`^${regexPattern}$`).test(file);
        });
        
        if (shouldBackup) {
          const targetFile = path.join(targetPath, file);
          // Check if the file exists in the target directory
          try {
            await fs.access(targetFile, fsSync.constants.F_OK);
            filesToBackup.push(file);
          } catch {
            // File doesn't exist in target, no need to back up
          }
        }
      }
      
      console.log(`Will backup ${filesToBackup.length} files from ${targetPath}`);
      
      // Create backups for each file
      for (const file of filesToBackup) {
        const targetFile = path.join(targetPath, file);
        await createBackup(targetFile);
      }
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error creating backups:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

// Handle ensure data directory
ipcMain.handle('ensure-data-directory', ensureDataDirectory);

// Handle source file changes detection
ipcMain.handle('check-source-changes', async (event, { sourcePath, lastCheckTime, targetPaths }) => {
  try {
    console.log(`Checking for changes in ${sourcePath} since ${new Date(lastCheckTime).toISOString()}`);
    
    if (!sourcePath) {
      return { hasChanges: false, error: 'No source path provided' };
    }
    
    // Check if directory exists
    try {
      await fs.access(sourcePath);
    } catch (error) {
      return { hasChanges: false, error: `Source directory does not exist: ${error.message}` };
    }
    
    // Get all files in the directory
    const files = await fs.readdir(sourcePath);
    let hasChanges = false;
    let changedFiles = [];
    
    // We'll focus on database files (*.mv.db and *.trace.db)
    const dbFilePatterns = ['*.mv.db', '*.trace.db'];
    const dbFiles = files.filter(file => {
      return dbFilePatterns.some(pattern => {
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return regex.test(file);
      });
    });
    
    console.log(`Found ${dbFiles.length} database files in source directory:`, dbFiles);
    
    // Check each database file
    for (const file of dbFiles) {
      const sourceFilePath = path.join(sourcePath, file);
      
      try {
        const sourceStats = await fs.stat(sourceFilePath);
        console.log(`Source file ${file} stats:`, {
          size: sourceStats.size,
          mtime: sourceStats.mtime
        });
        
        // Check if file was modified after the last check time
        const modifiedAfterLastCheck = sourceStats.mtimeMs > lastCheckTime;
        
        // If we have target paths, check if source and target files are different
        let targetDifferences = false;
        
        if (targetPaths && targetPaths.length > 0) {
          for (const targetPath of targetPaths) {
            try {
              const targetFilePath = path.join(targetPath, file);
              
              try {
                // Check if target file exists
                await fs.access(targetFilePath);
                
                // Compare file sizes
                const targetStats = await fs.stat(targetFilePath);
                console.log(`Target file ${targetFilePath} stats:`, {
                  size: targetStats.size,
                  mtime: targetStats.mtime
                });
                
                // If sizes are different, we have changes
                if (sourceStats.size !== targetStats.size) {
                  console.log(`Size difference detected for ${file}: source=${sourceStats.size}, target=${targetStats.size}`);
                  targetDifferences = true;
                }
              } catch (accessError) {
                // Target file doesn't exist, so it's different
                console.log(`Target file ${targetFilePath} doesn't exist`);
                targetDifferences = true;
              }
            } catch (targetError) {
              console.error(`Error checking target file in ${targetPath}:`, targetError);
            }
          }
        }
        
        // If file was modified after last check or there are differences with targets
        if (modifiedAfterLastCheck || targetDifferences) {
          hasChanges = true;
          changedFiles.push({
            name: file,
            modifiedTime: sourceStats.mtimeMs,
            size: sourceStats.size,
            modifiedAfterLastCheck,
            targetDifferences
          });
        }
      } catch (error) {
        console.error(`Error checking file ${sourceFilePath}:`, error);
        // Continue with other files even if one fails
      }
    }
    
    console.log(`Change detection result: hasChanges=${hasChanges}, changedFiles=${changedFiles.length}`);
    
    return { 
      hasChanges, 
      changedFiles,
      currentTime: Date.now() 
    };
  } catch (error) {
    console.error('Error checking source changes:', error);
    return { 
      hasChanges: false, 
      error: error.message,
      currentTime: Date.now()
    };
  }
});

// Handle file copy operation
ipcMain.handle('copy-files', async (event, { sourcePath, targetPath, filePatterns, createDirectoryIfMissing = true }) => {
  console.log(`Received copy-files request from renderer`);
  return await copyFiles(sourcePath, targetPath, filePatterns, createDirectoryIfMissing);
});

// Handle backup creation before copy
ipcMain.handle('create-backup', async (event, { sourcePath, targetPaths }) => {
  console.log(`Received create-backup request from renderer`);
  return await createBackupBeforeCopy(sourcePath, targetPaths);
});

// Handle single file backup creation
ipcMain.handle('create-single-backup', async (event, filePath) => {
  console.log(`Creating backup for single file: ${filePath}`);
  try {
    const backupPath = await createBackup(filePath);
    return { success: true, backupPath };
  } catch (error) {
    console.error('Error creating backup:', error);
    return { success: false, error: error.message };
  }
});

// Handle check if file is in use
ipcMain.handle('check-file-in-use', async (event, filePath) => {
  console.log('Main process: Checking if file is in use:', filePath);
  try {
    const inUse = isFileInUse(filePath);
    console.log(`Main process: File ${filePath} is ${inUse ? 'in use' : 'not in use'}`);
    return { inUse };
  } catch (error) {
    console.error('Error checking if file is in use:', error);
    return { inUse: false, error: error.message };
  }
});

// Handle native notifications
ipcMain.handle('show-notification', async (event, options) => {
  console.log('Main process: Showing native notification', options);
  
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: options.title || 'DB Sync Utility',
      body: options.body || '',
      icon: options.icon || path.join(__dirname, '../public/favicon.ico'),
      silent: options.silent || false
    });
    
    notification.show();
    return true;
  } else {
    console.log('Main process: Notifications are not supported on this system');
    return false;
  }
});

// Maximum number of backups to keep
const MAX_BACKUPS = 5;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 100; // ms

// File locks to prevent concurrent writes to the same file
const fileLocks = new Map();

/**
 * Acquire a lock for a file
 * @param {string} filePath - Path to the file to lock
 * @returns {Promise<Function>} - Function to release the lock
 */
async function acquireFileLock(filePath) {
  const normalizedPath = path.normalize(filePath);
  
  // Wait for any existing lock to be released
  while (fileLocks.has(normalizedPath)) {
    console.log(`Waiting for lock on ${normalizedPath} to be released...`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Acquire the lock
  console.log(`Acquired lock for ${normalizedPath}`);
  fileLocks.set(normalizedPath, true);
  
  // Return a function to release the lock
  return () => {
    console.log(`Released lock for ${normalizedPath}`);
    fileLocks.delete(normalizedPath);
  };
}

/**
 * Validates JSON content and returns parsed data if valid
 */
function validateJson(content) {
  try {
    // Remove BOM if present
    const cleanContent = content.replace(/^\uFEFF/, '').trim();
    
    // Check for empty content
    if (!cleanContent) {
      return { valid: false, error: 'Empty content' };
    }
    
    // Parse and validate JSON
    const data = JSON.parse(cleanContent);
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error };
  }
}

/**
 * Creates a backup of a file
 */
async function createBackup(filePath) {
  try {
    const backupDir = path.join(path.dirname(filePath), 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    // Get the base filename without path
    const baseFileName = path.basename(filePath);
    
    // Create a simple backup name without timestamp
    const backupPath = path.join(backupDir, `${baseFileName}.bak`);
    
    // Check if a backup already exists
    if (fsSync.existsSync(backupPath)) {
      try {
        // Delete the existing backup
        await fs.unlink(backupPath);
        console.log(`Removed existing backup: ${path.basename(backupPath)}`);
      } catch (err) {
        console.error(`Failed to remove existing backup ${path.basename(backupPath)}:`, err);
      }
    }
    
    // Create the new backup
    await fs.copyFile(filePath, backupPath);
    console.log(`Created new backup: ${path.basename(backupPath)}`);
    
    return backupPath;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return null;
  }
}

/**
 * Cleans up old backups, keeping only the most recent number of backups specified in settings
 */
async function cleanupOldBackups(filePath, maxBackups = null) {
  // If maxBackups is not provided, try to get it from settings
  if (maxBackups === null || typeof maxBackups !== 'number') {
    try {
      // Try to load from global settings cache first
      if (global.appSettings && typeof global.appSettings.backupRetentionCount === 'number') {
        maxBackups = global.appSettings.backupRetentionCount;
        console.log(`Using backup retention count from global settings: ${maxBackups}`);
      } else {
        // Fall back to reading from file
        const settingsPath = path.join(getDataDirectory(), 'settings.json');
        if (fsSync.existsSync(settingsPath)) {
          const settingsData = await fs.readFile(settingsPath, 'utf8');
          const settings = JSON.parse(settingsData);
          maxBackups = settings.backupRetentionCount || 10;
          console.log(`Loaded backup retention count from settings file: ${maxBackups}`);
        } else {
          maxBackups = 10; // Default if settings file doesn't exist
          console.log(`Using default backup retention count: ${maxBackups}`);
        }
      }
    } catch (error) {
      console.warn('Error reading backup retention setting:', error);
      maxBackups = 10; // Default on error
      console.log(`Using default backup retention count after error: ${maxBackups}`);
    }
  }
  
  // Ensure maxBackups is a positive number
  maxBackups = Math.max(1, Math.floor(Number(maxBackups)));
  console.log(`Final backup retention count: ${maxBackups}`);
  
  try {
    const backupDir = path.join(path.dirname(filePath), 'backups');
    const baseName = path.basename(filePath);
    
    // Check if backup directory exists
    try {
      await fs.access(backupDir);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return; // No backups to clean
      }
      throw err;
    }
    
    // Get all backup files for this file
    const files = await fs.readdir(backupDir);
    console.log(`Found ${files.length} files in backup directory`);
    
    // Improved backup file detection
    const backupPattern = new RegExp(`^${escapeRegExp(baseName)}\..*\.bak$`);
    const backupFiles = files
      .filter(file => backupPattern.test(file))
      .map(file => {
        // Extract timestamp from filename
        const timestampMatch = file.match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}/);
        let fileTime;
        
        if (timestampMatch) {
          try {
            // Convert timestamp string to Date object
            const timeStr = timestampMatch[0].replace(/_/g, 'T').replace(/-/g, ':');
            fileTime = new Date(timeStr);
            
            // Check if date is valid
            if (isNaN(fileTime.getTime())) {
              console.warn(`Invalid date from backup filename: ${file}`);
              fileTime = new Date(0); // Use epoch as fallback
            }
          } catch (err) {
            console.warn(`Error parsing date from backup filename: ${file}`, err);
            fileTime = new Date(0); // Use epoch as fallback
          }
        } else {
          fileTime = new Date(0); // Use epoch as fallback
        }
        
        return {
          name: file,
          path: path.join(backupDir, file),
          time: fileTime
        };
      });
    
    console.log(`Identified ${backupFiles.length} backup files for ${baseName}`);
    
    // Helper function to escape special characters in string for use in RegExp
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Sort by date (oldest first) to identify the oldest files
    backupFiles.sort((a, b) => a.time - b.time);
    
    console.log(`Backup retention policy: keeping ${maxBackups} most recent backups out of ${backupFiles.length} total`);
    
    if (backupFiles.length > maxBackups) {
      // Delete the oldest files, keep the newest ones
      const toRemove = backupFiles.slice(0, backupFiles.length - maxBackups);
      const toKeep = backupFiles.slice(backupFiles.length - maxBackups);
      
      console.log(`Will remove ${toRemove.length} oldest backups:`);
      toRemove.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.time.toISOString()})`);
      });
      
      console.log(`Will keep ${toKeep.length} newest backups:`);
      toKeep.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.time.toISOString()})`);
      });
      
      // Delete the old backups
      let deletedCount = 0;
      for (const file of toRemove) {
        try {
          // Check if file exists before attempting to delete
          if (fsSync.existsSync(file.path)) {
            await fs.unlink(file.path);
            console.log(`Successfully removed old backup: ${file.name}`);
            deletedCount++;
          } else {
            console.warn(`Backup file not found, may have been deleted already: ${file.path}`);
          }
        } catch (err) {
          console.error(`Failed to remove backup ${file.name}:`, err);
        }
      }
      
      console.log(`Cleanup complete: removed ${deletedCount} of ${toRemove.length} old backups`);
    } else {
      console.log(`No backups to remove: ${backupFiles.length} files are within the limit of ${maxBackups}`);
    }
  } catch (error) {
    console.warn(`Error cleaning up old backups: ${error.message}`);
    // Non-critical error, don't throw
  }
}

/**
 * Safely parses JSON with recovery
 */
async function safeJsonParse(filePath, content) {
  const validation = validateJson(content);
  
  if (validation.valid) {
    return { success: true, data: validation.data };
  }
  
  console.warn('Initial JSON parse failed, attempting recovery:', validation.error);
  
  try {
    // Try to fix common JSON issues
    let fixedContent = content.trim();
    
    // Remove any content after the last valid JSON structure
    const lastBracket = Math.max(
      fixedContent.lastIndexOf(']'),
      fixedContent.lastIndexOf('}')
    );
    
    if (lastBracket !== -1) {
      fixedContent = fixedContent.substring(0, lastBracket + 1);
    }
    
    // Try to validate the fixed content
    const fixedValidation = validateJson(fixedContent);
    
    if (fixedValidation.valid) {
      // Create a backup of the corrupted file
      await createBackup(filePath);
      
      // Write the fixed content back to the file
      await fs.writeFile(filePath, JSON.stringify(fixedValidation.data, null, 2), 'utf-8');
      console.log('Successfully fixed JSON file');
      
      return { success: true, data: fixedValidation.data };
    }
    
    throw new Error('Could not recover JSON data');
  } catch (recoveryError) {
    console.error('JSON recovery failed:', recoveryError);
    return { 
      success: false, 
      error: recoveryError,
      message: recoveryError.message || 'Failed to parse JSON'
    };
  }
}

// Helper function to initialize a new JSON file with default content
const initializeJsonFile = async (filePath, defaultContent = []) => {
  try {
    const data = JSON.stringify(defaultContent, null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
    console.log(`Initialized new file at ${filePath}`);
    return defaultContent;
  } catch (error) {
    console.error(`Error initializing file ${filePath}:`, error);
    return defaultContent;
  }
};

// Add check-path-access handler for checking if a path is accessible
ipcMain.handle('check-path-access', async (event, pathToCheck) => {
  try {
    console.log(`Checking path access: ${pathToCheck}`);
    await fs.access(pathToCheck, fsSync.constants.F_OK | fsSync.constants.R_OK);
    return { accessible: true, error: null };
  } catch (error) {
    console.error(`Path access check failed for ${pathToCheck}:`, error);
    return { 
      accessible: false, 
      error: error.message,
      code: error.code
    };
  }
});

// Network connectivity and offline support handlers

// Check if a path is a network drive
function isNetworkDrive(drivePath) {
  if (!drivePath) return false;
  
  // Check for UNC paths (\\server\share)
  if (drivePath.startsWith('\\\\')) {
    return true;
  }
  
  // For Windows, check if it's a mapped network drive
  // This is a basic check - more sophisticated detection could be added
  try {
    const stats = fsSync.statSync(drivePath);
    // Additional checks could be added here to detect network drives
    return false; // For now, only UNC paths are considered network drives
  } catch (error) {
    // If we can't stat the path, it might be a disconnected network drive
    return drivePath.match(/^[A-Z]:\\/) !== null;
  }
}

// Enhanced path access check with network drive detection
ipcMain.handle('check-path-access-enhanced', async (event, pathToCheck) => {
  try {
    console.log(`Enhanced path access check: ${pathToCheck}`);
    
    const isNetwork = isNetworkDrive(pathToCheck);
    const startTime = Date.now();
    
    // Set a timeout for network operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), isNetwork ? 10000 : 5000);
    });
    
    const accessPromise = fs.access(pathToCheck, fsSync.constants.F_OK | fsSync.constants.R_OK);
    
    await Promise.race([accessPromise, timeoutPromise]);
    
    const responseTime = Date.now() - startTime;
    
    return { 
      accessible: true, 
      error: null,
      isNetworkDrive: isNetwork,
      responseTime,
      timestamp: Date.now()
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const isNetwork = isNetworkDrive(pathToCheck);
    
    console.error(`Enhanced path access check failed for ${pathToCheck}:`, error);
    
    // Determine if this is a network-related error
    const networkErrorCodes = ['ENOENT', 'EACCES', 'EPERM', 'ETIMEDOUT', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH', 'EBUSY', 'EAGAIN'];
    const isNetworkError = networkErrorCodes.includes(error.code) || error.message === 'TIMEOUT';
    
    return { 
      accessible: false, 
      error: error.message,
      code: error.code,
      isNetworkDrive: isNetwork,
      isNetworkError,
      responseTime,
      timestamp: Date.now()
    };
  }
});

// Network connectivity cache to avoid frequent expensive checks
let networkConnectivityCache = {
  lastCheck: 0,
  result: null,
  cacheDuration: 120000 // 2 minutes cache
};

// Check overall network connectivity with caching
ipcMain.handle('check-network-connectivity', async (event) => {
  try {
    const now = Date.now();
    
    // Return cached result if it's still valid (within 2 minutes)
    if (networkConnectivityCache.result && 
        (now - networkConnectivityCache.lastCheck) < networkConnectivityCache.cacheDuration) {
      console.log('Using cached network connectivity result');
      return networkConnectivityCache.result;
    }
    
    console.log('Performing network connectivity check...');
    
    const results = {
      hasInternetConnection: false,
      canAccessLocalNetwork: false,
      networkDriveStatus: [],
      timestamp: now
    };
    
    // Check internet connectivity by trying to resolve a DNS name (with timeout)
    try {
      const dns = require('dns').promises;
      // Set a timeout for DNS resolution to avoid hanging
      const dnsPromise = dns.resolve('google.com');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DNS_TIMEOUT')), 5000)
      );
      
      await Promise.race([dnsPromise, timeoutPromise]);
      results.hasInternetConnection = true;
    } catch (dnsError) {
      // Don't log every DNS failure to reduce console spam
      if (dnsError.message !== 'DNS_TIMEOUT') {
        console.log('No internet connection detected:', dnsError.message);
      }
    }
    
    // Check local network connectivity (lightweight check)
    try {
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      
      // Check if we have active network interfaces
      const activeInterfaces = Object.values(networkInterfaces)
        .flat()
        .filter(iface => !iface.internal && iface.family === 'IPv4');
      
      results.canAccessLocalNetwork = activeInterfaces.length > 0;
    } catch (networkError) {
      console.log('Local network check failed:', networkError.message);
    }
    
    const response = { success: true, ...results };
    
    // Cache the result
    networkConnectivityCache = {
      lastCheck: now,
      result: response,
      cacheDuration: 120000 // 2 minutes
    };
    
    return response;
  } catch (error) {
    console.error('Network connectivity check failed:', error);
    const errorResponse = { 
      success: false, 
      error: error.message,
      timestamp: Date.now()
    };
    
    // Cache error response for shorter duration
    networkConnectivityCache = {
      lastCheck: Date.now(),
      result: errorResponse,
      cacheDuration: 30000 // 30 seconds for errors
    };
    
    return errorResponse;
  }
});

// Enhanced file operation with retry logic for network issues
ipcMain.handle('copy-files-with-retry', async (event, sourcePath, targetPath, filePatterns, options = {}) => {
  const {
    createDirectoryIfMissing = true,
    maxRetries = 3,
    retryDelay = 2000,
    exponentialBackoff = true
  } = options;
  
  console.log(`Copy files with retry: ${sourcePath} -> ${targetPath}`);
  
  let lastError;
  const isSourceNetwork = isNetworkDrive(sourcePath);
  const isTargetNetwork = isNetworkDrive(targetPath);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use the existing copyFiles function
      const result = await copyFiles(sourcePath, targetPath, filePatterns, createDirectoryIfMissing);
      
      // If successful, return with retry information
      return {
        ...result,
        retryInfo: {
          attempts: attempt + 1,
          isSourceNetwork,
          isTargetNetwork,
          finalAttemptSuccessful: true
        }
      };
    } catch (error) {
      lastError = error;
      
      // Check if this is a network error that we should retry
      const networkErrorCodes = ['ENOENT', 'EACCES', 'EPERM', 'ETIMEDOUT', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH', 'EBUSY', 'EAGAIN'];
      const isNetworkError = networkErrorCodes.includes(error.code);
      
      // Don't retry if it's not a network error or if we've exhausted retries
      if (!isNetworkError || attempt === maxRetries) {
        console.error(`Copy operation failed after ${attempt + 1} attempts:`, error);
        return {
          success: false,
          error: error.message,
          code: error.code,
          retryInfo: {
            attempts: attempt + 1,
            isSourceNetwork,
            isTargetNetwork,
            finalAttemptSuccessful: false,
            lastError: error.message
          }
        };
      }
      
      // Calculate delay with exponential backoff
      const delay = exponentialBackoff 
        ? retryDelay * Math.pow(2, attempt)
        : retryDelay;
      
      console.log(`Copy attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This shouldn't be reached, but just in case
  throw lastError;
});

// Check if specific network drives are accessible
ipcMain.handle('check-network-drives', async (event, drivePaths) => {
  console.log('Checking network drives:', drivePaths);
  
  const results = [];
  
  for (const drivePath of drivePaths) {
    try {
      const startTime = Date.now();
      const isNetwork = isNetworkDrive(drivePath);
      
      // Set timeout for network drives
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 8000);
      });
      
      const accessPromise = fs.access(drivePath, fsSync.constants.F_OK | fsSync.constants.R_OK);
      
      await Promise.race([accessPromise, timeoutPromise]);
      
      const responseTime = Date.now() - startTime;
      
      results.push({
        path: drivePath,
        accessible: true,
        isNetworkDrive: isNetwork,
        responseTime,
        error: null
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const isNetwork = isNetworkDrive(drivePath);
      
      results.push({
        path: drivePath,
        accessible: false,
        isNetworkDrive: isNetwork,
        responseTime,
        error: error.message,
        code: error.code
      });
    }
  }
  
  return {
    success: true,
    results,
    timestamp: Date.now()
  };
});

// Helper function for JSON file operations - NOT an IPC handler
async function readJsonFileWithRecovery(filePath, defaultValue = []) {
  const dataDir = await ensureDataDirectory();
  const fullPath = path.join(dataDir, path.basename(filePath));
  
  try {
    // Check if file exists first
    try {
      await fs.access(fullPath);
    } catch (accessError) {
      if (accessError.code === 'ENOENT') {
        console.log(`File ${filePath} not found, initializing with default content`);
        const data = await initializeJsonFile(fullPath, defaultValue);
        return { data, metadata: { initialized: true } };
      }
      throw accessError;
    }
    
    // Read the file
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    
    // If file is empty, try to restore from backup first
    if (!fileContent.trim()) {
      console.log(`File ${filePath} is empty, attempting to restore from backup`);
      
      // Try to find the most recent backup
      try {
        const backupDir = path.join(dataDir, 'backups');
        const backupPattern = new RegExp(`^${escapeRegExp(path.basename(filePath))}\..*\.bak$`);
        
        // Check if backup directory exists
        await fs.access(backupDir);
        
        // Get all backup files for this file
        const files = await fs.readdir(backupDir);
        const backupFiles = files
          .filter(file => backupPattern.test(file))
          .map(file => {
            try {
              const fileStat = fsSync.statSync(path.join(backupDir, file));
              return {
                name: file,
                path: path.join(backupDir, file),
                time: fileStat.mtime
              };
            } catch (err) {
              console.warn(`Error getting file stats for ${file}:`, err);
              return null;
            }
          })
          .filter(Boolean); // Remove any null entries
        
        // Sort by date (newest first)
        backupFiles.sort((a, b) => b.time - a.time);
        
        // If we have backups, restore from the most recent one
        if (backupFiles.length > 0) {
          const latestBackup = backupFiles[0];
          console.log(`Found backup to restore: ${latestBackup.name} from ${latestBackup.time.toISOString()}`);
          
          // Read the backup file
          const backupContent = await fs.readFile(latestBackup.path, 'utf-8');
          
          // Validate the backup content
          const validation = validateJson(backupContent);
          
          if (validation.valid) {
            // Write the backup content to the original file
            await fs.writeFile(fullPath, JSON.stringify(validation.data, null, 2), 'utf-8');
            console.log(`Successfully restored ${filePath} from backup`);
            
            // Return data with metadata about restoration
            return { 
              data: validation.data, 
              metadata: { 
                restored: true, 
                backupFile: latestBackup.name,
                backupDate: latestBackup.time.toISOString()
              } 
            };
          } else {
            console.warn(`Backup file ${latestBackup.name} contains invalid JSON, falling back to default`);
          }
        } else {
          console.log(`No backups found for ${filePath}`);
        }
      } catch (backupError) {
        console.warn(`Error restoring from backup: ${backupError.message}`);
      }
      
      // If we couldn't restore from backup, initialize with default content
      console.log(`Initializing ${filePath} with default content`);
      const data = await initializeJsonFile(fullPath, defaultValue);
      return { data, metadata: { initialized: true } };
    }
    
    // Try to parse the content
    const result = await safeJsonParse(fullPath, fileContent);
    
    if (result.success) {
      return { data: result.data, metadata: { success: true } };
    }
    
    // If we get here, recovery failed - create a backup and reinitialize
    console.warn('JSON recovery failed, creating backup and reinitializing file');
    
    try {
      // Create a proper backup in the backups directory
      const backupPath = await createBackup(fullPath);
      if (backupPath) {
        console.log(`Created backup of corrupted file at: ${backupPath}`);
      }
    } catch (backupError) {
      console.error('Failed to create backup:', backupError);
    }
    
    // Reinitialize the file with default content
    const data = await initializeJsonFile(fullPath, defaultValue);
    return { data, metadata: { initialized: true, recoveryFailed: true } };
  } catch (err) {
    console.error(`Unexpected error reading JSON file ${filePath}:`, err);
    // Initialize the file if we can't read it
    const data = await initializeJsonFile(fullPath, defaultValue);
    return { data, metadata: { initialized: true, error: err.message } };
  }
}

// Handle write-json-file with robust error handling and first-time creation
ipcMain.handle('write-json-file', async (event, { filePath, data }) => {
  // Acquire a lock for this file to prevent concurrent writes
  let releaseLock = null;
  
  try {
    // Get exclusive lock for this file
    releaseLock = await acquireFileLock(filePath);
    const dataDir = await ensureDataDirectory();
    const fullPath = path.join(dataDir, path.basename(filePath));
    // Use process ID and timestamp to ensure unique temp files
    const tempPath = `${fullPath}.${process.pid}.${Date.now()}.tmp`;
    const dirPath = path.dirname(fullPath);
    let isNewFile = false;

    // 1. Ensure the directory exists and is writable
    await retryOperation(async () => {
      try {
        await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.error('Error creating directory:', error);
          throw new Error(`Failed to create directory: ${error.message}`);
        }
      }
      
      // Verify directory is writable
      try {
        await fs.access(dirPath, fs.constants.W_OK);
      } catch (accessError) {
        console.error('Directory is not writable:', accessError);
        throw new Error(`Directory is not writable: ${accessError.message}`);
      }
    }, 3, 100);

    // 2. Check if file exists
    try {
      await fs.access(fullPath);
    } catch (accessError) {
      if (accessError.code === 'ENOENT') {
        console.log(`File ${filePath} does not exist, will create it`);
        isNewFile = true;
      } else {
        throw accessError;
      }
    }

    // 3. For new files, write directly
    if (isNewFile) {
      try {
        const jsonString = JSON.stringify(data, null, 2);
        await fs.writeFile(fullPath, jsonString, { encoding: 'utf-8', flag: 'wx' });
        console.log(`Successfully created new file at: ${fullPath}`);
        return { success: true, message: 'File created successfully' }; // Exit early for new files
      } catch (writeError) {
        if (writeError.code === 'EEXIST') {
          // Race condition: file was created between our check and write
          console.log('File was created by another process, continuing with update flow');
          isNewFile = false;
          // Continue to update flow
        } else {
          console.error('Failed to create new file:', writeError);
          throw new Error(`Failed to create new file: ${writeError.message}`);
        }
      }
    }

    // 4. For existing files, create a backup
    let backupPath = null;
    if (!isNewFile) { // Only create backup if updating existing file
      try {
        backupPath = await createBackup(fullPath);
        if (backupPath) {
          console.log('Created backup at:', backupPath);
        }
      } catch (backupError) {
        console.warn('Could not create backup, continuing without one:', backupError);
      }
    }
  
    // 5. Stringify and validate JSON
    let jsonString;
    try {
      jsonString = JSON.stringify(data, null, 2);
      // Quick validation by parsing
      JSON.parse(jsonString);
    } catch (jsonError) {
      throw new Error(`Invalid JSON data: ${jsonError.message}`);
    }
    
    // 6. Write to temporary file with retry and verification
    let tempFileWritten = false;
    await retryOperation(async () => {
      try {
        // Write with sync flag to ensure it completes
        await fs.writeFile(tempPath, jsonString, { 
          encoding: 'utf-8',
          flag: 'w',
          mode: 0o644
        });
        
        // Verify the temporary file exists and was written correctly
        if (!fsSync.existsSync(tempPath)) {
          throw new Error('Temporary file does not exist after write');
        }
        
        const tempContent = await fs.readFile(tempPath, 'utf-8');
        JSON.parse(tempContent); // Validate JSON
        tempFileWritten = true;
        console.log('Successfully wrote and verified temporary file:', tempPath);
      } catch (writeError) {
        console.error('Temporary file write/verify failed, retrying...', writeError);
        throw writeError; // Retry
      }
    }, 3, 200); // More retries with longer delay
    
    if (!tempFileWritten) {
      throw new Error('Failed to write temporary file after multiple attempts');
    }
    
    // 7. Direct write approach - more reliable than rename on Windows
    try {
      // Read the temp file we just wrote
      const content = await fs.readFile(tempPath, 'utf-8');
      
      // Write directly to the target file
      await fs.writeFile(fullPath, content, {
        encoding: 'utf-8',
        flag: 'w',
        mode: 0o644
      });
      
      console.log('Successfully wrote file directly to:', fullPath);
    } catch (writeError) {
      console.error('Direct write failed:', writeError);
      
      // If direct write fails, try to restore from backup
      if (backupPath) {
        console.log('Attempting to restore from backup...');
        try {
          const backupContent = await fs.readFile(backupPath, 'utf-8');
          await fs.writeFile(fullPath, backupContent, 'utf-8');
          console.log('Successfully restored from backup');
        } catch (restoreError) {
          console.error('Backup restoration failed:', restoreError);
          throw new Error(`Failed to write file and restore backup: ${writeError.message}`);
        }
      } else {
        throw new Error(`Failed to write file: ${writeError.message}`);
      }
    }
    
    // 8. Verify the final file
    try {
      if (!fsSync.existsSync(fullPath)) {
        throw new Error('Final file does not exist after write');
      }
      
      const finalContent = await fs.readFile(fullPath, 'utf-8');
      JSON.parse(finalContent); // Validate JSON
      console.log('Successfully verified final file at:', fullPath);
    } catch (verifyError) {
      console.error('Final file verification failed:', verifyError);
      // If verification fails but we have a backup, try to restore
      if (backupPath) {
        try {
          const backupContent = await fs.readFile(backupPath, 'utf-8');
          await fs.writeFile(fullPath, backupContent, 'utf-8');
          console.log('Restored from backup after verification failure');
        } catch (restoreError) {
          console.error('Backup restoration failed:', restoreError);
        }
      }
      // Continue anyway as the file might still be usable
    }
    
    // 9. Clean up temporary file
    try {
      if (fsSync.existsSync(tempPath)) {
        await fs.unlink(tempPath);
        console.log('Cleaned up temporary file:', tempPath);
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
      // Non-critical error, don't throw
    }
    
    // 10. Keep backup for a while, don't clean up immediately
    // We'll let the backup rotation handle cleanup on next write
    
    // Release the file lock before returning
    if (releaseLock) {
      releaseLock();
    }
    
    return { success: true, message: 'File updated successfully' };
    
  } catch (err) {
    console.error(`Error writing JSON file ${filePath}:`, err);
    
    // Clean up temp file if it exists
    try {
      if (fsSync.existsSync(tempPath)) {
        await fs.unlink(tempPath);
      }
    } catch (cleanupError) {
      try {
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        await fs.writeFile(fullPath, backupContent, 'utf-8');
        console.log('Successfully restored from backup');
        
        // Release the file lock before returning
        if (releaseLock) {
          releaseLock();
        }
        
        return { success: true, message: 'Restored from backup', restored: true };
      } catch (restoreError) {
        console.error('Backup restoration failed:', restoreError);
      }
    }
    
    // If no backup or restoration failed, try to initialize with empty array
    try {
      console.log('Attempting to initialize with default data...');
      // Use synchronous operations for more reliability in error recovery
      const jsonString = JSON.stringify(data || [], null, 2);
      
      // Make sure the directory exists
      if (!fsSync.existsSync(dirPath)) {
        fsSync.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
      }
      
      // Write directly to the file
      fsSync.writeFileSync(fullPath, jsonString, { encoding: 'utf-8', mode: 0o644 });
      console.log('Successfully initialized with default data');
      
      // Release the file lock before returning
      if (releaseLock) {
        releaseLock();
      }
      
      return { success: true, message: 'Initialized with default data', initialized: true };
    } catch (initError) {
      console.error('Failed to initialize with default data:', initError);
    }
    
    // Release the file lock before throwing error
    if (releaseLock) {
      releaseLock();
    }
    
    throw new Error(`Failed to write file: ${err.message}`);
  }
});

// Settings are now handled by the IPC handler defined earlier in the file
// The duplicate handler has been removed to prevent the 'Attempted to register a second handler for save-settings-to-file' error

// Password management handlers
ipcMain.handle('get-password', async () => {
  try {
    const dataDir = await ensureDataDirectory();
    const passwordFile = path.join(dataDir, 'password.json');
    
    // Check if password file exists
    try {
      await fs.access(passwordFile);
    } catch (err) {
      // If file doesn't exist, create it with default password
      await fs.writeFile(passwordFile, JSON.stringify({ password: 'admin' }), 'utf8');
      return 'admin';
    }
    
    // Read password from file
    const data = await fs.readFile(passwordFile, 'utf8');
    const { password } = JSON.parse(data);
    return password || 'admin';
  } catch (error) {
    console.error('Error getting password:', error);
    return 'admin'; // Fallback to default password
  }
});

ipcMain.handle('set-password', async (event, newPassword) => {
  try {
    const dataDir = await ensureDataDirectory();
    const passwordFile = path.join(dataDir, 'password.json');
    
    // Write new password to file
    await fs.writeFile(passwordFile, JSON.stringify({ password: newPassword }), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error setting password:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('verify-password', async (event, password) => {
  try {
    // Read password directly from file instead of trying to access handler
    const dataDir = await ensureDataDirectory();
    const passwordFile = path.join(dataDir, 'password.json');
    
    // Check if password file exists
    try {
      await fs.access(passwordFile);
    } catch (err) {
      // If file doesn't exist, compare with default password
      return password === 'admin';
    }
    
    // Read password from file
    const data = await fs.readFile(passwordFile, 'utf8');
    const { password: storedPassword } = JSON.parse(data);
    return password === (storedPassword || 'admin');
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
});

// Handle opening folders in file explorer
ipcMain.handle('open-folder-path', async (event, folderPath) => {
  try {
    console.log(`Opening folder in explorer: ${folderPath}`);
    if (!folderPath) {
      return { success: false, error: 'No folder path provided' };
    }
    
    // Check if the path exists
    try {
      await fs.access(folderPath);
    } catch (err) {
      console.error(`Path does not exist or is not accessible: ${folderPath}`, err);
      return { success: false, error: 'Path does not exist or is not accessible' };
    }
    
    // Open the folder in the default file explorer
    const opened = await shell.openPath(folderPath);
    
    if (opened === '') {
      console.log(`Successfully opened folder: ${folderPath}`);
      return { success: true };
    } else {
      console.error(`Failed to open folder: ${folderPath}`, opened);
      return { success: false, error: opened };
    }
  } catch (error) {
    console.error(`Error opening folder: ${folderPath}`, error);
    return { success: false, error: error.message };
  }
});

// Function to calculate directory size recursively
async function calculateDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      try {
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          totalSize += await calculateDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      } catch (error) {
        // Skip files/directories that can't be accessed
        console.warn(`Skipping ${itemPath}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return totalSize;
}

// IPC handler for getting directory size
ipcMain.handle('get-directory-size', async (event, dirPath) => {
  try {
    console.log(`Calculating directory size for: ${dirPath}`);
    
    if (!dirPath) {
      return { success: false, error: 'No directory path provided' };
    }
    
    // Check if the path exists and is a directory
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        return { success: false, error: 'Path is not a directory' };
      }
    } catch (err) {
      console.error(`Path does not exist or is not accessible: ${dirPath}`, err);
      return { success: false, error: 'Path does not exist or is not accessible' };
    }
    
    const size = await calculateDirectorySize(dirPath);
    console.log(`Directory size for ${dirPath}: ${size} bytes`);
    
    return { success: true, size };
  } catch (error) {
    console.error(`Error calculating directory size: ${dirPath}`, error);
    return { success: false, error: error.message };
  }
});

// Settings loading is now handled by the IPC handler defined earlier in the file
// The duplicate handler has been removed to prevent the 'Attempted to register a second handler for load-settings-from-file' error
// End of removed duplicate handler

// Remove existing handlers if they exist
ipcMain.removeHandler('check-path-access');
ipcMain.removeHandler('check-file-in-use');

// Check if file is in use (locked) by another process
ipcMain.handle('check-file-in-use', async (event, filePath) => {
  console.log('Main process: Checking if file is in use:', filePath);
  
  if (!filePath) {
    return { inUse: false, error: 'No file path provided' };
  }
  
  try {
    const inUse = isFileInUse(filePath);
    console.log(`Main process: File ${filePath} is ${inUse ? '' : 'not '}in use`);
    return { inUse, error: null };
  } catch (error) {
    console.error('Main process: Error checking if file is in use:', error);
    return { inUse: false, error: error.message };
  }
});

// Check path access
ipcMain.handle('check-path-access', async (event, path) => {
  console.log('Main process: Checking path access for:', path);
  
  if (!path) {
    console.log('Main process: No path provided for access check');
    return { accessible: false, error: 'No path provided' };
  }
  
  try {
    await fs.access(path, fsSync.constants.R_OK | fsSync.constants.W_OK);
    console.log('Main process: Path is accessible:', path);
    return { accessible: true };
  } catch (error) {
    console.error('Main process: Path access error:', error.message);
    return { 
      accessible: false, 
      error: `Cannot access path: ${error.message}` 
    };
  }
});

// Remove existing dialog handlers if they exist
ipcMain.removeHandler('show-save-dialog');
ipcMain.removeHandler('show-open-dialog');
ipcMain.removeHandler('open-directory-dialog');

// Dialog handlers
ipcMain.handle('show-save-dialog', async (event, options) => {
  console.log('Main process: Showing save dialog with options:', options);
  
  try {
    const result = await dialog.showSaveDialog(mainWindow, options);
    console.log('Main process: Save dialog result:', result);
    return result;
  } catch (error) {
    console.error('Main process: Error showing save dialog:', error);
    return { canceled: true, filePath: null, error: error.message };
  }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  console.log('Main process: Showing open dialog with options:', options);
  
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    console.log('Main process: Open dialog result:', result);
    return result;
  } catch (error) {
    console.error('Main process: Error showing open dialog:', error);
    return { canceled: true, filePaths: [], error: error.message };
  }
});

// Directory dialog handler (for backward compatibility)
ipcMain.handle('open-directory-dialog', async (event, options) => {
  console.log('Main process: Showing directory dialog with options:', options);
  
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      ...options
    });
    console.log('Main process: Directory dialog result:', result);
    
    // Return the first selected path or undefined if canceled
    return result.canceled ? undefined : result.filePaths[0];
  } catch (error) {
    console.error('Main process: Error showing directory dialog:', error);
    return undefined;
  }
});

// Handle file writing
ipcMain.handle('write-file', async (event, { filePath, content }) => {
  try {
    console.log('Main process: Writing file to:', filePath);
    await fs.writeFile(filePath, content, 'utf8');
    console.log('Main process: File written successfully');
    return { success: true };
  } catch (error) {
    console.error('Main process: Error writing file:', error);
    return { success: false, error: error.message };
  }
});

// Handle opening files with default application
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    console.log('Main process: Opening file:', filePath);
    const result = await shell.openPath(filePath);
    if (result) {
      console.log('Error opening file:', result);
      return { success: false, error: result };
    }
    console.log('File opened successfully');
    return { success: true };
  } catch (error) {
    console.error('Error opening file:', error);
    return { success: false, error: error.message };
  }
});

// Auto-updater IPC handlers
ipcMain.handle('updater-check-for-updates', async () => {
  try {
    await autoUpdateManager.manualUpdateCheck();
    return { success: true };
  } catch (error) {
    console.error('Error checking for updates:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater-download-update', async () => {
  try {
    await autoUpdateManager.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Error downloading update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater-quit-and-install', () => {
  try {
    autoUpdateManager.quitAndInstall();
    return { success: true };
  } catch (error) {
    console.error('Error installing update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater-get-status', () => {
  try {
    const status = autoUpdateManager.getUpdateStatus();
    return { success: true, status };
  } catch (error) {
    console.error('Error getting update status:', error);
    return { success: false, error: error.message };
  }
});

// Crash reporting IPC handlers
ipcMain.handle('crash-report', async (event, errorData) => {
  try {
    const crashId = await crashHandler.reportCrash(
      new Error(errorData.message),
      errorData.type || 'error',
      errorData.context
    );
    return { success: true, crashId };
  } catch (error) {
    console.error('Failed to report crash:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-crash-reports', async (event, limit) => {
  try {
    const reports = await crashHandler.getCrashReports(limit);
    return { success: true, reports };
  } catch (error) {
    console.error('Failed to get crash reports:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-crash-report', async (event, crashId) => {
  try {
    const deleted = await crashHandler.deleteCrashReport(crashId);
    return { success: deleted };
  } catch (error) {
    console.error('Failed to delete crash report:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-breadcrumb', (event, message, level, category) => {
  try {
    crashHandler.addBreadcrumb(message, level, category);
    return { success: true };
  } catch (error) {
    console.error('Failed to add breadcrumb:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-breadcrumbs', () => {
  try {
    const breadcrumbs = crashHandler.getBreadcrumbs();
    return { success: true, breadcrumbs };
  } catch (error) {
    console.error('Failed to get breadcrumbs:', error);
    return { success: false, error: error.message };
  }
});

// Initialize crash handler
crashHandler.initialize().then(() => {
  console.log('Crash handler initialized successfully');
}).catch(error => {
  console.error('Failed to initialize crash handler:', error);
});
