import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TargetLocation } from '../app/types';

interface DirectoryAccessStatus {
  [key: string]: boolean;
}

interface CacheEntry {
  result: boolean;
  timestamp: number;
}

// Cache for path access results with timestamps
const pathAccessCache = new Map<string, CacheEntry>();
const CACHE_TTL = 300000; // 5 minutes cache TTL (increased from 60s)
const MAX_CACHE_SIZE = 100; // Maximum number of cache entries
const BATCH_SIZE = 5; // Number of directories to check in parallel
const MIN_CHECK_INTERVAL = 60000; // 1 minute minimum time between checks (increased from 10s)
const POLLING_INTERVAL = 600000; // 10 minutes between background checks (increased from 2min)

// Simple debounce function with cancel method
type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  } as DebouncedFunction<T>;
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

// Clean up old cache entries
function cleanupCache() {
  const now = Date.now();
  const entries = Array.from(pathAccessCache.entries());
  
  // Remove expired entries first
  entries.forEach(([key, { timestamp }]) => {
    if (now - timestamp > CACHE_TTL) {
      pathAccessCache.delete(key);
    }
  });
  
  // If still too many entries, remove oldest ones
  if (pathAccessCache.size > MAX_CACHE_SIZE) {
    const sorted = entries
      .filter(([_, { timestamp }]) => now - timestamp <= CACHE_TTL)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
    const toRemove = sorted.length - MAX_CACHE_SIZE;
    if (toRemove > 0) {
      for (let i = 0; i < toRemove; i++) {
        pathAccessCache.delete(sorted[i][0]);
      }
    }
  }
}

export function useDirectoryAccessibility(targetLocations: TargetLocation[], filteredLocations?: TargetLocation[]) {
  const [accessStatus, setAccessStatus] = useState<DirectoryAccessStatus>({});
  const [isChecking, setIsChecking] = useState(false);
  const checkInProgress = useRef<boolean>(false);
  const lastCheckTime = useRef<number>(0);
  const mountedRef = useRef(true);
  
  // Memoize the target locations to prevent unnecessary effect triggers
  const targetLocationsKey = useMemo(() => 
    targetLocations.map(loc => `${loc.id}:${loc.path}`).join(',')
  , [targetLocations]);

  // Check if we need to check a path based on cache
  const needsCheck = useCallback((path: string): boolean => {
    cleanupCache(); // Clean up cache on each check
    const cached = pathAccessCache.get(path);
    if (!cached) return true;
    return (Date.now() - cached.timestamp) > CACHE_TTL;
  }, []);

  // Process a batch of locations and check their accessibility
  const processBatch = useCallback(async (batch: TargetLocation[], forceCheck = false): Promise<Array<{id: string, accessible: boolean}>> => {
    if (!batch.length) return [];
    
    const results: Array<{id: string, accessible: boolean}> = [];
    
    for (const location of batch) {
      try {
        // Check cache first unless forced
        const cached = pathAccessCache.get(location.path);
        if (!forceCheck && cached && (Date.now() - cached.timestamp) <= CACHE_TTL) {
          console.log(`Using cached accessibility for ${location.path}`);
          results.push({ id: location.id, accessible: cached.result });
          continue;
        }
        
        // If forced check or not in cache or cache expired, check path access
        console.log(`Checking path access for ${location.path}${forceCheck ? ' (forced)' : ''}`);
        const result = await window.electron.checkPathAccess(location.path);
        const isAccessible = result.accessible;
        console.log(`Path ${location.path} is ${isAccessible ? 'accessible' : 'not accessible'}`);
        
        // Update cache
        pathAccessCache.set(location.path, {
          result: isAccessible,
          timestamp: Date.now()
        });
        
        // Manage cache size
        if (pathAccessCache.size > MAX_CACHE_SIZE) {
          // Remove oldest entry
          const oldestKey = Array.from(pathAccessCache.keys())[0];
          pathAccessCache.delete(oldestKey);
        }
        
        results.push({ id: location.id, accessible: isAccessible });
      } catch (error) {
        console.error(`Error checking accessibility for ${location.path}:`, error);
        results.push({ id: location.id, accessible: false });
      }
    }
    
    return results;
  }, []);

  const checkAccessibility = useCallback(async (forceCheck = false) => {
    // Prevent multiple simultaneous checks
    if (checkInProgress.current && !forceCheck) {
      console.log('Skipping accessibility check - another check is in progress');
      return accessStatus;
    }
    
    // Don't check too frequently unless forced
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTime.current;
    
    if (!forceCheck && (timeSinceLastCheck < MIN_CHECK_INTERVAL)) {
      console.log(`Skipping accessibility check - last check was ${Math.round(timeSinceLastCheck/1000)}s ago (min interval: ${MIN_CHECK_INTERVAL/1000}s)`);
      return accessStatus;
    }
    
    // Log when we're doing a check and why
    if (forceCheck) {
      console.log('Performing forced accessibility check');
    } else {
      console.log(`Performing regular accessibility check after ${Math.round(timeSinceLastCheck/1000)}s`);
    }
    
    // If a check is already in progress and this is a forced check,
    // wait for the current check to complete before starting a new one
    if (checkInProgress.current && forceCheck) {
      console.log('Waiting for current check to complete before forcing a new check');
      // Wait a bit for the current check to finish
      await new Promise(resolve => setTimeout(resolve, 100));
      if (checkInProgress.current) {
        console.log('Current check still in progress, will force a new check anyway');
      }
    }
    
    checkInProgress.current = true;
    setIsChecking(true);
    lastCheckTime.current = now;
    
    try {
      // Use filtered locations if provided, otherwise use all target locations
      const baseLocations = filteredLocations || targetLocations;
      
      // When forcing a check, log the number of locations being checked
      if (forceCheck) {
        console.log(`Forcing check for ${baseLocations.length} locations`);
      }
      
      // Filter locations that need checking - only check if cache is expired or forced
      const locationsToCheck = baseLocations.filter(loc => {
        if (forceCheck) {
          console.log(`Will check ${loc.path} (forced check)`);
          return true;
        }
        
        const cached = pathAccessCache.get(loc.path);
        const needsCheck = !cached || (Date.now() - cached.timestamp) > CACHE_TTL;
        
        if (!needsCheck) {
          console.log(`Skipping check for ${loc.path} - using cache`);
        }
        
        return needsCheck;
      });

      // If nothing to check, return early
      if (locationsToCheck.length === 0) {
        console.log('No locations need checking');
        return accessStatus;
      }
      
      console.log(`Checking accessibility for ${locationsToCheck.length} locations${forceCheck ? ' (forced check)' : ''}`);
      
      // Process in batches
      const allResults: Array<{id: string, accessible: boolean}> = [];
      
      // Create batches
      const batches: TargetLocation[][] = [];
      for (let i = 0; i < locationsToCheck.length; i += BATCH_SIZE) {
        batches.push(locationsToCheck.slice(i, i + BATCH_SIZE));
      }
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!mountedRef.current) break; // Stop if component unmounted
        
        const batchResults = await processBatch(batch, forceCheck);
        allResults.push(...batchResults);
        
        // Small delay between batches, but not after the last batch
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Update the status only if there are changes and component is still mounted
      if (mountedRef.current) {
        setAccessStatus(prev => {
          const newStatus = { ...prev };
          let hasChanges = false;
          
          allResults.forEach(({ id, accessible }) => {
            if (newStatus[id] !== accessible) {
              newStatus[id] = accessible;
              hasChanges = true;
            }
          });
          
          return hasChanges ? newStatus : prev;
        });
      }
      
      return { ...accessStatus, ...Object.fromEntries(
        allResults.map(({ id, accessible }) => [id, accessible])
      )};
    } catch (error) {
      console.error('Error in accessibility check:', error);
      return accessStatus;
    } finally {
      if (mountedRef.current) {
        checkInProgress.current = false;
        setIsChecking(false);
      }
    }
  }, [targetLocations, filteredLocations, targetLocationsKey, accessStatus, needsCheck]);

  // Debounced version of checkAccessibility
  const debouncedCheck = useMemo(
    () => debounce<typeof checkAccessibility>(checkAccessibility, 500),
    [checkAccessibility]
  ) as DebouncedFunction<typeof checkAccessibility>;

  // Initial check on mount and when targetLocations change
  useEffect(() => {
    mountedRef.current = true;
    
    // Only do initial check if we have locations to check
    if (targetLocations.length > 0) {
      // Check if we've already done an initial check recently
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTime.current;
      
      if (timeSinceLastCheck < MIN_CHECK_INTERVAL) {
        // Skip if we've checked recently
        return;
      }
      
      console.log('Performing initial accessibility check on mount');
      // Use a small delay to prevent multiple checks during initial render
      setTimeout(() => {
        if (mountedRef.current) {
          debouncedCheck(false); // Use regular check, not forced
        }
      }, 1000);
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [targetLocationsKey, debouncedCheck, targetLocations.length]);

  // Set up polling with cleanup - only poll when component is visible
  useEffect(() => {
    if (!mountedRef.current) return;
    
    let timeoutId: NodeJS.Timeout;
    let isVisible = true;
    let lastPollTime = Date.now();
    
    // Check if document is visible to avoid unnecessary checks when app is minimized
    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const checkAndSchedule = async () => {
      if (!mountedRef.current) return;
      
      const now = Date.now();
      const timeSinceLastPoll = now - lastPollTime;
      
      // Only perform checks if document is visible AND polling interval has passed
      if (isVisible && timeSinceLastPoll >= POLLING_INTERVAL) {
        try {
          console.log(`Running scheduled accessibility check (${Math.round(timeSinceLastPoll/1000)}s since last check)`);
          await checkAccessibility(false);
          lastPollTime = Date.now(); // Update last poll time only after successful check
        } catch (error) {
          console.error('Polling error:', error);
        }
      } else if (!isVisible) {
        console.log('Skipping scheduled check - document not visible');
      } else {
        console.log(`Skipping scheduled check - last check was ${Math.round(timeSinceLastPoll/1000)}s ago, waiting for ${Math.round((POLLING_INTERVAL - timeSinceLastPoll)/1000)}s more`);
      }
      
      if (mountedRef.current) {
        // Calculate time until next check
        const timeUntilNextCheck = Math.max(
          POLLING_INTERVAL, // At least wait the full polling interval
          POLLING_INTERVAL - (now - lastPollTime) // Or wait remaining time since last poll
        );
        console.log(`Scheduling next check in ${Math.round(timeUntilNextCheck/1000)}s`);
        timeoutId = setTimeout(checkAndSchedule, timeUntilNextCheck);
      }
    };
    
    // Start first check after initial delay
    timeoutId = setTimeout(checkAndSchedule, POLLING_INTERVAL);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkAccessibility]);

  // Check accessibility when the window regains focus
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const handleFocus = () => debouncedCheck(true);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      debouncedCheck.cancel?.();
    };
  }, [debouncedCheck]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Function to manually trigger accessibility check
  const refreshAccessibility = useCallback(async () => {
    if (mountedRef.current) {
      return await checkAccessibility(true);
    }
    return accessStatus;
  }, [checkAccessibility, accessStatus]);

  // Function to force an immediate check (not debounced) that returns a Promise
  const forceCheck = useCallback(async () => {
    console.log('Force checking directory accessibility...');
    if (mountedRef.current) {
      // Cancel any pending debounced checks
      debouncedCheck.cancel?.();
      
      // Clear cache for all locations to force a fresh check
      const locationsToCheck = filteredLocations || targetLocations;
      locationsToCheck.forEach(loc => {
        if (pathAccessCache.has(loc.path)) {
          console.log(`Clearing cache for ${loc.path} to force fresh check`);
          pathAccessCache.delete(loc.path);
        }
      });
      
      // Set checking state immediately for UI feedback
      setIsChecking(true);
      
      try {
        // Use direct check with force=true to bypass all caching
        const result = await checkAccessibility(true);
        console.log('Force check completed, directories checked:', locationsToCheck.length);
        return result;
      } catch (error) {
        console.error('Error during forced accessibility check:', error);
        throw error;
      }
    }
    return accessStatus;
  }, [checkAccessibility, accessStatus, debouncedCheck, filteredLocations, targetLocations]);

  return { 
    accessStatus, 
    refreshAccessibility,
    isChecking,
    forceCheck
  };
}
