/**
 * TypeScript declarations for Electron API in test environment
 */

declare global {
  interface Window {
    electron: {
      // File operations
      openDirectoryDialog: () => Promise<{ success: boolean; path?: string; error?: string }>;
      copyFiles: (params: any) => Promise<{ success: boolean; copiedFiles?: any[]; error?: string }>;
      checkPathAccess: (path: string) => Promise<{ success: boolean; readable: boolean; writable: boolean; error?: string }>;
      checkFileInUse: (filePath: string) => Promise<{ success: boolean; inUse: boolean; error?: string }>;
      createBackup: (params: any) => Promise<{ success: boolean; backupPath?: string; error?: string }>;
      
      // Settings and data
      loadTargetLocations: () => Promise<any[]>;
      saveTargetLocations: (locations: any[]) => Promise<{ success: boolean; error?: string }>;
      loadSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
      loadHistoryEntries: () => Promise<any[]>;
      saveHistoryEntries: (entries: any[]) => Promise<{ success: boolean; error?: string }>;
      
      // System operations
      openFolderPath: (path: string) => Promise<{ success: boolean; error?: string }>;
      openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      
      // Version and updates
      getAppVersion: () => Promise<string>;
      checkForUpdates: () => Promise<{ available: boolean; version?: string; error?: string }>;
      
      // Auto-updater API
      updater: {
        checkForUpdates: () => Promise<{ success: boolean; available?: boolean; version?: string; error?: string }>;
        downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
        installUpdate: () => Promise<{ success: boolean; error?: string }>;
        getStatus: () => Promise<{ success: boolean; status?: { checking: boolean; downloaded: boolean; currentVersion: string }; error?: string }>;
        onUpdateStatus: (callback: (status: any) => void) => void;
        onUpdateAvailable: (callback: (info: any) => void) => void;
        onUpdateDownloaded: (callback: (info: any) => void) => void;
        onUpdateError: (callback: (error: any) => void) => void;
        removeAllListeners: () => void;
      };
      
      // IPC communication
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      send: (channel: string, ...args: any[]) => void;
      on: (channel: string, listener: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
