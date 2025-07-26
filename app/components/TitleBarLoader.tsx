'use client';

import { useEffect, useState } from 'react';
import CustomTitleBar from './CustomTitleBar';
import type { ElectronAPI } from '../../types/electron';

// This component is used to dynamically load the CustomTitleBar
// only in the Electron environment to avoid SSR issues
export function TitleBarLoader() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const isRunningInElectron = typeof window !== 'undefined' && window.electron !== undefined;
    console.log('Is running in Electron:', isRunningInElectron);
    
    if (isRunningInElectron) {
      // Add the in-electron class to the body for styling
      document.body.classList.add('in-electron');
      setIsElectron(true);
      
      // Log window controls availability for debugging
      try {
        // Use type assertion to access windowControls
        const electronAPI = window.electron as any;
        if (electronAPI && electronAPI.windowControls) {
          console.log('Window controls are available:', Object.keys(electronAPI.windowControls));
        } else {
          console.warn('Window controls are not available');
        }
      } catch (error) {
        console.error('Error checking window controls:', error);
      }
    }
  }, []);

  
  // Only render the CustomTitleBar in Electron
  if (!isElectron) {
    return null;
  }

  return (
    <div className="electron-only" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9000 }}>
      <CustomTitleBar />
    </div>
  );
}

export default TitleBarLoader;
