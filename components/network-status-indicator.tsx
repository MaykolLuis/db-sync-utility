/**
 * Network Status Indicator Component
 * Shows current network connectivity status and provides offline support feedback
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Server, ServerOff, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useOfflineSupport } from '../hooks/use-offline-support';

export interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function NetworkStatusIndicator({ 
  className = '', 
  showDetails = false,
  compact = false 
}: NetworkStatusIndicatorProps) {
  const {
    networkStatus,
    offlineCapabilities,
    isOnline,
    isNetworkDriveAccessible,
    checkConnectivity,
    isCheckingConnectivity
  } = useOfflineSupport();
  
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Prevent hydration mismatch by only rendering after client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Don't render anything during SSR to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
        {!compact && (
          <span className="text-sm text-gray-500">Načítání...</span>
        )}
      </div>
    );
  }
  
  // Determine overall status
  const getOverallStatus = () => {
    if (!isOnline) return 'offline';
    if (!isNetworkDriveAccessible) return 'limited';
    return 'online';
  };
  
  const overallStatus = getOverallStatus();
  
  // Get status color and icon
  const getStatusDisplay = () => {
    switch (overallStatus) {
      case 'offline':
        return {
          color: 'bg-red-500',
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Offline',
          description: 'Žádné připojení k síti'
        };
      case 'limited':
        return {
          color: 'bg-amber-500',
          icon: <AlertTriangle className="h-4 w-4" />,
          text: 'Omezeno',
          description: 'Síťové jednotky nedostupné'
        };
      case 'online':
        return {
          color: 'bg-green-500',
          icon: <Wifi className="h-4 w-4" />,
          text: 'Online',
          description: 'Plné připojení k síti'
        };
      default:
        return {
          color: 'bg-gray-500',
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Neznámo',
          description: 'Stav připojení neznámý'
        };
    }
  };
  
  const statusDisplay = getStatusDisplay();
  
  // Format last checked time
  const formatLastChecked = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `před ${minutes}m`;
    } else {
      return `před ${seconds}s`;
    }
  };
  
  // Compact view
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${className}`}
              onClick={() => setShowDetailsDialog(true)}
            >
              <div className={`h-2 w-2 rounded-full ${statusDisplay.color}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusDisplay.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`${statusDisplay.color} text-white border-0 cursor-pointer`}
              onClick={() => setShowDetailsDialog(true)}
            >
              {statusDisplay.icon}
              <span className="ml-1">{statusDisplay.text}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{statusDisplay.description}</p>
              <p className="text-sm text-gray-500">
                Poslední kontrola: {formatLastChecked(networkStatus.lastChecked)}
              </p>
              <p className="text-xs text-gray-400">Klikněte pro detaily</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => checkConnectivity(true)} // Force refresh when manually clicked
        disabled={isCheckingConnectivity}
        className={`h-8 w-8 p-0 transition-all duration-200 ${
          isCheckingConnectivity 
            ? 'opacity-75 cursor-not-allowed' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <RefreshCw 
          className={`h-4 w-4 transition-all duration-200 ${
            isCheckingConnectivity 
              ? 'animate-spin text-blue-500 drop-shadow-sm' 
              : 'hover:rotate-45 hover:scale-110 text-gray-600 dark:text-gray-400'
          }`} 
          style={{
            animationDuration: isCheckingConnectivity ? '1s' : undefined
          }}
        />
      </Button>
      
      {showDetails && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetailsDialog(true)}
          className="h-8 w-8 p-0"
        >
          <Info className="h-4 w-4" />
        </Button>
      )}
      
      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {statusDisplay.icon}
              <span>Stav síťového připojení</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${statusDisplay.color}`} />
                <span className="font-medium">{statusDisplay.text}</span>
              </div>
              <span className="text-sm text-gray-500">
                {formatLastChecked(networkStatus.lastChecked)}
              </span>
            </div>
            
            {/* Detailed Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span>Internetové připojení</span>
                </div>
                <Badge variant={isOnline ? "default" : "destructive"}>
                  {isOnline ? 'Dostupné' : 'Nedostupné'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isNetworkDriveAccessible ? (
                    <Server className="h-4 w-4 text-green-500" />
                  ) : (
                    <ServerOff className="h-4 w-4 text-amber-500" />
                  )}
                  <span>Síťové jednotky</span>
                </div>
                <Badge variant={isNetworkDriveAccessible ? "default" : "secondary"}>
                  {isNetworkDriveAccessible ? 'Dostupné' : 'Nedostupné'}
                </Badge>
              </div>
            </div>
            
            {/* Capabilities */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Dostupné funkce:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${offlineCapabilities.canAccessLocalFiles ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>Místní soubory</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${offlineCapabilities.canAccessNetworkDrives ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>Síťové jednotky</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${offlineCapabilities.canSaveToCache ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>Ukládání do cache</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${offlineCapabilities.hasInternetConnection ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>Internet</span>
                </div>
              </div>
            </div>
            
            {/* Error Information */}
            {networkStatus.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-medium text-red-800 dark:text-red-200 text-sm mb-1">
                  Chyba připojení:
                </h4>
                <p className="text-red-700 dark:text-red-300 text-sm">
                  {networkStatus.error}
                </p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkConnectivity(true)} // Force refresh when manually clicked
                disabled={isCheckingConnectivity}
                className={`transition-all duration-200 ${
                  isCheckingConnectivity 
                    ? 'opacity-75 cursor-not-allowed' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <RefreshCw 
                  className={`h-4 w-4 mr-2 transition-all duration-200 ${
                    isCheckingConnectivity 
                      ? 'animate-spin text-blue-500' 
                      : 'group-hover:rotate-45'
                  }`} 
                />
                <span className={`transition-colors duration-200 ${
                  isCheckingConnectivity ? 'text-blue-500' : ''
                }`}>
                  {isCheckingConnectivity ? 'Kontroluji...' : 'Zkontrolovat znovu'}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailsDialog(false)}
              >
                Zavřít
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
