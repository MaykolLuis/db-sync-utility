'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/custom-button';
import { SectionHeader } from '@/components/section-header';
import { useTargetLocationsStore } from '@/lib/stores/use-target-locations-store';
import { useFileOperations } from '@/hooks/use-file-operations';
import { useTargetLocationsAutoSave } from '@/hooks/use-auto-save';
import { TargetLocation } from '@/app/types';
import { 
  Plus, 
  Save, 
  Trash2, 
  FolderOpen,
  Check,
  CheckCircle2,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  AlertCircle,
  FileWarning,
  Computer,
  ChevronDown,
  ChevronRight,
  X,
  ExternalLink,
  Edit,
  Folder
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { electronUtils } from '@/lib/electron-utils';
import path from 'path';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// Custom tooltip component
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip = ({ children, content, side = 'top' }: TooltipProps) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>
      <div className="inline-flex items-center">{children}</div>
    </TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content 
        side={side}
        sideOffset={4}
        className="z-50 max-w-[300px] rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
      >
        <div className="break-words whitespace-normal">
          {content}
        </div>
        <TooltipPrimitive.Arrow className="fill-popover" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
);

interface TargetLocationsSectionProps {
  isUpdating: boolean;
}

export function TargetLocationsSection({ isUpdating }: TargetLocationsSectionProps) {
  const { 
    targetLocations, 
    setTargetLocations,
    addTargetLocation,
    updateTargetLocation,
    removeTargetLocation,
    toggleTargetLocationSelection,
    selectAllTargetLocations,
    loadTargetLocations,
    saveTargetLocations
  } = useTargetLocationsStore();
  
  const { browseFolder, checkFileLock } = useFileOperations();
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationPath, setNewLocationPath] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  
  // Change tracking state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalLocations, setOriginalLocations] = useState<TargetLocation[]>([]);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  
  // Auto-save integration - NOW SAFELY RE-ENABLED
  const { saveState } = useTargetLocationsAutoSave(
    hasUnsavedChanges,
    originalLocations,
    targetLocations
  );
  
  // Enhanced state for search and accessibility
  const [searchQuery, setSearchQuery] = useState('');
  const [accessStatus, setAccessStatus] = useState<{[key: string]: boolean}>({});
  const [isCheckingAccess, setIsCheckingAccess] = useState<{[key: string]: boolean}>({});
  const [expandedLocations, setExpandedLocations] = useState<{[key: string]: boolean}>({});
  const [fileDetails, setFileDetails] = useState<{[key: string]: any}>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1000;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(2)} ${units[i]}`;
  };
  
  // Check directory accessibility
  const checkDirectoryAccess = useCallback(async (locationId: string, path: string) => {
    if (!path) return;
    
    setIsCheckingAccess(prev => ({ ...prev, [locationId]: true }));
    
    try {
      const result = await electronUtils.getPathAccessDetails(path);
      setAccessStatus(prev => ({ ...prev, [locationId]: result.accessible }));
    } catch (error) {
      console.error('Error checking directory access:', error);
      setAccessStatus(prev => ({ ...prev, [locationId]: false }));
    } finally {
      setIsCheckingAccess(prev => ({ ...prev, [locationId]: false }));
    }
  }, []);
  
  // Check file details for expanded location
  const checkFileDetails = useCallback(async (locationId: string, locationPath: string) => {
    if (!locationPath) return;
    
    try {
      const dbFiles = ['configurations.mv.db', 'configurations.trace.db'];
      const fileInfo: any = {
        files: {},
        totalSize: 0,
        hasDatabase: false
      };
      
      for (const filename of dbFiles) {
        const filePath = path.join(locationPath, filename);
        try {
          const stats = await electronUtils.getFileStats(filePath);
          if (stats && stats.size > 0) {
            fileInfo.files[filename] = {
              exists: true,
              size: stats.size,
              modified: stats.modifiedAt || new Date()
            };
            fileInfo.totalSize += stats.size;
            fileInfo.hasDatabase = true;
          }
        } catch (error) {
          fileInfo.files[filename] = { exists: false };
        }
      }
      
      setFileDetails(prev => ({ ...prev, [locationId]: fileInfo }));
    } catch (error) {
      console.error('Error checking file details:', error);
    }
  }, []);
  
  // Filter locations based on search
  const filteredLocations = targetLocations.filter(location => 
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.path.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);
  
  // Auto-check accessibility on mount and when locations change
  useEffect(() => {
    if (targetLocations.length > 0) {
      targetLocations.forEach(location => {
        if (location.path) {
          checkDirectoryAccess(location.id, location.path);
        }
      });
    }
  }, [targetLocations, checkDirectoryAccess]);

  // Auto-check file locks when component becomes visible
  useEffect(() => {
    const checkAllFileLocks = async () => {
      if (targetLocations.length > 0) {
        for (const location of targetLocations) {
          if (location.path) {
            try {
              const dbFile = path.join(location.path, 'configurations.mv.db');
              const isLocked = await checkFileLock(dbFile);
              // Store lock status in a ref or state if needed for UI updates
              console.log(`File lock status for ${location.name}: ${isLocked ? 'locked' : 'unlocked'}`);
            } catch (error) {
              console.error(`Error checking lock for ${location.name}:`, error);
            }
          }
        }
      }
    };

    // Check file locks when component mounts
    checkAllFileLocks();
  }, [targetLocations, checkFileLock]);

  // Initialize original locations on first load
  useEffect(() => {
    if (originalLocations.length === 0 && targetLocations.length > 0) {
      setOriginalLocations(JSON.parse(JSON.stringify(targetLocations)));
    }
  }, [targetLocations, originalLocations.length]);

  // Handle saving all locations
  const handleSaveLocations = useCallback(async () => {
    try {
      await saveTargetLocations();
      // Reset change tracking after successful save
      setOriginalLocations(JSON.parse(JSON.stringify(targetLocations)));
      setHasUnsavedChanges(false);
      toast.success('Lokace byly uloženy');
    } catch (error) {
      toast.error('Nepodařilo se uložit lokace');
    }
  }, [saveTargetLocations, targetLocations]);

  // Track changes to detect unsaved modifications
  useEffect(() => {
    if (originalLocations.length === 0) return;
    
    const hasChanges = JSON.stringify(targetLocations) !== JSON.stringify(originalLocations);
    setHasUnsavedChanges(hasChanges);
  }, [targetLocations, originalLocations]);

  // Handle app close with unsaved changes using Electron IPC
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron) {
      // Set up IPC handlers for Electron
      window.electron.onCheckUnsavedChanges(() => {
        console.log('Checking unsaved changes:', hasUnsavedChanges);
        return hasUnsavedChanges;
      });
      
      window.electron.onSaveAndClose(async () => {
        console.log('Save and close requested');
        await handleSaveLocations();
        return true;
      });
    }
  }, [hasUnsavedChanges, handleSaveLocations]);

  // Handle browsing for a new target location
  const handleBrowseTargetFolder = async (index?: number) => {
    const selectedPath = await browseFolder();
    if (!selectedPath) return;

    if (index !== undefined) {
      // Update existing location
      const location = targetLocations[index];
      updateTargetLocation(location.id, { path: selectedPath });
      // Re-check accessibility for updated path
      checkDirectoryAccess(location.id, selectedPath);
    } else {
      // Set path for new location
      setNewLocationPath(selectedPath);
    }
  };

  // Handle adding a new location
  const handleAddLocation = async () => {
    if (!newLocationName.trim() || !newLocationPath.trim()) {
      setValidationError('Zadejte název i cestu lokace');
      return;
    }

    // Clear previous validation error
    setValidationError('');

    try {
      const newLocation = {
        id: Date.now().toString(),
        name: newLocationName.trim(),
        path: newLocationPath.trim(),
        selected: false
      };
      
      const result = addTargetLocation(newLocation);
      
      if (!result.success) {
        setValidationError(result.error || 'Nepodařilo se přidat lokaci');
        return;
      }
      
      // Check accessibility for new location
      checkDirectoryAccess(newLocation.id, newLocation.path);
      
      setNewLocationName('');
      setNewLocationPath('');
      setIsAddingLocation(false);
      setValidationError('');
      toast.success('Lokace byla přidána');
    } catch (error) {
      setValidationError('Nepodařilo se přidat lokaci');
    }
  };

  // Handle canceling add location
  const handleCancelAddLocation = () => {
    setNewLocationName('');
    setNewLocationPath('');
    setIsAddingLocation(false);
    setValidationError('');
  };

  // Handle updating a location with validation
  const handleUpdateLocation = (locationId: string, updates: Partial<TargetLocation>) => {
    const result = updateTargetLocation(locationId, updates);
    
    if (!result.success) {
      toast.error(result.error || 'Nepodařilo se aktualizovat lokaci');
      return false;
    }
    
    return true;
  };

  // Handle removing a location
  const handleRemoveLocation = async (locationId: string) => {
    try {
      await removeTargetLocation(locationId);
      // Clean up state
      setAccessStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[locationId];
        return newStatus;
      });
      setFileDetails(prev => {
        const newDetails = { ...prev };
        delete newDetails[locationId];
        return newDetails;
      });
      setExpandedLocations(prev => {
        const newExpanded = { ...prev };
        delete newExpanded[locationId];
        return newExpanded;
      });
      toast.success('Lokace byla odstraněna');
    } catch (error) {
      toast.error('Nepodařilo se odstranit lokaci');
    }
  };



  // Toggle location expansion
  const handleToggleExpansion = async (locationId: string, locationPath: string) => {
    const isExpanded = expandedLocations[locationId];
    
    setExpandedLocations(prev => ({
      ...prev,
      [locationId]: !isExpanded
    }));
    
    // Load file details when expanding
    if (!isExpanded && !fileDetails[locationId]) {
      await checkFileDetails(locationId, locationPath);
    }
  };

  // Refresh accessibility for all locations
  const handleRefreshAll = async () => {
    for (const location of targetLocations) {
      if (location.path) {
        await checkDirectoryAccess(location.id, location.path);
      }
    }
    toast.success('Stav lokací byl aktualizován');
  };

  // Toggle selection for all locations
  const handleToggleAll = (checked: boolean) => {
    selectAllTargetLocations(checked);
  };

  // Check if all locations are selected
  const areAllSelected = filteredLocations.length > 0 && 
    filteredLocations.every(location => location.selected);
    
  // Count selected locations
  const selectedCount = filteredLocations.filter(loc => loc.selected).length;

  return (
    <TooltipPrimitive.Provider>
      <Card className="flex flex-col flex-1 min-h-0">
      <SectionHeader
        title="Cílové lokace"
        description="Spravujte cílové složky pro synchronizaci"
        variant="gray"
        action={
          <div className="flex items-center gap-2">
            <Button
              className={`gap-2 text-white hover:text-white ${
                hasUnsavedChanges 
                  ? 'bg-red-500 hover:bg-red-600 border-red-500' 
                  : 'bg-gray-400 hover:bg-gray-500 border-gray-400 cursor-not-allowed'
              }`}
              onClick={handleSaveLocations}
              disabled={isUpdating || !hasUnsavedChanges}
              size="sm"
              variant="outline"
            >
              <Save className="h-4 w-4" />
              Uložit lokace
            </Button>
            {!isAddingLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingLocation(true)}
                disabled={isUpdating}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Přidat lokaci
              </Button>
            )}
          </div>
        }
      />
      <CardContent className="pt-4 flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Search and Controls */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Hledat lokace... (Ctrl+F)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isUpdating}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Obnovit
            </Button>
          </div>

          {/* Summary */}
          {filteredLocations.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-4">
                <Checkbox 
                  id="select-all"
                  checked={areAllSelected}
                  onCheckedChange={handleToggleAll}
                  disabled={isUpdating}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  Vybrat vše ({selectedCount}/{filteredLocations.length})
                </Label>
              </div>
              {searchQuery && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Zobrazeno {filteredLocations.length} z {targetLocations.length} lokací
                </div>
              )}
            </div>
          )}

          {/* Add Location Form */}
          {isAddingLocation && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <div className="flex-1 grid grid-cols-5 gap-2">
                  <div className="col-span-2">
                    <Input
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="Název lokace"
                      disabled={isUpdating}
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Input
                      value={newLocationPath}
                      onChange={(e) => setNewLocationPath(e.target.value)}
                      placeholder="Cesta k cílové složce"
                      disabled={isUpdating}
                      className="flex-1 text-sm font-mono"
                    />
                    <Tooltip content="Procházet složky">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleBrowseTargetFolder()}
                        disabled={isUpdating}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleAddLocation()}
                      disabled={isUpdating || !newLocationName || !newLocationPath}
                      className="text-green-500 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCancelAddLocation}
                      disabled={isUpdating}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Error Display */}
          {validationError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{validationError}</span>
              </div>
            </div>
          )}

          {/* Locations List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {filteredLocations.map((location, index) => (
              <DirectoryItem
                key={location.id}
                location={location}
                index={index}
                isAccessible={accessStatus[location.id] ?? false}
                isChecking={isCheckingAccess[location.id] ?? false}
                isExpanded={expandedLocations[location.id] ?? false}
                fileDetails={fileDetails[location.id]}
                onToggleSelection={() => toggleTargetLocationSelection(location.id)}
                onUpdateLocation={(updates) => handleUpdateLocation(location.id, updates)}
                onBrowseFolder={() => handleBrowseTargetFolder(index)}
                onRemoveLocation={() => handleRemoveLocation(location.id)}
                onToggleExpansion={() => handleToggleExpansion(location.id, location.path)}
                onRefreshAccess={() => checkDirectoryAccess(location.id, location.path)}
                isUpdating={isUpdating}
                formatFileSize={formatFileSize}
              />
            ))}
          </div>
        </div>
      </CardContent>
      
      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Neuložené změny
            </AlertDialogTitle>
            <AlertDialogDescription>
              Máte neuložené změny v cílových lokacích. Chcete je uložit nebo zahodit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowUnsavedChangesDialog(false);
                // Reset to original state (discard changes)
                setTargetLocations(originalLocations);
                setHasUnsavedChanges(false);
              }}
            >
              Zahodit změny
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleSaveLocations();
                setShowUnsavedChangesDialog(false);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Uložit změny
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </Card>
    </TooltipPrimitive.Provider>
  );
}

// DirectoryItem Component
interface DirectoryItemProps {
  location: TargetLocation;
  index: number;
  isAccessible: boolean;
  isChecking: boolean;
  isExpanded: boolean;
  fileDetails?: any;
  onToggleSelection: () => void;
  onUpdateLocation: (updates: Partial<TargetLocation>) => boolean;
  onBrowseFolder: () => void;
  onRemoveLocation: () => void;
  onToggleExpansion: () => void;
  onRefreshAccess: () => void;
  isUpdating: boolean;
  formatFileSize: (bytes: number) => string;
}

function DirectoryItem({
  location,
  index,
  isAccessible,
  isChecking,
  isExpanded,
  fileDetails,
  onToggleSelection,
  onUpdateLocation,
  onBrowseFolder,
  onRemoveLocation,
  onToggleExpansion,
  onRefreshAccess,
  isUpdating,
  formatFileSize
}: DirectoryItemProps) {
  const { checkFileLock } = useFileOperations();
  const [lockStatus, setLockStatus] = useState<'locked' | 'unlocked' | 'checking' | 'unknown'>('unknown');
  const [isCheckingLock, setIsCheckingLock] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(location.name);
  const [editingPath, setEditingPath] = useState(location.path);

  // Sync editing state with location changes
  useEffect(() => {
    setEditingName(location.name);
    setEditingPath(location.path);
  }, [location.name, location.path]);

  // Auto-check file lock status when component mounts or path changes
  useEffect(() => {
    const autoCheckLock = async () => {
      if (!location.path) return;
      
      setIsCheckingLock(true);
      setLockStatus('checking');
      
      try {
        const dbFile = path.join(location.path, 'configurations.mv.db');
        const isLocked = await checkFileLock(dbFile);
        setLockStatus(isLocked ? 'locked' : 'unlocked');
      } catch (error) {
        setLockStatus('unknown');
      } finally {
        setIsCheckingLock(false);
      }
    };

    // Only auto-check if we have a path and current status is unknown
    if (location.path && lockStatus === 'unknown') {
      autoCheckLock();
    }
  }, [location.path, checkFileLock, lockStatus]);

  // Check file lock status
  const handleCheckLock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!location.path) return;
    
    setIsCheckingLock(true);
    setLockStatus('checking');
    
    try {
      const dbFile = path.join(location.path, 'configurations.mv.db');
      const isLocked = await checkFileLock(dbFile);
      setLockStatus(isLocked ? 'locked' : 'unlocked');
    } catch (error) {
      setLockStatus('unknown');
    } finally {
      setIsCheckingLock(false);
    }
  };

  // Get lock status icon and color
  const getLockStatusIcon = () => {
    switch (lockStatus) {
      case 'checking':
        return { icon: RefreshCw, color: 'text-blue-500', spin: true };
      case 'locked':
        return { icon: Lock, color: 'text-red-500', spin: false };
      case 'unlocked':
        return { icon: Unlock, color: 'text-green-500', spin: false };
      default:
        return { icon: FileWarning, color: 'text-gray-400', spin: false };
    }
  };

  const lockStatusIcon = getLockStatusIcon();
  const LockIcon = lockStatusIcon.icon;

  // Handle opening folder in Windows Explorer
  const handleOpenFolder = async () => {
    if (!location.path) return;
    
    try {
      if (typeof window !== 'undefined' && window.electron) {
        await window.electron.openFolderPath(location.path);
      }
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  // Handle edit mode toggle
  const handleToggleEdit = () => {
    if (isEditing) {
      // Cancel editing - revert to original values
      setEditingName(location.name);
      setEditingPath(location.path);
    }
    setIsEditing(!isEditing);
  };

  // Handle save changes (exit edit mode)
  const handleSaveEdit = () => {
    // Only update if values have changed
    const hasChanges = editingName !== location.name || editingPath !== location.path;
    
    if (hasChanges) {
      const updates: Partial<TargetLocation> = {};
      if (editingName !== location.name) updates.name = editingName;
      if (editingPath !== location.path) updates.path = editingPath;
      
      const success = onUpdateLocation(updates);
      if (!success) {
        // Validation failed, don't exit edit mode
        return;
      }
    }
    
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-600 dark:border-gray-900 rounded-lg p-3 space-y-2">
      {/* Main Row */}
      <div className="flex items-center gap-2">
        <Checkbox
          id={`location-${location.id}`}
          checked={location.selected}
          onCheckedChange={onToggleSelection}
          disabled={isUpdating}
        />
        
        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          <Tooltip content={
            isChecking
              ? 'Kontroluji přístup...' 
              : isAccessible 
                ? 'Cesta je přístupná' 
                : 'Cesta není přístupná'
          }>
            <span className="flex items-center justify-center h-5 w-5 rounded-full">
              {isChecking ? (
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
              ) : isAccessible ? (
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
              ) : (
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></div>
              )}
            </span>
          </Tooltip>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCheckLock}
            disabled={isCheckingLock || !location.path}
          >
            <Tooltip content={
              lockStatus === 'locked' ? 'Soubor je uzamčen' :
              lockStatus === 'unlocked' ? 'Soubor není uzamčen' :
              lockStatus === 'checking' ? 'Kontrola zámku...' :
              'Neznámý stav zámku'
            }>
              <LockIcon 
                className={`h-3 w-3 ${lockStatusIcon.color} ${lockStatusIcon.spin ? 'animate-spin' : ''}`} 
              />
            </Tooltip>
          </Button>
        </div>

        {/* Location Info */}
        <div className="flex-1 grid grid-cols-5 gap-2">
          <div className="col-span-1">
            {isEditing ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Název lokace"
                disabled={isUpdating}
                className="text-xs h-8"
              />
            ) : (
              <div className="flex items-center h-8 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs">
                 <Computer className="h-4 w-4 mr-2 text-blue-500"/><span className="truncate">{location.name || 'Bez názvu'}</span>
              </div>
            )}
          </div>
          <div className="col-span-4 flex items-center gap-1">
            {isEditing ? (
              <Input
                value={editingPath}
                onChange={(e) => setEditingPath(e.target.value)}
                placeholder="Cesta k cílové složce"
                disabled={isUpdating}
                className="flex-1 text-xs font-mono h-8"
              />
            ) : (
              <div className="flex-1 flex items-center h-8 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono">
                <Folder className="h-4 w-4 mr-2 text-amber-300"/><span className="truncate">{location.path || 'Cesta není nastavena'}</span>
              </div>
            )}
            {isEditing && (
              <Tooltip content="Procházet složky">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBrowseFolder}
                  disabled={isUpdating}
                  className="h-8 w-8 p-0"
                >
                  <FolderOpen className="h-3 w-3" />
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshAccess}
            disabled={isUpdating || isChecking}
            className="h-8 w-8 p-0"
          >
            <Tooltip content="Obnovit stav přístupnosti">
              <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
            </Tooltip>
          </Button>
          
          <Tooltip content="Otevřít složku v průzkumníku">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenFolder}
              disabled={isUpdating || !location.path}
              className="h-8 w-8 p-0 text-blue-500 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Tooltip>
          
          <Tooltip content={isEditing ? "Uložit změny" : "Upravit lokaci"}>
            <Button
              variant="ghost"
              size="sm"
              onClick={isEditing ? handleSaveEdit : handleToggleEdit}
              disabled={isUpdating}
              className={`h-8 w-8 p-0 ${isEditing ? 'text-green-500 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/20'}`}
            >
              {isEditing ? <Check className="h-3 w-3" /> : <Edit className="h-3 w-3 text-orange-500" />}
            </Button>
          </Tooltip>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpansion}
            disabled={isUpdating}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? 
              <ChevronDown className="h-3 w-3" /> : 
              <ChevronRight className="h-3 w-3" />
            }
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isUpdating}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Smazat cílovou lokaci</AlertDialogTitle>
                <AlertDialogDescription>
                  Opravdu chcete smazat lokaci "{location.name}"?
                  <br />
                  <span className="text-sm text-muted-foreground font-mono">{location.path}</span>
                  <br /><br />
                  Tato akce je nevratná.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onRemoveLocation}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  Smazat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-lg p-4 space-y-4">
            {fileDetails ? (
              <>
                {/* Database Files Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b border-gray-200/50 dark:border-gray-700/50 pb-1">
                    Databázové soubory
                  </h4>
                  
                  {fileDetails.hasDatabase ? (
                    <div className="space-y-2">
                      {Object.entries(fileDetails.files).map(([filename, info]: [string, any]) => (
                        info.exists && (
                          <div key={filename} className="flex items-center justify-between p-2 bg-white/70 dark:bg-gray-800/70 rounded border">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-mono">{filename}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                              <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                                {formatFileSize(info.size)}
                              </span>
                              <span>
                                {new Date(info.modified).toLocaleString('cs-CZ')}
                              </span>
                            </div>
                          </div>
                        )
                      ))}
                      
                      {fileDetails.totalSize > 0 && (
                        <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Celková velikost databáze
                          </span>
                          <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                            {formatFileSize(fileDetails.totalSize)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">
                        Žádné databázové soubory nebyly nalezeny
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center p-4">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Načítání informací o souborech...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
