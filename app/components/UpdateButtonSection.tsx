"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/custom-button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, Check, Computer, Copy, Loader2, RotateCcw, FolderOpen, RefreshCw, InfoIcon, ArrowRight, FileDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { electronUtils } from "@/lib/electron-utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

// Custom tooltip component with proper typing
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip = ({ children, content, side = 'top' }: TooltipProps) => (
  <TooltipPrimitive.Provider>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <span className="inline-flex items-center">{children}</span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content 
          side={side}
          sideOffset={4}
          className="z-50 max-w-[300px] rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
          <div className="break-words whitespace-normal">
            {content}
          </div>
          <TooltipPrimitive.Arrow className="fill-popover" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

interface CopyStatus {
  targetId: string
  progress: number
  status: "pending" | "copying" | "success" | "error"
  error?: string
  fileName?: string
  fileSize?: number
  speed?: number
  timeRemaining?: number
  completedSize?: number
  startTime?: number
  endTime?: number
}

interface UpdateButtonSectionProps {
  isUpdating: boolean
  copyStatuses: CopyStatus[]
  targetLocations: Array<{ id: string; name: string; path: string; selected: boolean }>
  failedOperationsCount: number
  isRetryingAll: boolean
  sourcePath: string
  onUpdate: () => void
  onRetryTarget: (targetId: string) => void
  onRetryAllFailedOperations: () => void
  onExportUpdateResults: () => void
  onFinishUpdate: () => void
  calculateOverallProgress: () => number
  copyFiles?: (sourcePath: string, targetPath: string, targetId: string, onProgress: (progressInfo: any) => void) => Promise<{ success: boolean; error?: string }>
}

export function UpdateButtonSection({
  isUpdating,
  copyStatuses,
  targetLocations,
  failedOperationsCount,
  isRetryingAll,
  sourcePath,
  onUpdate,
  onRetryTarget,
  onRetryAllFailedOperations,
  onExportUpdateResults,
  onFinishUpdate,
  calculateOverallProgress,
  copyFiles
}: UpdateButtonSectionProps) {
  // State for path dialog
  const [showPathDialog, setShowPathDialog] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const pathInputRef = useRef<HTMLInputElement>(null);
  const [animateProgress, setAnimateProgress] = useState(false);
  const [trackedCopyStatuses, setTrackedCopyStatuses] = useState<CopyStatus[]>([]);
  
  // Effect to trigger progress bar animation when updating starts
  useEffect(() => {
    if (isUpdating) {
      setAnimateProgress(true);
    }
  }, [isUpdating]);
  
  // Track elapsed time for each copy operation
  useEffect(() => {
    if (copyStatuses.length > 0) {
      // Process each status and add timing information
      const updatedStatuses = copyStatuses.map(status => {
        // Find existing tracked status
        const existingStatus = trackedCopyStatuses.find(s => s.targetId === status.targetId);
        
        // If this is a new status or status changed from pending to copying, add start time
        if (!existingStatus) {
          // Initialize with current time for any new status
          return { ...status, startTime: Date.now() };
        }
        
        // If status changed from pending to copying, update start time
        if (status.status === "copying" && existingStatus.status === "pending") {
          return { ...status, startTime: Date.now() };
        }
        
        // If status changed to success or error, add end time
        if ((status.status === "success" || status.status === "error") && 
            existingStatus && existingStatus.status === "copying") {
          return { ...status, startTime: existingStatus.startTime, endTime: Date.now() };
        }
        
        // Keep existing timing data
        return { 
          ...status, 
          startTime: existingStatus.startTime, 
          endTime: existingStatus.endTime 
        };
      });
      
      setTrackedCopyStatuses(updatedStatuses);
    } else if (isUpdating && trackedCopyStatuses.length === 0) {
      // Initialize with a global start time when update begins
      setTrackedCopyStatuses([{ targetId: "global", progress: 0, status: "pending", startTime: Date.now() }]);
    }
  }, [copyStatuses, isUpdating]);
  
  // Handle opening folder in file explorer
  const handleOpenFolder = async (path: string) => {
    try {
      // Try to use the Electron API first
      try {
        const result = await electronUtils.openFolderPath(path);
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (electronError) {
        console.error(`Electron API failed to open folder: ${path}`, electronError);
        
        // Show path in dialog as fallback
        setCurrentPath(path);
        setShowPathDialog(true);
        
        // Focus and select the input text after dialog is shown
        setTimeout(() => {
          if (pathInputRef.current) {
            pathInputRef.current.focus();
            pathInputRef.current.select();
          }
        }, 100);
      }
    } catch (error) {
      console.error(`Error handling folder open: ${path}`, error);
    }
  };
  
  // Format file size to human-readable format
  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };
  
  // Format time remaining
  const formatDuration = (seconds: number): string => {
    if (!seconds) return "";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 0) return "Dokončeno";
    
    // Convert to milliseconds for very small values
    if (seconds < 1) {
      const ms = Math.round(seconds * 1000);
      return `${ms}ms zbývá`;
    }
    
    // Show seconds for values under a minute
    if (seconds < 60) return `${Math.round(seconds)}s zbývá`;
    
    // Show minutes and seconds for longer durations
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s zbývá`;
  };
  
  const formatElapsedTime = (startTime?: number, endTime?: number): string => {
    if (!startTime) return "0ms";
    
    const now = endTime || Date.now();
    const elapsedMs = now - startTime;
    
    // Show milliseconds if less than 1 second
    if (elapsedMs < 1000) return `${elapsedMs}ms`;
    
    // Show seconds if less than 1 minute
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    if (elapsedSeconds < 60) return `${elapsedSeconds}s`;
    
    // Show minutes and seconds for longer durations
    return `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;
  };
  return (
    <Card>
      <CardContent className="pt-6">
        {isUpdating && (
          <div className="w-full space-y-4">
            <motion.div
              className="flex justify-between text-sm mb-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-blue-400 font-medium">Celkový průběh:</span>
              <div className="flex flex-col items-end">
                <span className="font-mono text-blue-300">{calculateOverallProgress()}%</span>
                <div className="flex items-center gap-1 font-mono text-[10px] text-blue-300/80">
                  <span className="font-medium">Čas:</span>
                  <span>
                    {trackedCopyStatuses.length > 0 ? 
                      formatElapsedTime(trackedCopyStatuses[0]?.startTime || Date.now()) : 
                      formatElapsedTime(Date.now())}
                  </span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.5 }}
              className="rounded-full overflow-hidden border border-blue-500/20"
            >
              <Progress 
                value={calculateOverallProgress()} 
                className="bg-blue-950/30 h-2.5" 
                indicatorClassName={cn(
                  "transition-all",
                  animateProgress && "animate-pulse",
                  calculateOverallProgress() === 100 ? "bg-green-500/80" : "bg-blue-500/80"
                )}
              />
            </motion.div>

            <motion.div 
              className="space-y-4 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Copy className="h-4 w-4 text-blue-400" /> 
                <span className="text-blue-400">Průběh podle cílů:</span>
              </h4>
              
              <AnimatePresence>
                {copyStatuses.map((status, index) => {
                  const location = targetLocations.find((loc) => loc.id === status.targetId)
                  if (!location) return null

                  return (
                    <motion.div 
                      key={status.targetId} 
                      className="border border-red-500/20 rounded-lg p-1.5 relative overflow-hidden bg-[#121212]/80 backdrop-blur-sm"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <div className="flex items-center gap-1.5">
                        {status.status === "success" && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            className="flex-shrink-0"
                          >
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          </motion.div>
                        )}
                        {status.status === "error" && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            className="flex-shrink-0"
                          >
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          </motion.div>
                        )}
                        {status.status === "copying" && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="flex-shrink-0"
                          >
                            <Loader2 className="h-3.5 w-3.5 text-blue-400" />
                          </motion.div>
                        )}
                        {status.status === "pending" && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 truncate">
                            <Computer className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                            <span className="font-medium text-[10px] text-blue-400 truncate">{location.name}</span>
                            <span className="text-[9px] text-blue-300/50 font-mono truncate ml-1">cesta: {location.path}</span>
                            <Tooltip content="Otevřít složku">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenFolder(location.path);
                                }}
                                className="ml-1 p-0.5 rounded hover:bg-blue-500/20 transition-colors"
                              >
                                <FolderOpen className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <div className="text-[10px] font-mono font-medium text-right text-blue-300">
                            {status.progress}%
                          </div>
                          {status.status === "copying" && (
                            <div className="text-[9px] font-mono text-blue-300/80 font-medium">
                              {status.timeRemaining !== undefined ? formatTime(status.timeRemaining) : ""}
                            </div>
                          )}
                          {status.status === "success" && (
                            <div className="text-[9px] font-mono text-green-300/90 font-medium">
                              Čas: {formatElapsedTime(trackedCopyStatuses.find(s => s.targetId === status.targetId)?.startTime, 
                                                     trackedCopyStatuses.find(s => s.targetId === status.targetId)?.endTime)}
                            </div>
                          )}
                          {status.status !== "success" && status.status !== "copying" && (
                            <div className="text-[9px] font-mono text-blue-300/80 font-medium">
                              Čas: {formatElapsedTime(trackedCopyStatuses.find(s => s.targetId === status.targetId)?.startTime)}
                            </div>
                          )}
                        </div>
                        {status.status === "error" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-5 px-1.5 py-0 text-[9px] gap-0.5 border-red-500/30 bg-red-950/20 hover:bg-red-950/30 text-red-400 flex-shrink-0 ml-1"
                            onClick={() => onRetryTarget(status.targetId)}
                          >
                            <RefreshCw className="h-2 w-2" />
                            Znovu
                          </Button>
                        )}
                      </div>
                      
                      {/* File details row */}
                      {status.status === "copying" && status.fileName && (
                        <motion.div 
                          className="flex flex-col text-[8px] text-blue-300/70 mt-0.5 font-mono bg-blue-950/20 px-1 py-0.5 rounded border border-blue-500/10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 truncate">
                              <span className="truncate">Soubor: {status.fileName}</span>
                              {status.fileSize && (
                                <span className="whitespace-nowrap">({formatFileSize(status.fileSize)})</span>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open source folder
                                  if (sourcePath) {
                                    handleOpenFolder(sourcePath);
                                  }
                                }}
                                className="ml-1 p-0.5 rounded hover:bg-blue-500/20 transition-colors"
                                title="Otevřít zdrojovou složku"
                              >
                                <FolderOpen className="h-2 w-2 text-blue-400 flex-shrink-0" />
                              </button>
                            </div>
                            {status.speed && (
                              <span className="whitespace-nowrap text-blue-300/90 font-medium">{formatFileSize(status.speed)}/s</span>
                            )}
                          </div>
                          
                          {/* Time information row */}
                          <div className="flex justify-between items-center mt-0.5 border-t border-blue-500/10 pt-0.5">
                            <span className="text-blue-300/90 font-medium">Čas kopírování:</span>
                            <div className="flex items-center gap-2">
                              {trackedCopyStatuses.find(s => s.targetId === status.targetId)?.startTime && (
                                <span className="text-blue-300/90 font-medium">
                                  {formatElapsedTime(trackedCopyStatuses.find(s => s.targetId === status.targetId)?.startTime)}
                                </span>
                              )}
                              {status.timeRemaining !== undefined && (
                                <span className="text-blue-300/90 font-medium">
                                  Zbývá: {formatTime(status.timeRemaining)}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Progress bar with animation */}
                      <div className="relative h-2 mt-2">
                        <div className="absolute inset-0 rounded-full bg-gray-200"></div>
                        <motion.div 
                          className={cn(
                            "absolute left-0 top-0 bottom-0 rounded-full",
                            status.status === "error" ? "bg-red-500" : 
                            status.status === "success" ? "bg-green-500" : 
                            "bg-bfi-blue"
                          )}
                          style={{ width: `${status.progress}%` }}
                          initial={{ width: "0%" }}
                          animate={{ width: `${status.progress}%` }}
                          transition={{ type: "spring", stiffness: 50, damping: 20 }}
                        />
                        
                        {/* Animated pulse effect on the progress bar */}
                        {status.status === "copying" && (
                          <motion.div 
                            className="absolute right-0 h-full w-[20%] bg-white opacity-30 blur-sm"
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            style={{ clipPath: "inset(0 0 0 0 round 9999px)" }}
                          />
                        )}
                      </div>
                      
                      {/* Error message */}
                      {status.status === "error" && (
                        <motion.p 
                          className="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                        >
                          <AlertCircle className="h-3 w-3 inline-block mr-1" />
                          {status.error}
                        </motion.p>
                      )}
                      
                      {/* Success message */}
                      {status.status === "success" && (
                        <motion.p 
                          className="text-xs text-green-600 mt-2 p-2 rounded"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                        >
                          <InfoIcon className="h-3 w-3 inline-block mr-1" />
                          Soubory byly úspěšně zkopírovány
                        </motion.p>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        {!isUpdating ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <Button 
              onClick={onUpdate} 
              className="w-full gap-2 bfi-button relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Aktualizovat soubory
              </span>
              <motion.div 
                className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 1, ease: "easeInOut" }}
              />
            </Button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {/* Path dialog */}
            {showPathDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPathDialog(false)}>
                <div className="bg-zinc-900 border border-blue-500/30 rounded-md p-4 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-medium text-blue-400 mb-2">Cesta ke složce</h3>
                  <p className="text-xs text-zinc-400 mb-3">
                    Aplikace nemůže přímo otevřít složku. Zkopírujte tuto cestu a vložte ji do Průzkumníka souborů.
                  </p>
                  <div className="flex gap-2">
                    <input 
                      ref={pathInputRef}
                      type="text" 
                      value={currentPath} 
                      readOnly 
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-blue-300"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 py-0 text-[10px] border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/30 text-blue-400"
                      onClick={() => {
                        if (pathInputRef.current) {
                          pathInputRef.current.select();
                          document.execCommand('copy');
                        }
                      }}
                    >
                      Kopírovat
                    </Button>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 py-0 text-[10px] border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300"
                      onClick={() => setShowPathDialog(false)}
                    >
                      Zavřít
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Overall progress section */}
            {copyStatuses.every((status) => status.status === "success" || status.status === "error") && (
              <motion.div 
                className="flex flex-col sm:flex-row gap-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {failedOperationsCount > 0 && (
                  <motion.div 
                    className="flex-1"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Button 
                      onClick={onRetryAllFailedOperations} 
                      className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white" 
                      disabled={isRetryingAll}
                    >
                      {isRetryingAll ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <motion.div
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </motion.div>
                      )}
                      Zkusit znovu vše ({failedOperationsCount})
                    </Button>
                  </motion.div>
                )}
                
                <motion.div 
                  className="flex-1"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                >
                  <Button 
                    onClick={onExportUpdateResults} 
                    className="w-full gap-2 border-bfi-blue text-bfi-blue hover:bg-blue-950/20" 
                    variant="outline"
                  >
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <FileDown className="h-4 w-4" />
                    </motion.div>
                    Exportovat výsledky
                  </Button>
                </motion.div>
                
                <motion.div 
                  className="flex-1"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
                >
                  <Button 
                    onClick={onFinishUpdate} 
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4" />
                    Zavřít výsledky
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
