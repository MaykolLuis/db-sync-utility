'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/custom-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SourceDirectorySection from '@/components/source-directory-section';
import { TargetLocationsSection } from '@/components/target-locations-section';
import { CopyOperationSection } from '@/components/copy-operation-section';
import { HistoryTableSection } from '@/components/history-table-section';
import { SettingsSection } from '@/components/settings-section';
import { useTargetLocationsStore } from '@/lib/stores/use-target-locations-store';
import { useHistoryStore } from '@/lib/stores/use-history-store';
import { useSettingsStore } from '@/lib/stores/use-settings-store';
import { useAutoRecoveryStore } from '@/lib/stores/use-auto-recovery-store';
import { useDeveloperModeStore } from '@/lib/stores/use-developer-mode-store';
import { HistorySidebar } from '@/components/history-sidebar';
import { NetworkStatusIndicator } from '@/components/network-status-indicator';
import { RecoveryDialog } from '@/components/recovery-dialog';
import { GlobalSearchModal } from '@/components/global-search-modal';
import { UpdateNotification } from '@/components/update-notification';
import { UpdateSettings } from '@/components/update-settings';
import CrashReportingPage from '@/components/crash-reporting-page';
import { AnimatedMainPage } from '@/components/animated-main-page';
import { AnimatedTabs } from '@/components/animated-tabs';
import { AnimatedContent } from '@/components/animated-content';
import { AnimatedHeader } from '@/components/animated-header';
import { useSourceDirectoryAutoSave } from '@/hooks/use-auto-save';
import { toast } from 'sonner';
import { Search, Database, Keyboard, Settings, Wrench, ShieldPlus, CircleUserRound, HelpCircle } from 'lucide-react';
import { TitleBarLoader } from '@/app/components/TitleBarLoader';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import AsyncErrorBoundary from '@/app/components/AsyncErrorBoundary';
import FormErrorBoundary from '@/app/components/FormErrorBoundary';
import DocumentationModal from '@/components/documentation-modal';

// Export types for other components to use
export interface TargetLocation {
  id?: string;
  name: string;
  path: string;
  selected?: boolean;
}

export interface HistoryEntry {
  id: number;
  timestamp: number;
  description: string;
  sourcePath: string;
  version?: string;
  targetLocations: TargetLocation[];
  copyResults?: {
    targetId: string;
    targetPath?: string;
    targetName?: string;
    success: boolean;
    error?: string;
    fileSize?: number;
    duration?: number;
    fileName?: string;
    hasDiff?: boolean;
  }[];
}

const DBSyncUtility = React.memo(() => {
  const [sourcePath, setSourcePath] = useState('');
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(true);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryData, setRecoveryData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('source');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isShortcutDialogOpen, setIsShortcutDialogOpen] = useState(false);
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false);
  
  // Store hooks
  const { loadTargetLocations } = useTargetLocationsStore();
  const { history, loadHistoryEntries } = useHistoryStore();
  const { settings, loadSettings, setSavedSourcePath } = useSettingsStore();
  const { isDeveloperMode } = useDeveloperModeStore();

  // Set initial active tab based on settings (only on first load)
  const [hasInitializedTab, setHasInitializedTab] = useState(false);
  
  useEffect(() => {
    if (!hasInitializedTab && settings.defaultStartupTab) {
      setActiveTab(settings.defaultStartupTab);
      setHasInitializedTab(true);
    }
  }, [settings.defaultStartupTab, hasInitializedTab]);
  const { 
    checkForRecovery, 
    getRecoveryData, 
    initializeSession,
    clearSourceDirectoryRecovery,
    clearTargetLocationsRecovery,
    clearCopyOperationRecovery,
    clearSettingsRecovery,
    clearHistoryEntryRecovery 
  } = useAutoRecoveryStore();

  // Load initial data and check for recovery
  const loadInitialData = useCallback(async () => {
    try {
      console.log('Loading initial data...');
      
      // Initialize new session
      initializeSession();
      
      // Check for recovery data first
      const hasRecovery = checkForRecovery();
      if (hasRecovery) {
        const data = getRecoveryData();
        if (data) {
          setRecoveryData(data);
          setShowRecoveryDialog(true);
          console.log('Recovery data found, showing recovery dialog');
        }
      }
      
      // Load settings first
      await loadSettings();
      console.log('Settings loaded');
      
      // Load target locations
      await loadTargetLocations();
      console.log('Target locations loaded');
      
      // Load history entries
      await loadHistoryEntries();
      console.log('History entries loaded');
      
      console.log('All initial data loaded successfully');
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Chyba při načítání dat aplikace');
    }
  }, []); // Remove all dependencies to prevent infinite loop

  useEffect(() => {
    loadInitialData();
  }, []); // Remove loadInitialData dependency to prevent infinite loop

  // Load saved source path when settings are available
  useEffect(() => {
    if (settings.rememberSourcePath && settings.savedSourcePath) {
      setSourcePath(settings.savedSourcePath);
      console.log('Loaded saved source path:', settings.savedSourcePath);
    }
  }, [settings.rememberSourcePath, settings.savedSourcePath]);

  // Auto-save source directory - NOW SAFELY RE-ENABLED
  useSourceDirectoryAutoSave(sourcePath, sourcePath.trim() !== '');

  // Clear recovery data on normal app close
  useEffect(() => {
    const clearAllRecoveryData = () => {
      console.log('App closing normally - clearing all recovery data');
      clearTargetLocationsRecovery();
      clearSourceDirectoryRecovery();
      clearCopyOperationRecovery();
      clearSettingsRecovery();
      clearHistoryEntryRecovery();
    };

    const handleBeforeUnload = () => {
      // Only clear if no copy operation is in progress
      if (!isUpdating) {
        clearAllRecoveryData();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also clear on component unmount if not updating
      if (!isUpdating) {
        clearAllRecoveryData();
      }
    };
  }, [isUpdating, clearTargetLocationsRecovery, clearSourceDirectoryRecovery, clearCopyOperationRecovery, clearSettingsRecovery, clearHistoryEntryRecovery]);

  // Handle tab switching when developer mode is toggled off
  useEffect(() => {
    const developerTabIds = ['updates', 'crash-reporting'];
    if (!isDeveloperMode && developerTabIds.includes(activeTab)) {
      // Switch to source tab if currently on a developer tab and developer mode is off
      setActiveTab('source');
    }
  }, [isDeveloperMode, activeTab]);

  // Handle recovery actions
  const handleRecovery = useCallback((dataType: string) => {
    if (!recoveryData) return;
    
    switch (dataType) {
      case 'sourceDirectory':
        if (recoveryData.data?.sourceDirectory?.path) {
          setSourcePath(recoveryData.data.sourceDirectory.path);
          toast.success('Zdrojový adresář byl obnoven');
        }
        break;
      case 'copyOperation':
        toast.info('Nedokončená kopírovací operace byla obnovena');
        break;
      case 'historyEntry':
        toast.info('Nedokončený záznam historie byl obnoven');
        break;
    }
  }, [recoveryData]);

  // Handle source path changes
  const handleSourcePathChange = useCallback((path: string, isValid: boolean) => {
    setSourcePath(path);
    
    // Save to settings if remember source path is enabled and path is valid
    if (settings.rememberSourcePath && path && path.trim() && isValid) {
      console.log('Saving source path to settings:', path);
      setSavedSourcePath(path);
    }
  }, [settings.rememberSourcePath, setSavedSourcePath]);

  const handleBrowseFolder = useCallback(async (): Promise<string | undefined> => {
    try {
      const result = await window.electron.openDirectoryDialog();
      if (result && typeof result === 'string') {
        setSourcePath(result);
        setSavedSourcePath(result);
        return result;
      }
      return undefined;
    } catch (error) {
      console.error('Error browsing folder:', error);
      toast.error('Chyba při výběru složky');
      return undefined;
    }
  }, [setSavedSourcePath]);

  const handleClearSource = useCallback(() => {
    setSourcePath('');
    // Clear saved path from settings
    setSavedSourcePath('');
    // Clear source directory recovery data
    clearSourceDirectoryRecovery();
  }, [setSavedSourcePath, clearSourceDirectoryRecovery]);

  const handleCopyComplete = useCallback(() => {
    // Refresh history after copy operation
    loadHistoryEntries();
    toast.success('Kopírování dokončeno');
  }, [loadHistoryEntries]);

  const handleOpenHistorySidebar = useCallback(() => {
    setIsHistorySidebarOpen(true);
  }, []);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle global search shortcut (Ctrl+F) even in input fields
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      setIsGlobalSearchOpen(true);
      return;
    }

    // Don't handle other shortcuts if user is typing in an input field
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Handle Ctrl/Cmd key combinations
    if (e.ctrlKey || e.metaKey) {
      // Use both key and code for better keyboard layout compatibility
      const keyPressed = e.key || e.code;
      
      switch (keyPressed) {
        case '1':
        case 'Digit1':
          e.preventDefault();
          setActiveTab('source');
          break;
        case '2':
        case 'Digit2':
          e.preventDefault();
          setActiveTab('targets');
          break;
        case '3':
        case 'Digit3':
          e.preventDefault();
          setActiveTab('copy');
          break;
        case '4':
        case 'Digit4':
          e.preventDefault();
          setActiveTab('history');
          break;
        case '5':
        case 'Digit5':
          e.preventDefault();
          setActiveTab('settings');
          break;
          case '6':
          case 'Digit6':
            e.preventDefault();
            setActiveTab('updates');
            break;
          case '7':
          case 'Digit7':
            e.preventDefault();
            setActiveTab('crash-reporting');
            break;
            case '8':
            case 'Digit8':
              e.preventDefault();
              setActiveTab('crash-reporting');
              break;
        case 'Enter':
          e.preventDefault();
          // Trigger copy operation if on copy tab and source path is set
          if (activeTab === 'copy' && sourcePath) {
            // Find the copy button and click it
            const copyButton = document.querySelector('[data-copy-button]') as HTMLButtonElement;
            if (copyButton && !copyButton.disabled) {
              copyButton.click();
            }
          }
          break;
        case '0':
          e.preventDefault();
          // Browse for source directory
          handleBrowseFolder();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          // Add new target location
          setActiveTab('targets');
          // Focus on add location form after a short delay
          setTimeout(() => {
            const addLocationInput = document.querySelector('[data-add-location-name]') as HTMLInputElement;
            if (addLocationInput) {
              addLocationInput.focus();
            }
          }, 100);
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          // Show keyboard shortcuts dialog (Help)
          setIsShortcutDialogOpen(true);
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          // Show keyboard shortcuts dialog (Help)
          setIsDocumentationOpen(true);
          break;
        case 'r':
          e.preventDefault();
          // Refresh/reload application
          window.location.reload();
          break;
        case 'q':
          e.preventDefault();
          // Close application (Electron)
          if (window.electron && (window.electron as any).windowControls?.close) {
            (window.electron as any).windowControls.close();
          }
          break;
        case 'm':
        case 'M':
          // Developer mode toggle (Ctrl + Shift + M)
          if (e.shiftKey) {
            e.preventDefault();
            console.log('Developer mode keyboard shortcut triggered!');
            const { toggleDeveloperMode } = useDeveloperModeStore.getState();
            toggleDeveloperMode();
          }
          break;
      }
    }
  }, [activeTab, sourcePath, handleBrowseFolder]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <ErrorBoundary level="app" onError={(error) => console.error('App-level error:', error)}>
      <AnimatedMainPage isInitialLoad={true}>
        <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col overflow-hidden">
        <ErrorBoundary level="component" context="TitleBar">
          <TitleBarLoader />
        </ErrorBoundary>
        
        <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-700/30 bg-gray-800/30 backdrop-blur-md mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-sm border border-red-400/30 shadow-lg">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                    DB Sync Utility
                  </h1>
                  <p className="text-gray-300 text-sm font-medium">Nástroj pro synchronizaci databáze</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-1">
                  <NetworkStatusIndicator 
                    showDetails={true}
                    className=""
                  />
                </div>
                <Button
                  onClick={() => setIsGlobalSearchOpen(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:bg-gray-700/50 text-gray-200 hover:text-white transition-all duration-200"
                >
                  <Search className="h-4 w-4" />
                  Vyhledávání
                </Button>
               
                <Button
                  onClick={() => setIsShortcutDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:bg-gray-700/50 text-gray-200 hover:text-white transition-all duration-200"
                >
                  <Keyboard className="h-4 w-4" />
                  Klávesové zkratky
                </Button>
                
                {/* Documentation button */}
                <Button
                  onClick={() => setIsDocumentationOpen(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:bg-gray-700/50 text-gray-200 hover:text-white transition-all duration-200"
                  title="Otevřít dokumentaci aplikace"
                >
                  <HelpCircle className="h-4 w-4" />
                  Dokumentace
                </Button>
                
                {/* Developer Mode Toggle */}
                <Button
                  onClick={() => {
                    console.log('Developer mode toggle clicked!');
                    const { toggleDeveloperMode } = useDeveloperModeStore.getState();
                    toggleDeveloperMode();
                  }}
                  variant="outline"
                  size="sm"
                  className={`gap-2 backdrop-blur-sm transition-all duration-200 ${
                    isDeveloperMode 
                      ? 'bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200'
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 text-gray-200 hover:text-white'
                  }`}
                  title={isDeveloperMode ? 'Přepnout na uživatelský režim' : 'Přepnout na vývojářský režim'}
                >
                  {isDeveloperMode ? (
                    <Wrench className="h-4 w-4" />
                  ) : (
                    <CircleUserRound className="h-4 w-4" />
                  )}
                  {isDeveloperMode ? 'Dev Mode' : 'User Mode'}
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Animated Tabs Navigation */}
              <AnimatedTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isDeveloperMode={isDeveloperMode}
              />

              {/* Animated Content Area */}
              <AnimatedContent activeTab={activeTab}>
                {activeTab === 'source' && (
                  <ErrorBoundary level="section" context="Zdrojová složka">
                    <SourceDirectorySection 
                      sourcePath={sourcePath}
                      isUpdating={isUpdating}
                      onSourcePathChange={handleSourcePathChange}
                      onBrowseFolder={handleBrowseFolder}
                      onClear={handleClearSource}
                      hasSelectedPreset={false}
                    />
                  </ErrorBoundary>
                )}

                {activeTab === 'targets' && (
                  <AsyncErrorBoundary
                    context="Cílové lokace"
                    onRetry={() => window.location.reload()}
                    maxRetries={3}
                  >
                    <TargetLocationsSection 
                      isUpdating={isUpdating}
                    />
                  </AsyncErrorBoundary>
                )}

                {activeTab === 'copy' && (
                  <ErrorBoundary level="section" context="Kopírování">
                    <CopyOperationSection 
                      sourcePath={sourcePath}
                      isUpdating={isUpdating}
                      setIsUpdating={setIsUpdating}
                      onCopyComplete={handleCopyComplete}
                    />
                  </ErrorBoundary>
                )}

                {activeTab === 'history' && (
                  <AsyncErrorBoundary
                    context="Historie operací"
                    onRetry={() => {
                      // Reload history data
                      loadHistoryEntries();
                    }}
                    maxRetries={2}
                  >
                    <HistoryTableSection 
                      onOpenHistorySidebar={handleOpenHistorySidebar}
                    />
                  </AsyncErrorBoundary>
                )}

               

                {activeTab === 'settings' && (
                  <ErrorBoundary level="section" context="Nastavení">
                    <SettingsSection />
                  </ErrorBoundary>
                )}

                {activeTab === 'updates' && (
                  <ErrorBoundary level="section" context="Aktualizace aplikace">
                    <UpdateSettings />
                  </ErrorBoundary>
                )}

                {activeTab === 'crash-reporting' && (
                  <ErrorBoundary level="section" context="Crash Reporting">
                    <CrashReportingPage />
                  </ErrorBoundary>
                )}  
              </AnimatedContent>
            </div>
          </div>
        </div>
        </div>

        {/* History Sidebar */}
        <ErrorBoundary level="component" context="Historie sidebar">
          <HistorySidebar 
            isOpen={isHistorySidebarOpen}
            onClose={() => setIsHistorySidebarOpen(false)}
            history={history}
          />
        </ErrorBoundary>
        
        {/* Shortcut Dialog */}
        <Dialog open={isShortcutDialogOpen} onOpenChange={setIsShortcutDialogOpen}>
          <DialogContent className="max-w-2xl bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 shadow-2xl z-[9999]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-gradient-to-r from-red-500/80 to-red-600/80 backdrop-blur-sm border border-red-400/30">
                  <Keyboard className="h-5 w-5 text-white" />
                </div>
                Klávesové zkratky
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Přehled všech dostupných klávesových zkratek pro rychlejší práci s aplikací.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Navigation Shortcuts */}
              <div>
                <h4 className="font-semibold mb-3 text-xs text-gray-400 uppercase tracking-wide">Navigace</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Přepnout na záložku Zdroj</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + 1</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Přepnout na záložku Cíle</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + 2</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Přepnout na záložku Kopírování</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + 3</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Přepnout na záložku Historie</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + 4</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Přepnout na záložku Nastavení</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + 5</kbd>
                  </div>
                  
                  {/* Developer Mode Shortcuts - Only show in developer mode */}
                  {isDeveloperMode && (
                    <>
                      <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                        <span>Přepnout na záložku Aktualizace</span>
                        <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + 6</kbd>
                      </div>
                      <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                        <span>Přepnout na záložku Chyby</span>
                        <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + 7</kbd>
                      </div>
                    </>
                  )}
               
                  
                </div>
              </div>
              
              {/* File Operations */}
              <div>
                <h4 className="font-semibold mb-3 text-xs text-gray-400 uppercase tracking-wide">Operace se soubory</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Spustit kopírování</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Vybrat zdrojovou složku</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + 0</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Přidat nový cíl</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + N</kbd>
                  </div>
                </div>
              </div>
              
              {/* General Shortcuts */}
              <div>
                <h4 className="font-semibold mb-3 text-xs text-gray-400 uppercase tracking-wide">Obecné</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Globální vyhledávání</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + F</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Dokumentace</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + D</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Zobrazit klávesové zkratky</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + H</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Obnovit aplikaci</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + R</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Developer Mode</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + Shift + M</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1 px-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl text-gray-200">
                    <span>Zavřít aplikaci</span>
                    <kbd className="px-2 py-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-300 backdrop-blur-sm">Ctrl + Q</kbd>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Global Search Modal */}
        <GlobalSearchModal
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
          sourcePath={sourcePath}
          onNavigateToTab={(tab) => {
            setActiveTab(tab);
            setIsGlobalSearchOpen(false);
          }}
          onOpenHistorySidebar={() => {
            setIsHistorySidebarOpen(true);
            setIsGlobalSearchOpen(false);
          }}
        />

        {/* Documentation Modal */}
        <DocumentationModal
          isOpen={isDocumentationOpen}
          onOpenChange={setIsDocumentationOpen}
        />

        {/* Recovery Dialog */}
        {showRecoveryDialog && recoveryData && (
          <RecoveryDialog
            isOpen={showRecoveryDialog}
            onClose={() => setShowRecoveryDialog(false)}
            recoveryData={recoveryData}
            onRecover={handleRecovery}
          />
        )}
        
        {/* Update Notification */}
        {showUpdateNotification && (
          <div className="fixed top-20 right-6 z-[9999] max-w-md">
            <UpdateNotification
              onClose={() => setShowUpdateNotification(false)}
              className="shadow-2xl"
            />
          </div>
        )}
        </div>
      </AnimatedMainPage>
    </ErrorBoundary>
  );
});


DBSyncUtility.displayName = 'DBSyncUtility';

export default DBSyncUtility;
