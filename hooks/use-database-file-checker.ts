'use client';

import { useState, useCallback, useEffect } from 'react';
import { useFileOperations } from './use-file-operations';
import path from 'path';

// Define the expected database files
const DB_FILES = ['configurations.mv.db', 'configurations.trace.db'];

export type FileStatus = 'none' | 'partial' | 'all' | 'checking';
export type LockStatus = 'locked' | 'unlocked' | 'checking' | 'unknown';

interface DatabaseFileCheckerResult {
  // File status
  fileStatus: FileStatus;
  lockStatus: LockStatus;
  
  // File existence details
  fileExistence: { [filename: string]: boolean };
  
  // Actions
  checkFiles: (directoryPath: string) => Promise<void>;
  checkLocks: (directoryPath: string) => Promise<void>;
  
  // Combined check
  checkFilesAndLocks: (directoryPath: string) => Promise<void>;
  
  // State
  isChecking: boolean;
  error: string | null;
}

export function useDatabaseFileChecker(): DatabaseFileCheckerResult {
  const [fileStatus, setFileStatus] = useState<FileStatus>('none');
  const [lockStatus, setLockStatus] = useState<LockStatus>('unknown');
  const [fileExistence, setFileExistence] = useState<{ [filename: string]: boolean }>({});
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { checkFileExists, checkFileLock } = useFileOperations();
  
  const checkFiles = useCallback(async (directoryPath: string) => {
    if (!directoryPath) {
      setFileExistence({});
      setFileStatus('none');
      return;
    }
    
    setIsChecking(true);
    setFileStatus('checking');
    setError(null);
    
    try {
      const fileExistenceResults: { [filename: string]: boolean } = {};
      
      // Check each database file
      await Promise.all(
        DB_FILES.map(async (filename) => {
          const filePath = path.join(directoryPath, filename);
          const exists = await checkFileExists(filePath);
          fileExistenceResults[filename] = exists;
        })
      );
      
      setFileExistence(fileExistenceResults);
      
      // Determine overall file status
      const existingFiles = Object.values(fileExistenceResults).filter(Boolean).length;
      if (existingFiles === 0) {
        setFileStatus('none');
      } else if (existingFiles < DB_FILES.length) {
        setFileStatus('partial');
      } else {
        setFileStatus('all');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se zkontrolovat soubory databáze';
      setError(errorMessage);
      console.error('Error checking database files:', errorMessage);
      setFileStatus('none');
    } finally {
      setIsChecking(false);
    }
  }, [checkFileExists]);
  
  const checkLocks = useCallback(async (directoryPath: string) => {
    if (!directoryPath) {
      setLockStatus('unknown');
      return;
    }
    
    setIsChecking(true);
    setLockStatus('checking');
    setError(null);
    
    try {
      let anyLocked = false;
      let anyChecked = false;
      
      // Check each database file that exists
      await Promise.all(
        DB_FILES.map(async (filename) => {
          const filePath = path.join(directoryPath, filename);
          
          // Only check lock if file exists - get current fileExistence
          const currentExists = await checkFileExists(filePath);
          if (currentExists) {
            anyChecked = true;
            const isLocked = await checkFileLock(filePath);
            if (isLocked) {
              anyLocked = true;
            }
          }
        })
      );
      
      if (!anyChecked) {
        setLockStatus('unknown');
      } else if (anyLocked) {
        setLockStatus('locked');
      } else {
        setLockStatus('unlocked');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se zkontrolovat zámky souborů';
      setError(errorMessage);
      console.error('Error checking file locks:', errorMessage);
      setLockStatus('unknown');
    } finally {
      setIsChecking(false);
    }
  }, [checkFileLock, checkFileExists]);
  
  const checkFilesAndLocks = useCallback(async (directoryPath: string) => {
    if (!directoryPath) {
      setFileStatus('none');
      setLockStatus('unknown');
      setFileExistence({});
      return;
    }
    
    setIsChecking(true);
    setError(null);
    
    try {
      // First check which files exist
      await checkFiles(directoryPath);
      
      // Then check locks for existing files
      await checkLocks(directoryPath);
    } finally {
      setIsChecking(false);
    }
  }, [checkFiles, checkLocks]);
  
  return {
    fileStatus,
    lockStatus,
    fileExistence,
    checkFiles,
    checkLocks,
    checkFilesAndLocks,
    isChecking,
    error
  };
}
