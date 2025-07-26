'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/custom-button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  name?: string;
  context?: string;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
  retryCount: number;
}

class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: 0
    };
  }

  get maxRetries() {
    return this.props.maxRetries || 5;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error) {
    console.error('AsyncErrorBoundary caught an error:', error);
    
    // Auto-retry for network/async errors
    if (this.isRetryableError(error) && this.state.retryCount < this.maxRetries) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  isRetryableError = (error: Error): boolean => {
    const retryableErrors = [
      'NetworkError',
      'TypeError: Failed to fetch',
      'AbortError',
      'TimeoutError',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];

    return retryableErrors.some(errorType => 
      error.message.includes(errorType) || 
      error.name.includes(errorType)
    );
  };

  scheduleRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff, max 10s
    
    this.setState({ isRetrying: true });
    
    const timeout = setTimeout(() => {
      this.handleRetry();
    }, delay);
    
    this.retryTimeouts.push(timeout);
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: prevState.retryCount + 1
    }));

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleManualRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.handleRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, isRetrying, retryCount } = this.state;
      const { name = 'Async operace' } = this.props;
      const isNetworkError = error?.message.includes('fetch') || error?.message.includes('Network');

      if (isRetrying) {
        return (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-300">Opakování pokusu...</p>
              <p className="text-sm text-gray-500">Pokus {retryCount + 1} z {this.maxRetries}</p>
            </div>
          </div>
        );
      }

      return (
        <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-lg p-6 m-4">
          <div className="flex items-center gap-3 mb-4">
            {isNetworkError ? (
              <WifiOff className="h-6 w-6 text-yellow-400" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-400" />
            )}
            <h3 className="text-lg font-semibold text-yellow-400">
              {isNetworkError ? 'Problém s připojením' : 'Chyba při načítání'}
            </h3>
          </div>
          
          <p className="text-gray-300 mb-4">
            {isNetworkError 
              ? 'Nepodařilo se navázat spojení. Zkontrolujte připojení k internetu nebo stav serveru.'
              : `Došlo k chybě při načítání dat pro: ${name}`
            }
          </p>
          
          <div className="bg-gray-800/30 rounded p-3 mb-4">
            <p className="text-sm text-yellow-300 font-mono">
              {error?.message || 'Neznámá chyba'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {retryCount < this.maxRetries && (
              <Button
                onClick={this.handleManualRetry}
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Zkusit znovu
              </Button>
            )}
            
            {retryCount >= this.maxRetries && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <AlertCircle className="h-4 w-4" />
                <span>Maximální počet pokusů dosažen</span>
              </div>
            )}
            
            <div className="text-sm text-gray-500">
              {isNetworkError ? (
                <div className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  <span>Zkontrolujte připojení</span>
                </div>
              ) : (
                <span>Pokus {retryCount} z {this.maxRetries}</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AsyncErrorBoundary;
