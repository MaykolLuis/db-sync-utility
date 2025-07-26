import path from 'path';

// Import Electron API types
import { ElectronAPI } from '../types/electron';

declare const window: Window & { electron: ElectronAPI };

// In Electron, we'll store data in the user's app data directory
export const DATA_DIR = 'data';

// Ensure data directory exists
export async function ensureDataDirectory(): Promise<string> {
  if (typeof window !== 'undefined' && window.electron) {
    return window.electron.ensureDataDirectory();
  }
  throw new Error('Electron API not available');
}

// Interface for file read result with metadata
export interface FileReadResult<T> {
  data: T;
  metadata?: {
    restored?: boolean;
    backupFile?: string;
    backupDate?: string;
    initialized?: boolean;
    recoveryFailed?: boolean;
    success?: boolean;
    error?: string;
  };
}

// Store the last read file metadata for each file
const lastReadMetadata = new Map<string, FileReadResult<any>['metadata']>();

// Read JSON file
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  if (typeof window !== 'undefined' && window.electron) {
    try {
      const result = await window.electron.readJsonFile(filePath) as FileReadResult<T>;
      
      // If the result has metadata, log it and store it
      if (result.metadata) {
        console.log(`File ${filePath} read with metadata:`, result.metadata);
        lastReadMetadata.set(filePath, result.metadata);
      }
      
      // Return just the data for backward compatibility
      return result.data;
    } catch (error) {
      console.error(`Error reading JSON file ${filePath}:`, error);
      throw error;
    }
  }
  throw new Error('Electron API not available');
}

// Get metadata from the last read operation for a file
export function getLastReadMetadata(filePath: string): FileReadResult<any>['metadata'] | undefined {
  return lastReadMetadata.get(filePath);
}

// Clear metadata for a file
export function clearFileMetadata(filePath: string): void {
  lastReadMetadata.delete(filePath);
}

// Write JSON file
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  if (typeof window !== 'undefined' && window.electron) {
    try {
      await window.electron.writeJsonFile(filePath, data);
    } catch (error) {
      console.error(`Error writing JSON file ${filePath}:`, error);
      throw error;
    }
  } else {
    throw new Error('Electron API not available');
  }
}

// Check if path exists
export async function pathExists(filePath: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.electron) {
    try {
      await window.electron.readJsonFile(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
  return false;
}
