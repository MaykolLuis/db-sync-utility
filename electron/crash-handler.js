const { crashReporter: electronCrashReporter, app, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class ElectronCrashHandler {
  constructor() {
    this.crashReportsDir = path.join(app.getPath('userData'), 'crash-reports');
    this.breadcrumbs = [];
    this.maxBreadcrumbs = 50;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Ensure crash reports directory exists
      await fs.mkdir(this.crashReportsDir, { recursive: true });

      // Initialize Electron's built-in crash reporter
      electronCrashReporter.start({
        productName: 'DB Sync Utility',
        companyName: 'DB Sync Utility',
        submitURL: '', // We'll handle crashes locally
        uploadToServer: false,
        ignoreSystemCrashHandler: false,
        rateLimit: false,
        compress: true
      });

      // Set up process-level error handlers
      this.setupErrorHandlers();

      this.isInitialized = true;
      this.addBreadcrumb('Electron crash handler initialized', 'info', 'crash-handler');
      
      console.log('Crash handler initialized successfully');
    } catch (error) {
      console.error('Failed to initialize crash handler:', error);
    }
  }

  setupErrorHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error);
      await this.reportCrash(error, 'uncaughtException');
      
      // Show error dialog to user
      if (app.isReady()) {
        await this.showCrashDialog(error, 'Neočekávaná chyba aplikace');
      }
      
      // Exit gracefully after a short delay
      setTimeout(() => {
        app.exit(1);
      }, 1000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      await this.reportCrash(error, 'unhandledRejection');
    });

    // Handle renderer process crashes
    app.on('render-process-gone', async (event, webContents, details) => {
      const error = new Error(`Renderer process crashed: ${details.reason}`);
      error.stack = `Renderer crash details: ${JSON.stringify(details, null, 2)}`;
      
      console.error('Renderer process crashed:', details);
      await this.reportCrash(error, 'rendererCrash');
      
      // Show error dialog
      await this.showCrashDialog(error, 'Chyba zobrazovacího procesu');
    });

    // Handle child process crashes
    app.on('child-process-gone', async (event, details) => {
      const error = new Error(`Child process crashed: ${details.type} - ${details.reason}`);
      error.stack = `Child process crash details: ${JSON.stringify(details, null, 2)}`;
      
      console.error('Child process crashed:', details);
      await this.reportCrash(error, 'rendererCrash');
    });
  }

  addBreadcrumb(message, level = 'info', category) {
    const breadcrumb = {
      timestamp: Date.now(),
      message,
      level,
      category
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  async reportCrash(error, type = 'error', additionalContext = {}) {
    try {
      const crashId = this.generateCrashId();
      const systemInfo = await this.getSystemInfo();
      const context = this.getContext(additionalContext);

      const crashReport = {
        id: crashId,
        timestamp: Date.now(),
        type,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context,
        systemInfo,
        appState: additionalContext.appState,
        breadcrumbs: [...this.breadcrumbs]
      };

      // Save crash report to file
      const reportPath = path.join(this.crashReportsDir, `${crashId}.json`);
      await fs.writeFile(reportPath, JSON.stringify(crashReport, null, 2), 'utf8');

      // Add breadcrumb about the crash
      this.addBreadcrumb(`Crash reported: ${crashId}`, 'error', 'crash-handler');

      console.error(`Crash reported with ID: ${crashId}`);
      return crashId;
    } catch (reportingError) {
      console.error('Failed to report crash:', reportingError);
      return 'failed-to-report';
    }
  }

  generateCrashId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `electron-crash-${timestamp}-${random}`;
  }

  async getSystemInfo() {
    return {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node
    };
  }

  getContext(additionalContext = {}) {
    return {
      version: app.getVersion(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      ...additionalContext
    };
  }

  async showCrashDialog(error, title = 'Chyba aplikace') {
    try {
      const result = await dialog.showMessageBox(null, {
        type: 'error',
        title: title,
        message: 'Aplikace narazila na neočekávanou chybu.',
        detail: `Chyba: ${error.message}\n\nAplikace bude restartována. Všechny crash reporty jsou uloženy pro analýzu.`,
        buttons: ['Restartovat aplikaci', 'Zavřít aplikaci', 'Zobrazit crash reporty'],
        defaultId: 0,
        cancelId: 1
      });

      switch (result.response) {
        case 0: // Restart
          app.relaunch();
          app.exit(0);
          break;
        case 1: // Close
          app.exit(1);
          break;
        case 2: // Show crash reports
          await this.openCrashReportsDirectory();
          break;
      }
    } catch (dialogError) {
      console.error('Failed to show crash dialog:', dialogError);
    }
  }

  async openCrashReportsDirectory() {
    try {
      const { shell } = require('electron');
      await shell.openPath(this.crashReportsDir);
    } catch (error) {
      console.error('Failed to open crash reports directory:', error);
    }
  }

  async getCrashReports(limit = 50) {
    try {
      const files = await fs.readdir(this.crashReportsDir);
      const crashFiles = files
        .filter(file => file.endsWith('.json') && file.includes('crash-'))
        .sort()
        .reverse()
        .slice(0, limit);

      const reports = [];
      
      for (const file of crashFiles) {
        try {
          const filePath = path.join(this.crashReportsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const report = JSON.parse(content);
          reports.push(report);
        } catch (error) {
          console.error(`Failed to read crash report ${file}:`, error);
        }
      }

      return reports;
    } catch (error) {
      console.error('Failed to get crash reports:', error);
      return [];
    }
  }

  async deleteCrashReport(crashId) {
    try {
      const reportPath = path.join(this.crashReportsDir, `${crashId}.json`);
      await fs.unlink(reportPath);
      this.addBreadcrumb(`Deleted crash report: ${crashId}`, 'info', 'crash-handler');
      return true;
    } catch (error) {
      console.error(`Failed to delete crash report ${crashId}:`, error);
      return false;
    }
  }

  getBreadcrumbs() {
    return [...this.breadcrumbs];
  }

  clearBreadcrumbs() {
    this.breadcrumbs = [];
    this.addBreadcrumb('Breadcrumbs cleared', 'info', 'crash-handler');
  }
}

// Singleton instance
const electronCrashHandler = new ElectronCrashHandler();

module.exports = electronCrashHandler;
