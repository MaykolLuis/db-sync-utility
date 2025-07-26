"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from './ui/icons';
import { cn } from '@/lib/utils';
import { electronUtils } from '@/lib/electron-utils';
import { useToast } from '@/components/ui/use-toast';

interface DirectorySelectorProps {
  onDirectorySelect?: (path: string) => void;
  className?: string;
  placeholder?: string;
  buttonLabel?: string;
}

export function DirectorySelector({ 
  onDirectorySelect, 
  className, 
  placeholder = 'No folder selected',
  buttonLabel = 'Browse...'
}: DirectorySelectorProps) {
  const [selectedPath, setSelectedPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isCheckingLock, setIsCheckingLock] = useState(false);
  const { toast } = useToast();

  const showError = useCallback((message: string) => {
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  }, [toast]);

  const handleClick = async () => {
    try {
      setIsLoading(true);
      console.log('Opening directory dialog...');
      console.log('window.electron available:', !!window.electron);
      
      if (!window.electron) {
        showError('Electron API is not available in this environment');
        console.error('Electron API not available');
        return;
      }
      
      const path = await electronUtils.openDirectoryDialog();
      console.log('Selected path:', path);
      
      if (path) {
        setSelectedPath(path);
        await checkPathAccess(path);
      } else {
        console.log('No path selected or dialog was canceled');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open directory dialog';
      console.error('Error selecting directory:', error);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPathAccess = async (path: string) => {
    if (!path) {
      setIsValid(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await electronUtils.getPathAccessDetails(path);
      setIsValid(result.accessible);
      
      if (result.accessible) {
        onDirectorySelect?.(path);
      } else {
        showError(`No access to directory: ${result.error || 'Unknown error'}`);
        onDirectorySelect?.('');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check directory access';
      console.error('Error checking path access:', error);
      showError(errorMessage);
      setIsValid(false);
      onDirectorySelect?.('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedPath('');
    setIsValid(false);
    onDirectorySelect?.('');
  };
  
  const checkFileLock = async () => {
    if (!selectedPath) return;
    
    try {
      setIsCheckingLock(true);
      const result = await electronUtils.getFileInUseDetails(selectedPath);
      
      if (result.inUse) {
        toast({
          title: "File is locked",
          description: "This file is currently in use by another process.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "File is available",
          description: "This file is not locked by any other process.",
          variant: "default"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check file lock status';
      console.error('Error checking file lock:', error);
      showError(errorMessage);
    } finally {
      setIsCheckingLock(false);
    }
  };

  return (
    <div className={cn("flex w-full items-center space-x-2", className)}>
      <div className="relative flex-1">
        <Input
          type="text"
          value={selectedPath}
          readOnly
          placeholder={placeholder}
          className={cn("pr-20 truncate", {
            'border-green-500': isValid && selectedPath,
            'border-destructive': !isValid && selectedPath,
          })}
          title={selectedPath}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {isLoading ? (
            <Icons.Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isValid && selectedPath ? (
            <>
              <button 
                type="button" 
                onClick={checkFileLock} 
                title="Check if file is in use" 
                className="p-1 hover:bg-gray-100 rounded-full"
                disabled={isCheckingLock}
              >
                {isCheckingLock ? (
                  <Icons.Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Icons.Lock className="h-4 w-4 text-blue-500" />
                )}
              </button>
              <Icons.CheckCircle className="h-4 w-4 text-green-500" />
            </>
          ) : selectedPath ? (
            <Icons.XCircle className="h-4 w-4 text-destructive" />
          ) : null}
        </div>
      </div>
      
      {selectedPath ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={isLoading}
          className="shrink-0"
          title="Clear selection"
        >
          <Icons.X className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isLoading}
          className="shrink-0 whitespace-nowrap"
        >
          {isLoading ? (
            <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.FolderOpen className="mr-2 h-4 w-4" />
          )}
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
