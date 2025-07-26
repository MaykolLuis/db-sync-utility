'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/custom-button';
import { useTargetLocationsStore } from '@/lib/stores/use-target-locations-store';
import { useHistoryStore } from '@/lib/stores/use-history-store';
import { useSettingsStore } from '@/lib/stores/use-settings-store';
import { useFileOperations } from '@/hooks/use-file-operations';
import { useDatabaseFileChecker } from '@/hooks/use-database-file-checker';
import { useOfflineSupport } from '@/hooks/use-offline-support';
import { useCopyOperationAutoSave } from '@/hooks/use-auto-save';
import { toast } from 'sonner';
import { 
  Copy, 
  AlertCircle,
  CheckCircle,
  Loader2,
  FileCheck,
  Computer,
  Folder,
  FolderOpen,
  Check
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { getDirectorySize, formatFileSize } from '@/lib/utils/file-size-utils';
import path from 'path';

interface CopyOperationSectionProps {
  sourcePath: string;
  isUpdating: boolean;
  setIsUpdating: (value: boolean) => void;
  onCopyComplete?: () => void;
}

export function CopyOperationSection({
  sourcePath,
  isUpdating,
  setIsUpdating,
  onCopyComplete
}: CopyOperationSectionProps) {
  const { targetLocations, updateTargetLocationSize } = useTargetLocationsStore();
  const { createHistoryEntryWithVersion, updateHistoryEntry, saveHistoryEntries } = useHistoryStore();
  const { settings } = useSettingsStore();
  const { copyFile, createBackup, copyLoading, checkFileExists, browseFolder } = useFileOperations();
  const { fileStatus, lockStatus, checkFilesAndLocks } = useDatabaseFileChecker();
  const {
    networkStatus,
    isOnline,
    isNetworkDriveAccessible,
    checkPathWithRetry,
    copyFilesWithNetworkRetry,
    checkNetworkDrives,
    handleNetworkError,
    showOfflineNotification
  } = useOfflineSupport();
  
  // Local state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [copyProgress, setCopyProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const [description, setDescription] = useState('');
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [targetAccessStatus, setTargetAccessStatus] = useState<{ [key: string]: boolean }>({});
  const [completedTargets, setCompletedTargets] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copyStartTime, setCopyStartTime] = useState<number>(0);
  const [copyResults, setCopyResults] = useState<Array<{
    targetId: string;
    targetPath: string;
    targetName: string;
    success: boolean;
    error?: string;
    fileSize?: number;
    duration?: number;
  }>>([]);
  
  // Get selected target locations
  const selectedTargets = targetLocations.filter(loc => loc.selected);
  
  // Auto-save copy operation state - NOW SAFELY RE-ENABLED
  useCopyOperationAutoSave(
    isUpdating,
    sourcePath,
    selectedTargets,
    copyProgress,
    currentOperation,
    copyStartTime
  );
  
  // Check files when source path changes
  useEffect(() => {
    if (sourcePath) {
      checkFilesAndLocks(sourcePath);
    }
  }, [sourcePath, checkFilesAndLocks]);

  // Smooth progress animation
  useEffect(() => {
    if (copyProgress !== animatedProgress) {
      setIsAnimating(true);
      const duration = 800; // Animation duration in ms
      const startProgress = animatedProgress;
      const targetProgress = copyProgress;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedProgress = easeOutCubic(progress);
        
        const currentValue = startProgress + (targetProgress - startProgress) * easedProgress;
        setAnimatedProgress(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [copyProgress, animatedProgress]);
  
  // Calculate directory sizes for target locations
  useEffect(() => {
    const calculateSizes = async () => {
      for (const target of targetLocations) {
        if (target.path && !target.sizeFormatted) {
          try {
            const sizeResult = await getDirectorySize(target.path);
            if (sizeResult.success && sizeResult.size !== undefined) {
              const formattedSize = formatFileSize(sizeResult.size);
              updateTargetLocationSize(target.id, sizeResult.size, formattedSize);
            }
          } catch (error) {
            console.error(`Error calculating size for ${target.path}:`, error);
          }
        }
      }
    };
    
    if (targetLocations.length > 0) {
      calculateSizes();
    }
  }, [targetLocations, updateTargetLocationSize]);
  
  // Check target directory accessibility
  const checkTargetAccessibility = useCallback(async (targets: typeof targetLocations) => {
    const statusMap: { [key: string]: boolean } = {};
    
    for (const target of targets) {
      try {
        const result = await window.electron?.checkPathAccess?.(target.path);
        statusMap[target.id] = result?.accessible ?? false;
      } catch (error) {
        console.error(`Error checking access for ${target.path}:`, error);
        statusMap[target.id] = false;
      }
    }
    
    setTargetAccessStatus(statusMap);
  }, []);

  // Check accessibility when dialog opens
  useEffect(() => {
    if (showConfirmDialog && targetLocations.filter(location => location.selected).length > 0) {
      checkTargetAccessibility(targetLocations.filter(location => location.selected));
    }
  }, [showConfirmDialog, targetLocations, checkTargetAccessibility]);



  // Helper function to get status dot color and tooltip
  const getStatusInfo = (targetId: string) => {
    const isAccessible = targetAccessStatus[targetId];
    if (isAccessible === undefined) {
      return {
        color: 'bg-gray-400',
        tooltip: 'Kontrola přístupnosti...'
      };
    }
    return isAccessible 
      ? {
          color: 'bg-green-500',
          tooltip: 'Složka je přístupná'
        }
      : {
          color: 'bg-red-500', 
          tooltip: 'Složka není přístupná nebo neexistuje'
        };
  };
  
  // Check if copy is possible
  const canCopy = 
    sourcePath && 
    selectedTargets.length > 0 && 
    fileStatus === 'all' && 
    lockStatus === 'unlocked' &&
    !isUpdating;
  
  // Handle copy button click
  const handleCopyClick = () => {
    if (settings.showConfirmationBeforeCopy) {
      setShowConfirmDialog(true);
    } else {
      startCopyOperation();
    }
  };
  
  // Start the copy operation
  const startCopyOperation = async () => {
    setShowConfirmDialog(false);
    setIsUpdating(true);
    setCopyProgress(0);
    setCopyResults([]);
    setCurrentOperation('Příprava kopírování...');
    
    try {
      // Create a new history entry
      const historyEntry = await createHistoryEntryWithVersion({
        description: description || `Kopírování ${new Date().toLocaleDateString('cs-CZ')}`,
        sourcePath,
        targetLocations: selectedTargets.map(target => ({
          id: target.id,
          name: target.name,
          path: target.path
        })),
        timestamp: Date.now(),
        copyResults: []
      });
      
      // Database filenames to copy
      const dbFiles = ['configurations.mv.db', 'configurations.trace.db'];
      const totalOperations = selectedTargets.length; // One operation per target
      let completedOperations = 0;
      const results = [];
      
      // Reset animation states
      setCompletedTargets([]);
      setCurrentTargetIndex(0);
      
      // Process each target location with enhanced visual feedback
      for (let i = 0; i < selectedTargets.length; i++) {
        const target = selectedTargets[i];
        setCurrentTargetIndex(i);
        
        // Phase 1: Preparing target
        setCurrentOperation(`Příprava cíle: ${target.name}`);
        await new Promise(resolve => setTimeout(resolve, 300)); // Visual delay
        
        // Phase 2: Create backups if enabled
        if (settings.createBackupBeforeOverwrite) {
          setCurrentOperation(`Vytváření zálohy pro: ${target.name}`);
          await new Promise(resolve => setTimeout(resolve, 400)); // Visual delay
          
          try {
            for (const dbFile of dbFiles) {
              const targetFilePath = path.join(target.path, dbFile);
              // Only create backup if the target file exists
              const fileExists = await checkFileExists(targetFilePath);
              if (fileExists) {
                const backupPath = await createBackup(targetFilePath);
                if (backupPath) {
                  console.log(`Backup created: ${backupPath}`);
                } else {
                  console.warn(`Failed to create backup for: ${targetFilePath}`);
                }
              }
            }
          } catch (error) {
            console.error('Error during backup creation:', error);
            // Continue with copy operation even if backup fails
          }
          
          await new Promise(resolve => setTimeout(resolve, 200)); // Visual delay
        }
        
        // Phase 3: Copy database files
        setCurrentOperation(`Kopírování databázových souborů do ${target.name}`);
        // Phase 3: Copy files with network retry support
        setCurrentOperation(`Kopírování souborů do: ${target.name}`);
        const startTime = Date.now();
        
        // Check network connectivity before copying
        const pathAccessResult = await checkPathWithRetry(target.path);
        if (!pathAccessResult.accessible && pathAccessResult.isNetworkDrive) {
          showOfflineNotification(
            `Síťová jednotka ${target.name} není dostupná`,
            'warning'
          );
        }
        
        let success = false;
        let copyResult = null;
        let errorMessage = 'Nepodařilo se zkopírovat soubory';
        
        try {
          // Use enhanced copy with network retry
          copyResult = await copyFilesWithNetworkRetry(
            sourcePath,
            target.path,
            ['*.mv.db', '*.trace.db'],
            {
              createDirectoryIfMissing: false, // First try without creating directory
              maxRetries: isNetworkDriveAccessible ? 3 : 1, // More retries for network drives
              retryDelay: 2000,
              exponentialBackoff: true
            }
          );
          
          // Handle directory creation confirmation
          if (!copyResult.success && copyResult.error === 'DIRECTORY_NOT_EXISTS') {
            const shouldCreateDirectory = await new Promise<boolean>((resolve) => {
              const confirmed = window.confirm(
                `Cílová složka "${target.path}" neexistuje.\n\nChcete ji vytvořit a pokračovat v kopírování?`
              );
              resolve(confirmed);
            });
            
            if (shouldCreateDirectory) {
              // User confirmed, retry with directory creation enabled
              copyResult = await copyFilesWithNetworkRetry(
                sourcePath,
                target.path,
                ['*.mv.db', '*.trace.db'],
                {
                  createDirectoryIfMissing: true,
                  maxRetries: isNetworkDriveAccessible ? 3 : 1,
                  retryDelay: 2000,
                  exponentialBackoff: true
                }
              );
              success = copyResult.success;
              if (!success && copyResult.error) {
                errorMessage = copyResult.error;
              }
            } else {
              // User declined, mark as failed
              success = false;
              errorMessage = 'Kopírování zrušeno uživatelem - cílová složka nebyla vytvořena';
            }
          } else {
            success = copyResult.success;
            if (!success && copyResult.error) {
              errorMessage = copyResult.error;
            }
          }
          
          // Show retry information if applicable
          if (copyResult.retryInfo && copyResult.retryInfo.attempts > 1) {
            const retryMessage = success 
              ? `Kopírování úspěšné po ${copyResult.retryInfo.attempts} pokusech`
              : `Kopírování selhalo po ${copyResult.retryInfo.attempts} pokusech`;
            
            toast.info(retryMessage, {
              description: copyResult.retryInfo.isTargetNetwork 
                ? 'Byla detekována síťová jednotka'
                : undefined
            });
          }
          
          if (!success && copyResult.error) {
            console.error(`Copy failed for ${target.name}:`, copyResult.error);
            // Handle network errors with user-friendly messages
            if (copyResult.retryInfo?.isTargetNetwork) {
              handleNetworkError(copyResult, target.path);
            }
          }
        } catch (error) {
          console.error(`Error copying to ${target.name}:`, error);
          success = false;
          errorMessage = error instanceof Error ? error.message : 'Neznámá chyba';
          
          // Handle network errors
          if (pathAccessResult.isNetworkDrive) {
            handleNetworkError(error, target.path);
          }
        }
        
        const endTime = Date.now();
        const calculatedDuration = endTime - startTime;
        console.log(`Copy operation timing for ${target.name}:`);
        console.log('- Start time:', startTime);
        console.log('- End time:', endTime);
        console.log('- Duration (ms):', calculatedDuration);
        console.log('- Duration type:', typeof calculatedDuration);
        
        // Phase 4: Verification
        if (success) {
          setCurrentOperation(`Ověřování kopírování pro: ${target.name}`);
          await new Promise(resolve => setTimeout(resolve, 400)); // Visual delay
          setCompletedTargets(prev => [...prev, target.id]);
        } else {
          setCurrentOperation(`Chyba při kopírování do: ${target.name}`);
          await new Promise(resolve => setTimeout(resolve, 600)); // Visual delay for error
        }
        
        const resultEntry = {
          targetId: target.id,
          targetPath: target.path,
          targetName: target.name,
          success,
          error: success ? undefined : errorMessage,
          duration: calculatedDuration
        };
        
        console.log('Storing result entry:', resultEntry);
        results.push(resultEntry);
        
        // Update progress with smooth animation
        completedOperations++;
        const newProgress = Math.round((completedOperations / selectedTargets.length) * 100);
        setCopyProgress(newProgress);
        
        // Small delay between targets for better UX
        if (i < selectedTargets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Update the history entry with results
      setCopyResults(results);
      
      // Update the history entry with the actual copy results
      updateHistoryEntry(historyEntry.id, {
        copyResults: results
      });
      
      // Save the updated history entry to file system
      await saveHistoryEntries();
      
      // Show success or error toast
      const allSuccess = results.every(r => r.success);
      // Final completion message with animation
      setCurrentOperation('Kopírování dokončeno!');
      setCopyProgress(100);
      
      // Wait for final animation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show completion toast
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (failureCount === 0) {
        toast.success(`Všechny soubory byly úspěšně zkopírovány do ${successCount} cílů!`);
      } else {
        toast.warning(`Kopírování dokončeno: ${successCount} úspěšných, ${failureCount} neúspěšných`);
      }
      
      // Store results and call completion callback
      setCopyResults(results);
      onCopyComplete?.();
      
      // Reset animation states after a delay
      setTimeout(() => {
        setCopyProgress(0);
        setAnimatedProgress(0);
        setCurrentOperation('');
        setCompletedTargets([]);
        setCurrentTargetIndex(0);
      }, 2000);
      
    } catch (error) {
      console.error('Copy operation failed:', error);
      toast.error('Chyba při kopírování souborů');
      
      // Reset states on error
      setCopyProgress(0);
      setAnimatedProgress(0);
      setCurrentOperation('');
      setCompletedTargets([]);
      setCurrentTargetIndex(0);
    } finally {
      setIsUpdating(false);
      setShowConfirmDialog(false);
    }
  };
  
  return (
    <>
      <Card className="flex flex-col flex-1 min-h-0">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1e293b] to-[#0f172a] via-transparent to-blue-500/10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold m-0">
                  Kopírování databázových souborů
                </h3>
              
              </div>
              <div className="text-right">
                <div className="text-xs opacity-75">Připraveno k operaci</div>
                <div className="text-sm font-medium">{selectedTargets.length} cílů vybráno</div>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 flex-1 overflow-y-auto">
          {isUpdating ? (
            /* Enhanced Progress Display */
            <div className="space-y-6">
              {/* Main Status Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Kopírování v průběhu</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{currentOperation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{copyProgress}%</div>
                    <div className="text-xs text-blue-500 dark:text-blue-400">dokončeno</div>
                  </div>
                </div>
                
                {/* Enhanced Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                    <span>Průběh operace</span>
                    <span>{copyProgress}/100</span>
                  </div>
                  <div className="relative h-4 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${copyProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Target Progress */}
              {selectedTargets.length > 1 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Průběh podle cílů</h5>
                  <div className="space-y-2">
                    {selectedTargets.map((target, index) => (
                      <div key={target.id} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className={`w-3 h-3 rounded-full ${
                          completedTargets.includes(target.id) 
                            ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                            : index === currentTargetIndex 
                            ? 'bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}></div>
                        <Computer className="h-4 w-4 text-blue-500" />
                        <span className={`text-sm font-medium ${
                          completedTargets.includes(target.id) 
                            ? 'text-green-600 dark:text-green-400' 
                            : index === currentTargetIndex 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {target.name}
                        </span>
                        {completedTargets.includes(target.id) && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Operation Overview Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Source Status Card */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100">Zdrojová složka</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300">Databázové soubory</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium break-all">
                      {sourcePath || 'Není vybrána'}
                    </p>
                    <div className="flex items-center space-x-2">
                      {fileStatus === 'all' && lockStatus === 'unlocked' ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Připraveno</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                            {fileStatus !== 'all' ? 'Chybí soubory' : 'Zamčeno'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Targets Status Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                      <Computer className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Cílové lokace</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Vybrané destinace</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full text-left p-2 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70 rounded-lg transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              {selectedTargets.length > 0 ? `${selectedTargets.length} lokací vybráno` : 'Žádné lokace'}
                            </span>
                            <div className="text-xs text-blue-600 dark:text-blue-400">Zobrazit ▼</div>
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[700px] p-0">
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-t-lg">
                          <h4 className="font-semibold text-lg">Vybrané cílové lokace</h4>
                          <p className="text-sm opacity-90">Přehled všech destinací pro kopírování</p>
                        </div>
                        <div className="p-4">
                          {selectedTargets.length > 0 ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                              {selectedTargets.map((target, index) => (
                                <div key={target.id} className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <Computer className="h-4 w-4 text-blue-500" />
                                          <span className="font-semibold text-slate-900 dark:text-slate-100">{target.name}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <Folder className="h-3 w-3 text-amber-500" />
                                          <span className="text-sm text-slate-600 dark:text-slate-400">{target.path}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                          {target.sizeFormatted || 'Počítání...'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-3 p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <AlertCircle className="h-6 w-6 text-gray-400" />
                              <p className="text-gray-500 dark:text-gray-400">Žádné cílové lokace nejsou vybrány</p>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Operation Status Card */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <FileCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900 dark:text-green-100">Stav operace</h4>
                      <p className="text-xs text-green-700 dark:text-green-300">Připravenost systému</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      {fileStatus === 'all' && lockStatus === 'unlocked' ? (
                        <>
                          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-sm text-green-700 dark:text-green-300 font-medium">Připraveno ke kopírování</span>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                          <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                            {fileStatus !== 'all' ? 'Chybí zdrojové soubory' : 'Soubory jsou zamčené'}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Network: {isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Description Input */}
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                 
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">Popis aktualizace</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Přidejte popis pro lepší sledování v historii</p>
                  </div>
                </div>
                <Textarea
                  placeholder="Např. Týdenní aktualizace konfigurace s novými parametry produktu, oprava kritických chyb v modulu plateb, nebo implementace nových funkcí pro správu uživatelů..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={isUpdating}
                  className="resize-none border-slate-300 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-purple-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Zadejte stručný popis této aktualizace pro lepší identifikaci v historii
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!canCopy || copyLoading}
                className="bfi-button relative overflow-hidden"
                data-copy-button
              >
                {copyLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2">
                      🔄
                    </div>
                    Kopírování...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Zkopírovat soubory
                  </>
                )}
              </Button>
            </CardFooter>
        </Card>
        
        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Potvrdit kopírování</DialogTitle>
              <DialogDescription>
                Chystáte se zkopírovat databázové soubory do {selectedTargets.length} cílových složek.
                Tato akce přepíše existující soubory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h4 className="font-medium">Zdrojová složka</h4>
                <p className="text-sm text-gray-500 break-all">{sourcePath}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Cílové složky</h4>
                <div className="max-h-60 overflow-y-auto">
                  {selectedTargets.map(target => {
                    const statusInfo = getStatusInfo(target.id);
                    return (
                      <div key={target.id} className="grid grid-cols-12 gap-2 items-center py-2 text-sm border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                        {/* Column 1: Computer icon + target name */}
                        <div className="col-span-4 flex items-center space-x-2">
                          <Computer className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <span className="text-gray-900 dark:text-gray-100 font-medium truncate" title={target.name}>
                            {target.name}
                          </span>
                        </div>
                        
                        {/* Column 2: Folder icon + target path */}
                        <div className="col-span-7 flex items-center space-x-2">
                          <Folder className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          <span className="text-gray-500 truncate" title={target.path}>
                            {target.path}
                          </span>
                        </div>
                        
                        {/* Column 3: Status indicator dot with tooltip */}
                        <div className="col-span-1 flex justify-end mr-4">
                          <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {description && (
                <div className="space-y-2">
                  <h4 className="font-medium">Popis aktualizace</h4>
                  <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded border">
                    {description}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={copyLoading}
              >
                Zrušit
              </Button>
              <Button
                onClick={startCopyOperation}
                disabled={copyLoading}
                className="bfi-button"
              >
                {copyLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2">
                      🔄
                    </div>
                    Kopírování...
                  </>
                ) : (
                  'Potvrdit a zkopírovat'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Enhanced Progress Display */}
        {copyLoading && (
          <Card className="mt-4 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <CardContent className="pt-4">
              <div className="space-y-6">
                {/* Main Progress Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center">
                      <div className="animate-pulse h-3 w-3 bg-blue-500 rounded-full mr-3"></div>
                      Kopírování databázových souborů
                    </h3>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {Math.round(animatedProgress)}%
                    </span>
                  </div>
                  
                  {/* Animated Progress Bar */}
                  <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${animatedProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                {/* Current Operation */}
                <div className="flex items-center space-x-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border">
                  <div className="animate-spin h-5 w-5 text-blue-500">
                    ⚙️
                  </div>
                  <span className="text-sm font-medium">{currentOperation}</span>
                </div>
                
                {/* Target Progress Indicators */}
                {selectedTargets.length > 1 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Průběh podle cílů:</h4>
                    <div className="grid gap-2">
                      {selectedTargets.map((target, index) => (
                        <div key={target.id} className="flex items-center space-x-3 p-2 rounded border">
                          <div className={`h-2 w-2 rounded-full ${
                            completedTargets.includes(target.id) 
                              ? 'bg-green-500 animate-pulse' 
                              : index === currentTargetIndex 
                              ? 'bg-blue-500 animate-pulse' 
                              : 'bg-gray-300'
                          }`}></div>
                          <span className={`text-sm ${
                            completedTargets.includes(target.id) 
                              ? 'text-green-600 font-medium' 
                              : index === currentTargetIndex 
                              ? 'text-blue-600 font-medium' 
                              : 'text-gray-500'
                          }`}>
                            {target.name}
                          </span>
                          {completedTargets.includes(target.id) && (
                            <span className="text-xs text-green-600">✅</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  }
