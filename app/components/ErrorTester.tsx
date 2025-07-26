'use client';

import React, { useState } from 'react';
import { Button } from '@/components/custom-button';
import { AlertTriangle, Bug, Zap, Clock } from 'lucide-react';

interface ErrorTesterProps {
  onError?: (error: Error) => void;
}

const ErrorTester: React.FC<ErrorTesterProps> = ({ onError }) => {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [asyncError, setAsyncError] = useState(false);

  // Synchronous error for testing ErrorBoundary
  const throwSyncError = () => {
    setShouldThrow(true);
  };

  // Asynchronous error for testing AsyncErrorBoundary
  const throwAsyncError = async () => {
    setAsyncError(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    throw new Error('Testovací asynchronní chyba - síťové připojení selhalo');
  };

  // Form validation error
  const throwFormError = () => {
    throw new Error('Neplatná hodnota v poli - formulář nelze odeslat');
  };

  // Component crash error
  const throwComponentError = () => {
    throw new Error('Kritická chyba komponenty - neočekávaný stav');
  };

  if (shouldThrow) {
    throw new Error('Testovací synchronní chyba - komponenta selhala');
  }

  return (
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 m-4">
      <div className="flex items-center gap-2 mb-4">
        <Bug className="h-5 w-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-yellow-400">
          Testování Error Boundaries
        </h3>
      </div>
      
      <p className="text-gray-300 mb-4 text-sm">
        Použijte následující tlačítka k testování různých typů chyb a ověření, 
        že error boundaries správně zachycují a zpracovávají chyby.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={throwSyncError}
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Synchronní chyba
        </Button>

        <Button
          onClick={throwAsyncError}
          size="sm"
          className="bg-orange-600 hover:bg-orange-700 text-white"
          disabled={asyncError}
        >
          <Clock className="h-4 w-4 mr-2" />
          {asyncError ? 'Načítání...' : 'Async chyba'}
        </Button>

        <Button
          onClick={throwFormError}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Zap className="h-4 w-4 mr-2" />
          Chyba formuláře
        </Button>

        <Button
          onClick={throwComponentError}
          size="sm"
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          <Bug className="h-4 w-4 mr-2" />
          Chyba komponenty
        </Button>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        <p>• <strong>Synchronní chyba:</strong> Testuje ErrorBoundary</p>
        <p>• <strong>Async chyba:</strong> Testuje AsyncErrorBoundary</p>
        <p>• <strong>Chyba formuláře:</strong> Testuje FormErrorBoundary</p>
        <p>• <strong>Chyba komponenty:</strong> Testuje obecné zachycení chyb</p>
      </div>
    </div>
  );
};

export default ErrorTester;
