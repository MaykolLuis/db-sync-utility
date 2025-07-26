'use client';

import { useState, useCallback } from 'react';
import { electronUtils } from '@/lib/electron-utils';
import { toast } from 'sonner';

interface FileOperationsResult {
  // File selection
  browseFolder: () => Promise<string | null>;
  
  // File existence checking
  checkFileExists: (filePath: string) => Promise<boolean>;
  checkFilesExist: (filePaths: string[]) => Promise<{ [path: string]: boolean }>;
  
  // File lock checking
  checkFileLock: (filePath: string) => Promise<boolean>;
  checkFilesLock: (filePaths: string[]) => Promise<{ [path: string]: boolean }>;
  
  // File operations
  copyFile: (sourcePath: string, targetPath: string, filePatterns?: string[], createDirectoryIfMissing?: boolean) => Promise<{ success: boolean; error?: string; targetPath?: string }>;
  createBackup: (filePath: string) => Promise<string | null>;
  
  // State
  isLoading: boolean;
  browseLoading: boolean;
  checkLoading: boolean;
  lockLoading: boolean;
  copyLoading: boolean;
  backupLoading: boolean;
  error: string | null;
}

export function useFileOperations(): FileOperationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Computed loading state - true if any operation is loading
  const isLoadingComputed = browseLoading || checkLoading || lockLoading || copyLoading || backupLoading;

  const browseFolder = useCallback(async (): Promise<string | null> => {
    setBrowseLoading(true);
    setError(null);
    
    try {
      if (window.electron?.openDirectoryDialog) {
        const result = await window.electron.openDirectoryDialog();
        return result || null;
      } else {
        throw new Error('Directory picker not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se otevřít složku';
      setError(errorMessage);
      toast.error('Chyba při výběru složky', {
        description: errorMessage
      });
      return null;
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  const checkFileExists = useCallback(async (filePath: string): Promise<boolean> => {
    setCheckLoading(true);
    setError(null);
    
    try {
      if (window.electron?.checkPathAccess) {
        const result = await window.electron.checkPathAccess(filePath);
        return result.accessible;
      } else {
        throw new Error('File existence check not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se zkontrolovat existenci souboru';
      console.error(errorMessage);
      return false;
    } finally {
      setCheckLoading(false);
    }
  }, []);

  const checkFilesExist = useCallback(async (filePaths: string[]): Promise<{ [path: string]: boolean }> => {
    const results: { [path: string]: boolean } = {};
    
    await Promise.all(
      filePaths.map(async (path) => {
        results[path] = await checkFileExists(path);
      })
    );
    
    return results;
  }, [checkFileExists]);

  const checkFileLock = useCallback(async (filePath: string): Promise<boolean> => {
    setLockLoading(true);
    setError(null);
    
    try {
      const electron = window.electron as any;
      if (electron?.checkFileInUse) {
        const result = await electron.checkFileInUse(filePath);
        return result.inUse;
      } else {
        throw new Error('File lock check not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se zkontrolovat zámek souboru';
      console.error(errorMessage);
      return true; // Assume locked if error
    } finally {
      setLockLoading(false);
    }
  }, []);

  const checkFilesLock = useCallback(async (filePaths: string[]): Promise<{ [path: string]: boolean }> => {
    const results: { [path: string]: boolean } = {};
    
    await Promise.all(
      filePaths.map(async (path) => {
        results[path] = await checkFileLock(path);
      })
    );
    
    return results;
  }, [checkFileLock]);

  const copyFile = useCallback(async (sourcePath: string, targetPath: string, filePatterns?: string[], createDirectoryIfMissing: boolean = true): Promise<{ success: boolean; error?: string; targetPath?: string }> => {
    setCopyLoading(true);
    setError(null);
    
    try {
      if (window.electron?.copyFiles) {
        const result = await window.electron.copyFiles(sourcePath, targetPath, filePatterns, createDirectoryIfMissing);
        return result;
      } else {
        throw new Error('File copy operation not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se zkopírovat soubor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setCopyLoading(false);
    }
  }, []);

  const createBackup = useCallback(async (filePath: string): Promise<string | null> => {
    setBackupLoading(true);
    setError(null);
    
    try {
      if (window.electron?.createSingleBackup) {
        const result = await window.electron.createSingleBackup(filePath);
        if (result.success) {
          return result.backupPath || filePath + '.backup';
        } else {
          throw new Error(result.error || 'Backup creation failed');
        }
      } else {
        throw new Error('Backup creation not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se vytvořit zálohu';
      console.error(errorMessage);
      return null;
    } finally {
      setBackupLoading(false);
    }
  }, []);

  return {
    browseFolder,
    checkFileExists,
    checkFilesExist,
    checkFileLock,
    checkFilesLock,
    copyFile,
    createBackup,
    isLoading: isLoadingComputed,
    browseLoading,
    checkLoading,
    lockLoading,
    copyLoading,
    backupLoading,
    error
  };
}
