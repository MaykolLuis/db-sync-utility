/**
 * Offline Support Utilities for DB Sync Utility
 * Handles network disconnections and provides graceful fallbacks
 */

export interface NetworkStatus {
  isOnline: boolean;
  isNetworkDriveAccessible: boolean;
  lastChecked: number;
  error?: string;
}

export interface OfflineCapabilities {
  canAccessLocalFiles: boolean;
  canAccessNetworkDrives: boolean;
  canSaveToCache: boolean;
  hasInternetConnection: boolean;
}

export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface OfflineError extends Error {
  code: string;
  isNetworkError: boolean;
  isRecoverable: boolean;
  suggestedAction?: string;
}

// Network error codes that indicate offline/network issues
export const NETWORK_ERROR_CODES = [
  'ENOENT',     // File/directory not found (network drive disconnected)
  'EACCES',     // Access denied (network permissions)
  'EPERM',      // Operation not permitted (network permissions)
  'ENOTFOUND',  // Network host not found
  'ETIMEDOUT',  // Network timeout
  'ECONNREFUSED', // Connection refused
  'ENETUNREACH', // Network unreachable
  'EHOSTUNREACH', // Host unreachable
  'EAI_AGAIN',   // DNS lookup failed
  'ECONNRESET',  // Connection reset
  'EBUSY',       // Resource busy (network drive issues)
  'EAGAIN',      // Resource temporarily unavailable
  'EMFILE',      // Too many open files (network resource exhaustion)
  'ENFILE',      // File table overflow (network resource exhaustion)
] as const;

// Paths that typically indicate network drives on Windows
export const NETWORK_DRIVE_PATTERNS = [
  /^\\\\[^\\]+\\/, // UNC paths (\\server\share)
  /^[A-Z]:\\.*$/,  // Mapped network drives (check if they're network drives)
] as const;

/**
 * Check if a path is likely a network drive
 */
export function isNetworkPath(path: string): boolean {
  if (!path) return false;
  
  // Check for UNC paths
  if (path.startsWith('\\\\')) {
    return true;
  }
  
  // For mapped drives, we'd need to check with the OS
  // This is a basic heuristic - the actual check happens in Electron
  return false;
}

/**
 * Check if an error is network-related
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.code || error.errno || '';
  return NETWORK_ERROR_CODES.includes(errorCode as any);
}

/**
 * Create a standardized offline error
 */
export function createOfflineError(
  message: string,
  code: string,
  isRecoverable: boolean = true,
  suggestedAction?: string
): OfflineError {
  const error = new Error(message) as OfflineError;
  error.code = code;
  error.isNetworkError = isNetworkError({ code });
  error.isRecoverable = isRecoverable;
  error.suggestedAction = suggestedAction;
  return error;
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's not a network error or if we've exhausted retries
      if (!isNetworkError(error) || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = exponentialBackoff 
        ? retryDelay * Math.pow(2, attempt)
        : retryDelay;
      
      // Notify about retry attempt
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check network connectivity status
 */
export async function checkNetworkStatus(): Promise<NetworkStatus> {
  const status: NetworkStatus = {
    isOnline: navigator.onLine,
    isNetworkDriveAccessible: false,
    lastChecked: Date.now()
  };

  try {
    // Check if we can access network drives through Electron
    if (window.electron && 'checkNetworkConnectivity' in window.electron) {
      const result = await (window.electron as any).checkNetworkConnectivity();
      status.isNetworkDriveAccessible = result.success;
      if (!result.success) {
        status.error = result.error;
      }
    }
  } catch (error) {
    status.error = error instanceof Error ? error.message : 'Network check failed';
  }

  return status;
}

/**
 * Get offline capabilities based on current network status
 */
export function getOfflineCapabilities(networkStatus: NetworkStatus): OfflineCapabilities {
  return {
    canAccessLocalFiles: true, // Always true for local files
    canAccessNetworkDrives: networkStatus.isNetworkDriveAccessible,
    canSaveToCache: true, // Always true for local cache
    hasInternetConnection: networkStatus.isOnline
  };
}

/**
 * Format network error for user display
 */
export function formatNetworkError(error: any, path?: string): string {
  if (!error) return 'Neznámá chyba sítě';
  
  const errorCode = error.code || '';
  const isNetwork = isNetworkPath(path || '');
  
  switch (errorCode) {
    case 'ENOENT':
      return isNetwork 
        ? 'Síťová jednotka není dostupná. Zkontrolujte připojení k síti.'
        : 'Soubor nebo složka nebyla nalezena.';
    
    case 'EACCES':
    case 'EPERM':
      return isNetwork
        ? 'Nemáte oprávnění k přístupu k síťové jednotce. Zkontrolujte přihlašovací údaje.'
        : 'Nemáte oprávnění k přístupu k tomuto souboru.';
    
    case 'ETIMEDOUT':
      return 'Vypršel časový limit připojení k síti. Zkuste to znovu později.';
    
    case 'ECONNREFUSED':
      return 'Připojení k síťovému serveru bylo odmítnuto.';
    
    case 'ENETUNREACH':
    case 'EHOSTUNREACH':
      return 'Síťový server není dostupný. Zkontrolujte připojení k síti.';
    
    case 'EBUSY':
      return isNetwork
        ? 'Síťová jednotka je momentálně nedostupná. Zkuste to znovu za chvíli.'
        : 'Soubor je používán jiným procesem.';
    
    default:
      return isNetwork
        ? `Chyba síťového připojení: ${error.message || errorCode}`
        : `Chyba při přístupu k souboru: ${error.message || errorCode}`;
  }
}

/**
 * Get suggested recovery actions for network errors
 */
export function getRecoveryActions(error: any, path?: string): string[] {
  const actions: string[] = [];
  const errorCode = error.code || '';
  const isNetwork = isNetworkPath(path || '');
  
  if (isNetwork) {
    actions.push('Zkontrolujte připojení k síti');
    actions.push('Ověřte, že síťová jednotka je připojena');
    
    if (['EACCES', 'EPERM'].includes(errorCode)) {
      actions.push('Zkontrolujte přihlašovací údaje');
      actions.push('Ověřte oprávnění k síťové jednotce');
    }
    
    if (['ETIMEDOUT', 'ECONNREFUSED'].includes(errorCode)) {
      actions.push('Zkuste to znovu za chvíli');
      actions.push('Kontaktujte správce sítě');
    }
  }
  
  actions.push('Zkuste operaci znovu');
  actions.push('Zkontrolujte, zda cesta existuje');
  
  return actions;
}

/**
 * Cache management for offline operations
 */
export class OfflineCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global offline cache instance
export const offlineCache = new OfflineCache();

// Cleanup cache every 5 minutes
setInterval(() => {
  offlineCache.cleanup();
}, 5 * 60 * 1000);
