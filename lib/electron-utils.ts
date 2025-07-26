// This file provides type-safe wrappers around the Electron API exposed in preload

import type { DialogOptions, PathAccessResult, FileInUseResult, SourceChangesResult, ElectronAPI } from '@/types/electron';

// Note: The Window interface with electron property is already defined in types/electron.d.ts

// All Electron API types are now defined in @/types/electron.d.ts

// Note: openFolderPath is implemented as a method in the electronUtils object below

export const electronUtils = {
  openDirectoryDialog: async (options?: DialogOptions): Promise<string | null> => {
    try {
      if (!window.electron) {
        console.error('Electron API is not available');
        return null;
      }
      const result = await window.electron.openDirectoryDialog(options);
      return result || null; // Convert undefined to null to maintain backward compatibility
    } catch (error) {
      console.error('Error in openDirectoryDialog:', error);
      return null;
    }
  },
  
  // Get file statistics (size, modified date, etc.)
  getFileStats: async (filePath: string): Promise<{ size: number; isFile: boolean; isDirectory: boolean; modifiedAt?: Date; createdAt?: Date }> => {
    try {
      if (!filePath || !window.electron) {
        console.error('Electron API is not available or no file path provided');
        return { size: 0, isFile: false, isDirectory: false };
      }
      
      console.log(`Getting file stats for: ${filePath}`);
      const stats = await window.electron.getFileStats(filePath);
      
      // Convert date strings to Date objects if they exist
      if (stats.modifiedAt) {
        stats.modifiedAt = new Date(stats.modifiedAt);
      }
      if (stats.createdAt) {
        stats.createdAt = new Date(stats.createdAt);
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting file stats:', error);
      return { size: 0, isFile: false, isDirectory: false };
    }
  },

  checkPathAccess: async (path: string): Promise<boolean> => {
    try {
      if (!path || !window.electron) return false;
      const result = await window.electron.checkPathAccess(path);
      return result.accessible;
    } catch (error) {
      console.error('Error checking path access:', error);
      return false;
    }
  },
  
  checkFileInUse: async (filePath: string): Promise<boolean> => {
    try {
      if (!filePath || !window.electron) return false;
      // Use a safer type assertion with unknown as an intermediate step
      const result = await (window.electron as unknown as {
        checkFileInUse: (path: string) => Promise<FileInUseResult>
      }).checkFileInUse(filePath);
      return result.inUse;
    } catch (error) {
      console.error('Error checking if file is in use:', error);
      return false;
    }
  },
  
  getFileInUseDetails: async (filePath: string): Promise<FileInUseResult> => {
    try {
      if (!filePath || !window.electron) {
        return { inUse: false, error: 'Electron API is not available' };
      }
      // Use a safer type assertion with unknown as an intermediate step
      return await (window.electron as unknown as {
        checkFileInUse: (path: string) => Promise<FileInUseResult>
      }).checkFileInUse(filePath);
    } catch (error) {
      console.error('Error getting file in use details:', error);
      return { inUse: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Additional method to get detailed access information
  getPathAccessDetails: async (path: string): Promise<PathAccessResult> => {
    if (!path || !window.electron) {
      return { accessible: false, error: 'Electron API not available' };
    }
    try {
      return await window.electron.checkPathAccess(path);
    } catch (error) {
      return { 
        accessible: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
  
  // Check for changes in source files since the last check time
  checkSourceChanges: async (sourcePath: string, lastCheckTime: number, targetPaths?: string[]): Promise<SourceChangesResult> => {
    if (!sourcePath || !window.electron) {
      return { 
        hasChanges: false, 
        error: 'Electron API not available or no source path provided',
        currentTime: Date.now()
      };
    }
    
    try {
      // Use a safer type assertion with unknown as an intermediate step
      return await (window.electron as unknown as {
        checkSourceChanges: (path: string, lastCheckTime: number, targetPaths?: string[]) => Promise<SourceChangesResult>
      }).checkSourceChanges(sourcePath, lastCheckTime, targetPaths);
    } catch (error) {
      console.error('Error checking source changes:', error);
      return { 
        hasChanges: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        currentTime: Date.now()
      };
    }
  },
  
  // Open folder in file explorer
  openFolderPath: async (folderPath: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!window.electron) {
        console.error('Electron API is not available');
        return { success: false, error: 'Electron API is not available' };
      }
      
      console.log(`Opening folder in explorer: ${folderPath}`);
      
      // Use direct IPC call through custom function to avoid TypeScript error
      // This is a workaround for the TypeScript error
      const openFolder = async (path: string): Promise<{ success: boolean; error?: string }> => {
        try {
          // @ts-ignore - Ignore TypeScript error for this specific call
          const result = await window.electron.openFolderPath(path);
          return result || { success: false, error: 'Unknown error' };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      };
      
      return await openFolder(folderPath);
    } catch (error: unknown) {
      console.error('Error opening folder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
};
