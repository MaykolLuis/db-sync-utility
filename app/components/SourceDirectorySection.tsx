import { useState, useEffect, JSX } from "react"
import { Button } from "@/components/custom-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Check, AlertCircle, FolderOpen, X, RefreshCw, FileText, Clock, HardDrive, FileCheck, FileX, ChevronDown, ChevronUp, File, Database, FileArchive, FileImage, FileVideo, FileAudio, FileCode, FileJson, History, Eraser } from "lucide-react"
import { FileLockChecker } from "@/components/FileLockChecker"
import { FileStats } from "@/types/file-stats"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

// Custom tooltip component with proper typing
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip = ({ children, content, side = 'top' }: TooltipProps) => (
  <TooltipPrimitive.Provider>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <span className="inline-block">{children}</span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content 
          side={side}
          className="z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-popover" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

// Note: The Window interface with electron property is already defined in types/electron.d.ts
// We don't need to redeclare it here

type FileInfo = {
  name: string
  size: string
  lastModified: string
}

type FileValidationResult = {
  isValid: boolean
  message: string
  files: FileInfo[]
  missingFiles: string[]
  totalSize: string
  fileCount: number
}

interface SourceDirectorySectionProps {
  sourcePath: string
  isUpdating: boolean
  onSourcePathChange: (path: string, isValid: boolean) => void
  onBrowseFolder: () => Promise<string | undefined>
  onClear: () => void
  hasSelectedPreset: boolean
}

export function SourceDirectorySection({
  sourcePath,
  isUpdating,
  onSourcePathChange,
  onBrowseFolder,
  onClear,
  hasSelectedPreset,
}: SourceDirectorySectionProps) {
  const [validation, setValidation] = useState<FileValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [expandedFile, setExpandedFile] = useState<string | null>(null)
  const [fileDetails, setFileDetails] = useState<Record<string, FileDetail>>({})
  const [showAllFiles, setShowAllFiles] = useState(false)
  const [fileStatuses, setFileStatuses] = useState<Record<string, {text: string, color: string}>>({})
  const [isDirectoryAccessible, setIsDirectoryAccessible] = useState<boolean | null>(null)
  const [directoryAccessError, setDirectoryAccessError] = useState<string | null>(null)
  const MAX_VISIBLE_FILES = 3 // Show only 3 files by default

  interface FileDetail {
    size: number
    mtime: Date
    birthtime: Date
    atime: Date
    ctime: Date
    permissions: {
      readable: string
      writable: string
      executable: string
    }
  }

  const validateDirectory = async (path: string, silent = false) => {
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
    
    setIsValidating(true)
    
    try {
      const result = await window.electron.validateSourceDirectory(path);
      
      // Format file sizes and dates and get statuses
      const filesWithDetails = await Promise.all(
        result.files.map(async (file: string) => {
          const filePath = `${path}/${file}`;
          const stats = await window.electron.getFileStats(filePath);
          
          // Log the actual file size from the main process
          console.log(`File ${file} stats from main process:`, stats);
          
          const lastModified = new Date(stats.mtime);
          const isToday = lastModified.toDateString() === now.toDateString();
          
          // Set status for this file
          const status = isToday
            ? { 
                text: `Aktualizováno dnes v ${lastModified.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, 
                color: 'bg-blue-100 text-blue-800' 
              }
            : { 
                text: `Aktualizováno ${lastModified.toLocaleDateString()}`, 
                color: 'bg-yellow-100 text-yellow-800' 
              };
          
          setFileStatuses(prev => ({
            ...prev,
            [file as string]: status
          }));
          
          // Ensure we're using the actual file size from the main process
          const fileSize = typeof stats.size === 'number' ? stats.size : 0;
          
          // Debug the file size before and after formatting
          const formattedSize = formatFileSize(fileSize);
          console.log(`File ${file} - Raw size: ${fileSize} bytes, Formatted size: ${formattedSize}`);
          
          return {
            name: file,
            size: formattedSize,
            lastModified: lastModified.toLocaleString(),
          };
        })
      );

      // Calculate total size by summing up file sizes in bytes
      let totalSizeBytes = 0;
      const filesWithDetailsAndSizes = await Promise.all(
        result.files.map(async (file: string) => {
          const filePath = `${path}/${file}`;
          const stats = await window.electron.getFileStats(filePath);
          totalSizeBytes += stats.size; // Add the actual file size in bytes
          
          const lastModified = new Date(stats.mtime);
          const isToday = lastModified.toDateString() === now.toDateString();
          
          // Set status for this file
          const status = isToday
            ? { 
                text: `Aktualizováno dnes v ${lastModified.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, 
                color: 'bg-blue-100 text-blue-800' 
              }
            : { 
                text: `Aktualizováno ${lastModified.toLocaleDateString()}`, 
                color: 'bg-yellow-100 text-yellow-800' 
              };
          
          setFileStatuses(prev => ({
            ...prev,
            [file as string]: status
          }));
          
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
  };

  // Helper function to format date to compact string
  const formatDateCompact = (date: Date): string => {
    const now = new Date();
    
    // Get the start of today in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the start of yesterday in local timezone
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get the start of the file's day in local timezone
    const fileDate = new Date(date);
    fileDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffDays = Math.floor((today.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Format time part
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

  // Helper function to format file size
  // Uses 1000-based units (KB = 1000 bytes) to match Windows Explorer display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    // Log the raw bytes for debugging
    console.log(`formatFileSize called with ${bytes} bytes`);
    
    // Use 1000-based units to match Windows Explorer display
    const k = 1000;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    // Calculate the appropriate unit index
    const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k));
    
    // Calculate the value in the appropriate unit
    const value = bytes / Math.pow(k, i);
    
    // Format with 2 decimal places
    const formattedValue = value.toFixed(2);
    
    // Return the formatted string
    return `${formattedValue} ${units[i]}`;
  };

  const handleBrowseFolder = async () => {
    const path = await onBrowseFolder()
    // Validation will be triggered by the sourcePath change in useEffect
  }

  const handlePathChange = (path: string) => {
    // Clear previous validation when path changes
    setValidation(null);
    onSourcePathChange(path, false);
    
    // Clear expanded file and details and statuses
    setExpandedFile(null);
    setFileDetails({});
    setFileStatuses({});
    
    // The useEffect will handle the validation when sourcePath changes
  }

  // Check directory accessibility
  const checkDirectoryAccess = async (path: string) => {
    if (!path) {
      setIsDirectoryAccessible(null);
      setDirectoryAccessError(null);
      return;
    }

    try {
      const result = await window.electron.checkPathAccess(path);
      setIsDirectoryAccessible(result.accessible);
      setDirectoryAccessError(result.error || null);
      
      if (!result.accessible) {
        setValidation(null);
      }
      
      return result.accessible;
    } catch (error) {
      console.error('Error checking directory access:', error);
      setIsDirectoryAccessible(false);
      setDirectoryAccessError('Nepodařilo se ověřit přístup k adresáři');
      return false;
    }
  };

  // Validate whenever sourcePath changes
  useEffect(() => {
    const validatePath = async () => {
      if (sourcePath) {
        const isAccessible = await checkDirectoryAccess(sourcePath);
        if (isAccessible) {
          await validateDirectory(sourcePath, false); // Only validate if directory is accessible
        }
      } else {
        setValidation(null);
        setIsDirectoryAccessible(null);
        setDirectoryAccessError(null);
      }
    };
    
    validatePath();
  }, [sourcePath]);
  
  // Manual validation handler
  const handleValidateClick = async () => {
    if (sourcePath) {
      setExpandedFile(null)
      setFileDetails({})
      await validateDirectory(sourcePath, false)
    }
  }

  const toggleFileDetails = async (file: FileInfo) => {
    if (expandedFile === file.name) {
      setExpandedFile(null)
      return
    }
    
    setExpandedFile(file.name)
    
    // If we already have the details, no need to fetch again
    if (fileDetails[file.name] || !sourcePath) {
      return
    }
    
    try {
      const stats = await window.electron.getFileStats(`${sourcePath}/${file.name}`);
      
      console.log('Raw stats from main process:', JSON.stringify(stats, null, 2));
      
      // Convert timestamps to Date objects
      const createDate = (timestamp: number): Date => {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date(0) : date;
      };
      
      const mtime = createDate(stats.mtime);
      const birthtime = createDate(stats.birthtime);
      const atime = createDate(stats.atime);
      const ctime = createDate(stats.ctime);
      
      console.log('Converted dates:', { mtime, birthtime, atime, ctime });
      
      setFileDetails(prev => ({
        ...prev,
        [file.name]: {
          size: stats.size,
          mtime,
          birthtime,
          atime,
          ctime,
          permissions: {
            readable: (stats.mode & 0o400) ? 'Ano' : 'Ne',
            writable: (stats.mode & 0o200) ? 'Ano' : 'Ne',
            executable: (stats.mode & 0o100) ? 'Ano' : 'Ne'
          }
        }
      }));
    } catch (error) {
      console.error('Error getting file details:', error);
      // Set error state for this file with valid Date objects
      const errorDate = new Date(0);
      setFileDetails(prev => ({
        ...prev,
        [file.name]: {
          size: 0,
          mtime: errorDate,
          birthtime: errorDate,
          atime: errorDate,
          ctime: errorDate,
          permissions: {
            readable: 'Ne',
            writable: 'Ne',
            executable: 'Ne'
          }
        }
      }));
    }
  }

  const getFileStatus = (fileName: string) => {
    return fileStatuses[fileName] || null;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const iconProps = { className: 'h-4 w-4 flex-shrink-0' }
    
    if (!ext) return <File {...iconProps} className={`${iconProps.className} text-gray-500`} />
    
    const iconMap: Record<string, JSX.Element> = {
      // Database files
      db: <Database {...iconProps} className={`${iconProps.className} text-blue-500`} />,
      sqlite: <Database {...iconProps} className={`${iconProps.className} text-blue-500`} />,
      sqlite3: <Database {...iconProps} className={`${iconProps.className} text-blue-500`} />,
      db3: <Database {...iconProps} className={`${iconProps.className} text-blue-500` } />,
      
      // Archive files
      zip: <FileArchive {...iconProps} className={`${iconProps.className} text-yellow-500`} />,
      rar: <FileArchive {...iconProps} className={`${iconProps.className} text-yellow-500`} />,
      '7z': <FileArchive {...iconProps} className={`${iconProps.className} text-yellow-500`} />,
      tar: <FileArchive {...iconProps} className={`${iconProps.className} text-yellow-500`} />,
      gz: <FileArchive {...iconProps} className={`${iconProps.className} text-yellow-500`} />,
      
      // Image files
      jpg: <FileImage {...iconProps} className={`${iconProps.className} text-green-500`} />,
      jpeg: <FileImage {...iconProps} className={`${iconProps.className} text-green-500`} />,
      png: <FileImage {...iconProps} className={`${iconProps.className} text-green-500`} />,
      gif: <FileImage {...iconProps} className={`${iconProps.className} text-green-500`} />,
      bmp: <FileImage {...iconProps} className={`${iconProps.className} text-green-500`} />,
      svg: <FileImage {...iconProps} className={`${iconProps.className} text-green-500`} />,
      
      // Video files
      mp4: <FileVideo {...iconProps} className={`${iconProps.className} text-purple-500`} />,
      mkv: <FileVideo {...iconProps} className={`${iconProps.className} text-purple-500`} />,
      avi: <FileVideo {...iconProps} className={`${iconProps.className} text-purple-500`} />,
      mov: <FileVideo {...iconProps} className={`${iconProps.className} text-purple-500`} />,
      
      // Audio files
      mp3: <FileAudio {...iconProps} className={`${iconProps.className} text-pink-500`} />,
      wav: <FileAudio {...iconProps} className={`${iconProps.className} text-pink-500`} />,
      ogg: <FileAudio {...iconProps} className={`${iconProps.className} text-pink-500`} />,
      
      // Code files
      json: <FileJson {...iconProps} className={`${iconProps.className} text-yellow-500`} />,
      js: <FileCode {...iconProps} className={`${iconProps.className} text-yellow-500`} />,
      ts: <FileCode {...iconProps} className={`${iconProps.className} text-blue-500`} />,
      jsx: <FileCode {...iconProps} className={`${iconProps.className} text-blue-300`} />,
      tsx: <FileCode {...iconProps} className={`${iconProps.className} text-blue-400`} />,
      html: <FileCode {...iconProps} className={`${iconProps.className} text-orange-500`} />,
      css: <FileCode {...iconProps} className={`${iconProps.className} text-blue-400`} />,
    }
    
    return iconMap[ext] || <File {...iconProps} className={`${iconProps.className} text-gray-400`} />
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white rounded-t-lg p-4 pb-3">
        <CardTitle className="text-base font-medium mb-1">Zdrojový adresář</CardTitle>
        <CardDescription className="text-gray-200 text-xs">
          <div className="flex items-center flex-wrap gap-1 mt-1">
            <span>Vyberte adresář obsahující soubory:</span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-white/10 rounded text-[11px] font-mono">configurations.mv.db</span>
              <span className="text-gray-400">a</span>
              <span className="px-1.5 py-0.5 bg-white/10 rounded text-[11px] font-mono">configurations.trace.db</span>
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={sourcePath}
              onChange={async (e) => {
                const newPath = e.target.value;
                handlePathChange(newPath);
                if (newPath) {
                  await checkDirectoryAccess(newPath);
                }
              }}
              className="flex-1"
              disabled={isUpdating}
              placeholder="Vyberte zdrojový adresář"
            />
            <Tooltip content="Procházet">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBrowseFolder}
                disabled={isUpdating || isValidating}
                className="relative"
              >
                {isValidating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
              </Button>
            </Tooltip>
            <Tooltip content="Ověřit soubory v adresáři">
              <Button
                variant="outline"
                onClick={handleValidateClick}
                disabled={isUpdating || !sourcePath || isValidating}
                className={`relative transition-all duration-200 ${isValidating ? 'opacity-70' : 'hover:opacity-90'}`}
              >
                <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
              </Button>
            </Tooltip>
            <Tooltip content="Zrušit výběr předvolby">
              <Button
                variant="destructive"
                size="icon"
                onClick={onClear}
                disabled={isUpdating || !sourcePath || isValidating}
                className="relative"
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
          
         
        </div>
        {validation && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-md border border-muted/30">
              <div className="flex-shrink-0 mt-0.5">
                {validation.isValid ? (
                  <FileCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <FileX className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-xs font-medium truncate">
                      {validation.isValid ? 'Složka je v pořádku' : 'Problém s ověřením'}
                    </h4>
                    <span 
                      className="text-[11px] whitespace-nowrap flex items-center gap-1"
                      title={new Date().toLocaleString('cs-CZ', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    >
                      <span className="text-muted-foreground/80">Zkontrolováno v:</span>
                      <span className="font-mono font-medium text-blue-400 bg-blue-950/30 px-1.5 py-0.5 rounded">
                        {new Date().toLocaleTimeString('cs-CZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </span>
                    </span>
                    
                  </div>
                  
                </div>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs text-muted-foreground mt-0.5 truncate flex-1" title={validation.message}>
                    {validation.message}
                  </p>
                  
                  {sourcePath && isDirectoryAccessible !== null && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className={`inline-block h-2 w-2 rounded-full ${isDirectoryAccessible ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
                          aria-hidden="true"
                        />
                        <Tooltip 
                          content={
                            isDirectoryAccessible 
                              ? 'Adresář je přístupný a je možné v něm číst a zapisovat data.'
                              : directoryAccessError || 'Nelze získat přístup k adresáři. Zkontrolujte, zda je počítač zapnutý a síťové připojení funkční.'
                          }
                          side="left"
                        >
                          <span>{isDirectoryAccessible ? 'Přístup povolen' : 'Přístup zamítnut'}</span>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-2.5 w-2.5 text-blue-400" />
                    {validation.totalSize}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-2.5 w-2.5 text-red-400" />
                    {validation.fileCount} souborů
                  </span>
                </div>
              </div>
            </div>

            {validation.files.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Soubory v adresáři</span>
                  <span className="ml-auto text-xs bg-muted-foreground/10 px-2 py-0.5 rounded-full">
                    {validation.files.length} souborů
                  </span>
                </div>
                <div className="max-h-[28rem] overflow-y-auto text-xs border rounded bg-background shadow-inner">
                  {validation.files.map((file, index) => (
                    <div key={index} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <div 
                        className="flex items-center px-2.5 py-1.5 cursor-pointer group"
                        onClick={() => toggleFileDetails(file)}
                      >
                        <div className="flex items-center min-w-0 flex-1 gap-2">
                          <div className="text-muted-foreground/70 group-hover:text-foreground/80">
                            {getFileIcon(file.name)}
                          </div>
                          <div className="min-w-0 flex-1 grid grid-cols-[1fr_auto] items-baseline gap-x-2">
                            <span className="truncate text-[12px] font-medium text-foreground/90">
                              {file.name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] justify-self-end">
                              <span className="font-mono font-medium text-blue-400 bg-blue-950/30 px-1 py-0.5 rounded">{file.size}</span>
                              <span className="text-gray-400 px-1 py-0.5 rounded">
                                {file.lastModified && file.lastModified !== 'N/A' 
                                  ? file.lastModified.split(',')[0]
                                  : 'Neznámé'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-2 text-muted-foreground/60">
                          {expandedFile === file.name ? (
                            <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      
                      {expandedFile === file.name && fileDetails[file.name] && (
                        <div className="bg-muted/10 p-2.5 text-xs border-t">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-start gap-2 min-w-0">
                              
                              <div className="min-w-0">
                                <div className="font-medium text-foreground/90 truncate" title={file.name}>
                                  {file.name}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 mt-2">
                                  <span className="font-mono text-blue-400">{file.size}</span>
                                  <span>•</span>
                                  <span>{file.lastModified || 'Neznámé'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileLockChecker 
                                filePath={`${sourcePath}/${file.name}`} 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              />
                            </div>
                            {getFileStatus(file.name) && (
                              <span className={`text-[10px] px-2 py-0.5 rounded whitespace-nowrap ${getFileStatus(file.name)?.color}`}>
                                {getFileStatus(file.name)?.text}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                            <div className="flex gap-2">
                              <div className="text-muted-foreground/70 min-w-[100px]">Cesta:</div>
                              <div className="truncate font-mono text-[11px]" title={`${sourcePath}/${file.name}`}>
                                {`${sourcePath}/${file.name}`}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <div className="text-muted-foreground/70 min-w-[100px]">Velikost:</div>
                              <div className="font-mono text-[11px]">
                                {file.size} ({fileDetails[file.name].size.toLocaleString()} B)
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <div className="text-muted-foreground/70 min-w-[100px]">Vytvořeno:</div>
                              <div className="text-[11px]">
                                {fileDetails[file.name].birthtime.getTime() === 0 
                                  ? 'Neznámé' 
                                  : formatDateCompact(fileDetails[file.name].birthtime)}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <div className="text-muted-foreground/70 min-w-[100px]">Upraveno:</div>
                              <div className="text-[11px]">
                                {fileDetails[file.name].mtime.getTime() === 0 
                                  ? 'Neznámé' 
                                  : formatDateCompact(fileDetails[file.name].mtime)}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <div className="text-muted-foreground/70 min-w-[100px]">Inode změna:</div>
                              <div className="text-[11px]">
                                {fileDetails[file.name].ctime.getTime() === 0 
                                  ? 'Neznámé' 
                                  : formatDateCompact(fileDetails[file.name].ctime)}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <div className="text-muted-foreground/70 min-w-[100px]">Poslední přístup:</div>
                              <div className="text-[11px]">
                                {fileDetails[file.name].atime.getTime() === 0 
                                  ? 'Neznámé' 
                                  : formatDateCompact(fileDetails[file.name].atime)}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <div className="text-muted-foreground/70 min-w-[100px]">Práva:</div>
                              <div className="flex gap-3 text-[11px]">
                                <span className="flex items-center gap-1">
                                  <span className={`inline-block w-2 h-2 rounded-full ${
                                    fileDetails[file.name].permissions.readable ? 'bg-green-500' : 'bg-red-500/70'
                                  }`}></span>
                                  Čtení
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className={`inline-block w-2 h-2 rounded-full ${
                                    fileDetails[file.name].permissions.writable ? 'bg-green-500' : 'bg-red-500/70'
                                  }`}></span>
                                  Zápis
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className={`inline-block w-2 h-2 rounded-full ${
                                    fileDetails[file.name].permissions.executable ? 'bg-green-500' : 'bg-red-500/70'
                                  }`}></span>
                                  Spustit
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {validation.files.length > MAX_VISIBLE_FILES && (
                    <div className="flex justify-center pt-2 pb-1">
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {validation.missingFiles.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
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
        )}
      </CardContent>
      </Card>
  )
}
