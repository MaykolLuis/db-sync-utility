'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface PasswordManagementResult {
  // Password verification
  verifyPassword: (password: string) => Promise<boolean>;
  
  // Password changing
  changePassword: (newPassword: string) => Promise<boolean>;
  
  // State
  isVerifying: boolean;
  isChanging: boolean;
  error: string | null;
}

export function usePasswordManagement(): PasswordManagementResult {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);
    
    try {
      if (window.electron?.verifyPassword) {
        const isValid = await window.electron.verifyPassword(password);
        return isValid;
      } else {
        // Fallback for development environment
        const storedPassword = localStorage.getItem("db-sync-password") || "admin";
        return password === storedPassword;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se ověřit heslo';
      setError(errorMessage);
      console.error('Error verifying password:', errorMessage);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    setIsChanging(true);
    setError(null);
    
    try {
      if (window.electron?.setPassword) {
        await window.electron.setPassword(newPassword);
        toast.success('Heslo bylo změněno', {
          description: 'Nové heslo bylo úspěšně uloženo'
        });
        return true;
      } else {
        // Fallback for development environment
        localStorage.setItem("db-sync-password", newPassword);
        toast.success('Heslo bylo změněno', {
          description: 'Nové heslo bylo úspěšně uloženo (vývojové prostředí)'
        });
        return true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se změnit heslo';
      setError(errorMessage);
      toast.error('Chyba při změně hesla', {
        description: errorMessage
      });
      return false;
    } finally {
      setIsChanging(false);
    }
  }, []);

  return {
    verifyPassword,
    changePassword,
    isVerifying,
    isChanging,
    error
  };
}
