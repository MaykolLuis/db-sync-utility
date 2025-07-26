'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  logToElectron?: boolean;
  retryable?: boolean;
  maxRetries?: number;
  onError?: (error: Error) => void;
  onRetry?: () => void;
}

interface ErrorState {
  error: Error | null;
  isRetrying: boolean;
  retryCount: number;
  hasError: boolean;
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const {
    showToast = true,
    logToConsole = true,
    logToElectron = true,
    retryable = false,
    maxRetries = 3,
    onError,
    onRetry
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    hasError: false
  });

  const handleError = useCallback((error: Error, context?: string) => {
    console.error(`Error in ${context || 'unknown context'}:`, error);

    // Update error state
    setErrorState(prev => ({
      ...prev,
      error,
      hasError: true
    }));

    // Log to console
    if (logToConsole) {
      console.error('Error caught by useErrorHandler:', {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      });
    }

    // Log to Electron main process
    if (logToElectron && typeof window !== 'undefined' && window.electron) {
      try {
        console.log('Logging error to Electron main process:', {
          error: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.error('Failed to log error to Electron:', e);
      }
    }

    // Show toast notification
    if (showToast) {
      toast.error('Došlo k chybě', {
        description: error.message || 'Neočekávaná chyba',
        duration: 5000,
        action: retryable && errorState.retryCount < maxRetries ? {
          label: 'Zkusit znovu',
          onClick: () => handleRetry()
        } : undefined
      });
    }

    // Call custom error handler
    if (onError) {
      onError(error);
    }
  }, [logToConsole, logToElectron, showToast, retryable, maxRetries, onError, errorState.retryCount]);

  const handleRetry = useCallback(() => {
    if (errorState.retryCount >= maxRetries) {
      toast.error('Maximální počet pokusů dosažen');
      return;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }));

    // Call custom retry handler
    if (onRetry) {
      onRetry();
    }

    // Reset error state after retry
    setTimeout(() => {
      setErrorState(prev => ({
        ...prev,
        error: null,
        hasError: false,
        isRetrying: false
      }));
    }, 100);
  }, [errorState.retryCount, maxRetries, onRetry]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      hasError: false
    });
  }, []);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        const result = await fn(...args);
        // Clear error on success
        if (errorState.hasError) {
          clearError();
        }
        return result;
      } catch (error) {
        handleError(error as Error, context);
        return null;
      }
    };
  }, [handleError, clearError, errorState.hasError]);

  const withSyncErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => R,
    context?: string
  ) => {
    return (...args: T): R | null => {
      try {
        const result = fn(...args);
        // Clear error on success
        if (errorState.hasError) {
          clearError();
        }
        return result;
      } catch (error) {
        handleError(error as Error, context);
        return null;
      }
    };
  }, [handleError, clearError, errorState.hasError]);

  return {
    // Error state
    error: errorState.error,
    hasError: errorState.hasError,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    canRetry: retryable && errorState.retryCount < maxRetries,
    
    // Error handling functions
    handleError,
    handleRetry,
    clearError,
    withErrorHandling,
    withSyncErrorHandling
  };
};

export default useErrorHandler;
