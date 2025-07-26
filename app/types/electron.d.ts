/**
 * Type definitions for Electron IPC API
 */

export interface UpdateStatusData {
  event: 'checking-for-update' | 'update-available' | 'update-not-available' | 'update-error' | 'download-progress' | 'update-downloaded';
  data?: {
    version?: string;
    releaseDate?: string;
    releaseNotes?: string;
    percent?: number;
    transferred?: number;
    total?: number;
    bytesPerSecond?: number;
    error?: string;
  };
}

export interface Breadcrumb {
  timestamp: number;
  message: string;
  level: 'info' | 'warn' | 'error';
  category?: string;
}

export interface CrashErrorData {
  message: string;
  stack?: string;
  name?: string;
  type?: 'error' | 'unhandledRejection' | 'uncaughtException' | 'rendererCrash' | 'manual';
  context?: {
    url?: string;
    userAgent?: string;
    userId?: string;
    appState?: {
      activeTab?: string;
      sourcePath?: string;
      targetLocationsCount?: number;
      historyEntriesCount?: number;
    };
  };
}

export interface CrashReport {
  id: string;
  timestamp: number;
  type: 'error' | 'unhandledRejection' | 'uncaughtException' | 'rendererCrash' | 'manual';
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    version: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    electronVersion: string;
    userAgent?: string;
    url?: string;
    userId?: string;
  };
  systemInfo: {
    totalMemory: number;
    freeMemory: number;
    cpus: number;
    uptime: number;
  };
  appState?: {
    activeTab?: string;
    sourcePath?: string;
    targetLocationsCount?: number;
    historyEntriesCount?: number;
  };
  breadcrumbs?: Breadcrumb[];
}

export interface ElectronAPI {
  // Window controls for custom title bar
  windowControls: {
    minimize: () => void;
    maximize: () => void;
    unmaximize: () => void;
    close: () => void;
    getWindowState: () => Promise<{ isMaximized: boolean; isMinimized: boolean }>;
    onWindowStateChange: (callback: (state: { isMaximized: boolean }) => void) => void;
  };
  
  // File operations
  showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath: string }>;
  checkPathAccess: (path: string) => Promise<boolean>;
  
  // JSON file operations
  readJsonFile: (filename: string) => Promise<{ success: boolean; data: any; error?: string }>;
  writeJsonFile: (filename: string, data: any) => Promise<{ success: boolean; error?: string }>;
  
  // File copy operations
  copyFiles: (options: {
    sourcePath: string;
    targetPath: string;
    patterns: string[];
    createBackup?: boolean;
  }) => Promise<{
    success: boolean;
    copiedFiles: string[];
    errors?: string[];
    error?: string;
  }>;
  
  // Database file operations
  checkDbFilesExist: (path: string) => Promise<{
    exists: boolean;
    files: { [filename: string]: boolean };
  }>;
  
  checkDbFileLock: (path: string) => Promise<{
    isLocked: boolean;
    error?: string;
  }>;
  
  // Password management
  getPassword: () => Promise<string>;
  setPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  verifyPassword: (password: string) => Promise<boolean>;
  
  // Unsaved changes handling
  onCheckUnsavedChanges: (callback: () => boolean) => void;
  onSaveAndClose: (callback: () => Promise<any>) => void;
  
  // Folder operations
  openFolderPath: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
  getDirectorySize: (dirPath: string) => Promise<{ success: boolean; size?: number; error?: string }>;
  
  // Target locations persistence
  loadTargetLocations: () => Promise<any[]>;
  saveTargetLocations: (locations: any[]) => Promise<{ success: boolean; error?: string }>;
  
  // Network connectivity and offline support
  checkNetworkConnectivity: () => Promise<{
    success: boolean;
    hasInternetConnection?: boolean;
    canAccessLocalNetwork?: boolean;
    networkDriveStatus?: any[];
    timestamp?: number;
    error?: string;
  }>;
  
  checkPathAccessEnhanced: (pathToCheck: string) => Promise<{
    accessible: boolean;
    error?: string;
    code?: string;
    isNetworkDrive?: boolean;
    isNetworkError?: boolean;
    responseTime?: number;
    timestamp?: number;
  }>;
  
  copyFilesWithRetry: (sourcePath: string, targetPath: string, filePatterns?: string[], options?: {
    createDirectoryIfMissing?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    exponentialBackoff?: boolean;
  }) => Promise<{
    success: boolean;
    copiedFiles?: string[];
    error?: string;
    code?: string;
    retryInfo?: {
      attempts: number;
      isSourceNetwork: boolean;
      isTargetNetwork: boolean;
      finalAttemptSuccessful: boolean;
      lastError?: string;
    };
  }>;
  
  checkNetworkDrives: (drivePaths: string[]) => Promise<{
    success: boolean;
    results?: Array<{
      path: string;
      accessible: boolean;
      isNetworkDrive: boolean;
      responseTime: number;
      error?: string;
      code?: string;
    }>;
    timestamp?: number;
    error?: string;
  }>;

  // Auto-updater interface
  updater: {
    checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    quitAndInstall: () => Promise<{ success: boolean; error?: string }>;
    getStatus: () => Promise<{ 
      success: boolean; 
      status?: {
        checking: boolean;
        downloaded: boolean;
        currentVersion: string;
      };
      error?: string;
    }>;
    onUpdateStatus: (callback: (data: UpdateStatusData) => void) => void;
    removeUpdateStatusListener: () => void;
  };
  
  // Crash reporting interface
  crashReporting: {
    reportCrash: (errorData: CrashErrorData) => Promise<{ success: boolean; crashId?: string; error?: string }>;
    getCrashReports: (limit?: number) => Promise<{ success: boolean; reports?: CrashReport[]; error?: string }>;
    deleteCrashReport: (crashId: string) => Promise<{ success: boolean; error?: string }>;
    addBreadcrumb: (message: string, level?: 'info' | 'warn' | 'error', category?: string) => Promise<{ success: boolean; error?: string }>;
    getBreadcrumbs: () => Promise<{ success: boolean; breadcrumbs?: Breadcrumb[]; error?: string }>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
