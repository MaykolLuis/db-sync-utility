'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, FileX } from 'lucide-react';
import { Button } from '@/components/custom-button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  formName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorBoundary: string;
}

class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorBoundary: 'form'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error) {
    console.error('FormErrorBoundary caught an error:', error);
    
    // Log form-specific error details
    if (typeof window !== 'undefined' && window.electron) {
      try {
        console.log('Logging form error to main process:', {
          error: error.message,
          stack: error.stack,
          formName: this.props.formName || 'unknown',
          timestamp: new Date().toISOString(),
          type: 'form_error'
        });
      } catch (e) {
        console.error('Failed to log form error:', e);
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });

    // Call custom reset handler
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const { formName = 'Formulář' } = this.props;

      return (
        <div className="bg-orange-900/10 border border-orange-500/20 rounded-lg p-4 m-2">
          <div className="flex items-center gap-3 mb-3">
            <FileX className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-orange-400">
              Chyba formuláře: {formName}
            </h3>
          </div>
          
          <p className="text-gray-300 mb-3">
            Formulář se nemohl načíst nebo zpracovat kvůli neočekávané chybě.
          </p>
          
          <div className="bg-gray-800/30 rounded p-3 mb-4">
            <p className="text-sm text-orange-300 font-mono">
              {error?.message || 'Neznámá chyba formuláře'}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={this.handleReset}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resetovat formulář
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              variant="outline"
              className="border-orange-500/30 text-orange-400"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Obnovit stránku
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FormErrorBoundary;
