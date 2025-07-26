'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/custom-button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SectionHeader } from '@/components/section-header';
import { useFileOperations } from '@/hooks/use-file-operations';
import { useDatabaseFileChecker } from '@/hooks/use-database-file-checker';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { 
  FolderOpen, 
  X, 
  Search, 
  Lock, 
  Unlock, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Check,
  AlertCircle,
  FileText,
  Clock,
  HardDrive,
  FileCheck,
  FileX,
  ChevronDown,
  ChevronUp,
  File,
  Database,
  FileArchive,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileJson,
  History,
  Eraser
} from 'lucide-react';

type FileInfo = {
  name: string;
  size: string;
  lastModified: string;
};

// Custom tooltip component
type TooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
};

const Tooltip = ({ children, content, side = 'top' }: TooltipProps) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>
      <div className="inline-flex items-center">{children}</div>
    </TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content 
        side={side}
        sideOffset={4}
        className="z-50 max-w-[300px] rounded-md border bg-gray-900/95 backdrop-blur-xl border-gray-700/50 shadow-2xl px-3 py-1.5 text-sm text-gray-200 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
      >
        <div className="break-words whitespace-normal">
          {content}
        </div>
        <TooltipPrimitive.Arrow className="fill-gray-900" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
);

type FileValidationResult = {
  isValid: boolean;
  message: string;
  files: FileInfo[];
  missingFiles: string[];
  totalSize: string;
  fileCount: number;
  lastChecked?: Date;
};

interface FileDetail {
  size: number;
  mtime: Date;
  birthtime: Date;
  atime: Date;
  ctime: Date;
  permissions: {
    readable: string;
    writable: string;
    executable: string;
  };
}

interface SourceDirectorySectionProps {
  sourcePath: string;
  isUpdating: boolean;
  onSourcePathChange: (path: string, isValid: boolean) => void;
  onBrowseFolder: () => Promise<string | undefined>;
  onClear: () => void;
  hasSelectedPreset: boolean;
}

export default function SourceDirectorySection({
  sourcePath,
  isUpdating,
  onSourcePathChange,
  onBrowseFolder,
  onClear,
  hasSelectedPreset
}: SourceDirectorySectionProps) {
  const [validation, setValidation] = useState<FileValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<Record<string, FileDetail>>({});
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<Record<string, {text: string, color: string}>>({});
  const [isDirectoryAccessible, setIsDirectoryAccessible] = useState<boolean | null>(null);
  const [directoryAccessError, setDirectoryAccessError] = useState<string | null>(null);
  const MAX_VISIBLE_FILES = 3; // Show only 3 files by default

  const { isLoading: isFileOperationLoading } = useFileOperations();
  const { 
    fileStatus, 
    lockStatus, 
    fileExistence, 
    checkFilesAndLocks, 
    isChecking 
  } = useDatabaseFileChecker();

  // Track the last checked path to prevent unnecessary checks
  const lastCheckedPath = React.useRef<string>('');
  
  // Memoize validateDirectory to prevent infinite loops
  const validateDirectory = React.useCallback(async (path: string, silent = false) => {
    if (!path) {
      if (!silent) {
        setValidation({
          isValid: false,
          message: 'Není vybrána žádná cesta',
          files: [],
          missingFiles: ['configurations.mv.db', 'configurations.trace.db'],
          totalSize: '0 B',
          fileCount: 0
        });
      }
      return false;
    }
    
    const now = new Date();
    
    setIsValidating(true);
    
    try {
      const result = await window.electron.validateSourceDirectory(path);
      
      // Format file sizes and dates and get statuses
      const filesWithDetails = await Promise.all(
        result.files.map(async (file: string) => {
          const filePath = `${path}/${file}`;
          const stats = await window.electron.getFileStats(filePath);
          
          const lastModified = new Date(stats.mtime);
          const isToday = lastModified.toDateString() === now.toDateString();
          
          // Set status for this file
          const status = isToday
            ? { 
                text: `Aktualizováno dnes v ${lastModified.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, 
                color: 'bg-blue-600 text-white border border-blue-700' 
              }
            : { 
                text: `Aktualizováno ${lastModified.toLocaleDateString()}`, 
                color: 'bg-amber-700 text-white border border-amber-700' 
              };
          
          setFileStatuses(prev => ({
            ...prev,
            [file as string]: status
          }));
          
          const fileSize = typeof stats.size === 'number' ? stats.size : 0;
          
          return {
            name: file,
            size: formatFileSize(fileSize),
            lastModified: lastModified.toLocaleString(),
          };
        })
      );

      // Calculate total size
      let totalSizeBytes = 0;
      const filesWithDetailsAndSizes = await Promise.all(
        result.files.map(async (file: string) => {
          const filePath = `${path}/${file}`;
          const stats = await window.electron.getFileStats(filePath);
          totalSizeBytes += stats.size;
          
          const lastModified = new Date(stats.mtime);
          
          return {
            name: file,
            size: formatFileSize(stats.size),
            lastModified: lastModified.toLocaleString(),
          };
        })
      );

      const validationResult = {
        ...result,
        files: filesWithDetailsAndSizes,
        totalSize: formatFileSize(totalSizeBytes),
        fileCount: filesWithDetailsAndSizes.length,
        lastChecked: now
      };

      if (!silent || !validation) {
        setValidation(validationResult);
      }
      onSourcePathChange(path, validationResult.isValid);
      return validationResult.isValid;
    } catch (error) {
      console.error('Error validating directory:', error);
      const errorState = {
        isValid: false,
        message: 'Chyba při ověřování adresáře',
        files: [],
        missingFiles: ['configurations.mv.db', 'configurations.trace.db'],
        totalSize: '0 B',
        fileCount: 0
      };
      if (!silent || !validation) {
        setValidation(errorState);
      }
      onSourcePathChange(path, false);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [onSourcePathChange]); // Add proper dependencies for useCallback

  // Check files when source path changes
  React.useEffect(() => {
    if (sourcePath && sourcePath !== lastCheckedPath.current) {
      lastCheckedPath.current = sourcePath;
      checkFilesAndLocks(sourcePath);
      validateDirectory(sourcePath);
    } else if (!sourcePath) {
      // Clear validation state when source path is cleared
      lastCheckedPath.current = '';
      setValidation(null);
      setExpandedFile(null);
      setFileDetails({});
      setFileStatuses({});
      setShowAllFiles(false);
      setIsValidating(false);
    }
  }, [sourcePath, checkFilesAndLocks, validateDirectory]); // Proper dependencies

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1000;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    const formattedValue = value.toFixed(2);
    
    return `${formattedValue} ${units[i]}`;
  };

  // Helper function to format date to compact string
  const formatDateCompact = (date: Date): string => {
    const now = new Date();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const fileDate = new Date(date);
    fileDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const timeString = date.toLocaleTimeString('cs-CZ', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
    
    if (fileDate.getTime() === today.getTime()) {
      return `Dnes v ${timeString}`;
    } else if (fileDate.getTime() === yesterday.getTime()) {
      return `Včera v ${timeString}`;
    } else if (diffDays < 7) {
      return `Před ${diffDays} dny`;
    } else if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('cs-CZ', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('cs-CZ', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
      });
    }
  };

  const handleBrowseFolder = async () => {
    const path = await onBrowseFolder();
    if (path) {
      validateDirectory(path);
    }
  };

  const getFileStatus = (fileName: string) => {
    return fileStatuses[fileName] || null;
  };

  const expandFile = async (fileName: string) => {
    if (expandedFile === fileName) {
      setExpandedFile(null);
      return;
    }

    setExpandedFile(fileName);
    
    if (!fileDetails[fileName]) {
      try {
        const filePath = `${sourcePath}/${fileName}`;
        const stats = await window.electron.getFileStats(filePath);
        
        setFileDetails(prev => ({
          ...prev,
          [fileName]: {
            size: stats.size,
            mtime: new Date(stats.mtime),
            birthtime: new Date(stats.birthtime),
            atime: new Date(stats.atime),
            ctime: new Date(stats.ctime),
            permissions: {
              readable: stats.permissions?.readable || 'Unknown',
              writable: stats.permissions?.writable || 'Unknown',
              executable: stats.permissions?.executable || 'Unknown'
            },
            readable: stats.permissions?.readable || 'Unknown',
            writable: stats.permissions?.writable || 'Unknown',
            executable: stats.permissions?.executable || 'Unknown'
          }
        }));
      } catch (error) {
        console.error('Error getting file details:', error);
      }
    }
  };

  // Get status indicator color
  const getStatusColor = () => {
    switch (fileStatus) {
      case 'all': return 'text-green-500';
      case 'partial': return 'text-amber-500';
      case 'none': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  // Get lock status icon
  const getLockStatusIcon = () => {
    if (isChecking) {
      return <Search className="h-4 w-4 animate-pulse" />;
    }

    switch (lockStatus) {
      case 'locked':
        return <Lock className="h-4 w-4 text-red-500" />;
      case 'unlocked':
        return <Unlock className="h-4 w-4 text-green-500" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  // Get lock status tooltip text
  const getLockStatusTooltip = () => {
    if (isChecking) {
      return 'Kontroluji stav souborů...';
    }

    switch (lockStatus) {
      case 'locked':
        return 'Soubory jsou zamčené jiným procesem';
      case 'unlocked':
        return 'Soubory jsou dostupné pro kopírování';
      default:
        return 'Klikněte pro kontrolu zámků souborů';
    }
  };

  return (
    <TooltipPrimitive.Provider>
      <Card className="flex flex-col flex-1 min-h-0">
      <SectionHeader
        title="Zdrojová složka"
        description="Vyberte složku obsahující databázové soubory"
        variant="gray"
      />
      <CardContent className="pt-4 flex-1 flex flex-col overflow-y-auto">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Input
              placeholder="Vyberte zdrojovou složku..."
              value={sourcePath}
              onChange={(e) => onSourcePathChange(e.target.value, false)}
              className="pr-8"
              disabled={isUpdating}
            />
            {sourcePath && (
              <button
                onClick={onClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isUpdating}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            onClick={handleBrowseFolder}
            disabled={isUpdating || isFileOperationLoading}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Procházet
          </Button>

          {sourcePath && (
            <Tooltip
              content={
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-200">Stav databázových souborů</h4>
                  <ul className="space-y-1">
                    {Object.entries(fileExistence).map(([filename, exists]) => (
                      <li key={filename} className="flex items-center justify-between">
                        <span className={!exists ? 'text-red-400 font-bold' : 'text-gray-300'}>
                          {filename}
                        </span>
                        {exists ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-400">{getLockStatusTooltip()}</p>
                </div>
              }
              side="bottom"
            >
              <Button
                variant="outline"
                size="icon"
                className={`${getStatusColor()} border-gray-300`}
                onClick={() => checkFilesAndLocks(sourcePath)}
                disabled={isChecking || !sourcePath}
              >
                {getLockStatusIcon()}
              </Button>
            </Tooltip>
          )}
        </div>

        {/* Validation Results */}
        {(isValidating || validation) && (
          <div className="mt-4 space-y-4">
            {isValidating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Ověřuji adresář...
              </div>
            )}

            {validation && (
              <div className={`rounded-xl border p-6 backdrop-blur-md shadow-xl ${
                validation.isValid 
                  ? 'border-green-400/30' 
                  : 'border-red-400/30'
              }`}>
                <div className="flex items-start gap-3">
                  {validation.isValid ? (
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      validation.isValid 
                        ? 'text-green-800 dark:text-green-200' 
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {validation.message}
                    </p>
                    
                    {validation.isValid && validation.files.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Nalezené soubory ({validation.fileCount})
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Celková velikost: {validation.totalSize}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {(showAllFiles ? validation.files : validation.files.slice(0, MAX_VISIBLE_FILES)).map((file, index) => (
                            <div key={index} className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/30 cursor-pointer hover:bg-gray-900/40 transition-all duration-200" onClick={() => expandFile(file.name)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Database className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm font-medium truncate">{file.name}</span>
                                      <Tooltip
                                        content={expandedFile === file.name ? 'Skrýt detaily souboru' : 'Zobrazit detaily souboru'}
                                        side="top"
                                      >
                                        <div
                                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded cursor-pointer"
                                        >
                                          {expandedFile === file.name ? (
                                            <ChevronUp className="h-3 w-3" />
                                          ) : (
                                            <ChevronDown className="h-3 w-3" />
                                          )}
                                        </div>
                                      </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                      <span>{file.size}</span>
                                      <span>•</span>
                                      <span>{file.lastModified || 'Neznámé'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 mr-4">
                                  <Tooltip
                                    content={
                                      isChecking 
                                        ? 'Kontroluji stav zámku souboru...'
                                        : lockStatus === 'locked' 
                                        ? 'Soubor je uzamčen - používá ho jiná aplikace'
                                        : lockStatus === 'unlocked'
                                        ? 'Soubor je volný - lze bezpečně kopírovat'
                                        : 'Klikněte pro kontrolu zámku souboru'
                                    }
                                    side="top"
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        checkFilesAndLocks(sourcePath);
                                      }}
                                      disabled={isChecking}
                                    >
                                      {isChecking ? (
                                        <Search className="h-3 w-3 animate-pulse" />
                                      ) : lockStatus === 'locked' ? (
                                        <Lock className="h-3 w-3 text-red-500" />
                                      ) : lockStatus === 'unlocked' ? (
                                        <Unlock className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </Tooltip>
                                </div>
                                {getFileStatus(file.name) && (
                                  <Tooltip
                                    content={
                                      getFileStatus(file.name)?.text === 'Nový' ? 'Soubor byl nedávno vytvořen nebo upraven' :
                                      getFileStatus(file.name)?.text === 'Starý' ? 'Soubor nebyl upraven delší dobu' :
                                      getFileStatus(file.name)?.text === 'Velmi starý' ? 'Soubor je velmi starý a možná vyžaduje pozornost' :
                                      `Status souboru: ${getFileStatus(file.name)?.text}`
                                    }
                                    side="top"
                                  >
                                    <span className={`text-[10px] px-2 py-0.5 rounded whitespace-nowrap cursor-help ${getFileStatus(file.name)?.color}`}>
                                      {getFileStatus(file.name)?.text}
                                    </span>
                                  </Tooltip>
                                )}
                              </div>
                              
                              {expandedFile === file.name && fileDetails[file.name] && (
                                <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                                  <div className="bg-gray-800/20 backdrop-blur-md rounded-xl p-6 space-y-6 border border-gray-700/30 shadow-xl">
                                    {/* File Path Section */}
                                    <div className="space-y-3">
                                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b border-gray-200/50 dark:border-gray-700/50 pb-1">
                                        Informace o souboru
                                      </h4>
                                      <div className="grid gap-3">
                                        <div className="flex items-start gap-4">
                                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[90px] pt-0.5">
                                            Cesta:
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-mono text-xs bg-white/70 dark:bg-gray-800/70 px-2 py-1 rounded border text-gray-800 dark:text-gray-200 break-all" title={`${sourcePath}/${file.name}`}>
                                              {`${sourcePath}/${file.name}`}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[90px]">
                                            Velikost:
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                              {file.size}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              ({fileDetails[file.name].size.toLocaleString()} bytů)
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Timestamps Section */}
                                    <div className="space-y-3">
                                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b border-gray-200/50 dark:border-gray-700/50 pb-1">
                                        Časové razítka
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center gap-4">
                                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[90px]">
                                            Vytvořeno:
                                          </div>
                                          <div className="text-xs text-gray-800 dark:text-gray-200">
                                            {fileDetails[file.name].birthtime.getTime() === 0 
                                              ? <span className="text-gray-500 italic">Neznámé</span>
                                              : formatDateCompact(fileDetails[file.name].birthtime)}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[90px]">
                                            Upraveno:
                                          </div>
                                          <div className="text-xs text-gray-800 dark:text-gray-200">
                                            {fileDetails[file.name].mtime.getTime() === 0 
                                              ? <span className="text-gray-500 italic">Neznámé</span>
                                              : formatDateCompact(fileDetails[file.name].mtime)}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[90px]">
                                            Inode změna:
                                          </div>
                                          <div className="text-xs text-gray-800 dark:text-gray-200">
                                            {fileDetails[file.name].ctime.getTime() === 0 
                                              ? <span className="text-gray-500 italic">Neznámé</span>
                                              : formatDateCompact(fileDetails[file.name].ctime)}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[90px]">
                                            Přístup:
                                          </div>
                                          <div className="text-xs text-gray-800 dark:text-gray-200">
                                            {fileDetails[file.name].atime.getTime() === 0 
                                              ? <span className="text-gray-500 italic">Neznámé</span>
                                              : formatDateCompact(fileDetails[file.name].atime)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Permissions Section */}
                                    <div className="space-y-3">
                                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b border-gray-200/50 dark:border-gray-700/50 pb-1">
                                        Oprávnění
                                      </h4>
                                      <div className="flex gap-4">
                                        <Tooltip
                                          content={
                                            fileDetails[file.name].permissions.readable 
                                              ? 'Soubor lze číst - aplikace má oprávnění k načtení obsahu souboru'
                                              : 'Soubor nelze číst - aplikace nemá oprávnění k načtení obsahu souboru'
                                          }
                                          side="top"
                                        >
                                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 dark:bg-gray-800/70 border cursor-help">
                                            <div className={`w-3 h-3 rounded-full ${
                                              fileDetails[file.name].permissions.readable ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                              Čtení
                                            </span>
                                          </div>
                                        </Tooltip>
                                        
                                        <Tooltip
                                          content={
                                            fileDetails[file.name].permissions.writable 
                                              ? 'Soubor lze upravovat - aplikace má oprávnění k zápisu do souboru'
                                              : 'Soubor nelze upravovat - aplikace nemá oprávnění k zápisu do souboru'
                                          }
                                          side="top"
                                        >
                                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 dark:bg-gray-800/70 border cursor-help">
                                            <div className={`w-3 h-3 rounded-full ${
                                              fileDetails[file.name].permissions.writable ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                              Zápis
                                            </span>
                                          </div>
                                        </Tooltip>
                                        
                                        <Tooltip
                                          content={
                                            fileDetails[file.name].permissions.executable 
                                              ? 'Soubor lze spustit - aplikace má oprávnění ke spuštění souboru'
                                              : 'Soubor nelze spustit - aplikace nemá oprávnění ke spuštění souboru'
                                          }
                                          side="top"
                                        >
                                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 dark:bg-gray-800/70 border cursor-help">
                                            <div className={`w-3 h-3 rounded-full ${
                                              fileDetails[file.name].permissions.executable ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                              Spuštění
                                            </span>
                                          </div>
                                        </Tooltip>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {validation.files.length > MAX_VISIBLE_FILES && (
                            <div className="flex justify-center pt-2 pb-1">
                              <Tooltip
                                content={
                                  showAllFiles 
                                    ? 'Skrýt část souborů pro lepší přehlednost'
                                    : `Zobrazit všech ${validation.files.length} souborů v adresáři`
                                }
                                side="top"
                              >
                                <button
                                  onClick={() => setShowAllFiles(!showAllFiles)}
                                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                >
                                  {showAllFiles ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" />
                                      Zobrazit méně
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      Zobrazit všech {validation.files.length} souborů
                                    </>
                                  )}
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {validation.missingFiles.length > 0 && (
                      <div className="bg-red-500/10 backdrop-blur-md border border-red-400/30 rounded-xl p-4 mt-4 shadow-xl shadow-red-500/10">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium text-destructive">Chybějící požadované soubory</h4>
                            <ul className="mt-1 space-y-1">
                              {validation.missingFiles.map((file, index) => (
                                <li key={index} className="text-xs text-destructive/90 flex items-center gap-1.5">
                                  <X className="h-3 w-3" />
                                  {file}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      </Card>
    </TooltipPrimitive.Provider>
  );
}
