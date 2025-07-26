// Type definitions for Electron API
interface ElectronAPI {
  // File system operations
  ensureDataDirectory: () => Promise<string>;
  readJsonFile: (filePath: string) => Promise<any>;
  writeJsonFile: (filePath: string, data: any) => Promise<any>;
  createBackup: (sourcePath: string, targetPaths: string[]) => Promise<{ success: boolean, error?: string }>;
  createSingleBackup: (filePath: string) => Promise<{ success: boolean, backupPath?: string, error?: string }>;
  copyFiles: (sourcePath: string, targetPath: string, filePatterns?: string[], createDirectoryIfMissing?: boolean) => Promise<{ 
    success: boolean;
    copiedFiles?: Array<{ name: string, size: number }>;
    error?: string;
    targetPath?: string;
  }>;
  
  // Settings persistence
  saveSettingsToFile: (settingsData: string) => Promise<{ success: boolean, error?: string }>;
  loadSettingsFromFile: () => Promise<string | null>;
  
  // Password management
  getPassword: () => Promise<string>;
  setPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  verifyPassword: (password: string) => Promise<boolean>;
  
  // Directory dialog handler
  openDirectoryDialog: (options?: any) => Promise<string | undefined>;
  
  // Path access checker
  checkPathAccess: (path: string) => Promise<{ accessible: boolean, error?: string }>;
  
  // File stats
  getFileStats: (filePath: string) => Promise<any>;
  
  // Source directory validation
  validateSourceDirectory: (dirPath: string) => Promise<any>;
  
  // Unsaved changes handling
  onCheckUnsavedChanges: (callback: () => boolean) => void;
  onSaveAndClose: (callback: () => Promise<boolean>) => void;
  
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
}

// Extend the Window interface
interface Window {
  electron: ElectronAPI;
}
