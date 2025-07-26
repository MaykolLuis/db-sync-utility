'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/custom-button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'section' | 'component';
  name?: string;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  crashId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      crashId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report crash using the new crash reporting system
    await this.reportCrash(error, errorInfo);
  }

  private async reportCrash(error: Error, errorInfo: ErrorInfo) {
    try {
      if (typeof window !== 'undefined' && (window.electron as any)?.crashReporting) {
        // Add breadcrumb about the error
        await (window.electron as any).crashReporting.addBreadcrumb(
          `React Error Boundary caught error in ${this.props.name || 'unknown component'}: ${error.message}`,
          'error',
          'react-error-boundary'
        );

        // Get current app state
        const appState = this.getCurrentAppState();

        // Report the crash
        const result = await (window.electron as any).crashReporting.reportCrash({
          message: error.message,
          stack: error.stack,
          name: error.name,
          type: 'error',
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            appState: {
              ...appState,
              errorBoundaryLevel: this.props.level,
              errorBoundaryName: this.props.name,
              errorBoundaryContext: this.props.context,
              componentStack: errorInfo.componentStack
            } as any
          }
        });

        if (result.success && result.crashId) {
          this.setState({ crashId: result.crashId });
          console.log(`Crash reported with ID: ${result.crashId}`);
        }
      } else {
        // Fallback: Log to Electron main process for debugging (legacy)
        console.log('Crash reporting not available, using legacy logging');
        console.log('Sending error to main process:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          level: this.props.level || 'unknown',
          name: this.props.name || 'unnamed'
        });
      }
    } catch (reportError) {
      console.error('Failed to report crash:', reportError);
    }
  }

  private getCurrentAppState() {
    try {
      // Try to extract app state from current page
      const url = window.location.href;
      const pathname = window.location.pathname;
      
      return {
        activeTab: this.getActiveTabFromUrl(pathname),
        url: url,
        timestamp: Date.now(),
        retryCount: this.retryCount,
        maxRetries: this.maxRetries
      };
    } catch (error) {
      console.error('Failed to get app state:', error);
      return {
        timestamp: Date.now(),
        retryCount: this.retryCount,
        maxRetries: this.maxRetries
      };
    }
  }

  private getActiveTabFromUrl(pathname: string): string {
    if (pathname.includes('source')) return 'source';
    if (pathname.includes('targets')) return 'targets';
    if (pathname.includes('copy')) return 'copy';
    if (pathname.includes('history')) return 'history';
    if (pathname.includes('settings')) return 'settings';
    return 'main';
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        crashId: null
      });
    }
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReportError = async () => {
    const { error, errorInfo, errorId, crashId } = this.state;
    const errorReport = {
      id: errorId,
      crashId: crashId || 'Not reported',
      timestamp: new Date().toISOString(),
      error: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack',
      level: this.props.level || 'unknown',
      name: this.props.name || 'unnamed',
      context: this.props.context || 'No context',
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };

    try {
      // Copy error report to clipboard
      await navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
      
      // Show success message with crash ID if available
      const message = crashId 
        ? `Chybový report byl zkopírován do schránky.\n\nCrash ID: ${crashId}\n\nMůžete jej odeslat vývojářům pro rychlejší řešení.`
        : 'Chybový report byl zkopírován do schránky. Můžete jej odeslat vývojářům.';
      
      alert(message);
    } catch (clipboardError) {
      console.error('Failed to copy error report to clipboard:', clipboardError);
      
      // Fallback: show error details in alert
      const fallbackMessage = `Nepodařilo se zkopírovat do schránky.\n\nChyba: ${error?.message}\nCrash ID: ${crashId || 'N/A'}\nČas: ${new Date().toISOString()}`;
      alert(fallbackMessage);
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;
      const { level = 'component', name = 'Neznámá komponenta' } = this.props;

      // Different UI based on error level
      if (level === 'app') {
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-8 text-center">
                <div className="flex justify-center mb-6">
                  <AlertTriangle className="h-16 w-16 text-red-400" />
                </div>
                
                <h1 className="text-2xl font-bold text-red-400 mb-4">
                  Aplikace se nečekaně ukončila
                </h1>
                
                <p className="text-gray-300 mb-6">
                  Omlouváme se za nepříjemnosti. Došlo k neočekávané chybě, která způsobila pád aplikace.
                </p>
                
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-gray-400 mb-2">Chyba ID: {errorId}</p>
                  {this.state.crashId && (
                    <p className="text-sm text-blue-400 mb-2">Crash ID: <code className="bg-blue-900/20 px-1 rounded">{this.state.crashId}</code></p>
                  )}
                  <p className="text-sm text-red-300 font-mono">
                    {error?.message || 'Neznámá chyba'}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={this.handleReload}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restartovat aplikaci
                  </Button>
                  
                  <Button
                    onClick={this.handleReportError}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-900/20"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    Zkopírovat chybový report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (level === 'section') {
        return (
          <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-6 m-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-red-400">
                Chyba v sekci: {name}
              </h3>
            </div>
            
            <p className="text-gray-300 mb-4">
              Tato sekce se nemohla načíst kvůli neočekávané chybě.
            </p>
            
            <div className="bg-gray-800/30 rounded p-3 mb-4">
              <p className="text-sm text-red-300 font-mono">
                {error?.message || 'Neznámá chyba'}
              </p>
            </div>
            
            <div className="flex gap-3">
              {this.retryCount < this.maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Zkusit znovu ({this.maxRetries - this.retryCount})
                </Button>
              )}
              
              <Button
                onClick={this.handleReportError}
                size="sm"
                variant="outline"
                className="border-red-500/30 text-red-400"
              >
                <Bug className="h-4 w-4 mr-2" />
                Nahlásit chybu
              </Button>
            </div>
          </div>
        );
      }

      // Component level error
      return (
        <div className="bg-red-900/10 border border-red-500/20 rounded p-4 m-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">
              Chyba komponenty: {name}
            </span>
          </div>
          
          <p className="text-xs text-gray-400 mb-2">
            {error?.message || 'Neznámá chyba'}
          </p>
          
          {this.retryCount < this.maxRetries && (
            <Button
              onClick={this.handleRetry}
              size="sm"
              variant="outline"
              className="text-xs border-red-500/30 text-red-400"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Zkusit znovu
            </Button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
