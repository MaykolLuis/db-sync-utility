"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { electronUtils } from '@/lib/electron-utils';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface FileLockCheckerProps {
  filePath: string;
  className?: string;
  size?: 'default' | 'sm' | 'icon';
  variant?: 'default' | 'ghost' | 'outline' | 'link';
  autoCheck?: boolean; // Automatically check on mount and when filePath changes
  showStatus?: boolean; // Show the lock status visually
  showLabel?: boolean; // Show text label next to icon
  onStatusChange?: (status: LockStatus) => void; // Callback when lock status changes
}

type LockStatus = 'unknown' | 'locked' | 'available' | 'error';

export function FileLockChecker({ 
  filePath, 
  className = '',
  size = 'sm',
  variant = 'outline',
  autoCheck = true, // Set to true by default to check automatically when loaded
  showStatus = true,
  showLabel = false,
  onStatusChange
}: FileLockCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [lockStatus, setLockStatus] = useState<LockStatus>('unknown');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInfo, setDialogInfo] = useState<{
    title: string;
    description: string;
    status: LockStatus;
    details?: string;
  }>({ title: '', description: '', status: 'unknown' });
  const { toast } = useToast();

  // Auto-check on mount and when filePath changes if autoCheck is true
  useEffect(() => {
    if (autoCheck && filePath) {
      checkFileLock(false); // Pass false to indicate this is not a manual check
    }
  }, [filePath, autoCheck]);

  // Track if the check was triggered manually by button click or automatically
  const [manualCheck, setManualCheck] = useState(false);

  const checkFileLock = async (isManualCheck = false) => {
    if (!filePath) return;
    
    // Set whether this is a manual check (to determine if dialog should be shown)
    setManualCheck(isManualCheck);
    
    try {
      setIsChecking(true);
      const result = await electronUtils.getFileInUseDetails(filePath);
      
      if (result.inUse) {
        const newStatus: LockStatus = 'locked';
        setLockStatus(newStatus);
        // Notify parent component if callback is provided
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        
        const info = {
          title: "Soubor je uzamčen",
          description: "Tento soubor je aktuálně používán jiným procesem a může být pouze pro čtení.",
          status: 'locked' as LockStatus,
          details: result.error || 'Soubor je uzamčen jiným procesem.'
        };
        setDialogInfo(info);
        
        // Only show dialog for manual checks
        if (isManualCheck) {
          setDialogOpen(true);
        }
        
        toast({
          title: info.title,
          description: info.description,
          variant: "destructive"
        });
      } else {
        const newStatus: LockStatus = 'available';
        setLockStatus(newStatus);
        // Notify parent component if callback is provided
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        
        const info = {
          title: "Soubor je dostupný",
          description: "Tento soubor není uzamčen žádným jiným procesem a je připraven k použití.",
          status: 'available' as LockStatus
        };
        setDialogInfo(info);
        
        // Only show dialog for manual checks
        if (isManualCheck) {
          setDialogOpen(true);
        }
        
        toast({
          title: info.title,
          description: info.description,
          variant: "default"
        });
      }
    } catch (error) {
      const newStatus: LockStatus = 'error';
      setLockStatus(newStatus);
      // Notify parent component if callback is provided
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba při kontrole zámku souboru';
      const info = {
        title: "Chyba při kontrole zámku",
        description: "Nastala chyba při zjišťování stavu zámku souboru.",
        status: 'error' as LockStatus,
        details: errorMessage
      };
      setDialogInfo(info);
      setDialogOpen(true);
      console.error('Error checking file lock:', error);
      toast({
        title: info.title,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Determine button style based on lock status
  const getButtonStyle = () => {
    if (!showStatus) return "";
    
    switch(lockStatus) {
      case 'locked':
        return "border-red-500/30 bg-red-950/20 hover:bg-red-950/30";
      case 'available':
        return "border-green-500/30 bg-green-950/20 hover:bg-green-950/30";
      case 'error':
        return "border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/30";
      default:
        return "border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/30";
    }
  };

  // Get appropriate icon based on status
  const getIcon = () => {
    if (isChecking) {
      return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
    }
    
    switch(lockStatus) {
      case 'locked':
        return <Lock className="h-6 w-6 text-red-500" />;
      case 'available':
        return <Unlock className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-amber-500" />;
      default:
        return <CheckCircle className="h-6 w-6 text-blue-500" />;
    }
  };

  // Get label text based on status
  const getLabelText = () => {
    if (isChecking) return "Kontroluji...";
    
    switch(lockStatus) {
      case 'locked':
        return "Uzamčeno";
      case 'available':
        return "Dostupné";
      case 'error':
        return "Chyba";
      default:
        return "Zkontrolovat";
    }
  };

  // Get tooltip content based on status
  const getTooltipContent = () => {
    if (isChecking) return "Kontrola stavu zámku souboru...";
    
    switch(lockStatus) {
      case 'locked':
        return "Soubor je uzamčen jiným procesem. Kliknutím zkontrolujete znovu.";
      case 'available':
        return "Soubor je dostupný a není uzamčen. Kliknutím zkontrolujete znovu.";
      case 'error':
        return "Chyba při kontrole stavu zámku. Kliknutím zkusíte znovu.";
      default:
        return "Kliknutím zkontrolujete, zda je soubor používán jiným procesem.";
    }
  };

  return (
    <>
      <Tooltip content={getTooltipContent()}>
        <div className="inline-block">
          <button
            type="button"
            onClick={() => checkFileLock(true)}
            disabled={isChecking || !filePath}
            className={cn(
              "relative rounded-md p-2 transition-all duration-200",
              "flex items-center justify-center gap-2",
              "border bg-black/40 backdrop-blur-sm shadow-md",
              getButtonStyle(),
              className,
              {
                "opacity-50 cursor-not-allowed": isChecking || !filePath,
                "active:scale-95": !(isChecking || !filePath)
              }
            )}
            aria-label="Zkontrolovat zámek souboru"
          >
            {getIcon()}
            {showLabel && (
              <span className="font-medium">{getLabelText()}</span>
            )}
          </button>
        </div>
      </Tooltip>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#09090b] border-[#121212] shadow-lg">
          <DialogHeader>
            <DialogTitle className={cn(
              dialogInfo.status === 'locked' && "text-red-400",
              dialogInfo.status === 'available' && "text-green-400",
              dialogInfo.status === 'error' && "text-amber-400"
            )}>
              {dialogInfo.title}
            </DialogTitle>
            <DialogDescription className="pt-2 text-base text-gray-300">
              {dialogInfo.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4">
            <div className="rounded-md bg-black/40 backdrop-blur-sm p-4 border border-gray-800">
              <div className="text-sm font-medium text-gray-300">Informace o souboru:</div>
              <div className="mt-1 text-sm text-blue-400 bg-blue-950/30 px-2 py-1 rounded break-all">
                {filePath}
              </div>
              
              {dialogInfo.details && (
                <div className="mt-2 pt-2 border-t border-gray-800">
                  <div className="text-sm font-medium text-gray-300">Detaily:</div>
                  <div className="mt-1 text-sm text-red-400 bg-red-950/20 px-2 py-1 rounded">
                    {dialogInfo.details}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={() => setDialogOpen(false)}
                variant="outline"
              >
                Zavřít
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
