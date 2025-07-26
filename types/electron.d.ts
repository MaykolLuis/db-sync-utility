/**
 * Comprehensive type definitions for Electron API exposed in the preload script
 */

export interface PathAccessResult {
  accessible: boolean;
  error?: string;
}

export interface FileInUseResult {
  inUse: boolean;
  error?: string;
}

export interface ChangedFile {
  name: string;
  modifiedTime: number;
  size: number;
  modifiedAfterLastCheck?: boolean;
  targetDifferences?: boolean;
}

export interface SourceChangesResult {
  hasChanges: boolean;
  changedFiles?: ChangedFile[];
  error?: string;
  currentTime: number;
}

export interface NotificationOptions {
  title?: string;
  body?: string;
  icon?: string;
  silent?: boolean;
}

export interface ElectronAPI {
  // Window controls for custom title bar
  windowControls: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  
  // Native notification
  showNotification: (options: NotificationOptions) => Promise<boolean>;
  
  // File system operations
  ensureDataDirectory: () => Promise<string>;
  readJsonFile: <T = any>(filePath: string, defaultValue?: T) => Promise<T>;
  writeJsonFile: (filePath: string, data: any) => Promise<boolean>;
  createBackup: (sourcePath: string, targetPaths: string[]) => Promise<{ success: boolean, error?: string }>;
  copyFiles: (sourcePath: string, targetPath: string, filePatterns?: string[]) => Promise<{ 
    success: boolean;
    copiedFiles?: Array<{ name: string, size: number }>;
    error?: string;
    errors?: string;
  }>;
  
  // Settings persistence
  saveSettingsToFile: (settingsData: string) => Promise<{ success: boolean; error?: string }>;
  loadSettingsFromFile: () => Promise<string | null>;
  
  // Password management
  getPassword: () => Promise<string>;
  setPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  verifyPassword: (password: string) => Promise<boolean>;
  
  // Dialog operations
  showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath: string }>;
  
  // Source file change detection
  checkSourceChanges: (sourcePath: string, lastCheckTime: number, targetPaths?: string[]) => Promise<SourceChangesResult>;
  
  // Folder operations
  openFolderPath: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
  
  // Dialog operations
  openDirectoryDialog: (options?: DialogOptions) => Promise<string | undefined>;
  
  // Path and file operations
  checkPathAccess: (path: string) => Promise<PathAccessResult>;
  checkFileInUse: (filePath: string) => Promise<FileInUseResult>;
  
  // Database file operations
  checkDbFilesExist: (path: string) => Promise<{
    exists: boolean;
    files: { [filename: string]: boolean };
  }>;
  
  checkDbFileLock: (path: string) => Promise<{
    isLocked: boolean;
    error?: string;
  }>;
  validateSourceDirectory: (dirPath: string) => Promise<{
    isValid: boolean;
    message: string;
    files: string[];
    missingFiles: string[];
  }>;
  getFileStats: (filePath: string) => Promise<{
    size: number;
    mtime: number;
    isFile: boolean;
    isDirectory: boolean;
    mode: number;
    birthtime: number;
    atime: number;
    ctime: number;
  } | null>;
  
  // Unsaved changes handling
  onCheckUnsavedChanges: (callback: () => boolean) => void;
  onSaveAndClose: (callback: () => Promise<any>) => void;
  
  // Folder operations
  openFolderPath: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
  getDirectorySize: (dirPath: string) => Promise<{ success: boolean; size?: number; error?: string }>;
  
  // Target locations persistence
  loadTargetLocations: () => Promise<any[]>;
  saveTargetLocations: (locations: any[]) => Promise<{ success: boolean; error?: string }>;
  
  // Dialog methods
  showSaveDialog: (options: DialogOptions) => Promise<{ canceled: boolean; filePath?: string }>;
  showOpenDialog: (options: DialogOptions) => Promise<{ canceled: boolean; filePaths?: string[] }>;
  
  // File operations
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>; // Opens file with default application
  
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

  // Crash reporting
  crashReporting: {
    reportCrash: (errorData: CrashErrorData) => Promise<{ success: boolean; crashId?: string; error?: string }>;
    getCrashReports: (limit?: number) => Promise<{ success: boolean; reports?: CrashReport[]; error?: string }>;
    deleteCrashReport: (crashId: string) => Promise<{ success: boolean; error?: string }>;
    addBreadcrumb: (message: string, level?: 'info' | 'warn' | 'error', category?: string) => Promise<{ success: boolean; error?: string }>;
    getBreadcrumbs: () => Promise<{ success: boolean; breadcrumbs?: Breadcrumb[]; error?: string }>;
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
  breadcrumbs: Breadcrumb[];
}

export interface DialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory'>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
