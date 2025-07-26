/**
 * React Hook for Offline Support and Network Connectivity
 * Provides comprehensive offline handling for the DB Sync Utility
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  NetworkStatus, 
  OfflineCapabilities, 
  RetryOptions,
  OfflineError,
  isNetworkError,
  formatNetworkError,
  getRecoveryActions,
  retryWithBackoff,
  offlineCache,
  checkNetworkStatus,
  getOfflineCapabilities,
  createOfflineError
} from '../lib/utils/offline-support';

export interface UseOfflineSupportResult {
  // Network status
  networkStatus: NetworkStatus;
  offlineCapabilities: OfflineCapabilities;
  isOnline: boolean;
  isNetworkDriveAccessible: boolean;
  
  // Methods
  checkConnectivity: (forceRefresh?: boolean) => Promise<void>;
  checkPathWithRetry: (path: string) => Promise<{ accessible: boolean; error?: string; isNetworkDrive?: boolean }>;
  copyFilesWithNetworkRetry: (sourcePath: string, targetPath: string, filePatterns?: string[], options?: any) => Promise<any>;
  checkNetworkDrives: (paths: string[]) => Promise<any>;
  
  // Error handling
  handleNetworkError: (error: any, path?: string) => void;
  showOfflineNotification: (message: string, type?: 'info' | 'warning' | 'error') => void;
  
  // Loading states
  isCheckingConnectivity: boolean;
  isCheckingPath: boolean;
  isCopyingFiles: boolean;
  
  // Cache management
  getCachedData: (key: string) => any;
  setCachedData: (key: string, data: any, ttl?: number) => void;
  clearCache: () => void;
}

export function useOfflineSupport(): UseOfflineSupportResult {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isNetworkDriveAccessible: false,
    lastChecked: Date.now()
  });
  
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false);
  const [isCheckingPath, setIsCheckingPath] = useState(false);
  const [isCopyingFiles, setIsCopyingFiles] = useState(false);
  
  const connectivityCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const lastConnectivityCheck = useRef<number>(0);
  
  // Derived state
  const offlineCapabilities = getOfflineCapabilities(networkStatus);
  const isOnline = networkStatus.isOnline;
  const isNetworkDriveAccessible = networkStatus.isNetworkDriveAccessible;
  
  // Check network connectivity
  // Debounced connectivity check to prevent rapid repeated calls
  const checkConnectivity = useCallback(async (forceRefresh: boolean = false) => {
    if (isCheckingConnectivity) {
      console.log('Connectivity check already in progress, skipping...');
      return;
    }
    
    // Check if we have recent cached data and this isn't a forced refresh
    if (!forceRefresh) {
      const cachedStatus = offlineCache.get('network-status');
      if (cachedStatus && (Date.now() - cachedStatus.lastChecked) < 30000) {
        console.log('Using recent cached network status');
        setNetworkStatus(cachedStatus);
        return;
      }
    }
    
    setIsCheckingConnectivity(true);
    
    // Ensure minimum animation duration for user feedback
    const startTime = Date.now();
    const minAnimationDuration = 800; // 800ms minimum to see the animation
    
    try {
      console.log('Performing network connectivity check...');
      const status = await checkNetworkStatus();
      
      // Calculate remaining time to reach minimum animation duration
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minAnimationDuration - elapsedTime);
      
      // Wait for remaining time if needed
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      setNetworkStatus(status);
      
      // Cache the network status
      offlineCache.set('network-status', status, 30000); // 30 seconds TTL
      
    } catch (error) {
      console.error('Failed to check network connectivity:', error);
      
      // Still respect minimum animation duration for errors
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minAnimationDuration - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      setNetworkStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Network check failed',
        lastChecked: Date.now()
      }));
    } finally {
      setIsCheckingConnectivity(false);
    }
  }, [isCheckingConnectivity]);
  
  // Enhanced path checking with network drive support
  const checkPathWithRetry = useCallback(async (path: string) => {
    if (!path) return { accessible: false, error: 'Cesta není zadána' };
    
    setIsCheckingPath(true);
    try {
      if (window.electron?.checkPathAccessEnhanced) {
        const result = await retryWithBackoff(
          () => window.electron.checkPathAccessEnhanced(path),
          {
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
            onRetry: (attempt, error) => {
              console.log(`Path check attempt ${attempt} failed:`, error.message);
              toast.info(`Opakuji kontrolu cesty (pokus ${attempt}/3)...`);
            }
          }
        );
        
        return {
          accessible: result.accessible,
          error: result.error,
          isNetworkDrive: result.isNetworkDrive,
          responseTime: result.responseTime
        };
      } else {
        // Fallback for development
        return { accessible: true };
      }
    } catch (error) {
      const formattedError = formatNetworkError(error, path);
      return {
        accessible: false,
        error: formattedError,
        isNetworkDrive: path.startsWith('\\\\')
      };
    } finally {
      setIsCheckingPath(false);
    }
  }, []);
  
  // Copy files with network retry logic
  const copyFilesWithNetworkRetry = useCallback(async (
    sourcePath: string, 
    targetPath: string, 
    filePatterns?: string[], 
    options?: any
  ) => {
    if (!sourcePath || !targetPath) {
      throw createOfflineError('Zdrojová nebo cílová cesta není zadána', 'INVALID_PATHS', false);
    }
    
    setIsCopyingFiles(true);
    try {
      if (window.electron?.copyFilesWithRetry) {
        const result = await window.electron.copyFilesWithRetry(
          sourcePath, 
          targetPath, 
          filePatterns || ['*.mv.db', '*.trace.db'],
          {
            maxRetries: 3,
            retryDelay: 2000,
            exponentialBackoff: true,
            ...options
          }
        );
        
        // Show retry information if there were multiple attempts
        if (result.retryInfo && result.retryInfo.attempts > 1) {
          const message = result.success 
            ? `Kopírování úspěšné po ${result.retryInfo.attempts} pokusech`
            : `Kopírování selhalo po ${result.retryInfo.attempts} pokusech`;
          
          toast.info(message, {
            description: result.retryInfo.isSourceNetwork || result.retryInfo.isTargetNetwork 
              ? 'Byla detekována síťová jednotka' 
              : undefined
          });
        }
        
        return result;
      } else {
        throw createOfflineError('Kopírování souborů není dostupné', 'COPY_NOT_AVAILABLE', false);
      }
    } catch (error) {
      const offlineError = error as OfflineError;
      handleNetworkError(offlineError, sourcePath);
      throw offlineError;
    } finally {
      setIsCopyingFiles(false);
    }
  }, []);
  
  // Check multiple network drives
  const checkNetworkDrives = useCallback(async (paths: string[]) => {
    if (!paths || paths.length === 0) return { success: true, results: [] };
    
    try {
      if (window.electron?.checkNetworkDrives) {
        const result = await window.electron.checkNetworkDrives(paths);
        
        // Cache the results
        offlineCache.set('network-drives-status', result, 60000); // 1 minute TTL
        
        return result;
      } else {
        return { success: true, results: [] };
      }
    } catch (error) {
      console.error('Failed to check network drives:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network drive check failed' };
    }
  }, []);
  
  // Handle network errors with user-friendly messages
  const handleNetworkError = useCallback((error: any, path?: string) => {
    const formattedError = formatNetworkError(error, path);
    const recoveryActions = getRecoveryActions(error, path);
    
    toast.error('Chyba síťového připojení', {
      description: formattedError,
      action: recoveryActions.length > 0 ? {
        label: 'Nápověda',
        onClick: () => {
          toast.info('Doporučené kroky:', {
            description: recoveryActions.join('\n• '),
            duration: 8000
          });
        }
      } : undefined,
      duration: 6000
    });
  }, []);
  
  // Show offline notifications
  const showOfflineNotification = useCallback((message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const toastFn = type === 'error' ? toast.error : type === 'warning' ? toast.warning : toast.info;
    
    toastFn(message, {
      description: !networkStatus.isOnline 
        ? 'Aplikace pracuje v offline režimu' 
        : !networkStatus.isNetworkDriveAccessible 
        ? 'Síťové jednotky nejsou dostupné'
        : undefined,
      duration: 5000
    });
  }, [networkStatus]);
  
  // Cache management
  const getCachedData = useCallback((key: string) => {
    return offlineCache.get(key);
  }, []);
  
  const setCachedData = useCallback((key: string, data: any, ttl?: number) => {
    offlineCache.set(key, data, ttl);
  }, []);
  
  const clearCache = useCallback(() => {
    offlineCache.clear();
  }, []);
  
  // Set up network status monitoring
  useEffect(() => {
    // Initial connectivity check
    checkConnectivity();
    
    // Set up periodic connectivity checks (every 5 minutes instead of 30 seconds)
    connectivityCheckInterval.current = setInterval(() => {
      const now = Date.now();
      // Only check if it's been more than 5 minutes since last check
      if (now - lastConnectivityCheck.current > 300000) { // 5 minutes = 300000ms
        lastConnectivityCheck.current = now;
        checkConnectivity();
      }
    }, 300000); // Check every 5 minutes instead of 30 seconds
    
    // Listen for online/offline events
    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: true }));
      checkConnectivity();
      toast.success('Připojení k síti obnoveno');
    };
    
    const handleOffline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: false }));
      toast.warning('Připojení k síti ztraceno', {
        description: 'Aplikace přešla do offline režimu'
      });
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
    
    return () => {
      if (connectivityCheckInterval.current) {
        clearInterval(connectivityCheckInterval.current);
      }
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [checkConnectivity]);
  
  // Monitor network drive accessibility
  useEffect(() => {
    if (networkStatus.isOnline && !networkStatus.isNetworkDriveAccessible) {
      // Show warning about network drive issues
      const cachedWarning = getCachedData('network-drive-warning');
      if (!cachedWarning) {
        showOfflineNotification(
          'Síťové jednotky nejsou dostupné',
          'warning'
        );
        setCachedData('network-drive-warning', true, 300000); // 5 minutes
      }
    }
  }, [networkStatus, getCachedData, setCachedData, showOfflineNotification]);
  
  return {
    // Network status
    networkStatus,
    offlineCapabilities,
    isOnline,
    isNetworkDriveAccessible,
    
    // Methods
    checkConnectivity,
    checkPathWithRetry,
    copyFilesWithNetworkRetry,
    checkNetworkDrives,
    
    // Error handling
    handleNetworkError,
    showOfflineNotification,
    
    // Loading states
    isCheckingConnectivity,
    isCheckingPath,
    isCopyingFiles,
    
    // Cache management
    getCachedData,
    setCachedData,
    clearCache
  };
}
