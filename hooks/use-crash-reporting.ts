import { useCallback, useEffect } from 'react';
import { CrashErrorData, CrashReport, Breadcrumb } from '@/types/electron';

interface UseCrashReportingReturn {
  reportCrash: (error: Error, type?: CrashErrorData['type'], appState?: any) => Promise<string | null>;
  addBreadcrumb: (message: string, level?: 'info' | 'warn' | 'error', category?: string) => Promise<void>;
  getCrashReports: (limit?: number) => Promise<CrashReport[]>;
  deleteCrashReport: (crashId: string) => Promise<boolean>;
  getBreadcrumbs: () => Promise<Breadcrumb[]>;
  isAvailable: boolean;
}

export function useCrashReporting(): UseCrashReportingReturn {
  const isAvailable = typeof window !== 'undefined' && !!(window.electron as any)?.crashReporting;

  // Set up global error handlers
  useEffect(() => {
    if (!isAvailable) return;

    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      await reportCrash(error, 'unhandledRejection');
    };

    const handleError = async (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      
      const error = event.error instanceof Error 
        ? event.error 
        : new Error(event.message);

      await reportCrash(error, 'error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    // Add global error listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Add initial breadcrumb
    addBreadcrumb('Crash reporting hook initialized', 'info', 'crash-reporting');

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [isAvailable]);

  const reportCrash = useCallback(async (
    error: Error, 
    type: CrashErrorData['type'] = 'error',
    appState?: any
  ): Promise<string | null> => {
    if (!isAvailable) {
      console.warn('Crash reporting not available');
      return null;
    }

    try {
      // Get current app state if not provided
      const currentAppState = appState || getCurrentAppState();

      const errorData: CrashErrorData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        type,
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          appState: currentAppState
        }
      };

      const result = await (window.electron as any).crashReporting.reportCrash(errorData);
      
      if (result.success && result.crashId) {
        console.log(`Crash reported successfully: ${result.crashId}`);
        return result.crashId;
      } else {
        console.error('Failed to report crash:', result.error);
        return null;
      }
    } catch (reportError) {
      console.error('Error reporting crash:', reportError);
      return null;
    }
  }, [isAvailable]);

  const addBreadcrumb = useCallback(async (
    message: string, 
    level: 'info' | 'warn' | 'error' = 'info', 
    category?: string
  ): Promise<void> => {
    if (!isAvailable) return;

    try {
      await (window.electron as any).crashReporting.addBreadcrumb(message, level, category);
    } catch (error) {
      console.error('Error adding breadcrumb:', error);
    }
  }, [isAvailable]);

  const getCrashReports = useCallback(async (limit = 50): Promise<CrashReport[]> => {
    if (!isAvailable) return [];

    try {
      const result = await (window.electron as any).crashReporting.getCrashReports(limit);
      return result.success && result.reports ? result.reports : [];
    } catch (error) {
      console.error('Error getting crash reports:', error);
      return [];
    }
  }, [isAvailable]);

  const deleteCrashReport = useCallback(async (crashId: string): Promise<boolean> => {
    if (!isAvailable) return false;

    try {
      const result = await (window.electron as any).crashReporting.deleteCrashReport(crashId);
      return result.success;
    } catch (error) {
      console.error('Error deleting crash report:', error);
      return false;
    }
  }, [isAvailable]);

  const getBreadcrumbs = useCallback(async (): Promise<Breadcrumb[]> => {
    if (!isAvailable) return [];

    try {
      const result = await (window.electron as any).crashReporting.getBreadcrumbs();
      return result.success && result.breadcrumbs ? result.breadcrumbs : [];
    } catch (error) {
      console.error('Error getting breadcrumbs:', error);
      return [];
    }
  }, [isAvailable]);

  return {
    reportCrash,
    addBreadcrumb,
    getCrashReports,
    deleteCrashReport,
    getBreadcrumbs,
    isAvailable
  };
}

// Helper function to get current app state
function getCurrentAppState() {
  try {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    return {
      pathname,
      search: window.location.search,
      activeTab: getActiveTabFromUrl(pathname),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      params: Object.fromEntries(searchParams.entries())
    };
  } catch (error) {
    console.error('Failed to get app state:', error);
    return {
      timestamp: Date.now(),
      error: 'Failed to collect app state'
    };
  }
}

function getActiveTabFromUrl(pathname: string): string {
  if (pathname.includes('source')) return 'source';
  if (pathname.includes('targets')) return 'targets';
  if (pathname.includes('copy')) return 'copy';
  if (pathname.includes('history')) return 'history';
  if (pathname.includes('settings')) return 'settings';
  if (pathname.includes('crash')) return 'crash-reporting';
  return 'main';
}

// Utility function to manually report crashes with additional context
export async function reportManualCrash(
  message: string, 
  additionalContext?: any,
  level: 'error' | 'warn' | 'info' = 'error'
): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !(window.electron as any)?.crashReporting) {
      console.warn('Crash reporting not available');
      return null;
    }

    const result = await (window.electron as any).crashReporting.reportCrash({
      message,
      stack: new Error().stack,
      name: 'ManualCrash',
      type: 'manual',
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        appState: {
          level,
          manualReport: true,
          additionalContext,
          reportedAt: new Date().toISOString(),
          ...getCurrentAppState()
        }
      }
    });

    return result.success && result.crashId ? result.crashId : null;
  } catch (error) {
    console.error('Error reporting manual crash:', error);
    return null;
  }
}

// Utility function to wrap async functions with crash reporting
export function withCrashReporting<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      if (context && typeof window !== 'undefined' && (window.electron as any)?.crashReporting) {
        await (window.electron as any).crashReporting.addBreadcrumb(
          `Starting ${context}`, 'info', 'function-wrapper'
        );
      }
      
      const result = await fn(...args);
      
      if (context && typeof window !== 'undefined' && (window.electron as any)?.crashReporting) {
        await (window.electron as any).crashReporting.addBreadcrumb(
          `Completed ${context}`, 'info', 'function-wrapper'
        );
      }
      
      return result;
    } catch (error) {
      if (context && typeof window !== 'undefined' && (window.electron as any)?.crashReporting) {
        await (window.electron as any).crashReporting.addBreadcrumb(
          `Error in ${context}: ${(error as Error).message}`, 'error', 'function-wrapper'
        );
      }
      
      // Report the crash directly
      if (typeof window !== 'undefined' && (window.electron as any)?.crashReporting) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        await (window.electron as any).crashReporting.reportCrash({
          message: errorObj.message,
          stack: errorObj.stack,
          name: errorObj.name,
          type: 'error',
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            appState: {
              functionContext: context,
              functionArgs: args.length > 0 ? 'provided' : 'none',
              ...getCurrentAppState()
            }
          }
        });
      }
      
      throw error; // Re-throw to maintain normal error handling
    }
  }) as T;
}
