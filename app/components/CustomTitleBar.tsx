'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

// Import the ElectronAPI type from the app types directory
import type { ElectronAPI } from '../types/electron';

// No need to redeclare the Window interface as it's already defined in electron.d.ts

function CustomTitleBar() {
  const { theme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Create refs for the buttons
  const minimizeRef = useRef<HTMLButtonElement>(null);
  const maximizeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastActionTimeRef = useRef<number>(0);
  
  // Update window state
  const updateWindowState = async () => {
    try {
      if (window.electron && (window.electron as any).windowControls?.getWindowState) {
        const state = await (window.electron as any).windowControls.getWindowState();
        setIsMaximized(state.isMaximized);
      }
    } catch (error) {
      console.error('RENDERER: Error getting window state:', error);
    }
  };
  
  const handleMinimize = () => {
    console.log('RENDERER: Minimize button clicked');
    try {
      if (window.electron && (window.electron as any).windowControls?.minimize) {
        (window.electron as any).windowControls.minimize();
      }
    } catch (error) {
      console.error('RENDERER: Error minimizing window:', error);
    }
  };
  
  const handleMaximize = () => {
    console.log('RENDERER: Maximize button clicked');
    
    // Simple debounce - ignore if called within 300ms
    const now = Date.now();
    if (now - lastActionTimeRef.current < 300) {
      console.log('RENDERER: Maximize ignored - too soon after last action');
      return;
    }
    lastActionTimeRef.current = now;
    
    try {
      if (window.electron && (window.electron as any).windowControls?.maximize) {
        console.log('RENDERER: Sending maximize command');
        (window.electron as any).windowControls.maximize();
      }
    } catch (error) {
      console.error('RENDERER: Error maximizing window:', error);
    }
  };

  const handleRestore = () => {
    console.log('RENDERER: Restore button clicked');
    
    // Simple debounce - ignore if called within 300ms
    const now = Date.now();
    if (now - lastActionTimeRef.current < 300) {
      console.log('RENDERER: Restore ignored - too soon after last action');
      return;
    }
    lastActionTimeRef.current = now;
    
    try {
      if (window.electron && (window.electron as any).windowControls?.unmaximize) {
        console.log('RENDERER: Sending unmaximize command');
        (window.electron as any).windowControls.unmaximize();
      }
    } catch (error) {
      console.error('RENDERER: Error restoring window:', error);
    }
  };

  const handleClose = () => {
    console.log('RENDERER: Close button clicked');
    try {
      if (window.electron && (window.electron as any).windowControls?.close) {
        (window.electron as any).windowControls.close();
      }
    } catch (error) {
      console.error('RENDERER: Error closing window:', error);
    }
  };

  // Initialize window state on mount
  useEffect(() => {
    updateWindowState();
    
    // Set up listener for window state changes
    if (window.electron && (window.electron as any).windowControls?.onWindowStateChange) {
      (window.electron as any).windowControls.onWindowStateChange((state: { isMaximized: boolean }) => {
        console.log('RENDERER: Window state changed:', state);
        setIsMaximized(state.isMaximized);
      });
    }
  }, []);
  
  // Use useEffect to set up direct DOM manipulation for hover effects
  useEffect(() => {
    // Minimize button
    if (minimizeRef.current) {
      const minimizeBtn = minimizeRef.current;
      
      // Reset any existing styles
      minimizeBtn.style.backgroundColor = 'transparent';
      minimizeBtn.style.boxShadow = 'none';
      minimizeBtn.style.filter = 'none';
      
      // Set up hover and active event listeners
      const minimizeHover = () => {
        minimizeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      };
      
      const minimizeOut = () => {
        minimizeBtn.style.backgroundColor = 'transparent';
      };
      
      const minimizeDown = () => {
        minimizeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      };
      
      const minimizeUp = () => {
        minimizeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      };
      
      minimizeBtn.addEventListener('mouseover', minimizeHover);
      minimizeBtn.addEventListener('mouseout', minimizeOut);
      minimizeBtn.addEventListener('mousedown', minimizeDown);
      minimizeBtn.addEventListener('mouseup', minimizeUp);
      
      // Clean up event listeners
      return () => {
        minimizeBtn.removeEventListener('mouseover', minimizeHover);
        minimizeBtn.removeEventListener('mouseout', minimizeOut);
        minimizeBtn.removeEventListener('mousedown', minimizeDown);
        minimizeBtn.removeEventListener('mouseup', minimizeUp);
      };
    }
  }, [minimizeRef]);
  
  // Maximize button styling handled by React event handlers
  
  // Close button
  useEffect(() => {
    if (closeRef.current) {
      const closeBtn = closeRef.current;
      
      // Reset any existing styles
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.boxShadow = 'none';
      closeBtn.style.filter = 'none';
      
      // Set up hover and active event listeners
      const closeHover = () => {
        closeBtn.style.backgroundColor = '#e11d48';
      };
      
      const closeOut = () => {
        closeBtn.style.backgroundColor = 'transparent';
      };
      
      const closeDown = () => {
        closeBtn.style.backgroundColor = '#be123c';
      };
      
      const closeUp = () => {
        closeBtn.style.backgroundColor = '#e11d48';
      };
      
      closeBtn.addEventListener('mouseover', closeHover);
      closeBtn.addEventListener('mouseout', closeOut);
      closeBtn.addEventListener('mousedown', closeDown);
      closeBtn.addEventListener('mouseup', closeUp);
      
      // Clean up event listeners
      return () => {
        closeBtn.removeEventListener('mouseover', closeHover);
        closeBtn.removeEventListener('mouseout', closeOut);
        closeBtn.removeEventListener('mousedown', closeDown);
        closeBtn.removeEventListener('mouseup', closeUp);
      };
    }
  }, [closeRef]);
  
  // Add styles for the user display
  useEffect(() => {
    // Add CSS for the user display if it doesn't exist
    const styleId = 'user-display-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .user-display {
          display: flex;
          align-items: center;
          margin-left: auto;
          margin-right: 10px;
          padding: 0 10px;
          height: 30px;
          color: #ffffff;
          font-size: 12px;
        }
        
        .user-display svg {
          margin-right: 6px;
          opacity: 0.8;
        }
        
        .user-display span {
          white-space: nowrap;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="title-bar">
      <div className="title-bar-text">
        <div className="logo" style={{ display: 'inline-block', position: 'relative', width: '24px', height: '24px', verticalAlign: 'middle', marginRight: '6px', marginTop: '4px' }}>
          <div className="logo-bg" style={{ width: '24px', height: '24px' }}></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 2 }}>
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
        </div>
        DB Sync Utility
      </div>

      <div className="user-display">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>Technické oddělení</span>
      </div>
      <div className="window-controls">
        <button 
          id="minimize-button" 
          className="window-control-button"
          title="Minimalizovat"
          onClick={handleMinimize}
          ref={minimizeRef}
        >
          <svg width="12" height="2" viewBox="0 0 12 2">
            <path d="M0 0h12v2H0z" fill="#FFFFFF"/>
          </svg>
        </button>
        {!isMaximized ? (
          <button 
            id="maximize-button" 
            className="window-control-button"
            title="Maximalizovat"
            onClick={handleMaximize}
            ref={maximizeRef}
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M0 0v12h12V0H0zm2 2h8v8H2V2z" fill="#FFFFFF"/>
            </svg>
          </button>
        ) : (
          <button 
            id="restore-button" 
            className="window-control-button"
            title="Obnovit"
            onClick={handleRestore}
            ref={restoreRef}
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 0v2H0v10h10V8h2V0H2zm8 2v6H2V2h8zM8 10H2V4h6v6z" fill="#FFFFFF"/>
            </svg>
          </button>
        )}
        <button 
          id="close-button" 
          className="window-control-button"
          title="Zavřít"
          onClick={handleClose}
          ref={closeRef}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 0L0 1l5 5-5 5 1 1 5-5 5 5 1-1-5-5 5-5-1-1-5 5-5-5z" fill="#FFFFFF"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// Only export as default to avoid duplicate export errors
export default CustomTitleBar;
